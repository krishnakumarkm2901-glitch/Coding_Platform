from flask import Blueprint, request, jsonify
from models.db import get_db
from utils.security import check_password, hash_password, generate_token
from utils.decorators import token_required
from utils.rate_limiter import rate_limit
from bson import ObjectId
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods=["POST"])
@rate_limit(max_requests=10, window_seconds=300)
def student_login():
    """Student login using student_id / register number and password."""
    data = request.get_json() or {}
    student_id = (data.get("student_id") or data.get("register_number") or "").strip().upper()
    password = data.get("password", "").strip()

    if not student_id or not password:
        return jsonify({"error": "Student ID and password are required", "success": False}), 400

    try:
        db = get_db()
        if db is None:
            raise RuntimeError("Database is not initialized")
        user = db.users.find_one({
            "$or": [
                {"student_id": student_id},
                {"register_number": student_id},
                {"email": student_id.lower()}
            ],
            "role": "STUDENT"
        })
    except Exception:
        logger.exception("Student login database lookup failed")
        return jsonify({
            "error": "Login service is temporarily unavailable. Please try again.",
            "success": False
        }), 503

    if not user:
        return jsonify({"error": "Invalid student ID or password", "success": False}), 401

    if user.get("status") == "disabled":
        return jsonify({"error": "Your student account has been disabled. Please contact the administrator.", "success": False}), 403

    if not check_password(password, user.get("password", "")):
        return jsonify({"error": "Invalid student ID or password", "success": False}), 401

    token = generate_token(user)
    
    # Update last login
    try:
        db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.now(timezone.utc)}}
        )
    except Exception:
        # Login remains valid if this non-essential audit update fails.
        logger.exception("Could not update last_login for student %s", student_id)

    user_info = {
        "id": str(user["_id"]),
        "student_id": user.get("student_id", ""),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "department": user.get("department", ""),
        "year": user.get("year", ""),
        "role": "STUDENT"
    }

    return jsonify({
        "success": True,
        "message": "Login successful",
        "token": token,
        "user": user_info
    }), 200

@auth_bp.route("/admin/login", methods=["POST"])
@rate_limit(max_requests=10, window_seconds=300)
def admin_login():
    """Admin login using email or username and password."""
    data = request.get_json() or {}
    login_id = (data.get("email") or data.get("username") or "").strip().lower()
    password = data.get("password", "").strip()

    if not login_id or not password:
        return jsonify({"error": "Email/Username and password are required", "success": False}), 400

    db = get_db()
    user = db.users.find_one({
        "$or": [
            {"email": login_id},
            {"username": login_id}
        ],
        "role": "ADMIN"
    })

    if not user:
        return jsonify({"error": "Invalid admin credentials", "success": False}), 401

    if user.get("status") == "disabled":
        return jsonify({"error": "Admin account is disabled", "success": False}), 403

    if not check_password(password, user.get("password", "")):
        return jsonify({"error": "Invalid admin credentials", "success": False}), 401

    token = generate_token(user)

    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )

    user_info = {
        "id": str(user["_id"]),
        "name": user.get("name", "Administrator"),
        "email": user.get("email", ""),
        "role": "ADMIN"
    }

    return jsonify({
        "success": True,
        "message": "Admin login successful",
        "token": token,
        "user": user_info
    }), 200

@auth_bp.route("/me", methods=["GET"])
def get_current_user():
    """Return authenticated user info or unauthenticated status."""
    from utils.security import decode_token
    from utils.decorators import _get_cached_user

    auth_header = request.headers.get("Authorization", "")
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return jsonify({"success": True, "authenticated": False, "user": None}), 200
        
    payload = decode_token(parts[1])
    if not payload or not payload.get("user_id"):
        return jsonify({"success": True, "authenticated": False, "user": None}), 200
        
    try:
        user = _get_cached_user(payload["user_id"])
    except Exception:
        logger.exception("Current-user lookup failed")
        return jsonify({"error": "Authentication service is temporarily unavailable", "success": False}), 503

    if not user:
        # Fallback to payload claims if JWT signature is valid
        user = {
            "id": str(payload.get("user_id", "")),
            "_id": str(payload.get("user_id", "")),
            "name": payload.get("name", "User"),
            "email": payload.get("email", ""),
            "role": payload.get("role", "STUDENT"),
            "student_id": payload.get("student_id", "")
        }

    if user.get("status") == "disabled":
        return jsonify({"success": True, "authenticated": False, "user": None}), 200

    user_info = {
        "id": str(user.get("_id") or user.get("id")),
        "_id": str(user.get("_id") or user.get("id")),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "STUDENT"),
        "student_id": user.get("student_id", ""),
        "department": user.get("department", ""),
        "year": user.get("year", "")
    }

    return jsonify({
        "success": True,
        "authenticated": True,
        "user": user_info
    }), 200

@auth_bp.route("/logout", methods=["POST"])
def logout():
    """JWT logout is completed client-side by discarding the token."""
    return jsonify({"success": True, "message": "Logout successful"}), 200

@auth_bp.route("/change-password", methods=["POST"])
@token_required
@rate_limit(max_requests=5, window_seconds=300, key_func=lambda: getattr(request, 'current_user', {}).get('_id', request.remote_addr))
def change_password():
    """Change current user's password."""
    data = request.get_json() or {}
    old_password = data.get("old_password", "").strip()
    new_password = data.get("new_password", "").strip()

    if not old_password or not new_password:
        return jsonify({"error": "Both old and new passwords are required", "success": False}), 400

    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters long", "success": False}), 400

    db = get_db()
    user = db.users.find_one({"_id": ObjectId(request.current_user["_id"])})
    if not user or not check_password(old_password, user.get("password", "")):
        return jsonify({"error": "Current password is incorrect", "success": False}), 400

    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": hash_password(new_password), "updated_at": datetime.now(timezone.utc)}}
    )

    return jsonify({"success": True, "message": "Password changed successfully"}), 200
