#!/usr/bin/env python3
"""
Campus Coder — Background Code Execution Worker.

This process runs SEPARATELY from the Flask web server.  It pulls
submission jobs from the Redis queue and executes student code using
the existing compiler pool / Piston infrastructure.  Results are
written back to both Redis (for fast polling) and MongoDB (for
permanent storage).

Usage:
    python worker.py                  # run forever
    python worker.py --once           # process one job then exit (testing)

Deployment:
    On Render, deploy this as a Background Worker service pointing to
    the same `server/` root with start command: python worker.py
"""

import argparse
import json
import logging
import os
import signal
import sys
import time
from datetime import datetime, timezone

# Ensure the server package is on the path so relative imports work
# when this script is launched directly from the server/ directory.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import Config
from models.db import init_db, get_db
from services.queue_service import (
    dequeue_submission,
    store_result,
    get_queue_stats,
)
from services.piston_service import execute_code, normalize_output
from services.compiler_pool import compiler_pool

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [WORKER] %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger("worker")

# ---------------------------------------------------------------------------
# Graceful shutdown
# ---------------------------------------------------------------------------

_shutdown = False

def _handle_signal(signum, _frame):
    global _shutdown
    logger.info("Received signal %s — shutting down after current job…", signum)
    _shutdown = True

signal.signal(signal.SIGINT, _handle_signal)
signal.signal(signal.SIGTERM, _handle_signal)


# ---------------------------------------------------------------------------
# Job processors
# ---------------------------------------------------------------------------

def _evaluate_test_cases(language, code, test_cases, timeout=5):
    """Run student code against test cases using central OnlineJudgeEngine."""
    from services.judge_engine import OnlineJudgeEngine
    return OnlineJudgeEngine.evaluate_solution(language, code, test_cases, time_limit=float(timeout))


def process_submission_job(job):
    """Execute a single submission job and return the result dict."""
    job_type = job.get("type", "submit")  # "submit" | "contest_submit"
    language = job.get("language", "python")
    code = job.get("code", "")
    test_cases = job.get("test_cases", [])
    timeout = int(job.get("timeout", 6))
    submission_id = job.get("submission_id")
    problem_id = job.get("problem_id")
    user_id = job.get("user_id")
    student_id = job.get("student_id")
    student_name = job.get("student_name")
    problem_title = job.get("problem_title")
    contest_id = job.get("contest_id")
    participant_id = job.get("participant_id")

    started = time.perf_counter()

    # ---------- Evaluate ----------
    eval_res = _evaluate_test_cases(language, code, test_cases, timeout)
    passed = eval_res["passed"]
    total = eval_res["total"]
    status = eval_res["status"]
    max_runtime = eval_res.get("max_time_ms", 0)
    total_time_ms = eval_res.get("total_time_ms", 0)

    # Determine first error information (for the submission record)
    first_error = ""
    failed_test_case_info = None
    for r in eval_res.get("results", []):
        if not r.get("passed"):
            first_error = r.get("error") or f"Output mismatch on test case {r.get('test_case', '?')}"
            failed_test_case_info = {
                "test_case_index": r.get("test_case", 0),
                "input": r.get("input", "(Hidden)"),
                "expected": r.get("expected_output", "(Hidden)"),
                "actual": r.get("actual_output", "(Hidden)"),
            }
            break

    elapsed_ms = round((time.perf_counter() - started) * 1000, 2)

    result = {
        "job_id": job.get("job_id"),
        "submission_id": submission_id,
        "status": status,
        "verdict": eval_res.get("verdict", status.upper().replace(" ", "_")),
        "passed_test_cases": passed,
        "total_test_cases": total,
        "runtime": max_runtime,
        "runtime_ms": max_runtime,
        "memory_mb": eval_res.get("memory_mb", 14.2),
        "total_time_ms": total_time_ms,
        "error_message": first_error,
        "failed_case": failed_test_case_info,
        "diagnostics": eval_res.get("diagnostics", []),
        "test_results": eval_res.get("results", []),
        "worker_elapsed_ms": elapsed_ms,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }

    # ---------- Persist to MongoDB ----------
    try:
        db = get_db()
        if db is not None and submission_id:
            from bson import ObjectId

            update_fields = {
                "status": status,
                "runtime": max_runtime,
                "passed_test_cases": passed,
                "total_test_cases": total,
                "error_message": first_error,
                "evaluated_at": datetime.now(timezone.utc),
            }
            db.submissions.update_one(
                {"_id": ObjectId(submission_id)},
                {"$set": update_fields},
            )
            logger.info(
                "Submission %s evaluated: %s (%d/%d) in %.0fms",
                submission_id, status, passed, total, elapsed_ms,
            )

            # Achievement notifications (same logic as original submissions.py)
            if status == "Accepted" and user_id:
                _handle_accepted_notification(db, user_id, problem_id, problem_title, submission_id)

        # Contest-specific persistence
        if contest_id and participant_id:
            _update_contest_participant(db, job, result)

    except Exception as e:
        logger.error("MongoDB persistence error for job %s: %s", job.get("job_id"), e)

    return result


def _handle_accepted_notification(db, user_id, problem_id, problem_title, submission_id):
    """Create notifications when a problem is first solved."""
    try:
        from bson import ObjectId
        from services.notification_service import create_notification

        solved_before = db.submissions.find_one({
            "user_id": user_id,
            "problem_id": problem_id,
            "status": "Accepted",
            "_id": {"$ne": ObjectId(submission_id)},
        })
        if not solved_before:
            create_notification(
                user_id=user_id,
                title="Problem Solved",
                message=f"You successfully solved the {problem_title or 'problem'}.",
                notif_type="coding_problem",
            )
            pipeline = [
                {"$match": {"user_id": user_id, "status": "Accepted"}},
                {"$group": {"_id": "$problem_id"}},
                {"$count": "count"},
            ]
            res_count = list(db.submissions.aggregate(pipeline))
            unique_count = res_count[0]["count"] if res_count else 0
            if unique_count == 10:
                create_notification(
                    user_id=user_id,
                    title="New Achievement",
                    message="Congratulations! You solved 10 coding problems.",
                    notif_type="achievement",
                )
    except Exception as e:
        logger.warning("Notification creation failed: %s", e)


def _update_contest_participant(db, job, result):
    """Update contest_participants with the evaluation result for a single problem."""
    try:
        from bson import ObjectId

        contest_id = job.get("contest_id")
        participant_id = job.get("participant_id")
        problem_id = job.get("problem_id")
        if not all([contest_id, participant_id, problem_id]):
            return

        # Store per-problem result in coding_results sub-document
        coding_result = {
            "status": result["status"],
            "passed": result["passed_test_cases"],
            "total": result["total_test_cases"],
            "time_ms": result.get("total_time_ms", 0),
        }

        db.contest_participants.update_one(
            {"_id": ObjectId(participant_id)},
            {"$set": {f"coding_results.{problem_id}": coding_result}},
        )
    except Exception as e:
        logger.warning("Contest participant update failed: %s", e)


# ---------------------------------------------------------------------------
# Main worker loop
# ---------------------------------------------------------------------------

def run_worker(once=False):
    """Pull jobs from the queue and process them."""
    logger.info("Worker starting (PID %d) — compiler pool: %d threads", os.getpid(), compiler_pool.max_workers)
    logger.info("Queue stats: %s", get_queue_stats())

    # Initialise MongoDB connection for the worker process
    init_db()

    processed = 0
    while not _shutdown:
        job = dequeue_submission(timeout=5)
        if job is None:
            if once:
                break
            continue

        job_id = job.get("job_id", "unknown")
        logger.info("Processing job %s (type=%s)", job_id, job.get("type", "submit"))

        try:
            result = process_submission_job(job)
            store_result(job_id, result)
            processed += 1
        except Exception as e:
            logger.error("Unhandled error processing job %s: %s", job_id, e, exc_info=True)
            store_result(job_id, {
                "job_id": job_id,
                "status": "Internal Error",
                "error_message": str(e),
                "passed_test_cases": 0,
                "total_test_cases": 0,
                "runtime": 0,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            })

        if once:
            break

    logger.info("Worker shutting down. Processed %d jobs.", processed)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Campus Coder code execution worker")
    parser.add_argument("--once", action="store_true", help="Process one job then exit")
    args = parser.parse_args()
    run_worker(once=args.once)
