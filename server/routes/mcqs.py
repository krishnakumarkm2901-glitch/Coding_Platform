from flask import Blueprint, request, jsonify
from models.db import get_db
from utils.decorators import token_required
from bson import ObjectId
from datetime import datetime, timezone

mcqs_bp = Blueprint("mcqs", __name__)

@mcqs_bp.route("/topics", methods=["GET"])
def get_mcq_topics():
    """Return available MCQ topics."""
    db = get_db()
    topics = db.mcqs.distinct("topic")
    return jsonify({
        "success": True,
        "topics": sorted(topics) if topics else [
            "C Programming", "C++", "Python", "Java", "Data Structures", 
            "Algorithms", "DBMS", "SQL", "Operating Systems", "Computer Networks", 
            "OOP", "Computer Architecture", "Software Engineering", "Web Development", "AI/ML Basics"
        ]
    }), 200

@mcqs_bp.route("", methods=["GET"])
def get_mcqs():
    """Get MCQs by topic/difficulty without revealing correct answers upfront."""
    db = get_db()
    topic = request.args.get("topic", "").strip()
    difficulty = request.args.get("difficulty", "").strip()
    limit = int(request.args.get("limit", 15))

    query = {}
    if topic and topic.lower() != "all":
        query["topic"] = topic
    if difficulty and difficulty.lower() != "all":
        query["difficulty"] = difficulty.capitalize()

    mcqs_cursor = db.mcqs.find(query).limit(limit)
    mcqs_list = []
    
    for m in mcqs_cursor:
        mcqs_list.append({
            "id": str(m["_id"]),
            "question": m.get("question"),
            "options": m.get("options", []),
            "topic": m.get("topic"),
            "difficulty": m.get("difficulty", "Easy")
        })

    return jsonify({
        "success": True,
        "mcqs": mcqs_list,
        "count": len(mcqs_list)
    }), 200

@mcqs_bp.route("/submit", methods=["POST"])
@token_required
def submit_mcq_quiz():
    """
    Evaluate quiz answers.
    Expects payload:
    {
       "answers": {
           "<mcq_id>": "Option A" or index or text
       },
       "topic": "Data Structures" (optional)
    }
    Returns score, percentage, correct/wrong details with explanations.
    """
    data = request.get_json() or {}
    user_answers = data.get("answers", {}) # dict of id -> selected answer

    if not user_answers:
        return jsonify({"error": "No answers provided", "success": False}), 400

    db = get_db()
    user = request.current_user
    user_id = user["_id"]

    mcq_ids = [ObjectId(mid) for mid in user_answers.keys() if ObjectId.is_valid(mid)]
    mcq_docs = list(db.mcqs.find({"_id": {"$in": mcq_ids}}))

    correct_count = 0
    wrong_count = 0
    results_detail = []

    for mcq in mcq_docs:
        mid_str = str(mcq["_id"])
        selected_answer = str(user_answers.get(mid_str, "")).strip()
        correct_answer = str(mcq.get("correct_answer", "")).strip()
        
        is_correct = (selected_answer.lower() == correct_answer.lower())
        if is_correct:
            correct_count += 1
        else:
            wrong_count += 1

        results_detail.append({
            "id": mid_str,
            "question": mcq.get("question"),
            "options": mcq.get("options", []),
            "selected_answer": selected_answer,
            "correct_answer": correct_answer,
            "is_correct": is_correct,
            "explanation": mcq.get("explanation", "No explanation available."),
            "topic": mcq.get("topic"),
            "difficulty": mcq.get("difficulty")
        })

    total_questions = len(mcq_docs)
    percentage = round((correct_count / total_questions * 100), 2) if total_questions > 0 else 0.0

    # Record in results collection
    db.results.insert_one({
        "user_id": user_id,
        "student_id": user.get("student_id"),
        "type": "MCQ_QUIZ",
        "topic": data.get("topic", "General"),
        "total_questions": total_questions,
        "correct_answers": correct_count,
        "wrong_answers": wrong_count,
        "score": correct_count,
        "percentage": percentage,
        "created_at": datetime.now(timezone.utc)
    })

    return jsonify({
        "success": True,
        "total_questions": total_questions,
        "correct_count": correct_count,
        "wrong_count": wrong_count,
        "score": correct_count,
        "percentage": percentage,
        "results": results_detail
    }), 200
