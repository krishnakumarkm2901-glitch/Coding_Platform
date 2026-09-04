import os
import sys
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

# Load env variables
load_dotenv()

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.db import init_db
from utils.security import hash_password

def seed_database():
    db = init_db()
    if db is None:
        print("Error: Could not connect to MongoDB. Check MONGO_URI in .env")
        return

    print("--- Cleaning existing database collections ---")
    db.users.delete_many({})
    db.problems.delete_many({})
    db.test_cases.delete_many({})
    db.mcqs.delete_many({})
    db.contests.delete_many({})
    db.contest_participants.delete_many({})
    db.submissions.delete_many({})
    db.results.delete_many({})

    print("--- 1. Seeding Admin Account ---")
    admin_doc = {
        "name": "Platform Administrator",
        "email": "nitplacements@nehrucolleges.com",
        "username": "nitplacements",
        "password": hash_password("circa@1234"),
        "role": "ADMIN",
        "status": "active",
        "created_at": datetime.now(timezone.utc)
    }
    db.users.insert_one(admin_doc)
    print("Admin created: nitplacements@nehrucolleges.com / circa@1234")

    print("--- 2. Seeding 10 Student Accounts ---")
    students_data = [
        {"student_id": "STU001", "name": "Aarav Sharma", "email": "aarav.sharma@college.edu", "dept": "Computer Science & Engg", "year": "3rd Year"},
        {"student_id": "STU002", "name": "Diya Patel", "email": "diya.patel@college.edu", "dept": "Information Technology", "year": "3rd Year"},
        {"student_id": "STU003", "name": "Rohan Verma", "email": "rohan.verma@college.edu", "dept": "Artificial Intelligence & DS", "year": "2nd Year"},
        {"student_id": "STU004", "name": "Ananya Iyer", "email": "ananya.iyer@college.edu", "dept": "Computer Science & Engg", "year": "4th Year"},
        {"student_id": "STU005", "name": "Vikram Singh", "email": "vikram.singh@college.edu", "dept": "Electronics & Comm Engg", "year": "2nd Year"},
        {"student_id": "STU006", "name": "Pooja Hegde", "email": "pooja.hegde@college.edu", "dept": "Information Technology", "year": "3rd Year"},
        {"student_id": "STU007", "name": "Karthik Raja", "email": "karthik.raja@college.edu", "dept": "Computer Science & Engg", "year": "1st Year"},
        {"student_id": "STU008", "name": "Sneha Reddy", "email": "sneha.reddy@college.edu", "dept": "Artificial Intelligence & DS", "year": "3rd Year"},
        {"student_id": "STU009", "name": "Aditya Joshi", "email": "aditya.joshi@college.edu", "dept": "Computer Science & Engg", "year": "2nd Year"},
        {"student_id": "STU010", "name": "Meera Nambiar", "email": "meera.nambiar@college.edu", "dept": "Cyber Security", "year": "4th Year"}
    ]

    for stu in students_data:
        db.users.insert_one({
            "student_id": stu["student_id"],
            "register_number": stu["student_id"],
            "name": stu["name"],
            "email": stu["email"],
            "password": hash_password("student123"),
            "department": stu["dept"],
            "year": stu["year"],
            "role": "STUDENT",
            "status": "active",
            "created_at": datetime.now(timezone.utc)
        })
    print(f"Seeded {len(students_data)} student accounts with default password 'student123'")

    print("--- 3. Seeding 20 Coding Problems ---")
    problems_data = [
        {
            "title": "Two Sum Problem",
            "slug": "two-sum-problem",
            "difficulty": "Easy",
            "topic": "Arrays",
            "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice. Return the indices space-separated in ascending order.",
            "input_format": "First line contains integer N (size of array).\nSecond line contains N space-separated integers.\nThird line contains target integer.",
            "output_format": "Print the two 0-based indices space-separated.",
            "constraints": "2 <= N <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9",
            "sample_input": "4\n2 7 11 15\n9",
            "sample_output": "0 1",
            "test_cases": [
                {"input": "4\n2 7 11 15\n9", "expected_output": "0 1", "is_sample": True},
                {"input": "3\n3 2 4\n6", "expected_output": "1 2", "is_sample": True},
                {"input": "2\n3 3\n6", "expected_output": "0 1", "is_sample": False},
                {"input": "5\n1 5 3 7 9\n12", "expected_output": "1 3", "is_sample": False}
            ]
        },
        {
            "title": "Maximum Subarray Sum",
            "slug": "maximum-subarray-sum",
            "difficulty": "Medium",
            "topic": "Dynamic Programming",
            "description": "Given an integer array `nums`, find the subarray with the largest sum, and return its sum (Kadane's Algorithm).",
            "input_format": "First line contains integer N.\nSecond line contains N space-separated integers.",
            "output_format": "Print the maximum subarray sum.",
            "constraints": "1 <= N <= 10^5\n-10^4 <= nums[i] <= 10^4",
            "sample_input": "9\n-2 1 -3 4 -1 2 1 -5 4",
            "sample_output": "6",
            "test_cases": [
                {"input": "9\n-2 1 -3 4 -1 2 1 -5 4", "expected_output": "6", "is_sample": True},
                {"input": "1\n1", "expected_output": "1", "is_sample": True},
                {"input": "5\n5 4 -1 7 8", "expected_output": "23", "is_sample": False},
                {"input": "4\n-5 -2 -8 -1", "expected_output": "-1", "is_sample": False}
            ]
        },
        {
            "title": "Valid Palindrome",
            "slug": "valid-palindrome",
            "difficulty": "Easy",
            "topic": "Strings",
            "description": "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nPrint `true` if it is a palindrome, or `false` otherwise.",
            "input_format": "A single line containing the string S.",
            "output_format": "Print `true` or `false` (lowercase).",
            "constraints": "1 <= length of S <= 10^5",
            "sample_input": "A man, a plan, a canal: Panama",
            "sample_output": "true",
            "test_cases": [
                {"input": "A man, a plan, a canal: Panama", "expected_output": "true", "is_sample": True},
                {"input": "race a car", "expected_output": "false", "is_sample": True},
                {"input": " ", "expected_output": "true", "is_sample": False},
                {"input": "Madam, I'm Adam", "expected_output": "true", "is_sample": False}
            ]
        },
        {
            "title": "Valid Parentheses",
            "slug": "valid-parentheses",
            "difficulty": "Easy",
            "topic": "Stack",
            "description": "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if open brackets are closed by the same type of brackets and in the correct order.",
            "input_format": "A single line containing the bracket string.",
            "output_format": "Print `true` if valid, otherwise `false`.",
            "constraints": "1 <= length of s <= 10^4",
            "sample_input": "()[]{}",
            "sample_output": "true",
            "test_cases": [
                {"input": "()[]{}", "expected_output": "true", "is_sample": True},
                {"input": "(]", "expected_output": "false", "is_sample": True},
                {"input": "{[]}", "expected_output": "true", "is_sample": False},
                {"input": "([)]", "expected_output": "false", "is_sample": False}
            ]
        },
        {
            "title": "Binary Search",
            "slug": "binary-search",
            "difficulty": "Easy",
            "topic": "Searching",
            "description": "Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return -1.",
            "input_format": "First line contains N.\nSecond line contains N space-separated integers.\nThird line contains target.",
            "output_format": "Print the 0-based index or -1.",
            "constraints": "1 <= N <= 10^4\n-10^4 < nums[i], target < 10^4",
            "sample_input": "6\n-1 0 3 5 9 12\n9",
            "sample_output": "4",
            "test_cases": [
                {"input": "6\n-1 0 3 5 9 12\n9", "expected_output": "4", "is_sample": True},
                {"input": "6\n-1 0 3 5 9 12\n2", "expected_output": "-1", "is_sample": True},
                {"input": "1\n5\n5", "expected_output": "0", "is_sample": False},
                {"input": "5\n1 3 5 7 9\n10", "expected_output": "-1", "is_sample": False}
            ]
        },
        {
            "title": "Merge Sorted Array",
            "slug": "merge-sorted-array",
            "difficulty": "Easy",
            "topic": "Sorting",
            "description": "You are given two integer arrays `nums1` and `nums2`, sorted in non-decreasing order. Merge `nums1` and `nums2` into a single array sorted in non-decreasing order.",
            "input_format": "First line: size M of first array.\nSecond line: M space-separated integers.\nThird line: size N of second array.\nFourth line: N space-separated integers.",
            "output_format": "Print the merged array space-separated.",
            "constraints": "1 <= M, N <= 1000",
            "sample_input": "3\n1 2 3\n3\n2 5 6",
            "sample_output": "1 2 2 3 5 6",
            "test_cases": [
                {"input": "3\n1 2 3\n3\n2 5 6", "expected_output": "1 2 2 3 5 6", "is_sample": True},
                {"input": "1\n1\n0\n", "expected_output": "1", "is_sample": True},
                {"input": "3\n4 5 6\n3\n1 2 3", "expected_output": "1 2 3 4 5 6", "is_sample": False}
            ]
        },
        {
            "title": "Climbing Stairs",
            "slug": "climbing-stairs",
            "difficulty": "Easy",
            "topic": "Dynamic Programming",
            "description": "You are climbing a staircase. It takes `n` steps to reach the top.\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
            "input_format": "A single integer n.",
            "output_format": "Print the number of distinct ways.",
            "constraints": "1 <= n <= 45",
            "sample_input": "3",
            "sample_output": "3",
            "test_cases": [
                {"input": "2", "expected_output": "2", "is_sample": True},
                {"input": "3", "expected_output": "3", "is_sample": True},
                {"input": "5", "expected_output": "8", "is_sample": False},
                {"input": "10", "expected_output": "89", "is_sample": False}
            ]
        },
        {
            "title": "Reverse Linked List Elements",
            "slug": "reverse-linked-list-elements",
            "difficulty": "Easy",
            "topic": "Linked List",
            "description": "Given the elements of a singly linked list, reverse the list, and print the reversed elements space-separated.",
            "input_format": "First line contains N.\nSecond line contains N space-separated integers.",
            "output_format": "Print reversed integers space-separated.",
            "constraints": "0 <= N <= 5000",
            "sample_input": "5\n1 2 3 4 5",
            "sample_output": "5 4 3 2 1",
            "test_cases": [
                {"input": "5\n1 2 3 4 5", "expected_output": "5 4 3 2 1", "is_sample": True},
                {"input": "2\n1 2", "expected_output": "2 1", "is_sample": True},
                {"input": "1\n42", "expected_output": "42", "is_sample": False}
            ]
        },
        {
            "title": "Coin Change Problem",
            "slug": "coin-change-problem",
            "difficulty": "Medium",
            "topic": "Dynamic Programming",
            "description": "You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.",
            "input_format": "First line contains N (number of coin types).\nSecond line contains N space-separated coin denominations.\nThird line contains the target amount.",
            "output_format": "Print the minimum number of coins needed, or -1.",
            "constraints": "1 <= coins.length <= 12\n1 <= coins[i] <= 2^31 - 1\n0 <= amount <= 10^4",
            "sample_input": "3\n1 2 5\n11",
            "sample_output": "3",
            "test_cases": [
                {"input": "3\n1 2 5\n11", "expected_output": "3", "is_sample": True},
                {"input": "1\n2\n3", "expected_output": "-1", "is_sample": True},
                {"input": "1\n1\n0", "expected_output": "0", "is_sample": False},
                {"input": "4\n1 5 10 25\n41", "expected_output": "4", "is_sample": False}
            ]
        },
        {
            "title": "Longest Common Prefix",
            "slug": "longest-common-prefix",
            "difficulty": "Easy",
            "topic": "Strings",
            "description": "Write a function to find the longest common prefix string amongst an array of strings.\nIf there is no common prefix, print an empty line or \"none\".",
            "input_format": "First line contains N (number of strings).\nFollowing N lines contain one string each.",
            "output_format": "Print the longest common prefix string.",
            "constraints": "1 <= N <= 200\n0 <= string length <= 200",
            "sample_input": "3\nflower\nflow\nflight",
            "sample_output": "fl",
            "test_cases": [
                {"input": "3\nflower\nflow\nflight", "expected_output": "fl", "is_sample": True},
                {"input": "3\ndog\nracecar\ncar", "expected_output": "", "is_sample": True},
                {"input": "2\ninterspecies\ninterstellar", "expected_output": "inters", "is_sample": False}
            ]
        },
        {
            "title": "Move Zeroes to End",
            "slug": "move-zeroes-to-end",
            "difficulty": "Easy",
            "topic": "Arrays",
            "description": "Given an integer array `nums`, move all 0's to the end of it while maintaining the relative order of the non-zero elements.\nNote that you must do this in-place without making a copy of the array.",
            "input_format": "First line: N\nSecond line: N space-separated integers",
            "output_format": "Print the modified array space-separated.",
            "constraints": "1 <= N <= 10^4",
            "sample_input": "5\n0 1 0 3 12",
            "sample_output": "1 3 12 0 0",
            "test_cases": [
                {"input": "5\n0 1 0 3 12", "expected_output": "1 3 12 0 0", "is_sample": True},
                {"input": "1\n0", "expected_output": "0", "is_sample": True},
                {"input": "4\n1 2 3 4", "expected_output": "1 2 3 4", "is_sample": False}
            ]
        },
        {
            "title": "House Robber",
            "slug": "house-robber",
            "difficulty": "Medium",
            "topic": "Dynamic Programming",
            "description": "You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. Adjacent houses have security systems connected, so you cannot rob two adjacent houses on the same night.\nDetermine the maximum amount of money you can rob tonight without alerting the police.",
            "input_format": "First line contains N.\nSecond line contains N space-separated integers representing money in each house.",
            "output_format": "Print maximum loot.",
            "constraints": "1 <= N <= 100\n0 <= nums[i] <= 400",
            "sample_input": "4\n1 2 3 1",
            "sample_output": "4",
            "test_cases": [
                {"input": "4\n1 2 3 1", "expected_output": "4", "is_sample": True},
                {"input": "5\n2 7 9 3 1", "expected_output": "12", "is_sample": True},
                {"input": "3\n2 1 1", "expected_output": "3", "is_sample": False}
            ]
        },
        {
            "title": "Rotate Array by K Steps",
            "slug": "rotate-array-by-k-steps",
            "difficulty": "Medium",
            "topic": "Arrays",
            "description": "Given an integer array `nums`, rotate the array to the right by `k` steps, where `k` is non-negative.",
            "input_format": "First line: N\nSecond line: N space-separated integers\nThird line: integer k",
            "output_format": "Print rotated array space-separated.",
            "constraints": "1 <= N <= 10^5\n0 <= k <= 10^5",
            "sample_input": "7\n1 2 3 4 5 6 7\n3",
            "sample_output": "5 6 7 1 2 3 4",
            "test_cases": [
                {"input": "7\n1 2 3 4 5 6 7\n3", "expected_output": "5 6 7 1 2 3 4", "is_sample": True},
                {"input": "4\n-1 -100 3 99\n2", "expected_output": "3 99 -1 -100", "is_sample": True},
                {"input": "2\n1 2\n0", "expected_output": "1 2", "is_sample": False}
            ]
        },
        {
            "title": "Prime Sieve (Count Primes)",
            "slug": "prime-sieve-count-primes",
            "difficulty": "Medium",
            "topic": "Mathematics",
            "description": "Given an integer `n`, return the number of prime numbers that are strictly less than `n` using Sieve of Eratosthenes.",
            "input_format": "A single integer n.",
            "output_format": "Print the count of prime numbers < n.",
            "constraints": "0 <= n <= 5 * 10^6",
            "sample_input": "10",
            "sample_output": "4",
            "test_cases": [
                {"input": "10", "expected_output": "4", "is_sample": True},
                {"input": "0", "expected_output": "0", "is_sample": True},
                {"input": "1", "expected_output": "0", "is_sample": False},
                {"input": "30", "expected_output": "10", "is_sample": False}
            ]
        },
        {
            "title": "Trapping Rain Water",
            "slug": "trapping-rain-water",
            "difficulty": "Hard",
            "topic": "Arrays",
            "description": "Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
            "input_format": "First line: N\nSecond line: N space-separated integers",
            "output_format": "Print total units of trapped rain water.",
            "constraints": "1 <= N <= 2 * 10^4\n0 <= height[i] <= 10^5",
            "sample_input": "12\n0 1 0 2 1 0 1 3 2 1 2 1",
            "sample_output": "6",
            "test_cases": [
                {"input": "12\n0 1 0 2 1 0 1 3 2 1 2 1", "expected_output": "6", "is_sample": True},
                {"input": "6\n4 2 0 3 2 5", "expected_output": "9", "is_sample": True},
                {"input": "3\n1 2 3", "expected_output": "0", "is_sample": False}
            ]
        },
        {
            "title": "Next Greater Element",
            "slug": "next-greater-element",
            "difficulty": "Medium",
            "topic": "Stack",
            "description": "Given an array of integers, print the next greater element (NGE) for every element. The Next Greater Element for an element x is the first greater element on the right side of x in the array. If no greater element exists, output -1 for that element.",
            "input_format": "First line: N\nSecond line: N space-separated integers",
            "output_format": "Print N space-separated integers representing NGE for each element.",
            "constraints": "1 <= N <= 10^4",
            "sample_input": "4\n4 5 2 25",
            "sample_output": "5 25 25 -1",
            "test_cases": [
                {"input": "4\n4 5 2 25", "expected_output": "5 25 25 -1", "is_sample": True},
                {"input": "4\n13 7 6 12", "expected_output": "-1 12 12 -1", "is_sample": True},
                {"input": "3\n1 2 3", "expected_output": "2 3 -1", "is_sample": False}
            ]
        },
        {
            "title": "Reverse Words in a String",
            "slug": "reverse-words-in-a-string",
            "difficulty": "Medium",
            "topic": "Strings",
            "description": "Given an input string `s`, reverse the order of the words. A word is defined as a sequence of non-space characters. The words in `s` will be separated by at least one space.\nReturn a string of the words in reverse order concatenated by a single space, without leading/trailing spaces.",
            "input_format": "A single line containing string s.",
            "output_format": "Print the words in reverse order separated by single space.",
            "constraints": "1 <= s.length <= 10^4",
            "sample_input": "the sky is blue",
            "sample_output": "blue is sky the",
            "test_cases": [
                {"input": "the sky is blue", "expected_output": "blue is sky the", "is_sample": True},
                {"input": "  hello world  ", "expected_output": "world hello", "is_sample": True},
                {"input": "a good   example", "expected_output": "example good a", "is_sample": False}
            ]
        },
        {
            "title": "Max Depth of Binary Tree",
            "slug": "max-depth-of-binary-tree",
            "difficulty": "Easy",
            "topic": "Trees",
            "description": "Given the number of levels and level-order traversal format where -1 denotes null, calculate the maximum depth of the binary tree.",
            "input_format": "First line contains N (number of node tokens in level-order).\nSecond line contains N space-separated values (-1 for null).",
            "output_format": "Print the depth of the binary tree.",
            "constraints": "1 <= N <= 10^4",
            "sample_input": "7\n3 9 20 -1 -1 15 7",
            "sample_output": "3",
            "test_cases": [
                {"input": "7\n3 9 20 -1 -1 15 7", "expected_output": "3", "is_sample": True},
                {"input": "3\n1 -1 2", "expected_output": "2", "is_sample": True},
                {"input": "1\n1", "expected_output": "1", "is_sample": False}
            ]
        },
        {
            "title": "Graph Number of Connected Components",
            "slug": "graph-connected-components",
            "difficulty": "Medium",
            "topic": "Graphs",
            "description": "You have a graph of `n` nodes labeled from 0 to n - 1. You are given an integer `n` and an array of `edges` where `edges[i] = [ai, bi]` indicates that there is an edge between `ai` and `bi` in the graph. Return the number of connected components in the graph.",
            "input_format": "First line: N (vertices) and E (edges)\nNext E lines: u v (edges)",
            "output_format": "Print the count of connected components.",
            "constraints": "1 <= N <= 2000\n0 <= E <= 5000",
            "sample_input": "5 4\n0 1\n1 2\n3 4\n2 0",
            "sample_output": "2",
            "test_cases": [
                {"input": "5 4\n0 1\n1 2\n3 4\n2 0", "expected_output": "2", "is_sample": True},
                {"input": "5 3\n0 1\n1 2\n2 3", "expected_output": "2", "is_sample": True},
                {"input": "3 0", "expected_output": "3", "is_sample": False}
            ]
        },
        {
            "title": "Median of Two Sorted Arrays",
            "slug": "median-of-two-sorted-arrays",
            "difficulty": "Hard",
            "topic": "Searching",
            "description": "Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the median of the two sorted arrays.\nPrint the result formatted to 1 decimal place (e.g. 2.0 or 2.5).",
            "input_format": "First line: M (size of array 1)\nSecond line: M space-separated integers\nThird line: N (size of array 2)\nFourth line: N space-separated integers",
            "output_format": "Print the median formatted as float.",
            "constraints": "0 <= M, N <= 1000",
            "sample_input": "2\n1 3\n1\n2",
            "sample_output": "2.0",
            "test_cases": [
                {"input": "2\n1 3\n1\n2", "expected_output": "2.0", "is_sample": True},
                {"input": "2\n1 2\n2\n3 4", "expected_output": "2.5", "is_sample": True},
                {"input": "0\n\n1\n1", "expected_output": "1.0", "is_sample": False}
            ]
        }
    ]

    inserted_problem_ids = []
    for prob in problems_data:
        prob_doc = {
            "title": prob["title"],
            "slug": prob["slug"],
            "difficulty": prob["difficulty"],
            "topic": prob["topic"],
            "description": prob["description"],
            "input_format": prob["input_format"],
            "output_format": prob["output_format"],
            "constraints": prob["constraints"],
            "sample_input": prob["sample_input"],
            "sample_output": prob["sample_output"],
            "sample_test_cases": [{"input": prob["sample_input"], "expected_output": prob["sample_output"], "is_sample": True}],
            "test_cases": [{"input": prob["sample_input"], "expected_output": prob["sample_output"], "is_sample": True}],
            "supported_languages": ["python", "c", "cpp", "java", "javascript", "go", "rust"],
            "time_limit": 2.0,
            "memory_limit": 128,
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        }
        res = db.problems.insert_one(prob_doc)
        inserted_problem_ids.append(str(res.inserted_id))
    print(f"Seeded {len(problems_data)} coding problems.")

    print("--- 4. Seeding 30 Technical MCQs ---")
    mcqs_data = [
        # C Programming
        {
            "question": "In C, what is the size of a pointer variable on a 64-bit architecture?",
            "options": ["2 bytes", "4 bytes", "8 bytes", "Depends on data type pointed to"],
            "correct_answer": "8 bytes",
            "explanation": "On a 64-bit architecture, pointers hold 64-bit memory addresses, which take 8 bytes regardless of the data type.",
            "topic": "C Programming",
            "difficulty": "Easy"
        },
        {
            "question": "Which of the following functions in C is used to dynamically allocate memory and initialize all bytes to zero?",
            "options": ["malloc()", "calloc()", "realloc()", "free()"],
            "correct_answer": "calloc()",
            "explanation": "calloc() allocates memory for an array of elements, initializes them to zero, and returns a pointer to the memory.",
            "topic": "C Programming",
            "difficulty": "Easy"
        },
        # C++
        {
            "question": "What is virtual function in C++ primarily used to achieve?",
            "options": ["Compile-time Polymorphism", "Run-time Polymorphism", "Data Encapsulation", "Multiple Inheritance"],
            "correct_answer": "Run-time Polymorphism",
            "explanation": "Virtual functions enable dynamic binding (late binding), allowing runtime polymorphism in C++.",
            "topic": "C++",
            "difficulty": "Easy"
        },
        {
            "question": "Which C++ STL container is implemented as a Red-Black Tree by default?",
            "options": ["std::vector", "std::unordered_map", "std::set", "std::deque"],
            "correct_answer": "std::set",
            "explanation": "std::set and std::map in C++ are typically implemented as self-balancing Red-Black binary search trees providing O(log n) lookups.",
            "topic": "C++",
            "difficulty": "Medium"
        },
        # Python
        {
            "question": "In Python, what is the time complexity of looking up a key in a standard `dict` on average?",
            "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
            "correct_answer": "O(1)",
            "explanation": "Python dictionaries are implemented using hash tables, achieving average O(1) time complexity for lookups.",
            "topic": "Python",
            "difficulty": "Easy"
        },
        {
            "question": "What does the Python GIL (Global Interpreter Lock) prevent?",
            "options": ["Multiple processes from running simultaneously", "Multiple native threads from executing Python bytecodes simultaneously in CPython", "Memory leaks in circular references", "Garbage collection execution"],
            "correct_answer": "Multiple native threads from executing Python bytecodes simultaneously in CPython",
            "explanation": "CPython's GIL ensures that only one thread executes Python bytecode at a time, simplifying thread safety of memory management.",
            "topic": "Python",
            "difficulty": "Medium"
        },
        # Java
        {
            "question": "Which keyword in Java prevents a class from being subclassed / inherited?",
            "options": ["static", "abstract", "final", "const"],
            "correct_answer": "final",
            "explanation": "When a class is declared with the `final` keyword in Java, no other class can extend it.",
            "topic": "Java",
            "difficulty": "Easy"
        },
        {
            "question": "Where are objects allocated in Java runtime memory?",
            "options": ["Stack Memory", "Heap Memory", "Method Area", "Program Counter Register"],
            "correct_answer": "Heap Memory",
            "explanation": "All object instances in Java are created and allocated on the Garbage-Collected Heap memory.",
            "topic": "Java",
            "difficulty": "Easy"
        },
        # Data Structures
        {
            "question": "What is the worst-case time complexity of inserting an element into an AVL Tree?",
            "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
            "correct_answer": "O(log n)",
            "explanation": "AVL trees strictly maintain a balance factor between -1 and 1, guaranteeing O(log n) worst-case height and insertion time.",
            "topic": "Data Structures",
            "difficulty": "Medium"
        },
        {
            "question": "Which data structure is most suitable for implementing a Breadth-First Search (BFS) graph traversal?",
            "options": ["Stack", "Queue", "Priority Queue", "Binary Search Tree"],
            "correct_answer": "Queue",
            "explanation": "BFS explores vertices level by level, following First-In-First-Out (FIFO) order, which is inherently provided by a Queue.",
            "topic": "Data Structures",
            "difficulty": "Easy"
        },
        {
            "question": "In a max-heap of size N, what is the index of the parent of node at index i (0-based indexing)?",
            "options": ["(i - 1) / 2", "(i + 1) / 2", "2 * i + 1", "2 * i + 2"],
            "correct_answer": "(i - 1) / 2",
            "explanation": "For 0-based array representations of binary heaps, the parent of index `i` is always located at `floor((i - 1) / 2)`.",
            "topic": "Data Structures",
            "difficulty": "Easy"
        },
        # Algorithms
        {
            "question": "What is the average and worst-case time complexity of QuickSort respectively?",
            "options": ["O(n log n) and O(n log n)", "O(n log n) and O(n^2)", "O(n) and O(n log n)", "O(n^2) and O(n^2)"],
            "correct_answer": "O(n log n) and O(n^2)",
            "explanation": "QuickSort runs in O(n log n) on average, but degrades to O(n^2) in the worst case when unbalanced partitions are chosen.",
            "topic": "Algorithms",
            "difficulty": "Easy"
        },
        {
            "question": "Which algorithm is used to find the shortest path from a single source node to all other nodes in a graph with non-negative edge weights?",
            "options": ["Floyd-Warshall Algorithm", "Dijkstra's Algorithm", "Kruskal's Algorithm", "Bellman-Ford Algorithm"],
            "correct_answer": "Dijkstra's Algorithm",
            "explanation": "Dijkstra's Algorithm solves the single-source shortest path problem on graphs with non-negative weights in O((V + E) log V) time.",
            "topic": "Algorithms",
            "difficulty": "Medium"
        },
        # DBMS & SQL
        {
            "question": "Which normal form removes transitive functional dependencies?",
            "options": ["1NF", "2NF", "3NF", "BCNF"],
            "correct_answer": "3NF",
            "explanation": "A relation is in Third Normal Form (3NF) if it is in 2NF and no non-prime attribute is transitively dependent on the primary key.",
            "topic": "DBMS",
            "difficulty": "Medium"
        },
        {
            "question": "What does ACID stand for in database transaction management?",
            "options": ["Atomicity, Consistency, Isolation, Durability", "Availability, Consistency, Integrity, Durability", "Accuracy, Concurrency, Isolation, Distribution", "Atomicity, Coherence, Independence, Durability"],
            "correct_answer": "Atomicity, Consistency, Isolation, Durability",
            "explanation": "ACID properties ensure that database transactions are processed reliably and maintain high data integrity.",
            "topic": "DBMS",
            "difficulty": "Easy"
        },
        {
            "question": "In SQL, which clause is used to filter groups created by the `GROUP BY` statement?",
            "options": ["WHERE", "HAVING", "FILTER", "ORDER BY"],
            "correct_answer": "HAVING",
            "explanation": "While `WHERE` filters individual rows before grouping, `HAVING` filters aggregated groups after `GROUP BY`.",
            "topic": "SQL",
            "difficulty": "Easy"
        },
        # Operating Systems
        {
            "question": "Which of the following conditions is NOT required for a deadlock to occur (Coffman conditions)?",
            "options": ["Mutual Exclusion", "Hold and Wait", "Preemption", "Circular Wait"],
            "correct_answer": "Preemption",
            "explanation": "Deadlock requires 'No Preemption'. If preemption is allowed, resources can be reclaimed to break deadlocks.",
            "topic": "Operating Systems",
            "difficulty": "Medium"
        },
        {
            "question": "What is the phenomenon where increased page frames lead to more page faults in FIFO page replacement?",
            "options": ["Thrashing", "Belady's Anomaly", "Priority Inversion", "Convoy Effect"],
            "correct_answer": "Belady's Anomaly",
            "explanation": "Belady's Anomaly is the counter-intuitive phenomenon where allocating more page frames results in more page faults under FIFO.",
            "topic": "Operating Systems",
            "difficulty": "Medium"
        },
        {
            "question": "Which scheduling algorithm is non-preemptive and prone to the convoy effect?",
            "options": ["Round Robin (RR)", "First-Come, First-Served (FCFS)", "Shortest Remaining Time First (SRTF)", "Priority Scheduling (Preemptive)"],
            "correct_answer": "First-Come, First-Served (FCFS)",
            "explanation": "In FCFS, short processes may get stuck waiting behind long CPU-bound processes, known as the convoy effect.",
            "topic": "Operating Systems",
            "difficulty": "Easy"
        },
        # Computer Networks
        {
            "question": "Which protocol works at the Transport layer of the OSI model and guarantees reliable, ordered delivery?",
            "options": ["UDP", "IP", "TCP", "ICMP"],
            "correct_answer": "TCP",
            "explanation": "Transmission Control Protocol (TCP) is a connection-oriented transport protocol that ensures ordered, error-checked packet delivery.",
            "topic": "Computer Networks",
            "difficulty": "Easy"
        },
        {
            "question": "What is the default port number for HTTPS (Hypertext Transfer Protocol Secure)?",
            "options": ["80", "443", "8080", "22"],
            "correct_answer": "443",
            "explanation": "Standard HTTP uses port 80, while encrypted HTTPS uses port 443.",
            "topic": "Computer Networks",
            "difficulty": "Easy"
        },
        {
            "question": "Which routing protocol uses the Bellman-Ford distance-vector algorithm?",
            "options": ["OSPF", "BGP", "RIP", "IS-IS"],
            "correct_answer": "RIP",
            "explanation": "Routing Information Protocol (RIP) uses hop counts and the distance-vector Bellman-Ford algorithm.",
            "topic": "Computer Networks",
            "difficulty": "Medium"
        },
        # OOP
        {
            "question": "Which OOP concept is demonstrated when multiple methods in the same class have the same name but different parameter lists?",
            "options": ["Method Overriding", "Method Overloading", "Encapsulation", "Abstraction"],
            "correct_answer": "Method Overloading",
            "explanation": "Method Overloading occurs when multiple methods in the same class share a name with differing parameter signatures.",
            "topic": "OOP",
            "difficulty": "Easy"
        },
        {
            "question": "What is the principle of hiding internal state and requiring all interaction to be performed through an object's methods?",
            "options": ["Inheritance", "Polymorphism", "Encapsulation", "Coupling"],
            "correct_answer": "Encapsulation",
            "explanation": "Encapsulation bundles data with the methods that operate on it and restricts direct access to internal object components.",
            "topic": "OOP",
            "difficulty": "Easy"
        },
        # Computer Architecture
        {
            "question": "What is the fastest type of memory located directly inside or closest to the CPU core?",
            "options": ["Main RAM", "L1 Cache / Registers", "SSD Storage", "Virtual Memory"],
            "correct_answer": "L1 Cache / Registers",
            "explanation": "CPU registers and Level 1 (L1) Cache operate at CPU clock speeds, offering nanosecond latency.",
            "topic": "Computer Architecture",
            "difficulty": "Easy"
        },
        # Software Engineering
        {
            "question": "In the Agile Scrum methodology, what is the typical duration of a Sprint?",
            "options": ["1 to 4 weeks", "6 months", "1 day", "1 year"],
            "correct_answer": "1 to 4 weeks",
            "explanation": "Scrum Sprints are time-boxed iterations, typically lasting between 1 and 4 weeks, with 2 weeks being standard.",
            "topic": "Software Engineering",
            "difficulty": "Easy"
        },
        # Web Development
        {
            "question": "Which HTTP status code signifies that the requested resource has been successfully created on the server?",
            "options": ["200 OK", "201 Created", "204 No Content", "301 Moved Permanently"],
            "correct_answer": "201 Created",
            "explanation": "HTTP 201 Created indicates that the request was fulfilled and resulted in the creation of one or more new resources.",
            "topic": "Web Development",
            "difficulty": "Easy"
        },
        {
            "question": "In modern JavaScript (ES6+), what is the primary difference between `let` and `var`?",
            "options": ["`let` has function scope, `var` has block scope", "`let` has block scope, `var` has function scope", "`let` values cannot be reassigned", "`var` is deprecated and throws errors in all browsers"],
            "correct_answer": "`let` has block scope, `var` has function scope",
            "explanation": "`let` and `const` variables are block-scoped (confined to the enclosing `{}`), while `var` is function-scoped or globally-scoped.",
            "topic": "Web Development",
            "difficulty": "Easy"
        },
        # AI / ML Basics
        {
            "question": "What problem occurs when a machine learning model learns the training data and noise too well, failing to generalize to unseen test data?",
            "options": ["Underfitting", "Overfitting", "Vanishing Gradient", "Data Leakage"],
            "correct_answer": "Overfitting",
            "explanation": "Overfitting happens when a model fits the training data too closely, capturing random noise and performing poorly on test data.",
            "topic": "AI/ML Basics",
            "difficulty": "Easy"
        },
        {
            "question": "Which activation function outputs values in the range (0, 1) and is commonly used for binary classification outputs?",
            "options": ["ReLU", "Sigmoid", "Softmax", "LeakyReLU"],
            "correct_answer": "Sigmoid",
            "explanation": "The Sigmoid activation function maps any real number into the (0, 1) range, representing probabilities in binary classification.",
            "topic": "AI/ML Basics",
            "difficulty": "Easy"
        }
    ]

    inserted_mcq_ids = []
    for mcq in mcqs_data:
        res = db.mcqs.insert_one({
            "question": mcq["question"],
            "options": mcq["options"],
            "correct_answer": mcq["correct_answer"],
            "explanation": mcq["explanation"],
            "topic": mcq["topic"],
            "difficulty": mcq["difficulty"],
            "created_at": datetime.now(timezone.utc)
        })
        inserted_mcq_ids.append(str(res.inserted_id))
    print(f"Seeded {len(mcqs_data)} technical MCQs.")

    print("--- 5. Seeding 2 Sample Contests ---")
    now = datetime.now(timezone.utc)

    # Contest 1: Active contest running right now (starts 1 hour ago, ends in 3 hours)
    c1_start = now - timedelta(hours=1)
    c1_end = now + timedelta(hours=3)
    c1_doc = {
        "title": "College Code Sprint 2026",
        "description": "The premier inter-department coding challenge for 2026. Solve 4 algorithmic problems and 5 technical MCQs to climb the leaderboard!",
        "start_time": c1_start,
        "end_time": c1_end,
        "duration_minutes": 120,
        "problem_ids": inserted_problem_ids[:4],
        "mcq_ids": inserted_mcq_ids[:5],
        "total_points": 250,
        "is_published": True,
        "created_at": now
    }
    c1_res = db.contests.insert_one(c1_doc)

    # Contest 2: Upcoming weekend championship
    c2_start = now + timedelta(days=2)
    c2_end = now + timedelta(days=2, hours=3)
    c2_doc = {
        "title": "Freshers Algorithmic Championship",
        "description": "Exclusive contest for 1st and 2nd year students focusing on Fundamental Data Structures, Searching, and Sorting.",
        "start_time": c2_start,
        "end_time": c2_end,
        "duration_minutes": 90,
        "problem_ids": inserted_problem_ids[4:8],
        "mcq_ids": inserted_mcq_ids[5:10],
        "total_points": 250,
        "is_published": True,
        "created_at": now
    }
    c2_res = db.contests.insert_one(c2_doc)
    print("Seeded 2 sample contests: 'College Code Sprint 2026' (Active) & 'Freshers Algorithmic Championship' (Upcoming)")

    print("--- 6. Seeding Initial Submissions & Contest Activity for Leaderboard ---")
    # Add a few submissions for student STU001 and STU002 so dashboard & leaderboards look lively
    stu1 = db.users.find_one({"student_id": "STU001"})
    stu2 = db.users.find_one({"student_id": "STU002"})
    stu3 = db.users.find_one({"student_id": "STU003"})

    if stu1 and inserted_problem_ids:
        # STU001 solved problem 0 and problem 1
        db.submissions.insert_one({
            "user_id": str(stu1["_id"]),
            "student_id": "STU001",
            "student_name": stu1["name"],
            "problem_id": inserted_problem_ids[0],
            "problem_title": "Two Sum Problem",
            "language": "python",
            "code": "def solution():\n    pass\n",
            "status": "Accepted",
            "runtime": 32.5,
            "memory": 14.2,
            "passed_test_cases": 4,
            "total_test_cases": 4,
            "error_message": "",
            "created_at": now - timedelta(days=1)
        })
        db.submissions.insert_one({
            "user_id": str(stu1["_id"]),
            "student_id": "STU001",
            "student_name": stu1["name"],
            "problem_id": inserted_problem_ids[1],
            "problem_title": "Maximum Subarray Sum",
            "language": "cpp",
            "code": "// Solution\n",
            "status": "Accepted",
            "runtime": 12.1,
            "memory": 8.5,
            "passed_test_cases": 4,
            "total_test_cases": 4,
            "error_message": "",
            "created_at": now - timedelta(hours=2)
        })
        # Add contest participation
        db.contest_participants.insert_one({
            "contest_id": str(c1_res.inserted_id),
            "user_id": str(stu1["_id"]),
            "student_id": "STU001",
            "student_name": stu1["name"],
            "department": "Computer Science & Engg",
            "joined_at": now - timedelta(minutes=45),
            "score": 130,
            "problems_solved": 2,
            "mcqs_correct": 3,
            "submitted": True,
            "submitted_at": now - timedelta(minutes=10),
            "anti_cheat_logs": []
        })

    if stu2 and inserted_problem_ids:
        # STU002 solved problem 0
        db.submissions.insert_one({
            "user_id": str(stu2["_id"]),
            "student_id": "STU002",
            "student_name": stu2["name"],
            "problem_id": inserted_problem_ids[0],
            "problem_title": "Two Sum Problem",
            "language": "java",
            "code": "// Java solution\n",
            "status": "Accepted",
            "runtime": 45.0,
            "memory": 22.1,
            "passed_test_cases": 4,
            "total_test_cases": 4,
            "error_message": "",
            "created_at": now - timedelta(hours=5)
        })
        db.contest_participants.insert_one({
            "contest_id": str(c1_res.inserted_id),
            "user_id": str(stu2["_id"]),
            "student_id": "STU002",
            "student_name": stu2["name"],
            "department": "Information Technology",
            "joined_at": now - timedelta(minutes=50),
            "score": 90,
            "problems_solved": 1,
            "mcqs_correct": 4,
            "submitted": True,
            "submitted_at": now - timedelta(minutes=15),
            "anti_cheat_logs": [{"event_type": "tab_switch", "detail": "User switched tabs", "timestamp": (now - timedelta(minutes=30)).isoformat()}]
        })

    print("--- Database Seeding Completed Successfully! ---")

if __name__ == "__main__":
    seed_database()
