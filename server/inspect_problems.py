from models.db import init_db
from dotenv import load_dotenv
load_dotenv()

db = init_db()
for p in db.problems.find():
    print(f"ID: {p['_id']} | Title: {p.get('title')}")
    print(f"  sample_input: {repr(p.get('sample_input'))}")
    print(f"  sample_output: {repr(p.get('sample_output'))}")
    print(f"  test_cases count: {len(p.get('test_cases', []))}")
    for idx, tc in enumerate(p.get('test_cases', [])):
        print(f"    tc[{idx}]: {tc}")
    print("-" * 50)
