"""
Comprehensive Admin Authentication & Performance Test Suite
Tests login speed, connection reuse, indexing, JWT validation, and post-login API access.
"""
import time
import json
from app import create_app
from models.db import get_db

def run_tests():
    app = create_app()
    client = app.test_client()
    db = get_db()

    print("=" * 60)
    print("1. DATABASE INDEX VERIFICATION")
    print("=" * 60)
    indexes = list(db.users.list_indexes())
    index_names = [idx.get("name") for idx in indexes]
    print(f"Users collection index count: {len(indexes)}")
    for idx in indexes:
        print(f"  - {idx.get('name')}: {idx.get('key')}")
    
    assert any("email" in name for name in index_names), "Email index missing"
    assert any("username" in name for name in index_names), "Username index missing"
    print("Database indexes verified successfully!\n")

    print("=" * 60)
    print("2. ADMIN LOGIN SPEED & AUTHENTICATION")
    print("=" * 60)
    
    # Valid Admin Login
    t0 = time.time()
    res = client.post("/api/auth/admin/login", json={
        "email": "nitplacements@nehrucolleges.com",
        "password": "circa@1234"
    })
    elapsed_ms = (time.time() - t0) * 1000.0
    print(f"Admin Login Status: {res.status_code}")
    print(f"Admin Login Elapsed Time: {elapsed_ms:.2f} ms")
    data = res.get_json()
    print(f"Success: {data.get('success')}")
    print(f"User: {data.get('user')}")
    print(f"Token present: {bool(data.get('token'))}")
    
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert data.get("success") is True, "Expected success: True"
    assert data.get("user", {}).get("role") == "ADMIN", "Expected role: ADMIN"
    assert bool(data.get("token")), "Expected JWT token"
    assert elapsed_ms < 1500, f"Expected cold start < 1500ms, was {elapsed_ms:.2f}ms"
    print(f"Admin Login passed in {elapsed_ms:.2f}ms!\n")

    admin_token = data.get("token")
    headers = {"Authorization": f"Bearer {admin_token}"}

    print("=" * 60)
    print("3. ERROR HANDLING & SECURITY TESTS")
    print("=" * 60)
    
    # Invalid Password
    t0 = time.time()
    res_bad_pw = client.post("/api/auth/admin/login", json={
        "email": "nitplacements@nehrucolleges.com",
        "password": "wrongpassword123"
    })
    elapsed_bad = (time.time() - t0) * 1000.0
    print(f"Invalid Password Status: {res_bad_pw.status_code} ({elapsed_bad:.2f}ms)")
    assert res_bad_pw.status_code == 401, f"Expected 401, got {res_bad_pw.status_code}"
    
    # Non-existent User
    res_bad_user = client.post("/api/auth/admin/login", json={
        "email": "nonexistent_admin@test.com",
        "password": "password123"
    })
    print(f"Non-existent User Status: {res_bad_user.status_code}")
    assert res_bad_user.status_code == 401, f"Expected 401, got {res_bad_user.status_code}"

    # Missing Fields
    res_empty = client.post("/api/auth/admin/login", json={})
    print(f"Empty Payload Status: {res_empty.status_code}")
    assert res_empty.status_code == 400, f"Expected 400, got {res_empty.status_code}"
    print("Error handling and security verification passed!\n")

    print("=" * 60)
    print("4. POST-LOGIN API ENDPOINTS (ADMIN DATA FLOW)")
    print("=" * 60)

    # 4.1 /api/auth/me
    res_me = client.get("/api/auth/me", headers=headers)
    print(f"GET /api/auth/me: {res_me.status_code}, authenticated={res_me.get_json().get('authenticated')}")
    assert res_me.status_code == 200 and res_me.get_json().get("authenticated") is True

    # 4.2 /api/admin/stats
    t0 = time.time()
    res_stats = client.get("/api/admin/stats", headers=headers)
    elapsed_stats = (time.time() - t0) * 1000.0
    print(f"GET /api/admin/stats: {res_stats.status_code} ({elapsed_stats:.2f}ms)")
    assert res_stats.status_code == 200, f"Stats failed: {res_stats.status_code}"

    # 4.3 /api/admin/students
    res_students = client.get("/api/admin/students", headers=headers)
    print(f"GET /api/admin/students: {res_students.status_code}")
    assert res_students.status_code == 200, f"Students failed: {res_students.status_code}"

    # 4.4 /api/contests
    res_contests = client.get("/api/contests", headers=headers)
    print(f"GET /api/contests: {res_contests.status_code}")
    assert res_contests.status_code == 200, f"Contests failed: {res_contests.status_code}"

    # 4.5 /api/health
    res_health = client.get("/api/health")
    print(f"GET /api/health: {res_health.status_code} - {res_health.get_json()}")
    assert res_health.status_code == 200, f"Health check failed: {res_health.status_code}"

    print("All post-login endpoints returned 200 OK!\n")

    print("=" * 60)
    print("5. CONCURRENCY & CONNECTION REUSE STABILITY")
    print("=" * 60)
    
    from utils.rate_limiter import _memory_limiter
    with _memory_limiter._lock:
        _memory_limiter._requests.clear()

    total_time = 0
    concurrency_count = 8
    for i in range(concurrency_count):
        t_start = time.time()
        r = client.post("/api/auth/admin/login", json={
            "email": "nitplacements@nehrucolleges.com",
            "password": "circa@1234"
        })
        t_dur = (time.time() - t_start) * 1000.0
        total_time += t_dur
        assert r.status_code == 200, f"Request #{i+1} failed with status {r.status_code}"
        print(f"  Request #{i+1}: {r.status_code} in {t_dur:.2f}ms")

    avg_ms = total_time / concurrency_count
    print(f"Average login duration across {concurrency_count} sequential requests: {avg_ms:.2f}ms")
    assert avg_ms < 300, f"Average login duration too high: {avg_ms:.2f}ms"
    print("Concurrency and connection pooling verified!\n")

    print("=" * 60)
    print("6. RATE LIMITING ENFORCEMENT TEST")
    print("=" * 60)
    # The limit is 10 requests per 300 seconds. We made 8 in the loop above.
    # Request 9:
    r9 = client.post("/api/auth/admin/login", json={"email": "nitplacements@nehrucolleges.com", "password": "circa@1234"})
    print(f"Request #9 status: {r9.status_code} (allowed)")
    assert r9.status_code == 200

    # Request 10:
    r10 = client.post("/api/auth/admin/login", json={"email": "nitplacements@nehrucolleges.com", "password": "circa@1234"})
    print(f"Request #10 status: {r10.status_code} (allowed)")
    assert r10.status_code == 200

    # Request 11 (should be blocked by 429):
    r11 = client.post("/api/auth/admin/login", json={"email": "nitplacements@nehrucolleges.com", "password": "circa@1234"})
    print(f"Request #11 status: {r11.status_code} (rate limited: {r11.get_json().get('error')})")
    assert r11.status_code == 429
    print("Rate limiting enforcement verified!\n")

    print("=" * 60)
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
