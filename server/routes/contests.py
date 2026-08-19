from flask import Blueprint, request, jsonify
from models.db import get_db
from utils.decorators import token_required, student_required
from services.piston_service import execute_code, normalize_output
from services.cache_service import cache
from services.compiler_pool import compiler_pool
from utils.time_utils import (
    get_utc_now,
    parse_to_utc_datetime,
    format_utc_iso,
    calculate_contest_status
)
from bson import ObjectId
from datetime import datetime, timezone, timedelta

contests_bp = Blueprint("contests", __name__)

def parse_iso_or_datetime(val):
    return parse_to_utc_datetime(val)

@contests_bp.route("", methods=["GET"])
def get_contests():
    """List all published contests with status and caching."""
    db = get_db()
    
    user_id = None
    auth_header = request.headers.get("Authorization")
    if auth_header and "Bearer " in auth_header:
        from utils.security import decode_token
        payload = decode_token(auth_header.split(" ")[1])
        if payload:
            user_id = payload.get("user_id")

    now = get_utc_now()

    # Cache base contest metadata for 10 seconds to protect DB during high concurrency
    cache_key = "contests:published:list"
    cached_contests = cache.get(cache_key)
    if cached_contests is None:
        contests_cursor = list(db.contests.find({"is_published": True}).sort("start_time", -1))
        cached_contests = []
        for c in contests_cursor:
            c_copy = dict(c)
            c_copy["_id"] = str(c["_id"])
            if "problem_ids" in c_copy:
                c_copy["problem_ids"] = [str(pid) for pid in c_copy["problem_ids"]]
            if "mcq_ids" in c_copy:
                c_copy["mcq_ids"] = [str(mid) for mid in c_copy["mcq_ids"]]
            
            for key, val in c_copy.items():
                if isinstance(val, datetime):
                    c_copy[key] = format_utc_iso(val)
            
            cached_contests.append(c_copy)
        cache.set(cache_key, cached_contests, ttl=10)

    contests_list = []
    for c in cached_contests:
        c_id = str(c["_id"])
        start = parse_to_utc_datetime(c.get("start_time"))
        end = parse_to_utc_datetime(c.get("end_time"))
        
        status = calculate_contest_status(start, end, now)

        has_joined = False
        user_score = 0
        if user_id:
            part = db.contest_participants.find_one({"contest_id": c_id, "user_id": user_id})
            if part:
                has_joined = True
                user_score = part.get("score", 0)

        participants_count = db.contest_participants.count_documents({"contest_id": c_id})

        c_type = c.get("contestType") or c.get("contest_type")
        if not c_type:
            has_p = bool(c.get("problem_ids", []))
            has_m = bool(c.get("mcq_ids", []))
            c_type = "BOTH" if (has_p and has_m) else "CODING" if has_p else "MCQ"

        contests_list.append({
            "id": c_id,
            "title": c.get("title"),
            "description": c.get("description", ""),
            "start_time": format_utc_iso(start),
            "end_time": format_utc_iso(end),
            "duration_minutes": c.get("duration_minutes", 60),
            "contest_type": c_type,
            "contestType": c_type,
            "problems_count": len(c.get("problem_ids", [])),
            "mcqs_count": len(c.get("mcq_ids", [])),
            "mcqs_per_student": c.get("mcqs_per_student", 20),
            "total_points": c.get("total_points", 100),
            "status": status,
            "participants_count": participants_count,
            "has_joined": has_joined,
            "user_score": user_score
        })

    return jsonify({
        "success": True, 
        "contests": contests_list,
        "server_time": format_utc_iso(now)
    }), 200

import random

def get_or_assign_student_mcqs(db, contest, user_id, student_id=None, now=None, attempt_number=1, exclude_previous_ids=None):
    """
    Fetch or generate a fixed, randomized subset of MCQs for a student.
    - If pool is 40 questions, selects 20 questions (or contest.mcqs_per_student).
    - Shuffles the selected questions into a random order.
    - Persists the assigned question IDs so the exact same 20 questions and order remain fixed.
    - For retests: excludes questions from previous attempts (if exclude_previous_ids provided)
    """
    if now is None:
        now = get_utc_now()
    if exclude_previous_ids is None:
        exclude_previous_ids = []

    contest_id_str = str(contest.get("_id") or contest.get("id"))
    all_mcq_ids = [str(mid) for mid in contest.get("mcq_ids", []) if mid]
    if not all_mcq_ids:
        return []

    user_id_objs = [str(user_id)]
    if ObjectId.is_valid(user_id):
        user_id_objs.append(ObjectId(user_id))
    
    contest_id_objs = [contest_id_str]
    if ObjectId.is_valid(contest_id_str):
        contest_id_objs.append(ObjectId(contest_id_str))

    # For retest: check if we're creating a new attempt (attempt_number > 1)
    if attempt_number > 1:
        # Always create new questions for retests, don't use cache
        pass
    else:
        # 1. Check if student already has assigned MCQs in contest_assigned_questions (original attempt)
        assigned_doc = db.contest_assigned_questions.find_one({
            "contest_id": {"$in": contest_id_objs},
            "user_id": {"$in": user_id_objs},
            "attempt_number": {"$exists": False}  # Legacy/original attempt
        })
        if assigned_doc and assigned_doc.get("question_ids"):
            return assigned_doc["question_ids"]

        # Also check existing contest_participants doc
        participant = db.contest_participants.find_one({
            "contest_id": {"$in": contest_id_objs},
            "user_id": {"$in": user_id_objs},
            "is_active_attempt": True
        })
        if participant and participant.get("assigned_mcq_ids"):
            return participant["assigned_mcq_ids"]

    # 2. Determine target count (default 20, or min(20, total) if pool is smaller, or custom mcqs_per_student)
    target_count = int(contest.get("mcqs_per_student") or 20)
    if target_count <= 0 or target_count > len(all_mcq_ids):
        target_count = min(20, len(all_mcq_ids)) if len(all_mcq_ids) >= 20 else len(all_mcq_ids)

    # Filter out previously assigned questions (for retests)
    available_ids = [qid for qid in all_mcq_ids if qid not in exclude_previous_ids]
    
    # 3. Randomly select target_count questions from available pool
    if len(available_ids) >= target_count:
        selected_ids = random.sample(available_ids, target_count)
    elif len(available_ids) > 0:
        # Use whatever is available if not enough unused questions
        selected_ids = list(available_ids)
    else:
        # Fallback: if no unused questions, use all (shouldn't happen in normal flow)
        selected_ids = random.sample(all_mcq_ids, min(target_count, len(all_mcq_ids)))

    # 4. Shuffle the selected subset so question #1 is randomized across candidates
    random.shuffle(selected_ids)

    # 5. Persist with attempt number tracking
    try:
        db.contest_assigned_questions.insert_one({
            "contest_id": contest_id_str,
            "user_id": str(user_id),
            "student_id": student_id,
            "question_ids": selected_ids,
            "attempt_number": attempt_number,
            "assigned_at": now
        })
    except Exception:
        pass

    # Read back to ensure we always return the stored winning sequence
    stored = db.contest_assigned_questions.find_one({
        "contest_id": {"$in": contest_id_objs},
        "user_id": {"$in": user_id_objs},
        "attempt_number": attempt_number
    })
    final_ids = stored.get("question_ids", selected_ids) if stored else selected_ids

    # Update participant if exists
    if attempt_number == 1:
        participant = db.contest_participants.find_one({
            "contest_id": {"$in": contest_id_objs},
            "user_id": {"$in": user_id_objs}
        })
        if participant:
            db.contest_participants.update_one(
                {"_id": participant["_id"]},
                {"$set": {"assigned_mcq_ids": final_ids}}
            )

    return final_ids

@contests_bp.route("/<contest_id>", methods=["GET"])
@token_required
def get_contest_details(contest_id):
    """Get full details of contest, including problems and personalized MCQs if joined/started."""
    db = get_db()
    if not ObjectId.is_valid(contest_id):
        return jsonify({"error": "Invalid contest ID", "success": False}), 400

    contest = db.contests.find_one({"_id": ObjectId(contest_id)})
    if not contest:
        return jsonify({"error": "Contest not found", "success": False}), 404

    now = get_utc_now()
    start = parse_to_utc_datetime(contest.get("start_time"))
    end = parse_to_utc_datetime(contest.get("end_time"))

    status = calculate_contest_status(start, end, now)

    c_type = contest.get("contestType") or contest.get("contest_type")
    if not c_type:
        has_p = bool(contest.get("problem_ids", []))
        has_m = bool(contest.get("mcq_ids", []))
        c_type = "BOTH" if (has_p and has_m) else "CODING" if has_p else "MCQ"

    # Time until start (if upcoming)
    time_to_start_seconds = max(0, int((start - now).total_seconds())) if (start and now < start) else 0

    # Check participant status
    user_id = request.current_user["_id"]
    user_role = request.current_user.get("role", "STUDENT")
    
    user_id_objs = [str(user_id)]
    if ObjectId.is_valid(user_id):
        user_id_objs.append(ObjectId(user_id))
    contest_id_objs = [contest_id]
    if ObjectId.is_valid(contest_id):
        contest_id_objs.append(ObjectId(contest_id))

    participant = db.contest_participants.find_one({
        "contest_id": {"$in": contest_id_objs},
        "user_id": {"$in": user_id_objs},
        "is_active_attempt": True
    })
    
    # Keep track of the historical status separately
    historical_participant = None
    if not participant:
        # Look for any previous attempt to understand why this student is not active
        historical_participant = db.contest_participants.find_one({
            "contest_id": {"$in": contest_id_objs},
            "user_id": {"$in": user_id_objs}
        }, sort=[("attempt_number", -1)])

    is_terminated = False
    is_locked = False
    is_retest_available = False
    termination_reason = ""
    lock_reason = ""
    lock_timeout_remaining_seconds = 0
    participant_status = "NOT_STARTED"
    retest_info = None

    if participant:
        # We have an ACTIVE attempt - use it for current contest data
        # Check if LOCKED attempt has expired (30 minutes passed)
        if participant.get("status") == "LOCKED" and participant.get("lock_timeout_at"):
            lock_timeout = parse_to_utc_datetime(participant.get("lock_timeout_at"))
            if lock_timeout and now >= lock_timeout:
                # Auto-terminate: lock window expired
                db.contest_participants.update_one(
                    {"_id": participant["_id"]},
                    {
                        "$set": {
                            "status": "AUTO_TERMINATED",
                            "resolution_window_active": False,
                            "auto_terminated": True,
                            "terminated_at": now,
                            "termination_reason": "Lock resolution window (30 minutes) expired without admin action"
                        },
                        "$push": {
                            "anti_cheat_logs": {
                                "event_type": "LOCK_EXPIRED",
                                "detail": "30-minute lock resolution window expired. Attempt auto-terminated.",
                                "timestamp": now.isoformat()
                            }
                        }
                    }
                )
                # Reload participant after update
                participant = db.contest_participants.find_one({"_id": participant["_id"]})
            else:
                # Lock is still valid, calculate remaining time
                if lock_timeout:
                    lock_timeout_remaining_seconds = max(0, int((lock_timeout - now).total_seconds()))
        
        is_terminated = bool(participant.get("auto_terminated") or participant.get("status") == "AUTO_TERMINATED")
        is_locked = bool(participant.get("status") == "LOCKED" and not is_terminated)
        termination_reason = participant.get("termination_reason", "")
        lock_reason = participant.get("lock_reason", "")
        participant_status = participant.get("status", "IN_PROGRESS")
        if participant.get("submitted") and not is_terminated:
            participant_status = "SUBMITTED"
        if participant.get("status") == "RETEST_READY":
            is_retest_available = True
            retest_info = {
                "participant_id": str(participant["_id"]),
                "attempt_number": participant.get("attempt_number", 2),
                "status": "RETEST_READY",
            }
    elif historical_participant:
        # No active attempt, but we have history - show why (terminated or locked)
        is_terminated = bool(historical_participant.get("auto_terminated") or historical_participant.get("status") == "AUTO_TERMINATED")
        is_locked = bool(historical_participant.get("status") == "LOCKED" and not is_terminated)
        termination_reason = historical_participant.get("termination_reason", "")
        lock_reason = historical_participant.get("lock_reason", "")
        participant_status = historical_participant.get("status", "NOT_STARTED")
    
    # Check if there's a new active retest available (higher attempt number with is_active_attempt: True)
    # This applies both when we have an active attempt and when we have historical terminated attempt
    if (is_locked or is_terminated) and not is_retest_available:
        current_attempt = (participant or historical_participant).get("attempt_number", 1)
        retest_attempt = db.contest_participants.find_one({
            "contest_id": {"$in": contest_id_objs},
            "user_id": {"$in": user_id_objs},
            "is_active_attempt": True,
            "attempt_number": {"$gt": current_attempt}
        })
        if retest_attempt:
            is_retest_available = True
            retest_info = {
                "participant_id": str(retest_attempt["_id"]),
                "attempt_number": retest_attempt.get("attempt_number", 2),
                "status": retest_attempt.get("status", "IN_PROGRESS")
            }

    # Remaining time in seconds based on contest duration and student joined_at
    duration_secs = int(contest.get("duration_minutes", 60)) * 60
    remaining_seconds = duration_secs
    # If locked, use the saved remaining_seconds from the lock event
    if is_locked and participant.get("locked_remaining_seconds") is not None:
        remaining_seconds = int(participant.get("locked_remaining_seconds"))
    elif participant and participant.get("joined_at"):
        joined_at = parse_to_utc_datetime(participant.get("joined_at"))
        if joined_at:
            elapsed = (now - joined_at).total_seconds()
            remaining_seconds = max(0, int(duration_secs - elapsed))
    
    if end and not is_locked:
        time_to_end = max(0, int((end - now).total_seconds()))
        remaining_seconds = min(remaining_seconds, time_to_end)

    # Fetch problems
    problems = []
    prob_ids = [ObjectId(pid) for pid in contest.get("problem_ids", []) if ObjectId.is_valid(pid)]
    if prob_ids:
        prob_docs = list(db.problems.find({"_id": {"$in": prob_ids}}))
        for p in prob_docs:
            p_id = str(p["_id"])
            problems.append({
                "id": p_id,
                "title": p.get("title"),
                "slug": p.get("slug"),
                "difficulty": p.get("difficulty", "Easy"),
                "topic": p.get("topic", "General"),
                "description": p.get("description", ""),
                "input_format": p.get("input_format", ""),
                "output_format": p.get("output_format", ""),
                "constraints": p.get("constraints", ""),
                "sample_input": p.get("sample_input", ""),
                "sample_output": p.get("sample_output", ""),
                "points": 50
            })

    # Fetch Personalized Assigned MCQs for student (or all if admin)
    mcqs = []
    if user_role == "ADMIN":
        assigned_mcq_ids = [str(mid) for mid in contest.get("mcq_ids", []) if mid]
    elif participant:
        # Student has an active attempt - use their assigned questions
        assigned_mcq_ids = [str(mid) for mid in participant.get("assigned_mcq_ids", []) if mid]
    else:
        # Student has no active attempt - assign fresh questions
        assigned_mcq_ids = get_or_assign_student_mcqs(db, contest, user_id, request.current_user.get("student_id"), now)

    if assigned_mcq_ids:
        valid_obj_ids = [ObjectId(mid) for mid in assigned_mcq_ids if ObjectId.is_valid(mid)]
        mcq_docs = list(db.mcqs.find({"_id": {"$in": valid_obj_ids}}))
        mcq_map = {str(m["_id"]): m for m in mcq_docs}

        # Preserve the EXACT shuffled assigned sequence
        for mid in assigned_mcq_ids:
            m = mcq_map.get(mid)
            if m:
                mcqs.append({
                    "id": str(m["_id"]),
                    "question": m.get("question"),
                    "options": m.get("options", []),
                    "topic": m.get("topic"),
                    "difficulty": m.get("difficulty", "Easy"),
                    "points": 10
                })

    return jsonify({
        "success": True,
        "contest": {
            "id": contest_id,
            "title": contest.get("title"),
            "description": contest.get("description"),
            "start_time": format_utc_iso(start),
            "end_time": format_utc_iso(end),
            "duration_minutes": contest.get("duration_minutes", 60),
            "contest_type": c_type,
            "contestType": c_type,
            "status": status,
            "server_time": format_utc_iso(now),
            "time_to_start_seconds": time_to_start_seconds,
            "remaining_seconds": remaining_seconds,
            "is_registered": bool(participant),
            "has_submitted": participant.get("submitted", False) if participant else False,
            "is_terminated": is_terminated,
            "is_locked": is_locked,
            "is_retest_available": is_retest_available,
            "retest_info": retest_info,
            "lock_timeout_remaining_seconds": lock_timeout_remaining_seconds,
            "termination_reason": termination_reason,
            "lock_reason": lock_reason,
            "participant_status": participant_status,
            "attempt_number": participant.get("attempt_number", 1) if participant else 1,
            "score": participant.get("score", 0) if participant else 0,
            "problems": problems,
            "mcqs": mcqs,
            "mcqs_per_student": contest.get("mcqs_per_student", 20),
            "allow_calculator": bool(contest.get("allow_calculator", False)),
            "allowCalculator": bool(contest.get("allow_calculator", False))
        }
    }), 200

@contests_bp.route("/<contest_id>/join", methods=["POST"])
@student_required
def join_contest(contest_id):
    """Register or start a contest session for a student with Strict Mode single-attempt guard."""
    db = get_db()
    if not ObjectId.is_valid(contest_id):
        return jsonify({"error": "Invalid contest ID", "success": False}), 400

    contest = db.contests.find_one({"_id": ObjectId(contest_id)})
    if not contest or not contest.get("is_published"):
        return jsonify({"error": "Contest not found or unpublished", "success": False}), 404

    now = get_utc_now()
    start = parse_to_utc_datetime(contest.get("start_time"))
    end = parse_to_utc_datetime(contest.get("end_time"))

    request_user_id = request.current_user["_id"]
    ready_user_ids = [str(request_user_id)]
    if ObjectId.is_valid(request_user_id):
        ready_user_ids.append(ObjectId(request_user_id))
    ready_contest_ids = [contest_id, ObjectId(contest_id)]
    ready_retest = db.contest_participants.find_one({
        "contest_id": {"$in": ready_contest_ids},
        "user_id": {"$in": ready_user_ids},
        "is_active_attempt": True,
        "status": "RETEST_READY",
    })

    # Guard: Cannot join before start time
    if start and now < start and not ready_retest:
        time_diff = int((start - now).total_seconds())
        return jsonify({
            "error": "Contest has not started yet. Please wait until the scheduled start time.",
            "status": "Upcoming",
            "time_to_start_seconds": max(0, time_diff),
            "success": False
        }), 403

    # Guard: Cannot join after end time
    if end and now > end and not ready_retest:
        return jsonify({
            "error": "Contest has already ended. Joining is no longer allowed.",
            "status": "Past",
            "success": False
        }), 403

    user = request.current_user
    user_id = user["_id"]
    data = request.get_json(silent=True) or {}

    user_id_objs = [str(user_id)]
    if ObjectId.is_valid(user_id):
        user_id_objs.append(ObjectId(user_id))
    contest_id_objs = [contest_id]
    if ObjectId.is_valid(contest_id):
        contest_id_objs.append(ObjectId(contest_id))

    existing = db.contest_participants.find_one({
        "contest_id": {"$in": contest_id_objs},
        "user_id": {"$in": user_id_objs},
        "is_active_attempt": True,
    }, sort=[("attempt_number", -1)])
    if existing:
        if existing.get("auto_terminated") or existing.get("status") == "AUTO_TERMINATED":
            return jsonify({
                "error": "Contest Terminated — You left the contest environment. Your attempt has been terminated and you cannot re-enter this contest.",
                "is_terminated": True,
                "status": "AUTO_TERMINATED",
                "termination_reason": existing.get("termination_reason", "Violation of strict contest rules"),
                "success": False
            }), 403

        if existing.get("status") == "LOCKED":
            return jsonify({
                "error": "Your contest attempt is currently locked. Please contact the administrator to restore access.",
                "is_locked": True,
                "status": "LOCKED",
                "lock_reason": existing.get("lock_reason", "Exited fullscreen"),
                "success": False
            }), 403

        if existing.get("submitted"):
            return jsonify({
                "error": "Contest already submitted. Only one attempt is permitted per contest.",
                "has_submitted": True,
                "status": "SUBMITTED",
                "success": False
            }), 403

        if existing.get("status") == "RETEST_READY":
            if not data.get("start_retest"):
                return jsonify({
                    "error": "This retest must be started from the fullscreen confirmation screen.",
                    "is_retest_available": True,
                    "success": False,
                }), 403
            db.contest_participants.update_one(
                {"_id": existing["_id"], "status": "RETEST_READY"},
                {
                    "$set": {"status": "IN_PROGRESS", "joined_at": now},
                    "$push": {"anti_cheat_logs": {
                        "event_type": "RETEST_STARTED",
                        "detail": "Student entered fullscreen and started the approved retest",
                        "timestamp": now.isoformat(),
                    }},
                },
            )
            existing["status"] = "IN_PROGRESS"
            existing["joined_at"] = now

    duration_secs = int(contest.get("duration_minutes", 60)) * 60
    remaining_seconds = duration_secs
    assigned_mcq_ids = get_or_assign_student_mcqs(db, contest, user_id, user.get("student_id"), now)

    if not existing:
        db.contest_participants.insert_one({
            "contest_id": contest_id,
            "user_id": user_id,
            "student_id": user.get("student_id"),
            "student_name": user.get("name"),
            "department": user.get("department", "CSE"),
            "joined_at": now,
            "assigned_mcq_ids": assigned_mcq_ids,
            "attempt_number": 1,
            "is_active_attempt": True,
            "status": "IN_PROGRESS",
            "score": 0,
            "problems_solved": 0,
            "mcqs_correct": 0,
            "submitted": False,
            "auto_terminated": False,
            "anti_cheat_logs": [
                {
                    "event_type": "SESSION_START",
                    "detail": "Student initiated strict contest arena session",
                    "timestamp": now.isoformat()
                }
            ]
        })
    else:
        joined_at = parse_to_utc_datetime(existing.get("joined_at"))
        if joined_at:
            elapsed = (now - joined_at).total_seconds()
            remaining_seconds = max(0, int(duration_secs - elapsed))
        elif existing.get("joined_at") is None:
            db.contest_participants.update_one(
                {"_id": existing["_id"]},
                {"$set": {"joined_at": now, "assigned_mcq_ids": assigned_mcq_ids}}
            )

    if end:
        time_to_end = max(0, int((end - now).total_seconds()))
        remaining_seconds = min(remaining_seconds, time_to_end)

    return jsonify({
        "success": True, 
        "message": "Successfully entered contest",
        "remaining_seconds": remaining_seconds,
        "status": "IN_PROGRESS"
    }), 200

@contests_bp.route("/<contest_id>/terminate", methods=["POST"])
@student_required
def terminate_contest(contest_id):
    """Terminate a student's ACTIVE retest attempt due to anti-cheat violation (e.g., fullscreen exit).
    Only applies to retest attempts (attempt_number > 1)."""
    db = get_db()
    if not ObjectId.is_valid(contest_id):
        return jsonify({"error": "Invalid contest ID", "success": False}), 400

    user = request.current_user
    user_id = user["_id"]
    data = request.get_json() or {}
    reason = data.get("reason", "SECURITY_VIOLATION")
    detail = data.get("detail", "Retest terminated due to rule violation")
    is_retest = data.get("is_retest", False)

    now = get_utc_now()
    event_record = {
        "event_type": "TERMINATION_VIOLATION",
        "detail": f"Attempt Terminated: {detail}",
        "reason": reason,
        "is_retest": is_retest,
        "timestamp": now.isoformat()
    }

    # Target only the ACTIVE attempt
    user_id_objs = [str(user_id)]
    if ObjectId.is_valid(user_id):
        user_id_objs.append(ObjectId(user_id))
    contest_id_objs = [contest_id]
    if ObjectId.is_valid(contest_id):
        contest_id_objs.append(ObjectId(contest_id))

    db.contest_participants.update_one(
        {
            "contest_id": {"$in": contest_id_objs},
            "user_id": {"$in": user_id_objs},
            "is_active_attempt": True
        },
        {
            "$set": {
                "status": "AUTO_TERMINATED",
                "submitted": True,
                "auto_terminated": True,
                "terminated_at": now,
                "termination_reason": detail
            },
            "$push": {"anti_cheat_logs": event_record}
        }
    )

    from services.notification_service import create_notification
    # Student Notification
    create_notification(
        user_id=user_id,
        title="Attempt Terminated",
        message=f"Your contest attempt was terminated: {detail}",
        notif_type="anti-cheat"
    )
    # Admin Notifications
    admins = list(db.users.find({"role": "ADMIN"}))
    for admin in admins:
        create_notification(
            user_id=admin["_id"],
            title="Contest Auto-Termination",
            message=f"Student {user.get('name')} was auto-terminated from contest because of: {detail}",
            notif_type="anti-cheat"
        )

    return jsonify({
        "success": True,
        "message": "Contest Terminated — You left the contest environment. Your attempt has been terminated and you cannot re-enter this contest.",
        "is_terminated": True,
        "termination_reason": detail
    }), 200

@contests_bp.route("/<contest_id>/lock", methods=["POST"])
@student_required
def lock_contest(contest_id):
    """Lock a student's contest attempt (e.g. on fullscreen exit) without terminating it.
    Starts a 30-minute resolution window for admin to restore/activate retest.
    After 30 minutes, auto-terminates."""
    db = get_db()
    if not ObjectId.is_valid(contest_id):
        return jsonify({"error": "Invalid contest ID", "success": False}), 400

    user = request.current_user
    user_id = user["_id"]
    data = request.get_json() or {}
    reason = data.get("reason", "EXIT_FULLSCREEN")
    detail = data.get("detail", "Exited fullscreen contest mode")
    resume_state = data.get("resume_state", {})

    now = get_utc_now()
    lock_timeout = now + timedelta(seconds=1800)  # 30 minutes from now

    event_record = {
        "event_type": "CONTEST_LOCKED",
        "detail": f"Contest Locked: {detail}",
        "reason": reason,
        "remaining_seconds": remaining_seconds,
        "timestamp": now.isoformat()
    }

    # Update only the ACTIVE attempt for this user
    user_id_objs = [str(user_id)]
    if ObjectId.is_valid(user_id):
        user_id_objs.append(ObjectId(user_id))
    contest_id_objs = [contest_id]
    if ObjectId.is_valid(contest_id):
        contest_id_objs.append(ObjectId(contest_id))

    active_filter = {
        "contest_id": {"$in": contest_id_objs},
        "user_id": {"$in": user_id_objs},
        "is_active_attempt": True,
        "submitted": {"$ne": True},
        "status": {"$in": ["IN_PROGRESS", "ACTIVE"]},
    }
    participant = db.contest_participants.find_one(active_filter, sort=[("attempt_number", -1)])
    if not participant:
        return jsonify({"error": "No active contest attempt could be locked.", "success": False}), 409

    # Calculate remaining contest time on the server. A resumed attempt counts
    # down from its saved lock snapshot, not from the original join time.
    contest = db.contests.find_one({"_id": ObjectId(contest_id)})
    duration_seconds = int((contest or {}).get("duration_minutes", 60)) * 60
    base_remaining = int(participant.get("locked_remaining_seconds", duration_seconds))
    timer_started_at = parse_to_utc_datetime(participant.get("resumed_at") or participant.get("joined_at"))
    if participant.get("resumed_at") is None:
        base_remaining = duration_seconds
    elapsed = max(0, int((now - timer_started_at).total_seconds())) if timer_started_at else 0
    remaining_seconds = max(0, base_remaining - elapsed)
    contest_end = parse_to_utc_datetime((contest or {}).get("end_time"))
    if contest_end:
        remaining_seconds = min(remaining_seconds, max(0, int((contest_end - now).total_seconds())))

    result = db.contest_participants.update_one(
        {"_id": participant["_id"], "status": {"$in": ["IN_PROGRESS", "ACTIVE"]}},
        {
            "$set": {
                "status": "LOCKED",
                "locked_at": now,
                "lock_timeout_at": lock_timeout,
                "resolution_window_active": True,
                "lock_reason": detail,
                "locked_remaining_seconds": max(0, remaining_seconds),
                "resume_state": resume_state,
                "requires_fullscreen_resume": False,
            },
            "$push": {"anti_cheat_logs": event_record}
        }
    )

    if result.modified_count != 1:
        return jsonify({"error": "No active contest attempt could be locked.", "success": False}), 409

    from services.notification_service import create_notification
    create_notification(
        user_id=user_id,
        title="Contest Locked",
        message=f"Your contest attempt has been locked: {detail}. Please contact the administrator to restore access.",
        notif_type="anti-cheat"
    )
    admins = list(db.users.find({"role": "ADMIN"}))
    for admin in admins:
        create_notification(
            user_id=admin["_id"],
            title="Contest Locked — Student Needs Restore",
            message=f"Student {user.get('name')} ({user.get('student_id', '')}) has been locked from contest due to: {detail}. Use Restore Access to unlock.",
            notif_type="anti-cheat"
        )

    return jsonify({
        "success": True,
        "message": "Contest attempt locked. Please contact the administrator to restore access.",
        "is_locked": True,
        "lock_reason": detail,
        "lock_timeout_minutes": 30
    }), 200

@contests_bp.route("/<contest_id>/event", methods=["POST"])
@student_required
def log_anti_cheat_event(contest_id):
    """Log tab switch, blur, copy/paste anti-cheat warning events."""
    data = request.get_json() or {}
    event_type = data.get("event_type", "tab_switch")
    event_detail = data.get("detail", "")

    db = get_db()
    user_id = request.current_user["_id"]

    event_record = {
        "event_type": event_type,
        "detail": event_detail,
        "timestamp": get_utc_now().isoformat()
    }

    db.contest_participants.update_one(
        {"contest_id": contest_id, "user_id": user_id},
        {"$push": {"anti_cheat_logs": event_record}}
    )

    return jsonify({"success": True, "logged": True}), 200

@contests_bp.route("/<contest_id>/submit", methods=["POST"])
@student_required
def submit_contest(contest_id):
    """
    Final submission of contest (automatically when timer ends or manually by student).
    Server enforces end time validation.
    """
    db = get_db()
    if not ObjectId.is_valid(contest_id):
        return jsonify({"error": "Invalid contest ID", "success": False}), 400

    contest = db.contests.find_one({"_id": ObjectId(contest_id)})
    if not contest:
        return jsonify({"error": "Contest not found", "success": False}), 404

    now = get_utc_now()
    start = parse_to_utc_datetime(contest.get("start_time"))
    end = parse_to_utc_datetime(contest.get("end_time"))
    
    # Submissions not allowed before start
    if start and now < start:
        return jsonify({"error": "Contest has not started yet. Submissions are not accepted.", "success": False}), 403

    # Allow 60 seconds grace period for network delays / auto-submission flight
    if end and now > (end + timedelta(seconds=60)):
        return jsonify({"error": "Contest has already ended. Submissions are no longer accepted.", "success": False}), 403

    user = request.current_user
    user_id = user["_id"]
    data = request.get_json() or {}

    mcq_answers = data.get("mcq_answers", {})
    code_solutions = data.get("code_solutions", {}) # dict of problem_id -> {language, code}
    # Also support coding_submissions array
    coding_submissions = data.get("coding_submissions", [])
    if coding_submissions and isinstance(coding_submissions, list):
        for sub in coding_submissions:
            pid = str(sub.get("problem_id", ""))
            if pid:
                code_solutions[pid] = {
                    "language": sub.get("language", "python"),
                    "code": sub.get("code", "")
                }

    total_score = 0
    mcqs_correct = 0
    problems_solved = 0

    # 1. Evaluate MCQs
    user_id_objs = [str(user_id)]
    if ObjectId.is_valid(user_id):
        user_id_objs.append(ObjectId(user_id))
    contest_id_objs = [contest_id]
    if ObjectId.is_valid(contest_id):
        contest_id_objs.append(ObjectId(contest_id))

    participant = db.contest_participants.find_one({
        "contest_id": {"$in": contest_id_objs},
        "user_id": {"$in": user_id_objs},
        "is_active_attempt": True,
    }, sort=[("attempt_number", -1)])
    if not participant:
        return jsonify({"error": "Active contest attempt not found", "success": False}), 404
    if participant.get("status") == "LOCKED":
        return jsonify({"error": "Locked attempts cannot be submitted.", "is_locked": True, "success": False}), 423
    if participant.get("auto_terminated") or participant.get("status") == "AUTO_TERMINATED":
        return jsonify({"error": "Terminated attempts cannot be submitted.", "is_terminated": True, "success": False}), 403
    assigned_mcq_ids = participant.get("assigned_mcq_ids") if participant else get_or_assign_student_mcqs(db, contest, user_id, user.get("student_id"), now)
    
    if mcq_answers:
        mcq_ids_eval = [ObjectId(mid) for mid in assigned_mcq_ids if ObjectId.is_valid(mid)]
        mcq_docs = list(db.mcqs.find({"_id": {"$in": mcq_ids_eval}}))
        for m in mcq_docs:
            mid_str = str(m["_id"])
            if str(mcq_answers.get(mid_str, "")).strip().lower() == str(m.get("correct_answer", "")).strip().lower():
                mcqs_correct += 1
                total_score += 10 # 10 points per MCQ

    # 2. Evaluate Code Solutions with Parallel Compiler Worker Pool
    coding_results = {}
    for pid, sol in code_solutions.items():
        lang = sol.get("language", "python")
        code = sol.get("code", "").strip()
        if not code:
            continue

        q = {"_id": ObjectId(pid)} if ObjectId.is_valid(pid) else {"slug": pid}
        prob = db.problems.find_one(q)
        if not prob:
            continue

        test_cases = prob.get("test_cases", [])
        if not test_cases:
            test_cases = list(db.test_cases.find({"problem_id": str(prob["_id"])}))
        if not test_cases:
            test_cases = [{"input": prob.get("sample_input", ""), "expected_output": prob.get("sample_output", "")}]

        # Execute test cases in parallel across worker pool
        eval_res = compiler_pool.evaluate_test_cases(lang, code, test_cases, timeout=5)
        passed = eval_res["passed"]
        total_tcs = eval_res["total"]
        status = eval_res["status"]

        if passed == total_tcs and total_tcs > 0:
            problems_solved += 1
            total_score += 50 # 50 points per solved problem
            coding_results[pid] = {
                "status": "Accepted",
                "passed": passed,
                "total": total_tcs,
                "time_ms": eval_res["total_time_ms"]
            }
        else:
            # Partial scoring
            partial_points = int((passed / total_tcs) * 50) if total_tcs > 0 else 0
            total_score += partial_points
            coding_results[pid] = {
                "status": status if status != "Accepted" else "Partial/Wrong",
                "passed": passed,
                "total": total_tcs,
                "time_ms": eval_res["total_time_ms"]
            }

    mcq_score = mcqs_correct * 10
    coding_score = max(total_score - mcq_score, 0)
    total_contest_mcqs = len(assigned_mcq_ids)
    total_contest_problems = len(contest.get("problem_ids", []))

    # Invalidate leaderboard cache for this contest
    cache.delete(f"contest:{contest_id}:leaderboard")

    # Update participant record with full pre-aggregated metrics
    # Accept IN_PROGRESS, ACTIVE, and RETEST_READY (race between join and submit)
    # No upsert — participant must already exist
    db.contest_participants.update_one(
        {"_id": participant["_id"], "status": {"$in": ["IN_PROGRESS", "ACTIVE", "RETEST_READY"]}},
        {
            "$set": {
                "score": total_score,
                "mcq_score": mcq_score,
                "coding_score": coding_score,
                "problems_solved": problems_solved,
                "total_problems": total_contest_problems,
                "mcqs_correct": mcqs_correct,
                "total_mcqs": total_contest_mcqs,
                "mcq_answers": mcq_answers,
                "code_solutions": code_solutions,
                "coding_results": coding_results,
                "submitted": True,
                "submitted_at": get_utc_now(),
                "status": "SUBMITTED",
                "auto_terminated": False,
                "resolution_window_active": False,
                "requires_fullscreen_resume": False,
            }
        }
    )

    return jsonify({
        "success": True,
        "message": "Contest submitted successfully",
        "score": total_score,
        "mcq_score": mcq_score,
        "coding_score": coding_score,
        "problems_solved": problems_solved,
        "mcqs_correct": mcqs_correct,
        "coding_results": coding_results,
        "result": {
            "total_score": total_score,
            "mcq_score": mcq_score,
            "coding_score": coding_score,
            "problems_solved": problems_solved,
            "mcqs_correct": mcqs_correct,
            "coding_results": coding_results
        }
    }), 200

@contests_bp.route("/<contest_id>/my-report", methods=["GET"])
@student_required
def get_student_contest_report(contest_id):
    """
    Retrieve personal contest report for the authenticated student only.
    Access Control: Only the student's own performance is returned.
    No export/download capability is provided.
    """
    db = get_db()
    if not ObjectId.is_valid(contest_id):
        return jsonify({"error": "Invalid contest ID", "success": False}), 400

    contest = db.contests.find_one({"_id": ObjectId(contest_id)})
    if not contest:
        return jsonify({"error": "Contest not found", "success": False}), 404

    user = request.current_user
    user_id = user["_id"]

    user_id_objs = [str(user_id)]
    if ObjectId.is_valid(user_id):
        user_id_objs.append(ObjectId(user_id))
    contest_id_objs = [contest_id]
    if ObjectId.is_valid(contest_id):
        contest_id_objs.append(ObjectId(contest_id))

    # Prefer latest submitted attempt; fall back to highest attempt_number
    participant = db.contest_participants.find_one({
        "contest_id": {"$in": contest_id_objs},
        "user_id": {"$in": user_id_objs},
        "submitted": True
    }, sort=[("attempt_number", -1)])
    if not participant:
        participant = db.contest_participants.find_one({
            "contest_id": {"$in": contest_id_objs},
            "user_id": {"$in": user_id_objs}
        }, sort=[("attempt_number", -1)])
    if not participant:
        return jsonify({
            "error": "No participation or submission record found for this contest.",
            "success": False
        }), 404

    # Calculate student rank among all participants
    all_participants = list(db.contest_participants.find({"contest_id": contest_id}).sort([
        ("score", -1),
        ("submitted_at", 1)
    ]))
    student_rank = 1
    for idx, p in enumerate(all_participants, 1):
        if str(p.get("user_id")) == str(user_id):
            student_rank = idx
            break

    # Fetch contest MCQs
    assigned_mcq_ids = participant.get("assigned_mcq_ids")
    if not assigned_mcq_ids:
        assigned_mcq_ids = get_or_assign_student_mcqs(db, contest, user_id, user.get("student_id"), get_utc_now())
    
    valid_mcq_ids = [ObjectId(mid) for mid in assigned_mcq_ids if ObjectId.is_valid(str(mid))]
    mcq_docs_list = list(db.mcqs.find({"_id": {"$in": valid_mcq_ids}}))
    mcq_map = {str(m["_id"]): m for m in mcq_docs_list}
    mcq_docs = [mcq_map[mid] for mid in assigned_mcq_ids if mid in mcq_map]

    saved_answers = participant.get("mcq_answers", {})
    
    mcq_breakdowns = []
    mcqs_correct_count = 0
    for idx, m in enumerate(mcq_docs, 1):
        mid_str = str(m["_id"])
        selected = saved_answers.get(mid_str)
        correct = str(m.get("correct_answer", "")).strip()
        is_correct = bool(selected and str(selected).strip().lower() == correct.lower())
        if is_correct:
            mcqs_correct_count += 1
        
        mcq_breakdowns.append({
            "id": mid_str,
            "question_number": idx,
            "title": m.get("title", f"Question {idx}"),
            "question": m.get("question", ""),
            "options": m.get("options", []),
            "selected_option": selected or "Not Answered",
            "correct_option": correct,
            "is_correct": is_correct,
            "explanation": m.get("explanation", ""),
            "marks_obtained": 10 if is_correct else 0,
            "total_marks": 10
        })

    # Fetch contest Problems
    prob_ids = contest.get("problem_ids", [])
    problems = []
    for pid in prob_ids:
        if ObjectId.is_valid(str(pid)):
            p_doc = db.problems.find_one({"_id": ObjectId(str(pid))})
            if p_doc: problems.append(p_doc)
        else:
            p_doc = db.problems.find_one({"id": pid})
            if p_doc: problems.append(p_doc)

    coding_results = participant.get("coding_results", {})
    code_solutions = participant.get("code_solutions", {})
    problem_breakdowns = []
    total_passed_tc = 0
    total_contest_tc = 0

    for idx, prob in enumerate(problems, 1):
        p_id = str(prob["_id"])
        res = coding_results.get(p_id, {})
        sol = code_solutions.get(p_id, {})
        tcs = prob.get("test_cases", [])
        total_tcs = len(tcs) or 4
        passed_tcs = res.get("passed", total_tcs if res.get("status") == "Accepted" else 0)
        total_passed_tc += passed_tcs
        total_contest_tc += total_tcs

        status = res.get("status", "Accepted" if participant.get("problems_solved", 0) >= idx else "Not Attempted")
        problem_breakdowns.append({
            "problem_id": p_id,
            "problem_number": idx,
            "title": prob.get("title", f"Problem {idx}"),
            "difficulty": prob.get("difficulty", "Medium"),
            "topic": prob.get("topic", "Algorithms"),
            "status": status,
            "passed_test_cases": passed_tcs,
            "total_test_cases": total_tcs,
            "language": sol.get("language", "python"),
            "code": sol.get("code", "")
        })

    total_mcqs = len(mcq_docs) or len(contest.get("mcq_ids", []))
    total_problems = len(problems) or len(prob_ids)
    mcq_score = float(participant.get("mcq_score", mcqs_correct_count * 10))
    coding_score = float(participant.get("coding_score", max(float(participant.get("score", 0)) - mcq_score, 0.0)))
    overall_score = float(participant.get("score", mcq_score + coding_score))
    
    # Calculate time taken
    joined_at = participant.get("joined_at")
    submitted_at = participant.get("submitted_at")
    duration_min = contest.get("duration_minutes", 60)
    duration_sec = duration_min * 60
    joined_at_utc = parse_to_utc_datetime(joined_at)
    submitted_at_utc = parse_to_utc_datetime(submitted_at)
    terminated_at_utc = parse_to_utc_datetime(participant.get("terminated_at"))
    if joined_at_utc:
        if submitted_at_utc:
            end_time_calc = submitted_at_utc
        elif terminated_at_utc:
            end_time_calc = terminated_at_utc
        else:
            end_time_calc = get_utc_now()
        time_taken_sec = max(int((end_time_calc - joined_at_utc).total_seconds()), 60)
        time_taken_sec = min(time_taken_sec, duration_sec)
    else:
        time_taken_sec = min(duration_sec, 600)
    mins = time_taken_sec // 60
    secs = time_taken_sec % 60
    time_taken_formatted = f"{mins}m {secs:02d}s"

    auto_terminated = bool(participant.get("auto_terminated") or participant.get("status") == "AUTO_TERMINATED")

    # Retest metadata
    attempt_number = participant.get("attempt_number", 1)
    is_retest = attempt_number > 1
    original_attempt_info = None
    if is_retest and participant.get("original_attempt_id"):
        orig = db.contest_participants.find_one({"_id": participant["original_attempt_id"]})
        if orig:
            original_attempt_info = {
                "attempt_number": orig.get("attempt_number", 1),
                "score": orig.get("score", 0),
                "mcq_score": float(orig.get("mcq_score", 0)),
                "coding_score": float(orig.get("coding_score", 0)),
                "status": orig.get("status", "LOCKED"),
                "locked_at": format_utc_iso(parse_to_utc_datetime(orig.get("locked_at"))) if orig.get("locked_at") else None
            }

    return jsonify({
        "success": True,
        "contest": {
            "id": str(contest["_id"]),
            "title": contest.get("title"),
            "description": contest.get("description", ""),
            "duration_minutes": contest.get("duration_minutes", 60),
            "start_time": format_utc_iso(parse_to_utc_datetime(contest.get("start_time"))),
            "end_time": format_utc_iso(parse_to_utc_datetime(contest.get("end_time"))),
            "total_mcqs": total_mcqs,
            "total_problems": total_problems
        },
        "student": {
            "name": user.get("name"),
            "student_id": user.get("student_id"),
            "department": user.get("department", "CSE")
        },
        "overall": {
            "overall_score": overall_score,
            "mcq_score": mcq_score,
            "coding_score": coding_score,
            "rank": student_rank,
            "total_candidates": len(all_participants),
            "time_taken": time_taken_formatted,
            "time_taken_seconds": time_taken_sec,
            "status": "COMPLETED" if not auto_terminated else "AUTO_TERMINATED",
            "submitted_at": format_utc_iso(submitted_at) if submitted_at else None,
            "attempt_number": attempt_number,
            "is_retest": is_retest
        },
        "mcq": {
            "mcq_score": mcq_score,
            "mcqs_correct": mcqs_correct_count,
            "total_mcqs": total_mcqs,
            "accuracy_percentage": round((mcqs_correct_count / max(total_mcqs, 1)) * 100, 1) if total_mcqs > 0 else 0.0,
            "breakdowns": mcq_breakdowns
        },
        "coding": {
            "coding_score": coding_score,
            "problems_solved": participant.get("problems_solved", sum(1 for p in problem_breakdowns if p["status"] == "Accepted")),
            "total_problems": total_problems,
            "passed_test_cases": total_passed_tc,
            "total_test_cases": total_contest_tc or (total_problems * 4),
            "coding_percentage": round((total_passed_tc / max(total_contest_tc or (total_problems * 4), 1)) * 100, 1) if total_problems > 0 else 0.0,
            "breakdowns": problem_breakdowns
        },
        "anti_cheat": {
            "status": "AUTO_TERMINATED" if auto_terminated else ("FLAGGED" if participant.get("anti_cheat_logs") else "CLEAN"),
            "auto_terminated": auto_terminated,
            "termination_reason": participant.get("termination_reason", ""),
            "flags_count": len(participant.get("anti_cheat_logs", []))
        },
        "original_attempt": original_attempt_info
    }), 200

@contests_bp.route("/<contest_id>/leaderboard", methods=["GET"])
def get_contest_leaderboard(contest_id):
    """Retrieve contest leaderboard sorted by score and submission time with caching.
    Deduplicates per student: shows only the latest/best attempt per student."""
    db = get_db()
    if not ObjectId.is_valid(contest_id):
        return jsonify({"error": "Invalid contest ID", "success": False}), 400

    cache_key = f"contest:{contest_id}:leaderboard"
    cached_leaderboard = cache.get(cache_key)
    if cached_leaderboard is not None:
        return jsonify({
            "success": True,
            "leaderboard": cached_leaderboard,
            "total_participants": len(cached_leaderboard)
        }), 200

    # Fetch ALL attempts, then deduplicate per student
    participants_cursor = db.contest_participants.find({"contest_id": contest_id}).sort([
        ("attempt_number", -1),
        ("score", -1),
        ("submitted_at", 1)
    ])

    # Keep only the best attempt per student:
    # Priority: submitted retest > submitted original > active retest > active original
    seen_students = {}
    for p in participants_cursor:
        sid = str(p.get("user_id", p.get("student_id", "")))
        if not sid:
            continue
        existing = seen_students.get(sid)
        if existing is None:
            seen_students[sid] = p
        else:
            # Prefer submitted over non-submitted
            p_submitted = bool(p.get("submitted"))
            e_submitted = bool(existing.get("submitted"))
            if p_submitted and not e_submitted:
                seen_students[sid] = p
            elif p_submitted == e_submitted and p.get("score", 0) > existing.get("score", 0):
                seen_students[sid] = p

    # Sort by score desc, then submission time asc
    best_attempts = sorted(
        seen_students.values(),
        key=lambda x: (-x.get("score", 0), x.get("submitted_at") or datetime.max.replace(tzinfo=timezone.utc))
    )

    leaderboard = []
    rank = 1
    for p in best_attempts:
        attempt_num = p.get("attempt_number", 1)
        leaderboard.append({
            "rank": rank,
            "student_name": p.get("student_name", "Student"),
            "student_id": p.get("student_id", "N/A"),
            "department": p.get("department", "CSE"),
            "score": p.get("score", 0),
            "problems_solved": p.get("problems_solved", 0),
            "mcqs_correct": p.get("mcqs_correct", 0),
            "submitted": p.get("submitted", False),
            "tab_switches": len(p.get("anti_cheat_logs", [])),
            "attempt_number": attempt_num,
            "is_retest": attempt_num > 1
        })
        rank += 1

    cache.set(cache_key, leaderboard, ttl=5)

    return jsonify({
        "success": True,
        "leaderboard": leaderboard,
        "total_participants": len(leaderboard)
    }), 200

@contests_bp.route("/leaderboard/global", methods=["GET"])
def get_global_leaderboard():
    """Retrieve global platform leaderboard based on problems solved & contest points."""
    db = get_db()
    
    # Aggregate total solved problems per student
    pipeline = [
        {"$match": {"status": "Accepted"}},
        {"$group": {"_id": {"user_id": "$user_id", "problem_id": "$problem_id"}, "student_name": {"$first": "$student_name"}, "student_id": {"$first": "$student_id"}}},
        {"$group": {"_id": "$_id.user_id", "problems_solved": {"$sum": 1}, "student_name": {"$first": "$student_name"}, "student_id": {"$first": "$student_id"}}},
        {"$sort": {"problems_solved": -1}},
        {"$limit": 50}
    ]
    
    results = list(db.submissions.aggregate(pipeline))
    leaderboard = []
    rank = 1

    for r in results:
        uid = r["_id"]
        uid_objs = [str(uid)]
        if ObjectId.is_valid(uid):
            uid_objs.append(ObjectId(uid))
        # Fetch contest score
        contest_parts = list(db.contest_participants.find({"user_id": {"$in": uid_objs}}))
        contest_score = sum([cp.get("score", 0) for cp in contest_parts])
        total_score = (r.get("problems_solved", 0) * 10) + contest_score

        leaderboard.append({
            "rank": rank,
            "student_name": r.get("student_name", "Student"),
            "student_id": r.get("student_id", "N/A"),
            "problems_solved": r.get("problems_solved", 0),
            "contest_score": contest_score,
            "total_score": total_score
        })
        rank += 1

    # Re-sort by total score
    leaderboard.sort(key=lambda x: x["total_score"], reverse=True)
    for idx, item in enumerate(leaderboard):
        item["rank"] = idx + 1

    return jsonify({
        "success": True,
        "leaderboard": leaderboard
    }), 200
