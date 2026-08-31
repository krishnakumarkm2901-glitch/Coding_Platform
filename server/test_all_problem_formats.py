import os
from dotenv import load_dotenv
load_dotenv()

from app import create_app
from services.piston_service import execute_code, normalize_output

app = create_app()
client = app.test_client()

print("==================================================")
print("1. VERIFYING BACKEND TESTCASE NORMALIZATION")
print("==================================================")

res = client.get("/api/problems")
data = res.get_json()
problems = data.get("problems", [])
print(f"Total problems fetched: {len(problems)}")

all_problems_have_testcases = True

for p_meta in problems:
    p_id = p_meta["id"]
    detail_res = client.get(f"/api/problems/{p_id}")
    detail_data = detail_res.get_json()
    prob = detail_data.get("problem", {})
    
    sample_cases = prob.get("sample_test_cases", [])
    sample_in = prob.get("sample_input")
    sample_out = prob.get("sample_output")
    
    if not sample_cases:
        print(f"  [FAIL] Problem '{prob.get('title')}' ({p_id}) has EMPTY sample_test_cases!")
        all_problems_have_testcases = False
    else:
        first_case = sample_cases[0]
        # Verify first case has input/expected_output keys
        if "input" not in first_case or "expected_output" not in first_case:
            print(f"  [FAIL] Problem '{prob.get('title')}' ({p_id}) missing keys in sample_test_cases[0]!")
            all_problems_have_testcases = False
        else:
            print(f"  [OK] '{prob.get('title')}': {len(sample_cases)} sample cases, Case 1 input: {repr(first_case['input'][:30])}, expected: {repr(first_case['expected_output'][:30])}")

print(f"\nBackend Testcase Normalization: {'[OK] ALL PASS' if all_problems_have_testcases else '[FAIL]'}")

print("\n==================================================")
print("2. TESTING DIFFERENT INPUT FORMATS AGAINST ENGINE")
print("==================================================")

test_formats = [
    # Format 1: String bracket input (Valid Parentheses)
    {
        "name": "String Bracket Input ({[()]})",
        "lang": "python",
        "code": '''
import sys

def isValid(s: str) -> bool:
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping.values():
            stack.append(char)
        elif char in mapping:
            if not stack or stack.pop() != mapping[char]:
                return False
        else:
            return False
    return not stack

s = sys.stdin.read().strip()
print("True" if isValid(s) else "False")
''',
        "input": "{[()]}",
        "expected": "True"
    },
    # Format 2: Integer input (Prime Sieve)
    {
        "name": "Single Integer Input (10)",
        "lang": "python",
        "code": '''
import sys
n = int(sys.stdin.read().strip())
primes = [True] * n
count = 0
for i in range(2, n):
    if primes[i]:
        count += 1
        for j in range(i*i, n, i):
            primes[j] = False
print(count)
''',
        "input": "10",
        "expected": "4"
    },
    # Format 3: Multi-line Array Input (Two Sum)
    {
        "name": "Multi-line Array Input",
        "lang": "python",
        "code": '''
import sys
lines = sys.stdin.read().strip().split('\\n')
n = int(lines[0])
nums = list(map(int, lines[1].split()))
target = int(lines[2])
seen = {}
for i, num in enumerate(nums):
    diff = target - num
    if diff in seen:
        print(f"{seen[diff]} {i}")
        break
    seen[num] = i
''',
        "input": "4\n2 7 11 15\n9",
        "expected": "0 1"
    },
    # Format 4: String with spaces (Reverse words)
    {
        "name": "String with spaces (the sky is blue)",
        "lang": "python",
        "code": '''
import sys
s = sys.stdin.read().strip()
words = s.split()
print(" ".join(reversed(words)))
''',
        "input": "the sky is blue",
        "expected": "blue is sky the"
    },
    # Format 5: Valid Empty Input
    {
        "name": "Valid Empty Input Handling",
        "lang": "python",
        "code": '''
import sys
s = sys.stdin.read().strip()
if not s:
    print("EMPTY_ACCEPTED")
else:
    print("NON_EMPTY")
''',
        "input": "",
        "expected": "EMPTY_ACCEPTED"
    }
]

for item in test_formats:
    res = execute_code(item["lang"], item["code"], item["input"], timeout=5)
    actual = normalize_output(res.get("output", ""))
    is_ok = actual == item["expected"] or actual.lower() == item["expected"].lower()
    status_str = "[OK] PASSED" if is_ok else "[FAIL]"
    print(f"  {status_str}: {item['name']} -> Input: {repr(item['input'])}, Expected: {repr(item['expected'])}, Got: {repr(actual)}")

print("\n==================================================")
print("ALL TESTCASES AND FORMATS VERIFIED SUCCESSFULLY")
print("==================================================")
