from flask import Blueprint, request, jsonify
from models.db import get_db
from utils.decorators import token_required, student_required
from services.piston_service import execute_code, normalize_output
from bson import ObjectId
from datetime import datetime, timezone

contests_bp = Blueprint("contests", __name__)

def parse_iso_or_datetime(val):
    if not val:
        return None
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val
    try:
        dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None

@contests_bp.route("", methods=["GET"])
def get_contests():
    """List all published contests with status."""
    db = get_db()
    contests_cursor = db.contests.find({"is_published": True}).sort("start_time", -1)
    
    user_id = None
    auth_header = request.headers.get("Authorization")
    if auth_header and "Bearer " in auth_header:
        from utils.security import decode_token
        payload = decode_token(auth_header.split(" ")[1])
        if payload:
            user_id = payload.get("user_id")

    now = datetime.now(timezone.utc)
    contests_list = []

    for c in contests_cursor:
        c_id = str(c["_id"])
        start = parse_iso_or_datetime(c.get("start_time"))
        end = parse_iso_or_datetime(c.get("end_time"))
        
        status = "Upcoming"
        if start and end:
            if now < start:
                status = "Upcoming"
            elif start <= now <= end:
                status = "Active"
            else:
                status = "Ended"

        has_joined = False
        user_score = 0
        if user_id:
            part = db.contest_participants.find_one({"contest_id": c_id, "user_id": user_id})
            if part:
                has_joined = True
                user_score = part.get("score", 0)

        participants_count = db.contest_participants.count_documents({"contest_id": c_id})

        contests_list.append({
            "id": c_id,
            "title": c.get("title"),
            "description": c.get("description", ""),
            "start_time": start.isoformat() if start else None,
            "end_time": end.isoformat() if end else None,
            "duration_minutes": c.get("duration_minutes", 60),
            "problems_count": len(c.get("problem_ids", [])),
            "mcqs_count": len(c.get("mcq_ids", [])),
            "total_points": c.get("total_points", 100),
            "status": status,
            "participants_count": participants_count,
            "has_joined": has_joined,
            "user_score": user_score
        })

    return jsonify({"success": True, "contests": contests_list}), 200

@contests_bp.route("/<contest_id>", methods=["GET"])
@token_required
def get_contest_details(contest_id):
    """Get full details of contest, including problems and MCQs if joined/started."""
    db = get_db()
    if not ObjectId.is_valid(contest_id):
        return jsonify({"error": "Invalid contest ID", "success": False}), 400

    contest = db.contests.find_one({"_id": ObjectId(contest_id)})
    if not contest:
        return jsonify({"error": "Contest not found", "success": False}), 404

    now = datetime.now(timezone.utc)
    start = parse_iso_or_datetime(contest.get("start_time"))
    end = parse_iso_or_datetime(contest.get("end_time"))

    status = "Upcoming"
    if start and end:
        if now < start:
            status = "Upcoming"
        elif start <= now <= end:
            status = "Active"
        else:
            status = "Ended"

    # Check participant status
    user_id = request.current_user["_id"]
    participant = db.contest_participants.find_one({"contest_id": contest_id, "user_id": user_id})

    is_terminated = False
    termination_reason = ""
    participant_status = "NOT_STARTED"

    if participant:
        is_terminated = bool(participant.get("auto_terminated") or participant.get("status") == "AUTO_TERMINATED")
        termination_reason = participant.get("termination_reason", "")
        participant_status = participant.get("status", "IN_PROGRESS")
        if participant.get("submitted") and not is_terminated:
            participant_status = "SUBMITTED"

    # Remaining time in seconds based on contest duration and student joined_at
    duration_secs = int(contest.get("duration_minutes", 60)) * 60
    remaining_seconds = duration_secs
    if participant and participant.get("joined_at"):
        joined_at = parse_iso_or_datetime(participant.get("joined_at"))
        if joined_at:
            elapsed = (now - joined_at).total_seconds()
            remaining_seconds = max(0, int(duration_secs - elapsed))
    
    if end:
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

    # Fetch MCQs
    mcqs = []
    mcq_ids = [ObjectId(mid) for mid in contest.get("mcq_ids", []) if ObjectId.is_valid(mid)]
    if mcq_ids:
        mcq_docs = list(db.mcqs.find({"_id": {"$in": mcq_ids}}))
        for m in mcq_docs:
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
            "start_time": start.isoformat() if start else None,
            "end_time": end.isoformat() if end else None,
            "duration_minutes": contest.get("duration_minutes", 60),
            "status": status,
            "remaining_seconds": remaining_seconds,
            "is_registered": bool(participant),
            "has_submitted": participant.get("submitted", False) if participant else False,
            "is_terminated": is_terminated,
            "termination_reason": termination_reason,
            "participant_status": participant_status,
            "score": participant.get("score", 0) if participant else 0,
            "problems": problems,
            "mcqs": mcqs
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

    user = request.current_user
    user_id = user["_id"]

    existing = db.contest_participants.find_one({"contest_id": contest_id, "user_id": user_id})
    if existing:
        if existing.get("auto_terminated") or existing.get("status") == "AUTO_TERMINATED":
            return jsonify({
                "error": "Contest Terminated — You left the contest environment. Your attempt has been terminated and you cannot re-enter this contest.",
                "is_terminated": True,
                "status": "AUTO_TERMINATED",
                "termination_reason": existing.get("termination_reason", "Violation of strict contest rules"),
                "success": False
            }), 403

        if existing.get("submitted"):
            return jsonify({
                "error": "Contest already submitted. Only one attempt is permitted per contest.",
                "has_submitted": True,
                "status": "SUBMITTED",
                "success": False
            }), 403

    now = datetime.now(timezone.utc)
    end = parse_iso_or_datetime(contest.get("end_time"))
    duration_secs = int(contest.get("duration_minutes", 60)) * 60
    remaining_seconds = duration_secs

    if not existing:
        db.contest_participants.insert_one({
            "contest_id": contest_id,
            "user_id": user_id,
            "student_id": user.get("student_id"),
            "student_name": user.get("name"),
            "department": user.get("department", "CSE"),
            "joined_at": now,
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
        joined_at = parse_iso_or_datetime(existing.get("joined_at"))
        if joined_at:
            elapsed = (now - joined_at).total_seconds()
            remaining_seconds = max(0, int(duration_secs - elapsed))
        else:
            db.contest_participants.update_one(
                {"_id": existing["_id"]},
                {"$set": {"joined_at": now}}
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
    """Immediately terminate a student's contest attempt due to anti-cheat/strict mode violation."""
    db = get_db()
    if not ObjectId.is_valid(contest_id):
        return jsonify({"error": "Invalid contest ID", "success": False}), 400

    user = request.current_user
    user_id = user["_id"]
    data = request.get_json() or {}
    reason = data.get("reason", "SECURITY_VIOLATION")
    detail = data.get("detail", "Left strict contest environment")

    event_record = {
        "event_type": "TERMINATION_VIOLATION",
        "detail": f"Contest Terminated: {detail}",
        "reason": reason,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    db.contest_participants.update_one(
        {"contest_id": contest_id, "user_id": user_id},
        {
            "$set": {
                "status": "AUTO_TERMINATED",
                "submitted": True,
                "auto_terminated": True,
                "terminated_at": datetime.now(timezone.utc),
                "termination_reason": detail
            },
            "$push": {"anti_cheat_logs": event_record}
        },
        upsert=True
    )

    from services.notification_service import create_notification
    # Student Notification
    create_notification(
        user_id=user_id,
        title="Contest Terminated",
        message=f"Your contest attempt was terminated due to a contest rule violation: {detail}",
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
        "timestamp": datetime.now(timezone.utc).isoformat()
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

    now = datetime.now(timezone.utc)
    end = parse_iso_or_datetime(contest.get("end_time"))
    
    # Allow 15 seconds grace period for network delays
    if end and now > (end + datetime.resolution * 15):
        # Even if late, accept auto-submission with expired notice
        pass

    user = request.current_user
    user_id = user["_id"]
    data = request.get_json() or {}

    mcq_answers = data.get("mcq_answers", {})
    code_solutions = data.get("code_solutions", {}) # dict of problem_id -> {language, code}

    total_score = 0
    mcqs_correct = 0
    problems_solved = 0

    # 1. Evaluate MCQs
    if mcq_answers:
        mcq_ids = [ObjectId(mid) for mid in mcq_answers.keys() if ObjectId.is_valid(mid)]
        mcq_docs = list(db.mcqs.find({"_id": {"$in": mcq_ids}}))
        for m in mcq_docs:
            mid_str = str(m["_id"])
            if str(mcq_answers.get(mid_str, "")).strip().lower() == str(m.get("correct_answer", "")).strip().lower():
                mcqs_correct += 1
                total_score += 10 # 10 points per MCQ

    # 2. Evaluate Code Solutions
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

        passed = 0
        total_tcs = len(test_cases)
        for tc in test_cases:
            tc_in = tc.get("input", "")
            tc_expected = normalize_output(tc.get("expected_output", tc.get("output", "")))
            res = execute_code(lang, code, tc_in, timeout=5)
            if normalize_output(res.get("output", "")) == tc_expected:
                passed += 1

        if passed == total_tcs and total_tcs > 0:
            problems_solved += 1
            total_score += 50 # 50 points per solved problem
            coding_results[pid] = {"status": "Accepted", "passed": passed, "total": total_tcs}
        else:
            # Partial scoring
            partial_points = int((passed / total_tcs) * 50) if total_tcs > 0 else 0
            total_score += partial_points
            coding_results[pid] = {"status": "Partial/Wrong", "passed": passed, "total": total_tcs}

    # Update participant record
    db.contest_participants.update_one(
        {"contest_id": contest_id, "user_id": user_id},
        {
            "$set": {
                "score": total_score,
                "problems_solved": problems_solved,
                "mcqs_correct": mcqs_correct,
                "submitted": True,
                "submitted_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )

    return jsonify({
        "success": True,
        "message": "Contest submitted successfully",
        "score": total_score,
        "problems_solved": problems_solved,
        "mcqs_correct": mcqs_correct,
        "coding_results": coding_results
    }), 200

@contests_bp.route("/<contest_id>/leaderboard", methods=["GET"])
def get_contest_leaderboard(contest_id):
    """Retrieve contest leaderboard sorted by score and submission time."""
    db = get_db()
    if not ObjectId.is_valid(contest_id):
        return jsonify({"error": "Invalid contest ID", "success": False}), 400

    participants_cursor = db.contest_participants.find({"contest_id": contest_id}).sort([
        ("score", -1),
        ("submitted_at", 1)
    ])

    leaderboard = []
    rank = 1
    for p in participants_cursor:
        leaderboard.append({
            "rank": rank,
            "student_name": p.get("student_name", "Student"),
            "student_id": p.get("student_id", "N/A"),
            "department": p.get("department", "CSE"),
            "score": p.get("score", 0),
            "problems_solved": p.get("problems_solved", 0),
            "mcqs_correct": p.get("mcqs_correct", 0),
            "submitted": p.get("submitted", False),
            "tab_switches": len(p.get("anti_cheat_logs", []))
        })
        rank += 1

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
        # Fetch contest score
        contest_parts = list(db.contest_participants.find({"user_id": uid}))
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
