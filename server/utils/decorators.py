from functools import wraps
from flask import request, jsonify
from utils.security import decode_token
from models.db import get_db
from bson import ObjectId

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
        
        db = get_db()
        try:
            user = db.users.find_one({"_id": ObjectId(payload["user_id"])})
            if not user or user.get("status") == "disabled":
                return jsonify({"error": "User account is disabled or does not exist", "success": False}), 403
            user["_id"] = str(user["_id"])
            if "password" in user:
                del user["password"]
            request.current_user = user
        except Exception:
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
        
        db = get_db()
        try:
            user = db.users.find_one({"_id": ObjectId(payload["user_id"])})
            if not user or user.get("role") != "ADMIN" or user.get("status") == "disabled":
                return jsonify({"error": "Unauthorized admin access", "success": False}), 403
            user["_id"] = str(user["_id"])
            if "password" in user:
                del user["password"]
            request.current_user = user
        except Exception:
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
        
        db = get_db()
        try:
            user = db.users.find_one({"_id": ObjectId(payload["user_id"])})
            if not user or user.get("role") != "STUDENT" or user.get("status") == "disabled":
                return jsonify({"error": "Student account is inactive or not found", "success": False}), 403
            user["_id"] = str(user["_id"])
            if "password" in user:
                del user["password"]
            request.current_user = user
        except Exception:
            return jsonify({"error": "Authentication failed", "success": False}), 401
        
        return f(*args, **kwargs)
    return decorated
