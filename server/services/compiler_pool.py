"""
Production-grade Isolated Multi-Worker Code Compilation Engine.
Handles high-concurrency code executions across C, C++, Java, Python, Go, Rust, and JavaScript
without blocking the main Flask HTTP server threads.
"""

import concurrent.futures
import logging
import os
import time
from typing import Any, Dict, List
from services.piston_service import execute_code, normalize_output

logger = logging.getLogger(__name__)

# Determine worker pool capacity based on available CPU cores
CPU_COUNT = os.cpu_count() or 4
MAX_COMPILER_WORKERS = min(32, max(8, CPU_COUNT * 4))


class CompilerWorkerPool:
    def __init__(self, max_workers: int = MAX_COMPILER_WORKERS):
        self.max_workers = max_workers
        self.executor = concurrent.futures.ThreadPoolExecutor(
            max_workers=max_workers,
            thread_name_prefix="CompilerWorker"
        )
        self.total_submitted = 0
        self.total_completed = 0
        self.total_failed = 0
        self._lock = concurrent.futures.thread._threads_queues if hasattr(concurrent.futures, 'thread') else None

    def execute_single(self, language: str, code: str, stdin_input: str = "", timeout: int = 5) -> Dict[str, Any]:
        """Execute a single test case asynchronously in the worker pool."""
        self.total_submitted += 1
        future = self.executor.submit(execute_code, language, code, stdin_input, timeout)
        try:
            result = future.result(timeout=timeout + 3)
            self.total_completed += 1
            return result
        except concurrent.futures.TimeoutError:
            self.total_failed += 1
            return {
                "success": False,
                "status": "Time Limit Exceeded",
                "output": "",
                "stderr": "Execution timed out",
                "error": "Time Limit Exceeded",
                "execution_time": timeout * 1000
            }
        except Exception as e:
            self.total_failed += 1
            logger.error(f"Compiler worker execution error: {e}")
            return {
                "success": False,
                "status": "Runtime Error",
                "output": "",
                "stderr": str(e),
                "error": str(e),
                "execution_time": 0
            }

    def evaluate_test_cases(
        self,
        language: str,
        code: str,
        test_cases: List[Dict[str, Any]],
        timeout: int = 5
    ) -> Dict[str, Any]:
        """
        Evaluate multiple test cases in parallel across worker threads.
        Returns aggregate passed count, total count, execution times, and detailed breakdowns.
        """
        if not test_cases:
            return {
                "status": "Accepted",
                "passed": 0,
                "total": 0,
                "total_time_ms": 0,
                "max_time_ms": 0,
                "results": []
            }

        start_time = time.perf_counter()

        # Submit all test cases to the worker pool concurrently
        futures = []
        for idx, tc in enumerate(test_cases):
            tc_in = tc.get("input", "")
            tc_expected = normalize_output(tc.get("expected_output", tc.get("output", "")))
            f = self.executor.submit(execute_code, language, code, tc_in, timeout)
            futures.append((idx, tc, tc_expected, f))

        passed_count = 0
        max_time_ms = 0
        detailed_results = []
        overall_status = "Accepted"

        for idx, tc, expected, future in futures:
            try:
                res = future.result(timeout=timeout + 2)
            except Exception as e:
                res = {
                    "success": False,
                    "status": "Runtime Error",
                    "output": "",
                    "stderr": str(e),
                    "execution_time": 0
                }

            out = normalize_output(res.get("output", ""))
            err = res.get("stderr", "") or res.get("error", "")
            exec_time = res.get("execution_time", 0)
            max_time_ms = max(max_time_ms, exec_time)

            is_correct = bool(out == expected and not err and res.get("success", False))

            if is_correct:
                status = "Passed"
                passed_count += 1
            elif "Time Limit Exceeded" in res.get("status", "") or "timeout" in str(err).lower():
                status = "Time Limit Exceeded"
                if overall_status == "Accepted":
                    overall_status = "Time Limit Exceeded"
            elif "Compilation Error" in res.get("status", ""):
                status = "Compilation Error"
                if overall_status == "Accepted":
                    overall_status = "Compilation Error"
            elif "Runtime Error" in res.get("status", ""):
                status = "Runtime Error"
                if overall_status == "Accepted":
                    overall_status = "Runtime Error"
            else:
                status = "Wrong Answer"
                if overall_status == "Accepted":
                    overall_status = "Wrong Answer"

            detailed_results.append({
                "test_case": idx + 1,
                "status": status,
                "passed": is_correct,
                "input": tc.get("input", "") if tc.get("is_sample") else "(Hidden)",
                "expected_output": expected if tc.get("is_sample") else "(Hidden)",
                "actual_output": out if tc.get("is_sample") else ("" if is_correct else "(Output Mismatch)"),
                "error": err,
                "execution_time_ms": exec_time
            })

        total_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
        total_count = len(test_cases)

        if passed_count == total_count and total_count > 0:
            final_status = "Accepted"
        elif passed_count > 0:
            final_status = "Partially Accepted" if overall_status in ["Accepted", "Wrong Answer"] else overall_status
        else:
            final_status = overall_status if overall_status != "Accepted" else "Wrong Answer"

        return {
            "status": final_status,
            "passed": passed_count,
            "total": total_count,
            "total_time_ms": total_time_ms,
            "max_time_ms": max_time_ms,
            "results": detailed_results
        }

    def get_metrics(self) -> Dict[str, Any]:
        """Return real-time metrics of compiler worker throughput and utilization."""
        return {
            "max_workers": self.max_workers,
            "total_submitted": self.total_submitted,
            "total_completed": self.total_completed,
            "total_failed": self.total_failed,
            "active_workers": min(self.total_submitted - self.total_completed, self.max_workers)
        }


# Global compiler pool singleton
compiler_pool = CompilerWorkerPool()
