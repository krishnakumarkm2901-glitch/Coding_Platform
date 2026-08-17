from datetime import datetime, timezone, timedelta
from app import create_app
from models.db import get_db
from utils.security import generate_token
from bson import ObjectId

def test_contest_report_system():
    app = create_app()
    client = app.test_client()
    db = get_db()
    now = datetime.now(timezone.utc)

    # 1. Setup Admin and 2 Students
    db.users.delete_many({"email": {"$in": ["rep_admin@nit.edu", "rep_stu1@nit.edu", "rep_stu2@nit.edu"]}})
    
    admin_id = db.users.insert_one({
        "name": "Report Admin",
        "email": "rep_admin@nit.edu",
        "role": "ADMIN",
        "department": "CSE"
    }).inserted_id
    admin_user = db.users.find_one({"_id": admin_id})
    admin_token = generate_token(admin_user)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    stu1_id = db.users.insert_one({
        "name": "Student Alpha",
        "email": "rep_stu1@nit.edu",
        "student_id": "REP_STU_01",
        "role": "STUDENT",
        "department": "CSE",
        "year": "3rd Year"
    }).inserted_id
    stu1_user = db.users.find_one({"_id": stu1_id})
    stu1_token = generate_token(stu1_user)
    stu1_headers = {"Authorization": f"Bearer {stu1_token}"}

    stu2_id = db.users.insert_one({
        "name": "Student Beta",
        "email": "rep_stu2@nit.edu",
        "student_id": "REP_STU_02",
        "role": "STUDENT",
        "department": "ECE",
        "year": "2nd Year"
    }).inserted_id
    stu2_user = db.users.find_one({"_id": stu2_id})
    stu2_token = generate_token(stu2_user)
    stu2_headers = {"Authorization": f"Bearer {stu2_token}"}

    # 2. Setup Contest with 2 MCQs and 1 Coding Problem
    mcq1_id = db.mcqs.insert_one({
        "title": "Time Complexity of Binary Search",
        "question": "What is the worst-case time complexity of binary search on a sorted array?",
        "options": ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
        "correct_answer": "O(log N)",
        "explanation": "Binary search halves the search space each step."
    }).inserted_id

    mcq2_id = db.mcqs.insert_one({
        "title": "Stack Principle",
        "question": "Which principle does a Stack data structure follow?",
        "options": ["FIFO", "LIFO", "LILO", "Random"],
        "correct_answer": "LIFO",
        "explanation": "Last In, First Out."
    }).inserted_id

    prob1_id = db.problems.insert_one({
        "title": "Two Sum Problem",
        "difficulty": "Easy",
        "topic": "Arrays",
        "test_cases": [
            {"input": "2 7 11 15\n9", "expected_output": "0 1"},
            {"input": "3 2 4\n6", "expected_output": "1 2"}
        ]
    }).inserted_id

    contest_id = db.contests.insert_one({
        "title": "Automated Report Verification Contest",
        "description": "Verification of 3 report types and student access control",
        "duration_minutes": 60,
        "start_time": now - timedelta(hours=2),
        "end_time": now - timedelta(hours=1),
        "is_published": True,
        "mcq_ids": [str(mcq1_id), str(mcq2_id)],
        "problem_ids": [str(prob1_id)],
        "total_points": 70
    }).inserted_id

    # 3. Create participation & submission records
    # Stu1: 2/2 MCQs correct (20 marks), 1/1 Problem solved (50 marks) -> Total: 70
    db.contest_participants.insert_one({
        "contest_id": str(contest_id),
        "user_id": str(stu1_id),
        "student_id": "REP_STU_01",
        "student_name": "Student Alpha",
        "department": "CSE",
        "score": 70,
        "mcq_score": 20,
        "coding_score": 50,
        "mcqs_correct": 2,
        "total_mcqs": 2,
        "problems_solved": 1,
        "total_problems": 1,
        "mcq_answers": {
            str(mcq1_id): "O(log N)",
            str(mcq2_id): "LIFO"
        },
        "coding_results": {
            str(prob1_id): {"status": "Accepted", "passed": 2, "total": 2}
        },
        "joined_at": now - timedelta(minutes=110),
        "submitted": True,
        "submitted_at": now - timedelta(minutes=80),
        "anti_cheat_logs": []
    })

    # Stu2: 1/2 MCQs correct (10 marks), 0/1 Problem solved (0 marks) -> Total: 10
    db.contest_participants.insert_one({
        "contest_id": str(contest_id),
        "user_id": str(stu2_id),
        "student_id": "REP_STU_02",
        "student_name": "Student Beta",
        "department": "ECE",
        "score": 10,
        "mcq_score": 10,
        "coding_score": 0,
        "mcqs_correct": 1,
        "total_mcqs": 2,
        "problems_solved": 0,
        "total_problems": 1,
        "mcq_answers": {
            str(mcq1_id): "O(log N)",
            str(mcq2_id): "FIFO"
        },
        "coding_results": {
            str(prob1_id): {"status": "Partial/Wrong", "passed": 0, "total": 2}
        },
        "joined_at": now - timedelta(minutes=110),
        "submitted": True,
        "submitted_at": now - timedelta(minutes=70),
        "anti_cheat_logs": []
    })

    print("[TEST 1] Admin Full Report API Verification")
    admin_rep_res = client.get(f"/api/admin/reports/contests/{contest_id}", headers=admin_headers)
    assert admin_rep_res.status_code == 200
    rep_json = admin_rep_res.json
    assert rep_json["success"] is True
    assert len(rep_json["leaderboard"]) == 2
    
    # Leaderboard ordering
    top_cand = rep_json["leaderboard"][0]
    assert top_cand["student_id"] == "REP_STU_01"
    assert top_cand["overall_score"] == 70.0
    assert top_cand["mcq_score"] == 20.0
    assert top_cand["coding_score"] == 50.0

    second_cand = rep_json["leaderboard"][1]
    assert second_cand["student_id"] == "REP_STU_02"
    assert second_cand["overall_score"] == 10.0
    assert second_cand["mcq_score"] == 10.0
    assert second_cand["coding_score"] == 0.0

    # Summary Stats
    summary = rep_json["summary"]
    assert summary["total_candidates"] == 2
    assert summary["avg_overall_score"] == 40.0 # (70+10)/2
    assert summary["total_mcqs"] == 2
    assert summary["avg_mcq_score"] == 15.0 # (20+10)/2
    assert summary["avg_coding_score"] == 25.0 # (50+0)/2
    print("[PASS] Admin Full Report API verified with Overall, MCQ, and Coding metrics!")

    print("[TEST 2] Admin 3-Report Downloads Verification (Excel & CSV)")
    for r_type in ["overall", "mcq", "coding"]:
        # Excel
        res_excel = client.get(f"/api/admin/reports/contests/{contest_id}/export?report_type={r_type}&format=excel", headers=admin_headers)
        assert res_excel.status_code == 200
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in res_excel.content_type
        assert len(res_excel.data) > 1000

        # CSV
        res_csv = client.get(f"/api/admin/reports/contests/{contest_id}/export?report_type={r_type}&format=csv", headers=admin_headers)
        assert res_csv.status_code == 200
        assert "text/csv" in res_csv.content_type
        assert b"REP_STU_01" in res_csv.data
        assert b"REP_STU_02" in res_csv.data
        print(f"[PASS] Admin {r_type.upper()} Download (Excel & CSV) verified!")

    print("[TEST 3] Backend Access Control Verification (Students Blocked from Admin APIs & Downloads)")
    # Student trying to call admin report
    stu_block1 = client.get(f"/api/admin/reports/contests/{contest_id}", headers=stu1_headers)
    assert stu_block1.status_code == 403
    
    # Student trying to download export
    stu_block2 = client.get(f"/api/admin/reports/contests/{contest_id}/export?report_type=overall", headers=stu1_headers)
    assert stu_block2.status_code == 403

    stu_block3 = client.get(f"/api/admin/reports/contests/{contest_id}/export?report_type=mcq", headers=stu2_headers)
    assert stu_block3.status_code == 403
    print("[PASS] Students strictly blocked from admin report APIs and downloads with 403 Forbidden!")

    print("[TEST 4] Student View-Only Personal Report Verification")
    # Stu1 accesses their own report
    stu1_rep = client.get(f"/api/contests/{contest_id}/my-report", headers=stu1_headers)
    assert stu1_rep.status_code == 200
    s1_data = stu1_rep.json
    assert s1_data["success"] is True
    assert s1_data["overall"]["overall_score"] == 70.0
    assert s1_data["overall"]["rank"] == 1
    assert s1_data["mcq"]["mcq_score"] == 20.0
    assert s1_data["mcq"]["mcqs_correct"] == 2
    assert s1_data["coding"]["coding_score"] == 50.0
    assert s1_data["coding"]["problems_solved"] == 1
    # Check that stu1 only receives their own info
    assert s1_data["student"]["student_id"] == "REP_STU_01"

    # Stu2 accesses their own report
    stu2_rep = client.get(f"/api/contests/{contest_id}/my-report", headers=stu2_headers)
    assert stu2_rep.status_code == 200
    s2_data = stu2_rep.json
    assert s2_data["success"] is True
    assert s2_data["overall"]["overall_score"] == 10.0
    assert s2_data["overall"]["rank"] == 2
    assert s2_data["mcq"]["mcq_score"] == 10.0
    assert s2_data["mcq"]["mcqs_correct"] == 1
    assert s2_data["coding"]["coding_score"] == 0.0
    assert s2_data["student"]["student_id"] == "REP_STU_02"
    print("[PASS] Student personal report returns strictly own scores (Overall, MCQ, Coding) without leaking other students' data!")

    # 4. Clean up test records
    db.users.delete_many({"_id": {"$in": [admin_id, stu1_id, stu2_id]}})
    db.mcqs.delete_many({"_id": {"$in": [mcq1_id, mcq2_id]}})
    db.problems.delete_one({"_id": prob1_id})
    db.contests.delete_one({"_id": contest_id})
    db.contest_participants.delete_many({"contest_id": str(contest_id)})
    print("[ALL TESTS PASSED SUCCESSFULLY!]")

if __name__ == "__main__":
    test_contest_report_system()
