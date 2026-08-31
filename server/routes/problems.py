from flask import Blueprint, request, jsonify
from models.db import get_db
from utils.security import decode_token
from bson import ObjectId
from datetime import datetime, timezone, timedelta
import re

problems_bp = Blueprint("problems", __name__)

STARTER_CODE_TEMPLATES = {
    "python": "def solution():\n    # Read input and print output\n    import sys\n    input_data = sys.stdin.read().strip()\n    # Write your logic here\n    print(input_data)\n\nif __name__ == '__main__':\n    solution()\n",
    "c": "#include <stdio.h>\n\nint main() {\n    // Write your logic here\n    int n;\n    if (scanf(\"%d\", &n) == 1) {\n        printf(\"%d\\n\", n);\n    }\n    return 0;\n}\n",
    "cpp": "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Fast I/O\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    // Write your logic here\n    int n;\n    if (cin >> n) {\n        cout << n << \"\\n\";\n    }\n    return 0;\n}\n",
    "java": "import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        // Write your logic here\n        if (scanner.hasNext()) {\n            String line = scanner.nextLine();\n            System.out.println(line);\n        }\n    }\n}\n",
    "javascript": "const readline = require('readline');\n\nconst rl = readline.createInterface({\n    input: process.stdin,\n    output: process.stdout\n});\n\nlet lines = [];\nrl.on('line', (line) => {\n    lines.push(line);\n});\n\nrl.on('close', () => {\n    // Write your logic here\n    console.log(lines.join('\\n'));\n});\n",
    "go": "package main\n\nimport (\n    \"fmt\"\n    \"io/ioutil\"\n    \"os\"\n)\n\nfunc main() {\n    // Read input and print output\n    inputData, err := ioutil.ReadAll(os.Stdin)\n    if err != nil {\n        return\n    }\n    // Write your logic here\n    fmt.Print(string(inputData))\n}\n",
    "rust": "use std::io::{self, Read};\n\nfn main() {\n    // Read input and print output\n    let mut input_data = String::new();\n    io::stdin().read_to_string(&mut input_data).unwrap();\n    // Write your logic here\n    print!(\"{}\", input_data);\n}\n"
}

@problems_bp.route("", methods=["GET"])
def get_problems():
    """List problems with search, difficulty, topic filters and pagination."""
    db = get_db()
    
    # Query parameters
    search = request.args.get("search", "").strip()
    difficulty = request.args.get("difficulty", "").strip()
    topic = request.args.get("topic", "").strip()
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    skip = (page - 1) * limit

    query = {"is_active": {"$ne": False}}

    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"topic": {"$regex": search, "$options": "i"}}
        ]
    
    if difficulty and difficulty.lower() != "all":
        query["difficulty"] = difficulty.capitalize()

    if topic and topic.lower() != "all":
        query["topic"] = topic

    total_count = db.problems.count_documents(query)
    problems_cursor = db.problems.find(query).skip(skip).limit(limit)

    # Optional: check if user is authenticated to mark solved problems
    user_id = None
    auth_header = request.headers.get("Authorization")
    if auth_header and "Bearer " in auth_header:
        token = auth_header.split(" ")[1]
        payload = decode_token(token)
        if payload:
            user_id = payload.get("user_id")

    solved_set = set()
    if user_id:
        user_solved = db.submissions.find({
            "user_id": user_id,
            "status": "Accepted"
        }, {"problem_id": 1})
        solved_set = set([str(s.get("problem_id")) for s in user_solved])

    problems_list = []
    for p in problems_cursor:
        p_id = str(p["_id"])
        # Calculate acceptance rate
        total_subs = db.submissions.count_documents({"problem_id": p_id})
        accepted_subs = db.submissions.count_documents({"problem_id": p_id, "status": "Accepted"})
        acceptance_rate = round((accepted_subs / total_subs * 100), 1) if total_subs > 0 else 100.0

        problems_list.append({
            "id": p_id,
            "title": p.get("title"),
            "slug": p.get("slug", p_id),
            "difficulty": p.get("difficulty", "Easy"),
            "topic": p.get("topic", "General"),
            "acceptance_rate": acceptance_rate,
            "total_submissions": total_subs,
            "is_solved": p_id in solved_set
        })

    return jsonify({
        "success": True,
        "problems": problems_list,
        "pagination": {
            "total": total_count,
            "page": page,
            "limit": limit,
            "pages": (total_count + limit - 1) // limit if limit > 0 else 1
        }
    }), 200

@problems_bp.route("/topics", methods=["GET"])
def get_topics():
    """Return distinct list of problem topics."""
    db = get_db()
    topics = db.problems.distinct("topic", {"is_active": {"$ne": False}})
    return jsonify({
        "success": True,
        "topics": sorted(topics)
    }), 200

@problems_bp.route("/<problem_id>", methods=["GET"])
def get_problem_by_id(problem_id):
    """Return full details for a single problem including sample test cases."""
    db = get_db()
    
    query = {}
    if ObjectId.is_valid(problem_id):
        query = {"$or": [{"_id": ObjectId(problem_id)}, {"slug": problem_id}]}
    else:
        query = {"slug": problem_id}

    problem = db.problems.find_one(query)
    if not problem:
        return jsonify({"error": "Problem not found", "success": False}), 404

    # Build response: Include public/sample test cases, exclude hidden test cases for students
    p_id = str(problem["_id"])
    sample_test_cases = []
    
    # Check if problem has embedded test cases or separate collection
    test_cases = problem.get("test_cases", [])
    if not test_cases:
        test_cases = list(db.test_cases.find({"problem_id": p_id}))

    if test_cases:
        for tc in test_cases:
            if tc.get("is_sample", False) or tc.get("is_public", True):
                inp = tc.get("input") if tc.get("input") is not None else tc.get("stdin", "")
                out = tc.get("expected_output") if tc.get("expected_output") is not None else tc.get("output", "")
                sample_test_cases.append({
                    "input": str(inp) if inp is not None else "",
                    "expected_output": str(out) if out is not None else "",
                    "explanation": tc.get("explanation", "")
                })

        # If no sample flag was set, include the first 2 as samples
        if not sample_test_cases:
            for tc in test_cases[:2]:
                inp = tc.get("input") if tc.get("input") is not None else tc.get("stdin", "")
                out = tc.get("expected_output") if tc.get("expected_output") is not None else tc.get("output", "")
                sample_test_cases.append({
                    "input": str(inp) if inp is not None else "",
                    "expected_output": str(out) if out is not None else "",
                    "explanation": tc.get("explanation", "")
                })

    # If sample_test_cases is still empty, fallback to sample_input and sample_output
    if not sample_test_cases:
        s_in = problem.get("sample_input")
        s_out = problem.get("sample_output")
        if s_in is not None or s_out is not None:
            sample_test_cases.append({
                "input": str(s_in) if s_in is not None else "",
                "expected_output": str(s_out) if s_out is not None else "",
                "explanation": ""
            })

    # Ensure sample_input/sample_output fields match sample_test_cases[0] if missing
    sample_in = problem.get("sample_input")
    sample_out = problem.get("sample_output")
    if (sample_in is None or sample_in == "") and sample_test_cases:
        sample_in = sample_test_cases[0]["input"]
    if (sample_out is None or sample_out == "") and sample_test_cases:
        sample_out = sample_test_cases[0]["expected_output"]

    starter_code = problem.get("starter_code", {})
    # Fill in default starters if not present
    for lang, default_code in STARTER_CODE_TEMPLATES.items():
        if lang not in starter_code:
            starter_code[lang] = default_code

    return jsonify({
        "success": True,
        "problem": {
            "id": p_id,
            "title": problem.get("title"),
            "slug": problem.get("slug"),
            "difficulty": problem.get("difficulty", "Easy"),
            "topic": problem.get("topic", "General"),
            "description": problem.get("description", ""),
            "input_format": problem.get("input_format", ""),
            "output_format": problem.get("output_format", ""),
            "constraints": problem.get("constraints", ""),
            "sample_input": sample_in if sample_in is not None else "",
            "sample_output": sample_out if sample_out is not None else "",
            "sample_test_cases": sample_test_cases,
            "starter_code": starter_code,
            "supported_languages": problem.get("supported_languages", ["python", "c", "cpp", "java", "javascript", "go", "rust"]),
            "time_limit": problem.get("time_limit", 2.0),
            "memory_limit": problem.get("memory_limit", 128)
        }
    }), 200

# ----------------- CODING PROBLEMS LEADERBOARD -----------------

@problems_bp.route("/leaderboard", methods=["GET"])
def get_coding_problems_leaderboard():
    """
    Dedicated Leaderboard for practice coding problems.
    Points rule: Easy = 10 pts, Medium = 20 pts, Hard = 30 pts.
    Deduplicated per problem. Ranked by Total Points, Problems Solved, Accepted Submissions, Accuracy, Streak.
    """
    db = get_db()
    
    # Query parameters
    department = request.args.get("department", "").strip()
    year = request.args.get("year", "").strip()
    difficulty_filter = request.args.get("difficulty", "").strip().lower()
    time_period = request.args.get("time_period", "all_time").strip().lower()
    search = request.args.get("search", "").strip().lower()

    now = datetime.now(timezone.utc)
    start_time = None
    if time_period == "this_week":
        start_time = now - timedelta(days=7)
    elif time_period == "this_month":
        start_time = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    elif time_period == "this_year":
        start_time = datetime(now.year, 1, 1, tzinfo=timezone.utc)

    # 1. Fetch all problems and build difficulty map
    all_problems = list(db.problems.find({}))
    problem_diff_map = {}
    for prob in all_problems:
        p_id_str = str(prob["_id"])
        diff = prob.get("difficulty", "Easy").capitalize()
        problem_diff_map[p_id_str] = diff
        if prob.get("id"):
            problem_diff_map[str(prob["id"])] = diff

    # 2. Build student query
    conditions = [{"role": "STUDENT"}]
    if search:
        conditions.append({
            "$or": [
                {"student_id": {"$regex": search, "$options": "i"}},
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
        })
    if department and department.lower() != "all":
        dept_keywords = {
            "computer science & engineering": ["computer science", "cse"],
            "information technology": ["information technology", "it"],
            "artificial intelligence & data science": ["artificial intelligence", "aids", "ai & ds", "ai and ds"],
            "electronics & communication engineering": ["electronics", "ece"],
            "electrical & electronics engineering": ["electrical", "eee"],
            "mechanical engineering": ["mechanical", "mech"],
            "civil engineering": ["civil"],
            "cyber security": ["cyber"]
        }
        dept_lower = department.lower()
        if dept_lower in dept_keywords:
            or_patterns = [{"department": {"$regex": kw, "$options": "i"}} for kw in dept_keywords[dept_lower]]
            conditions.append({"$or": or_patterns})
        else:
            conditions.append({"department": {"$regex": department, "$options": "i"}})
    if year and year.lower() != "all":
        year_prefix = year.split(" ")[0]
        conditions.append({"year": {"$regex": f"^{year_prefix}", "$options": "i"}})

    student_query = {"$and": conditions} if len(conditions) > 1 else conditions[0]
    students = list(db.users.find(student_query))

    # Identify current logged-in user from token
    logged_user_id = None
    auth_header = request.headers.get("Authorization")
    if auth_header and "Bearer " in auth_header:
        token = auth_header.split(" ")[1]
        payload = decode_token(token)
        if payload:
            logged_user_id = payload.get("user_id")

    # 3. Calculate statistics for each student
    leaderboard = []

    for st in students:
        s_id_str = str(st["_id"])
        student_reg_id = st.get("student_id", "")
        name = st.get("name", "Student")
        dept = st.get("department", "CSE")
        yr = st.get("year", "1st Year")

        # Query all practice problem submissions for this student (exclude contests)
        sub_query = {
            "$or": [
                {"user_id": ObjectId(s_id_str) if ObjectId.is_valid(s_id_str) else s_id_str},
                {"user_id": s_id_str},
                {"student_id": student_reg_id}
            ],
            "contest_id": {"$in": [None, ""]}
        }
        if start_time:
            sub_query["created_at"] = {"$gte": start_time}

        student_subs = list(db.submissions.find(sub_query))

        total_submissions = len(student_subs)
        accepted_submissions = 0
        solved_problems_set = set()
        easy_solved = 0
        medium_solved = 0
        hard_solved = 0
        active_dates = set()

        for s in student_subs:
            c_at = s.get("created_at")
            if isinstance(c_at, datetime):
                if c_at.tzinfo is None:
                    c_at = c_at.replace(tzinfo=timezone.utc)
                active_dates.add(c_at.date())

            if s.get("status") == "Accepted":
                accepted_submissions += 1
                p_id = str(s.get("problem_id", ""))
                if p_id and p_id not in solved_problems_set:
                    solved_problems_set.add(p_id)
                    p_diff = problem_diff_map.get(p_id, "Easy").lower()
                    if p_diff == "easy":
                        easy_solved += 1
                    elif p_diff == "medium":
                        medium_solved += 1
                    elif p_diff == "hard":
                        hard_solved += 1
                    else:
                        easy_solved += 1

        # Accuracy
        accuracy = round((accepted_submissions / max(total_submissions, 1)) * 100, 1) if total_submissions > 0 else 0.0

        # Points
        points = (easy_solved * 10) + (medium_solved * 20) + (hard_solved * 30)
        total_unique_solved = len(solved_problems_set)

        # Filter by difficulty if user requested
        if difficulty_filter in ["easy", "medium", "hard"]:
            if difficulty_filter == "easy":
                display_solved = easy_solved
                display_points = easy_solved * 10
            elif difficulty_filter == "medium":
                display_solved = medium_solved
                display_points = medium_solved * 20
            else:
                display_solved = hard_solved
                display_points = hard_solved * 30
        else:
            display_solved = total_unique_solved
            display_points = points

        # Calculate current streak
        streak = 0
        today_date = now.date()
        yesterday_date = today_date - timedelta(days=1)
        if today_date in active_dates:
            streak = 1
            curr = yesterday_date
            while curr in active_dates:
                streak += 1
                curr -= timedelta(days=1)
        elif yesterday_date in active_dates:
            streak = 1
            curr = yesterday_date - timedelta(days=1)
            while curr in active_dates:
                streak += 1
                curr -= timedelta(days=1)

        leaderboard.append({
            "user_id": s_id_str,
            "student_id": student_reg_id,
            "name": name,
            "department": dept,
            "year": yr,
            "problems_solved": display_solved,
            "total_unique_solved": total_unique_solved,
            "easy_solved": easy_solved,
            "medium_solved": medium_solved,
            "hard_solved": hard_solved,
            "accepted_submissions": accepted_submissions,
            "total_submissions": total_submissions,
            "points": display_points,
            "accuracy": accuracy,
            "streak": streak,
            "is_current_user": bool(logged_user_id and (logged_user_id == s_id_str or logged_user_id == student_reg_id))
        })

    # Sort leaderboard by:
    # 1. Total Points (descending)
    # 2. Problems Solved (descending)
    # 3. Accepted Submissions (descending)
    # 4. Accuracy (descending)
    # 5. Current Streak (descending)
    leaderboard.sort(key=lambda x: (
        -x["points"],
        -x["problems_solved"],
        -x["accepted_submissions"],
        -x["accuracy"],
        -x["streak"]
    ))

    # Assign ranks
    current_student_stats = None
    for idx, item in enumerate(leaderboard, 1):
        item["rank"] = idx
        if item["is_current_user"]:
            current_student_stats = item

    # If current logged in student was not found in filtered results, find their overall stat
    if not current_student_stats and logged_user_id:
        logged_doc = None
        if ObjectId.is_valid(str(logged_user_id)):
            logged_doc = db.users.find_one({"_id": ObjectId(str(logged_user_id))})
        if not logged_doc:
            logged_doc = db.users.find_one({"student_id": logged_user_id})
        
        if logged_doc and logged_doc.get("role") == "STUDENT":
            s_id_str = str(logged_doc["_id"])
            student_reg_id = logged_doc.get("student_id", "")
            student_subs = list(db.submissions.find({
                "$or": [
                    {"user_id": ObjectId(s_id_str) if ObjectId.is_valid(s_id_str) else s_id_str},
                    {"student_id": student_reg_id}
                ],
                "contest_id": {"$in": [None, ""]}
            }))
            tot_subs = len(student_subs)
            acc_subs = sum(1 for s in student_subs if s.get("status") == "Accepted")
            solved_set = set()
            es, ms, hs = 0, 0, 0
            for s in student_subs:
                if s.get("status") == "Accepted":
                    p_id = str(s.get("problem_id", ""))
                    if p_id and p_id not in solved_set:
                        solved_set.add(p_id)
                        diff = problem_diff_map.get(p_id, "Easy").lower()
                        if diff == "easy": es += 1
                        elif diff == "medium": ms += 1
                        elif diff == "hard": hs += 1
            pts = (es * 10) + (ms * 20) + (hs * 30)
            acc = round((acc_subs / max(tot_subs, 1)) * 100, 1) if tot_subs > 0 else 0.0
            
            current_student_stats = {
                "user_id": s_id_str,
                "student_id": student_reg_id,
                "name": logged_doc.get("name", "Student"),
                "department": logged_doc.get("department", "CSE"),
                "year": logged_doc.get("year", "1st Year"),
                "rank": "-",
                "points": pts,
                "problems_solved": len(solved_set),
                "easy_solved": es,
                "medium_solved": ms,
                "hard_solved": hs,
                "accepted_submissions": acc_subs,
                "total_submissions": tot_subs,
                "accuracy": acc,
                "streak": 0,
                "is_current_user": True
            }

    top_three = leaderboard[:3] if len(leaderboard) >= 3 else leaderboard

    return jsonify({
        "success": True,
        "leaderboard": leaderboard,
        "top_three": top_three,
        "current_student_stats": current_student_stats,
        "total_students": len(leaderboard)
    }), 200

