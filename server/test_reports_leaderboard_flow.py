"""
Test Contest Reports and Leaderboard endpoints after authentication.
"""
import time
from app import create_app
from models.db import get_db

def test_data_flow():
    app = create_app()
    client = app.test_client()
    db = get_db()

    # 1. Login as Admin
    res_login = client.post("/api/auth/admin/login", json={
        "email": "nitplacements@nehrucolleges.com",
        "password": "circa@1234"
    })
    assert res_login.status_code == 200, f"Login failed: {res_login.status_code}"
    token = res_login.get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Contest list
    res_contests = client.get("/api/contests", headers=headers)
    assert res_contests.status_code == 200
    contests_data = res_contests.get_json()
    contests = contests_data.get("contests", [])
    print(f"Total contests found: {len(contests)}")

    # 3. Test Leaderboard endpoints
    # 3.1 Problem Leaderboard
    res_prob_lead = client.get("/api/problems/leaderboard", headers=headers)
    print(f"GET /api/problems/leaderboard status: {res_prob_lead.status_code}")
    assert res_prob_lead.status_code == 200

    # 3.2 If contest exists, test contest report and leaderboard
    if contests:
        contest_id = str(contests[0]["_id"] if "_id" in contests[0] else contests[0]["id"])
        print(f"Testing contest ID: {contest_id}")
        
        # Contest Leaderboard
        t0 = time.time()
        res_lead = client.get(f"/api/contests/{contest_id}/leaderboard", headers=headers)
        print(f"GET /api/contests/{contest_id}/leaderboard: {res_lead.status_code} in {(time.time()-t0)*1000:.2f}ms")
        assert res_lead.status_code == 200

        # Contest Report
        t0 = time.time()
        res_report = client.get(f"/api/admin/contests/{contest_id}/report", headers=headers)
        print(f"GET /api/admin/contests/{contest_id}/report: {res_report.status_code} in {(time.time()-t0)*1000:.2f}ms")
        assert res_report.status_code in [200, 404]

    print("\nSUCCESS: All data flow endpoints verified without errors!")

if __name__ == "__main__":
    test_data_flow()
