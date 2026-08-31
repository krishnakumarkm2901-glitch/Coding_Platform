from flask import Blueprint, request, jsonify
from models.db import get_db
from utils.decorators import token_required
from utils.rate_limiter import rate_limit
from services.piston_service import execute_code, normalize_output
from services.queue_service import (
    is_queue_available,
    enqueue_submission,
    get_result,
)
from bson import ObjectId
from datetime import datetime, timezone
import uuid

submissions_bp = Blueprint("submissions", __name__)


# ---------------------------------------------------------------------------
# Run Code (custom input) — always synchronous for instant feedback
# ---------------------------------------------------------------------------

@submissions_bp.route("/run", methods=["POST"])
@rate_limit(max_requests=10, window_seconds=60, key_func=lambda: request.remote_addr)
def run_code_custom():
    """Run code against custom input using Piston API."""
    data = request.get_json() or {}
    language = data.get("language", "python").lower()
    code = data.get("code", "").strip()
    custom_input = data.get("custom_input", "")

    if not code:
        return jsonify({"error": "Code cannot be empty", "success": False}), 400

    result = execute_code(language, code, custom_input, timeout=8)
    
    return jsonify({
        "success": True,
        "status": result["status"],
        "output": result["output"],
        "error": result["error"],
        "execution_time": result["execution_time"]
    }), 200


# ---------------------------------------------------------------------------
# Submit Solution — async via queue when available, sync fallback
# ---------------------------------------------------------------------------

def _get_user_id_for_rate_limit():
    """Extract user ID from JWT for rate limiting (best-effort)."""
    try:
        auth_header = request.headers.get("Authorization", "")
        if "Bearer " in auth_header:
            from utils.security import decode_token
            payload = decode_token(auth_header.split(" ")[1])
            if payload:
                return payload.get("user_id", request.remote_addr)
    except Exception:
        pass
    return request.remote_addr


@submissions_bp.route("/submit", methods=["POST"])
@token_required
@rate_limit(max_requests=5, window_seconds=60, key_func=_get_user_id_for_rate_limit)
def submit_solution():
    """Submit solution code to be tested against all test cases.

    When the Redis queue is available, the submission is enqueued and
    a job_id is returned immediately (status='QUEUED').  The client
    polls GET /submissions/<id> until the status changes.

    When the queue is unavailable, execution happens synchronously
    (preserving the original behaviour for local development).
    """
    data = request.get_json() or {}
    problem_id = data.get("problem_id")
    language = data.get("language", "python").lower()
    code = data.get("code", "").strip()

    if not problem_id or not code:
        return jsonify({"error": "Problem ID and code are required", "success": False}), 400

    db = get_db()
    user = request.current_user
    user_id = user["_id"]

    query = {"_id": ObjectId(problem_id)} if ObjectId.is_valid(problem_id) else {"slug": problem_id}
    problem = db.problems.find_one(query)
    if not problem:
        return jsonify({"error": "Problem not found", "success": False}), 404

    # Fetch test cases (from embedded list or separate collection)
    test_cases = problem.get("test_cases", [])
    if not test_cases:
        test_cases = list(db.test_cases.find({"problem_id": str(problem["_id"])}))

    if not test_cases:
        # Fallback if no test cases defined: create a basic sample test case
        sample_in = problem.get("sample_input", "")
        sample_out = problem.get("sample_output", "")
        test_cases = [{"input": sample_in, "expected_output": sample_out, "is_sample": True}]

    # ---- Async path: enqueue and return immediately ----
    if is_queue_available():
        # Create a QUEUED submission record in MongoDB
        submission_doc = {
            "user_id": user_id,
            "student_id": user.get("student_id", ""),
            "student_name": user.get("name", ""),
            "problem_id": str(problem["_id"]),
            "problem_title": problem.get("title", ""),
            "language": language,
            "code": code,
            "status": "QUEUED",
            "runtime": 0,
            "memory": 0,
            "passed_test_cases": 0,
            "total_test_cases": len(test_cases),
            "error_message": "",
            "created_at": datetime.now(timezone.utc),
        }
        sub_result = db.submissions.insert_one(submission_doc)
        submission_id = str(sub_result.inserted_id)

        # Serialise test cases for the queue (strip ObjectId fields)
        serialised_tcs = []
        for tc in test_cases:
            serialised_tcs.append({
                "input": tc.get("input", ""),
                "expected_output": tc.get("expected_output", tc.get("output", "")),
                "is_sample": tc.get("is_sample", False),
            })

        job_id = str(uuid.uuid4())
        enqueue_submission({
            "job_id": job_id,
            "type": "submit",
            "submission_id": submission_id,
            "problem_id": str(problem["_id"]),
            "problem_title": problem.get("title", ""),
            "user_id": user_id,
            "student_id": user.get("student_id", ""),
            "student_name": user.get("name", ""),
            "language": language,
            "code": code,
            "test_cases": serialised_tcs,
            "timeout": 6,
        })

        return jsonify({
            "success": True,
            "submission_id": submission_id,
            "job_id": job_id,
            "status": "QUEUED",
            "message": "Submission queued for evaluation.",
            "passed_test_cases": 0,
            "total_test_cases": len(test_cases),
            "runtime": 0,
            "error_message": "",
            "failed_case": None,
        }), 202  # 202 Accepted

    # ---- Sync path: execute inline (original behaviour) ----
    return _submit_synchronous(db, user, problem, test_cases, language, code)


def _submit_synchronous(db, user, problem, test_cases, language, code):
    """Original synchronous submission flow — used when Redis is unavailable."""
    user_id = user["_id"]
    total_test_cases = len(test_cases)
    passed_test_cases = 0
    final_status = "Accepted"
    first_error = ""
    failed_test_case_info = None
    max_runtime = 0.0

    for idx, tc in enumerate(test_cases):
        tc_input = tc.get("input", "")
        expected_output = normalize_output(tc.get("expected_output", tc.get("output", "")))

        res = execute_code(language, code, tc_input, timeout=6)
        max_runtime = max(max_runtime, res.get("execution_time", 0.0))

        # Check for compilation or runtime errors
        if res["status"] == "Compilation Error":
            final_status = "Compilation Error"
            first_error = res["error"]
            break
        elif res["status"] == "Time Limit Exceeded":
            final_status = "Time Limit Exceeded"
            first_error = res["error"]
            failed_test_case_info = {
                "test_case_index": idx + 1,
                "input": tc_input if tc.get("is_sample") else "(Hidden Test Case)",
                "expected": expected_output if tc.get("is_sample") else "(Hidden)",
                "actual": "Time Limit Exceeded"
            }
            break
        elif res["status"] == "Runtime Error":
            final_status = "Runtime Error"
            first_error = res["error"]
            failed_test_case_info = {
                "test_case_index": idx + 1,
                "input": tc_input if tc.get("is_sample") else "(Hidden Test Case)",
                "expected": expected_output if tc.get("is_sample") else "(Hidden)",
                "actual": res["error"]
            }
            break
        
        # Compare actual output with expected output
        actual_output = normalize_output(res["output"])
        if actual_output == expected_output or actual_output.lower() == expected_output.lower():
            passed_test_cases += 1
        else:
            final_status = "Wrong Answer"
            first_error = f"Output mismatch on test case {idx + 1}"
            failed_test_case_info = {
                "test_case_index": idx + 1,
                "input": tc_input if tc.get("is_sample") else "(Hidden Test Case)",
                "expected": expected_output if tc.get("is_sample") else "(Hidden)",
                "actual": actual_output if tc.get("is_sample") else "(Hidden Output)"
            }
            break

    # Save submission record
    submission_doc = {
        "user_id": user_id,
        "student_id": user.get("student_id", ""),
        "student_name": user.get("name", ""),
        "problem_id": str(problem["_id"]),
        "problem_title": problem.get("title", ""),
        "language": language,
        "code": code,
        "status": final_status,
        "runtime": max_runtime,
        "memory": 15.4, # Approx MB
        "passed_test_cases": passed_test_cases,
        "total_test_cases": total_test_cases,
        "error_message": first_error,
        "created_at": datetime.now(timezone.utc)
    }

    sub_result = db.submissions.insert_one(submission_doc)

    if final_status == "Accepted":
        from services.notification_service import create_notification
        # Check if user has already solved this problem before
        solved_before = db.submissions.find_one({
            "user_id": user_id,
            "problem_id": str(problem["_id"]),
            "status": "Accepted",
            "_id": {"$ne": sub_result.inserted_id}
        })
        if not solved_before:
            create_notification(
                user_id=user_id,
                title="Problem Solved",
                message=f"You successfully solved the {problem.get('title')} problem.",
                notif_type="coding_problem"
            )
            
            # Count total unique solved problems
            pipeline = [
                {"$match": {"user_id": user_id, "status": "Accepted"}},
                {"$group": {"_id": "$problem_id"}},
                {"$count": "count"}
            ]
            res_count = list(db.submissions.aggregate(pipeline))
            unique_count = res_count[0]["count"] if res_count else 0
            
            # If they hit exactly 10 problems solved, trigger an achievement notification!
            if unique_count == 10:
                create_notification(
                    user_id=user_id,
                    title="New Achievement",
                    message="Congratulations! You solved 10 coding problems.",
                    notif_type="achievement"
                )

    return jsonify({
        "success": True,
        "submission_id": str(sub_result.inserted_id),
        "status": final_status,
        "passed_test_cases": passed_test_cases,
        "total_test_cases": total_test_cases,
        "runtime": max_runtime,
        "error_message": first_error,
        "failed_case": failed_test_case_info
    }), 200


# ---------------------------------------------------------------------------
# Poll submission status (for async queue flow)
# ---------------------------------------------------------------------------

@submissions_bp.route("/<submission_id>/status", methods=["GET"])
@token_required
def get_submission_status(submission_id):
    """Fast polling endpoint for queued submissions.

    Returns the current status.  If the submission has been evaluated,
    returns the full result.  If still queued, returns status='QUEUED'.
    """
    if not ObjectId.is_valid(submission_id):
        return jsonify({"error": "Invalid submission ID", "success": False}), 400

    db = get_db()
    sub = db.submissions.find_one(
        {"_id": ObjectId(submission_id)},
        {"code": 0},  # Exclude code for lightweight polling
    )
    if not sub:
        return jsonify({"error": "Submission not found", "success": False}), 404

    # Only allow owner or admin
    if str(sub.get("user_id")) != str(request.current_user["_id"]) and request.current_user.get("role") != "ADMIN":
        return jsonify({"error": "Unauthorized", "success": False}), 403

    status = sub.get("status", "QUEUED")

    return jsonify({
        "success": True,
        "submission_id": submission_id,
        "status": status,
        "passed_test_cases": sub.get("passed_test_cases", 0),
        "total_test_cases": sub.get("total_test_cases", 0),
        "runtime": sub.get("runtime", 0),
        "error_message": sub.get("error_message", ""),
        "is_complete": status not in ("QUEUED", "PROCESSING"),
    }), 200


# ---------------------------------------------------------------------------
# Submission history
# ---------------------------------------------------------------------------

@submissions_bp.route("", methods=["GET"])
@token_required
def get_user_submissions():
    """Retrieve submissions history for the current user."""
    db = get_db()
    user = request.current_user
    user_id = user["_id"]

    problem_id = request.args.get("problem_id")
    status = request.args.get("status")
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    skip = (page - 1) * limit

    query = {"user_id": user_id}
    if problem_id:
        query["problem_id"] = problem_id
    if status and status.lower() != "all":
        query["status"] = status

    total = db.submissions.count_documents(query)
    cursor = db.submissions.find(query).sort("created_at", -1).skip(skip).limit(limit)

    submissions_list = []
    for s in cursor:
        submissions_list.append({
            "id": str(s["_id"]),
            "problem_id": s.get("problem_id"),
            "problem_title": s.get("problem_title", "Problem"),
            "language": s.get("language"),
            "status": s.get("status"),
            "runtime": s.get("runtime", 0),
            "memory": s.get("memory", 0),
            "passed_test_cases": s.get("passed_test_cases", 0),
            "total_test_cases": s.get("total_test_cases", 0),
            "created_at": s.get("created_at").isoformat() if isinstance(s.get("created_at"), datetime) else str(s.get("created_at"))
        })

    return jsonify({
        "success": True,
        "submissions": submissions_list,
        "pagination": {
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit if limit > 0 else 1
        }
    }), 200

@submissions_bp.route("/<submission_id>", methods=["GET"])
@token_required
def get_submission_by_id(submission_id):
    """Get single submission with code and error info."""
    db = get_db()
    if not ObjectId.is_valid(submission_id):
        return jsonify({"error": "Invalid submission ID", "success": False}), 400

    sub = db.submissions.find_one({"_id": ObjectId(submission_id)})
    if not sub:
        return jsonify({"error": "Submission not found", "success": False}), 404

    # Allow student to see own submission or Admin
    if sub.get("user_id") != request.current_user["_id"] and request.current_user.get("role") != "ADMIN":
        return jsonify({"error": "Unauthorized access to this submission", "success": False}), 403

    return jsonify({
        "success": True,
        "submission": {
            "id": str(sub["_id"]),
            "problem_id": sub.get("problem_id"),
            "problem_title": sub.get("problem_title"),
            "student_id": sub.get("student_id"),
            "student_name": sub.get("student_name"),
            "language": sub.get("language"),
            "code": sub.get("code"),
            "status": sub.get("status"),
            "runtime": sub.get("runtime"),
            "memory": sub.get("memory"),
            "passed_test_cases": sub.get("passed_test_cases", 0),
            "total_test_cases": sub.get("total_test_cases", 0),
            "error_message": sub.get("error_message", ""),
            "created_at": sub.get("created_at").isoformat() if isinstance(sub.get("created_at"), datetime) else str(sub.get("created_at"))
        }
    }), 200
