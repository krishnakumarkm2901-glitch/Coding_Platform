from flask import Blueprint, jsonify, request
from models.db import get_db
from utils.decorators import student_required
from utils.time_utils import (
    get_utc_now,
    parse_to_utc_datetime,
    format_utc_iso,
    calculate_contest_status
)
from bson import ObjectId
from datetime import datetime, timezone, timedelta

students_bp = Blueprint("students", __name__)

@students_bp.route("/profile", methods=["GET"])
@student_required
def get_student_profile():
    """Return student profile with comprehensive analytics and stats."""
    db = get_db()
    user = request.current_user
    user_id = user["_id"]

    # Problem Counts
    total_problems = db.problems.count_documents({"is_active": {"$ne": False}})
    
    # Solved problems count (distinct problems with Accepted status)
    accepted_submissions = db.submissions.find({
        "user_id": user_id,
        "status": "Accepted"
    })
    solved_problem_ids = list(set([str(s.get("problem_id")) for s in accepted_submissions]))
    solved_count = len(solved_problem_ids)

    # Difficulty breakdown
    easy_total = db.problems.count_documents({"difficulty": "Easy", "is_active": {"$ne": False}})
    medium_total = db.problems.count_documents({"difficulty": "Medium", "is_active": {"$ne": False}})
    hard_total = db.problems.count_documents({"difficulty": "Hard", "is_active": {"$ne": False}})

    easy_solved = 0
    medium_solved = 0
    hard_solved = 0

    if solved_problem_ids:
        solved_obj_ids = [ObjectId(pid) for pid in solved_problem_ids if ObjectId.is_valid(pid)]
        solved_problems = list(db.problems.find({"_id": {"$in": solved_obj_ids}}))
        for p in solved_problems:
            diff = p.get("difficulty", "Easy").capitalize()
            if diff == "Easy":
                easy_solved += 1
            elif diff == "Medium":
                medium_solved += 1
            elif diff == "Hard":
                hard_solved += 1

    # Contests
    total_contests = db.contests.count_documents({"is_published": True})
    user_participations = list(db.contest_participants.find({"user_id": user_id}))
    joined_contests_count = len(user_participations)
    total_contest_score = sum([p.get("score", 0) for p in user_participations])

    # Recent submissions (last 10)
    recent_submissions_cursor = db.submissions.find({"user_id": user_id}).sort("created_at", -1).limit(10)
    recent_submissions = []
    for sub in recent_submissions_cursor:
        recent_submissions.append({
            "id": str(sub["_id"]),
            "problem_id": str(sub.get("problem_id")),
            "problem_title": sub.get("problem_title", "Untitled Problem"),
            "language": sub.get("language"),
            "status": sub.get("status"),
            "runtime": sub.get("runtime", 0),
            "memory": sub.get("memory", 0),
            "created_at": sub.get("created_at").isoformat() if isinstance(sub.get("created_at"), datetime) else str(sub.get("created_at"))
        })

    # Recent/Upcoming Contests
    contests_cursor = db.contests.find({"is_published": True}).sort("start_time", -1).limit(5)
    recent_contests = []
    now = get_utc_now()
    for c in contests_cursor:
        c_id = str(c["_id"])
        # Check if student joined
        participant = db.contest_participants.find_one({"contest_id": c_id, "user_id": user_id})
        
        start = parse_to_utc_datetime(c.get("start_time"))
        end = parse_to_utc_datetime(c.get("end_time"))
        status = calculate_contest_status(start, end, now)

        recent_contests.append({
            "id": c_id,
            "title": c.get("title"),
            "description": c.get("description", ""),
            "start_time": format_utc_iso(start),
            "end_time": format_utc_iso(end),
            "duration_minutes": c.get("duration_minutes", 60),
            "status": status,
            "has_joined": bool(participant),
            "score": participant.get("score", 0) if participant else 0
        })

    # Streak calculation
    # Fetch distinct dates of submissions
    all_user_subs = db.submissions.find({"user_id": user_id}, {"created_at": 1}).sort("created_at", -1)
    submission_dates = set()
    for s in all_user_subs:
        dt = s.get("created_at")
        if isinstance(dt, datetime):
            submission_dates.add(dt.date())
        elif isinstance(dt, str):
            try:
                submission_dates.add(datetime.fromisoformat(dt).date())
            except Exception:
                pass

    current_streak = 0
    check_date = datetime.now(timezone.utc).date()
    # Check today or yesterday
    if check_date in submission_dates:
        while check_date in submission_dates:
            current_streak += 1
            check_date -= timedelta(days=1)
    elif (check_date - timedelta(days=1)) in submission_dates:
        check_date -= timedelta(days=1)
        while check_date in submission_dates:
            current_streak += 1
            check_date -= timedelta(days=1)

    return jsonify({
        "success": True,
        "student": {
            "id": user_id,
            "name": user.get("name"),
            "student_id": user.get("student_id"),
            "email": user.get("email"),
            "department": user.get("department", "CSE"),
            "year": user.get("year", "3rd Year"),
            "avatar": user.get("avatar", "")
        },
        "stats": {
            "total_problems": total_problems,
            "solved_problems": solved_count,
            "easy": {"solved": easy_solved, "total": easy_total},
            "medium": {"solved": medium_solved, "total": medium_total},
            "hard": {"solved": hard_solved, "total": hard_total},
            "total_contests": total_contests,
            "joined_contests": joined_contests_count,
            "contest_score": total_contest_score,
            "current_streak": current_streak
        },
        "recent_submissions": recent_submissions,
        "recent_contests": recent_contests
    }), 200

@students_bp.route("/profile", methods=["PUT"])
@student_required
def update_student_profile():
    """Update student profile details."""
    db = get_db()
    user = request.current_user
    user_id = user["_id"]
    
    data = request.get_json() or {}
    
    update_data = {}
    if "name" in data:
        update_data["name"] = data["name"].strip()
    if "email" in data:
        update_data["email"] = data["email"].strip()
    if "department" in data:
        update_data["department"] = data["department"].strip()
    if "year" in data:
        update_data["year"] = data["year"].strip()
    if "avatar" in data:
        update_data["avatar"] = data["avatar"].strip()
        
    if not update_data:
        return jsonify({"success": False, "error": "No data provided to update"}), 400
        
    db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    
    from services.notification_service import create_notification
    create_notification(
        user_id=user_id,
        title="System Notification",
        message="Your student profile has been updated successfully.",
        notif_type="system"
    )
    
    updated_user = db.users.find_one({"_id": ObjectId(user_id)})
    
    return jsonify({
        "success": True,
        "message": "Profile updated successfully",
        "student": {
            "id": str(user_id),
            "name": updated_user.get("name"),
            "student_id": updated_user.get("student_id"),
            "email": updated_user.get("email"),
            "department": updated_user.get("department"),
            "year": updated_user.get("year"),
            "avatar": updated_user.get("avatar", ""),
            "role": updated_user.get("role", "STUDENT"),
            "status": updated_user.get("status", "active")
        }
    }), 200

@students_bp.route("/playground/run", methods=["POST"])
@student_required
def run_playground_code():
    """Run playground code using piston service, restricted to student users."""
    data = request.get_json() or {}
    language = data.get("language", "python").lower()
    code = data.get("code", "").strip()
    custom_input = data.get("custom_input", "")

    if not code:
        return jsonify({"error": "Code cannot be empty", "success": False}), 400

    # Execute code using the existing piston service
    from services.piston_service import execute_code
    result = execute_code(language, code, custom_input, timeout=8)

    return jsonify({
        "success": True,
        "status": result["status"],
        "output": result.get("output", ""),
        "error": result.get("error", ""),
        "stderr": result.get("stderr", result.get("error", "")),
        "error_type": result.get("error_type"),
        "execution_time": result.get("execution_time", 0.0)
    }), 200
