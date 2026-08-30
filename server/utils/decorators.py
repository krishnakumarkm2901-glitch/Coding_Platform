from functools import wraps
from flask import request, jsonify
from utils.security import decode_token
from models.db import get_db
from bson import ObjectId
from services.cache_service import cache
import logging

logger = logging.getLogger(__name__)

def _get_cached_user(user_id_str):
    if not user_id_str:
        return None
        
    cache_key = f"auth:user:{str(user_id_str)}"
    cached = cache.get(cache_key)
    if cached and isinstance(cached, dict):
        return cached

    db = get_db()
    if db is None:
        return None

    query_list = [{"id": str(user_id_str)}, {"student_id": str(user_id_str)}, {"email": str(user_id_str).lower()}]
    if ObjectId.is_valid(str(user_id_str)):
        query_list.insert(0, {"_id": ObjectId(str(user_id_str))})
    else:
        query_list.insert(0, {"_id": str(user_id_str)})

    try:
        user = db.users.find_one({"$or": query_list})
        if not user:
            return None
        user["_id"] = str(user.get("_id") or user.get("id"))
        user.pop("password", None)
        
        # Cache active user for 60 seconds
        cache.set(cache_key, user, ttl=60)
        return user
    except Exception as e:
        logger.warning(f"Error looking up user in database: {e}")
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Authorization token is missing", "success": False}), 401
        
        parts = auth_header.split(" ")
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"error": "Invalid token format. Format: Bearer <token>", "success": False}), 401
        
        token = parts[1]
        payload = decode_token(token)
        if not payload:
            return jsonify({"error": "Invalid or expired token", "success": False}), 401
        
        try:
            user = _get_cached_user(payload.get("user_id"))
            if not user:
                user = {
                    "_id": str(payload.get("user_id", "")),
                    "role": payload.get("role", "STUDENT"),
                    "student_id": payload.get("student_id", ""),
                    "email": payload.get("email", ""),
                    "name": payload.get("name", "User")
                }
            if user.get("status") == "disabled":
                return jsonify({"error": "User account is disabled", "success": False}), 403
            request.current_user = user
        except Exception as e:
            logger.exception("Token verification error: %s", e)
            return jsonify({"error": "User authentication failed", "success": False}), 401
        
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Authorization token is missing", "success": False}), 401
        
        parts = auth_header.split(" ")
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"error": "Invalid token format", "success": False}), 401
        
        payload = decode_token(parts[1])
        if not payload or payload.get("role") != "ADMIN":
            return jsonify({"error": "Admin access required", "success": False}), 403
        
        try:
            user = _get_cached_user(payload.get("user_id"))
            if not user:
                user = {
                    "_id": str(payload.get("user_id", "")),
                    "role": "ADMIN",
                    "email": payload.get("email", ""),
                    "name": payload.get("name", "Administrator")
                }
            if user.get("role") != "ADMIN" or user.get("status") == "disabled":
                return jsonify({"error": "Unauthorized admin access", "success": False}), 403
            request.current_user = user
        except Exception as e:
            logger.exception("Admin verification error: %s", e)
            return jsonify({"error": "Authentication failed", "success": False}), 401
        
        return f(*args, **kwargs)
    return decorated

def student_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Authorization token is missing", "success": False}), 401
        
        parts = auth_header.split(" ")
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"error": "Invalid token format", "success": False}), 401
        
        payload = decode_token(parts[1])
        if not payload or payload.get("role") != "STUDENT":
            return jsonify({"error": "Student access required", "success": False}), 403
        
        try:
            user = _get_cached_user(payload.get("user_id"))
            if not user:
                user = {
                    "_id": str(payload.get("user_id", "")),
                    "role": "STUDENT",
                    "student_id": payload.get("student_id", ""),
                    "email": payload.get("email", ""),
                    "name": payload.get("name", "Student")
                }
            if user.get("role") != "STUDENT" or user.get("status") == "disabled":
                return jsonify({"error": "Student account is inactive or not found", "success": False}), 403
            request.current_user = user
        except Exception as e:
            logger.exception("Student verification error: %s", e)
            return jsonify({"error": "Authentication failed", "success": False}), 401
        
        return f(*args, **kwargs)
    return decorated
