from datetime import datetime, timezone, timedelta
import zoneinfo

from utils.time_utils import (
    parse_to_utc_datetime,
    format_utc_iso,
    calculate_contest_status,
    get_utc_now,
    IST,
    UTC
)
from app import create_app
from models.db import get_db

def test_time_utils_parsing_and_formatting():
    # 1. Naive IST string (as input by admin in datetime-local: 2026-08-17T18:25)
    naive_ist_str = "2026-08-17T18:25"
    dt_utc = parse_to_utc_datetime(naive_ist_str)
    assert dt_utc.tzinfo == UTC
    assert dt_utc.year == 2026 and dt_utc.month == 8 and dt_utc.day == 17
    assert dt_utc.hour == 12 and dt_utc.minute == 55 # 18:25 IST - 5h30m = 12:55 UTC

    # 2. ISO UTC string with Z
    iso_utc = format_utc_iso(dt_utc)
    assert iso_utc == "2026-08-17T12:55:00Z"

    # 3. Formatted to IST
    dt_ist = dt_utc.astimezone(IST)
    assert dt_ist.hour == 18 and dt_ist.minute == 25

    # 4. Status calculation tests
    now = get_utc_now()
    start_future = now + timedelta(minutes=10)
    end_future = now + timedelta(minutes=70)
    assert calculate_contest_status(start_future, end_future, now) == "Upcoming"

    start_past = now - timedelta(minutes=10)
    end_future2 = now + timedelta(minutes=50)
    assert calculate_contest_status(start_past, end_future2, now) == "Active"

    start_past2 = now - timedelta(minutes=70)
    end_past = now - timedelta(minutes=10)
    assert calculate_contest_status(start_past2, end_past, now) == "Past"
    print("[PASS] test_time_utils_parsing_and_formatting passed!")

def test_contest_api_and_guards():
    app = create_app()
    client = app.test_client()
    db = get_db()

    now = get_utc_now()

    # Create dummy student user
    db.users.delete_many({"email": "test_timing_stu@nit.edu"})
    db.users.insert_one({
        "name": "Timing Test Student",
        "email": "test_timing_stu@nit.edu",
        "student_id": "TEST_TIME_01",
        "role": "STUDENT",
        "department": "CSE"
    })
    stu = db.users.find_one({"email": "test_timing_stu@nit.edu"})
    stu_id = str(stu["_id"])

    from utils.security import generate_token
    stu_token = generate_token(stu)
    headers = {"Authorization": f"Bearer {stu_token}"}

    # 1. Test Upcoming Contest (start in 30 mins)
    c_upcoming_id = db.contests.insert_one({
        "title": "Automated Upcoming Contest",
        "start_time": now + timedelta(minutes=30),
        "end_time": now + timedelta(minutes=90),
        "duration_minutes": 60,
        "is_published": True,
        "created_at": now
    }).inserted_id

    # Try to join upcoming contest before start -> MUST BE BLOCKED (403)
    join_res = client.post(f"/api/contests/{c_upcoming_id}/join", headers=headers)
    assert join_res.status_code == 403
    assert join_res.json["status"] == "Upcoming"
    print("[PASS] Successfully blocked joining upcoming contest before start time")

    # 2. Test Past Contest (ended 30 mins ago)
    c_past_id = db.contests.insert_one({
        "title": "Automated Past Contest",
        "start_time": now - timedelta(minutes=90),
        "end_time": now - timedelta(minutes=30),
        "duration_minutes": 60,
        "is_published": True,
        "created_at": now
    }).inserted_id

    # Try to join past contest -> MUST BE BLOCKED (403)
    join_past_res = client.post(f"/api/contests/{c_past_id}/join", headers=headers)
    assert join_past_res.status_code == 403
    assert join_past_res.json["status"] == "Past"
    print("[PASS] Successfully blocked joining past contest after end time")

    # Try to submit to past contest -> MUST BE BLOCKED (403)
    sub_past_res = client.post(f"/api/contests/{c_past_id}/submit", headers=headers, json={"mcq_answers": {}})
    assert sub_past_res.status_code == 403
    print("[PASS] Successfully blocked submitting to past contest after end time")

    # 3. Test Active Contest (started 10 mins ago, ends in 50 mins)
    c_active_id = db.contests.insert_one({
        "title": "Automated Active Contest",
        "start_time": now - timedelta(minutes=10),
        "end_time": now + timedelta(minutes=50),
        "duration_minutes": 60,
        "is_published": True,
        "created_at": now
    }).inserted_id

    # Join active contest -> MUST SUCCEED (200)
    join_active_res = client.post(f"/api/contests/{c_active_id}/join", headers=headers)
    assert join_active_res.status_code == 200
    assert join_active_res.json["success"] is True
    assert join_active_res.json["status"] == "IN_PROGRESS"
    print("[PASS] Successfully joined active contest")

    # Submit to active contest -> MUST SUCCEED (200)
    sub_active_res = client.post(f"/api/contests/{c_active_id}/submit", headers=headers, json={"mcq_answers": {}})
    assert sub_active_res.status_code == 200
    assert sub_active_res.json["success"] is True
    print("[PASS] Successfully submitted to active contest")

    # Cleanup test records
    db.contests.delete_many({"_id": {"$in": [c_upcoming_id, c_past_id, c_active_id]}})
    db.contest_participants.delete_many({"user_id": stu_id})
    db.users.delete_one({"_id": stu["_id"]})
    print("[PASS] test_contest_api_and_guards passed all assertions!")

if __name__ == "__main__":
    test_time_utils_parsing_and_formatting()
    test_contest_api_and_guards()
