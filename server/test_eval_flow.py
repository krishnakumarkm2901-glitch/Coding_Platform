from app import create_app
from models.db import get_db
from utils.security import generate_token

app = create_app()
client = app.test_client()
db = get_db()

# Find student
student = db.users.find_one({'role': 'STUDENT'})
token = generate_token(student)
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

prob = db.problems.find_one({'slug': 'two-sum-problem'})
pid = str(prob['_id'])
print(f"Testing problem: {prob.get('title')} ({pid})")
print(f"Sample Input: {repr(prob.get('sample_input'))}")
print(f"Sample Output: {repr(prob.get('sample_output'))}")
print(f"Test cases count: {len(prob.get('test_cases', []))}")

# 1. Run Code with correct solution
correct_code = """import sys
lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    nums = [int(x) for x in lines[1:n+1]]
    target = int(lines[n+1])
    lookup = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in lookup:
            print(f"{lookup[diff]} {i}")
            break
        lookup[num] = i
"""

res_run = client.post('/api/submissions/run', json={
    'language': 'python',
    'code': correct_code,
    'problem_id': pid,
    'test_cases': prob.get('test_cases')
}, headers=headers)
run_data = res_run.get_json()
print('RUN RESULT:', res_run.status_code, run_data.get('status'), 'passed:', run_data.get('passed_test_cases'), '/', run_data.get('total_test_cases'))
print('Run test_results:', run_data.get('test_results'))

# 2. Submit Solution with correct solution
res_sub = client.post('/api/submissions/submit', json={
    'language': 'python',
    'code': correct_code,
    'problem_id': pid
}, headers=headers)
data_sub = res_sub.get_json()
print('SUBMIT RESULT:', res_sub.status_code, data_sub.get('status'), 'passed:', data_sub.get('passed_test_cases'), '/', data_sub.get('total_test_cases'))

# 3. Submit Solution with wrong solution
wrong_code = 'print("999 999")'
res_wrong = client.post('/api/submissions/submit', json={
    'language': 'python',
    'code': wrong_code,
    'problem_id': pid
}, headers=headers)
print('WRONG SUBMIT RESULT:', res_wrong.status_code, res_wrong.get_json().get('status'))
