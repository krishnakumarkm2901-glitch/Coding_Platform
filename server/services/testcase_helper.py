"""
Testcase Helper Service for Campus Coder.
Ensures that for any problem, only the explicit Sample Input + Sample Output
(or explicit sample test cases provided in the problem) are used for both UI and evaluation.
No hidden test cases, random test cases, or additional test cases.
"""

from typing import Any, Dict, List


def get_problem_sample_test_cases(problem: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Returns only the sample test cases for a problem.
    Priority:
    1. If problem has `sample_test_cases` (with is_hidden != True), use those.
    2. If problem has `test_cases`, use only those with `is_sample == True` and `is_hidden != True`.
    3. Fallback to `sample_input` and `sample_output`.
    """
    if not problem:
        return []

    cases = []

    # 1. Explicit sample_test_cases
    if Array_or_list(problem.get("sample_test_cases")):
        for tc in problem["sample_test_cases"]:
            if tc.get("is_hidden") is True:
                continue
            inp = tc.get("input") if tc.get("input") is not None else tc.get("stdin", "")
            out = tc.get("expected_output") if tc.get("expected_output") is not None else tc.get("output", "")
            cases.append({
                "input": str(inp) if inp is not None else "",
                "expected_output": str(out) if out is not None else "",
                "explanation": tc.get("explanation", ""),
                "is_sample": True
            })

    # 2. Check test_cases if no sample_test_cases found
    if not cases and Array_or_list(problem.get("test_cases")):
        for tc in problem["test_cases"]:
            # Strictly ONLY include if explicitly marked as is_sample == True and not hidden
            if tc.get("is_sample") is True and not tc.get("is_hidden", False):
                inp = tc.get("input") if tc.get("input") is not None else tc.get("stdin", "")
                out = tc.get("expected_output") if tc.get("expected_output") is not None else tc.get("output", "")
                cases.append({
                    "input": str(inp) if inp is not None else "",
                    "expected_output": str(out) if out is not None else "",
                    "explanation": tc.get("explanation", ""),
                    "is_sample": True
                })

    # 3. Fallback to sample_input & sample_output
    sample_in = problem.get("sample_input")
    sample_out = problem.get("sample_output")

    if not cases and (sample_in is not None or sample_out is not None):
        cases.append({
            "input": str(sample_in) if sample_in is not None else "",
            "expected_output": str(sample_out) if sample_out is not None else "",
            "explanation": "",
            "is_sample": True
        })

    return cases


def Array_or_list(val):
    return isinstance(val, (list, tuple)) and len(val) > 0
