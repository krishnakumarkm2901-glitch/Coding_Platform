from flask import Blueprint, jsonify, request
from datetime import datetime, timezone
from bson import ObjectId
from models.db import get_db
from utils.decorators import token_required

notifications_bp = Blueprint("notifications_bp", __name__)

@notifications_bp.route("", methods=["GET"])
@token_required
def get_user_notifications():
    """Retrieve all notifications for the current logged-in user."""
    db = get_db()
    user = request.current_user
    user_id = str(user["_id"])
    
    # Fetch notifications belonging to this user
    cursor = db.notifications.find({"user_id": user_id}).sort("created_at", -1).limit(100)
    
    notifications_list = []
    unread_count = 0
    for n in cursor:
        is_read = n.get("is_read", False)
        if not is_read:
            unread_count += 1
            
        notifications_list.append({
            "id": str(n["_id"]),
            "title": n.get("title", "Notification"),
            "message": n.get("message", ""),
            "type": n.get("type", "system"),
            "is_read": is_read,
            "created_by": n.get("created_by", "System"),
            "created_at": n.get("created_at").isoformat() if isinstance(n.get("created_at"), datetime) else str(n.get("created_at"))
        })
        
    return jsonify({
        "success": True,
        "notifications": notifications_list,
        "unread_count": unread_count
    }), 200

@notifications_bp.route("/mark-read", methods=["PUT"])
@token_required
def mark_all_as_read():
    """Mark all notifications as read for the current user."""
    db = get_db()
    user = request.current_user
    user_id = str(user["_id"])
    
    db.notifications.update_many({"user_id": user_id, "is_read": False}, {"$set": {"is_read": True}})
    
    return jsonify({
        "success": True,
        "message": "All notifications marked as read"
    }), 200

@notifications_bp.route("/<notif_id>/read", methods=["PUT"])
@token_required
def mark_as_read(notif_id):
    """Mark a specific notification as read."""
    db = get_db()
    user = request.current_user
    user_id = str(user["_id"])
    
    try:
        res = db.notifications.update_one(
            {"_id": ObjectId(notif_id), "user_id": user_id},
            {"$set": {"is_read": True}}
        )
        if res.matched_count > 0:
            return jsonify({"success": True, "message": "Notification marked as read"}), 200
        return jsonify({"success": False, "error": "Notification not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@notifications_bp.route("/bulk-delete", methods=["POST"])
@token_required
def bulk_delete_notifications():
    """Bulk delete selected notifications for the current user."""
    db = get_db()
    user = request.current_user
    user_id = str(user["_id"])
    data = request.get_json() or {}
    ids = data.get("ids", [])
    
    if not ids:
        return jsonify({"success": False, "error": "No notification IDs provided"}), 400
        
    object_ids = []
    for i in ids:
        try:
            object_ids.append(ObjectId(i))
        except Exception:
            pass
            
    res = db.notifications.delete_many({"_id": {"$in": object_ids}, "user_id": user_id})
    return jsonify({
        "success": True, 
        "message": f"{res.deleted_count} notification{'s' if res.deleted_count != 1 else ''} deleted successfully",
        "deleted_count": res.deleted_count
    }), 200

@notifications_bp.route("/delete-all", methods=["POST"])
@token_required
def delete_all_notifications():
    """Delete all notifications for the current user."""
    db = get_db()
    user = request.current_user
    user_id = str(user["_id"])
    
    res = db.notifications.delete_many({"user_id": user_id})
    return jsonify({
        "success": True, 
        "message": "All notifications deleted successfully",
        "deleted_count": res.deleted_count
    }), 200

@notifications_bp.route("/<notif_id>", methods=["DELETE"])
@token_required
def delete_notification(notif_id):
    """Delete a specific notification."""
    db = get_db()
    user = request.current_user
    user_id = str(user["_id"])
    
    try:
        res = db.notifications.delete_one({"_id": ObjectId(notif_id), "user_id": user_id})
        if res.deleted_count > 0:
            return jsonify({"success": True, "message": "Notification deleted successfully"}), 200
        return jsonify({"success": False, "error": "Notification not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400
