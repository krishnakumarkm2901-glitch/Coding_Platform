from datetime import datetime, timezone
from bson import ObjectId
from models.db import get_db

def create_notification(user_id, title, message, notif_type, created_by="System"):
    """
    Create a notification in the database for a specific user.
    """
    db = get_db()
    
    # Cast user_id to string for database consistency
    u_id_str = str(user_id) if user_id else None
    
    notification_doc = {
        "user_id": u_id_str,
        "title": title,
        "message": message,
        "type": notif_type.lower(), # contest, coding_problem, submission, leaderboard, achievement, daily_challenge, attendance, anti_cheat, system
        "is_read": False,
        "created_by": created_by,
        "created_at": datetime.now(timezone.utc)
    }
    
    db.notifications.insert_one(notification_doc)
    return notification_doc

def create_broadcast_notification(title, message, notif_type, created_by="Admin"):
    """
    Broadcast a notification to all students.
    """
    db = get_db()
    
    students = list(db.users.find({"role": "STUDENT"}))
    for st in students:
        create_notification(
            user_id=st["_id"],
            title=title,
            message=message,
            notif_type=notif_type,
            created_by=created_by
        )
