from models.db import init_db
from dotenv import load_dotenv

load_dotenv()
db = init_db()

print("--- Updating db.problems to have ONLY sample test cases ---")

problems = list(db.problems.find())
for p in problems:
    p_id = p["_id"]
    title = p.get("title", "")
    sample_in = p.get("sample_input")
    sample_out = p.get("sample_output")

    # If Climbing Stairs, fix sample_input / sample_output if needed
    if title == "Climbing Stairs":
        sample_in = "3"
        sample_out = "3"

    # If sample_in was None, try to take from existing test_cases[0]
    if sample_in is None and p.get("test_cases"):
        sample_in = p["test_cases"][0].get("input", "")
        sample_out = p["test_cases"][0].get("expected_output", "")

    sample_in_str = str(sample_in) if sample_in is not None else ""
    sample_out_str = str(sample_out) if sample_out is not None else ""

    # Each problem's test case is strictly the Sample Input + Sample Output provided in the problem
    clean_test_cases = [{
        "input": sample_in_str,
        "expected_output": sample_out_str,
        "explanation": "",
        "is_sample": True
    }]

    db.problems.update_one(
        {"_id": p_id},
        {
            "$set": {
                "sample_input": sample_in_str,
                "sample_output": sample_out_str,
                "test_cases": clean_test_cases,
                "sample_test_cases": clean_test_cases
            }
        }
    )
    print(f"Updated '{title}' ({p_id}) -> 1 sample test case (Input: {repr(sample_in_str)[:20]}, Output: {repr(sample_out_str)[:10]})")

print("\nAll problems updated successfully! Verifying:")
for p in db.problems.find():
    print(f"ID: {p['_id']} | Title: {p.get('title')} | tcs count: {len(p.get('test_cases', []))}")
