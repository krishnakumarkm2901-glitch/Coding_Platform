"""
OneCompiler API Integration Provider.
Implements the primary remote execution engine using OneCompiler API v1.
"""

import logging
import os
import requests
import time
from typing import Any, Dict, List, Optional

from services.compiler.base import CompilerProvider, ExecutionResult
from services.diagnostic_parser import parse_diagnostics, pre_validate_code, sanitize_text

logger = logging.getLogger(__name__)

LANGUAGE_FILE_MAP = {
    "python": {"name": "main.py", "onecompiler_lang": "python"},
    "python3": {"name": "main.py", "onecompiler_lang": "python"},
    "py": {"name": "main.py", "onecompiler_lang": "python"},
    "c": {"name": "main.c", "onecompiler_lang": "c"},
    "cpp": {"name": "main.cpp", "onecompiler_lang": "cpp"},
    "c++": {"name": "main.cpp", "onecompiler_lang": "cpp"},
    "java": {"name": "Main.java", "onecompiler_lang": "java"},
    "javascript": {"name": "main.js", "onecompiler_lang": "javascript"},
    "js": {"name": "main.js", "onecompiler_lang": "javascript"},
    "go": {"name": "main.go", "onecompiler_lang": "go"},
    "golang": {"name": "main.go", "onecompiler_lang": "go"},
    "rust": {"name": "main.rs", "onecompiler_lang": "rust"},
    "rs": {"name": "main.rs", "onecompiler_lang": "rust"},
}


class OneCompilerProvider(CompilerProvider):
    """Primary Online Compiler Provider via OneCompiler API."""

    def __init__(self, api_key: Optional[str] = None, api_url: Optional[str] = None):
        self.api_key = (api_key or os.environ.get("ONECOMPILER_API_KEY", "")).strip()
        self.api_url = (api_url or os.environ.get("ONECOMPILER_API_URL", "https://onecompiler.com/api/v1/run")).strip()

    def execute(self, language: str, code: str, stdin: str = "", timeout: int = 5) -> ExecutionResult:
        lang_lower = (language or "python").lower()
        lang_info = LANGUAGE_FILE_MAP.get(lang_lower, {"name": "main.txt", "onecompiler_lang": lang_lower})
        one_lang = lang_info["onecompiler_lang"]
        file_name = lang_info["name"]

        # Level 1 Static AST pre-validation
        pre_diags = pre_validate_code(lang_lower, code)
        if pre_diags:
            first_err = pre_diags[0]
            return ExecutionResult(
                success=False,
                status="Syntax Error",
                stderr=first_err.get("compiler_message", "Syntax Error"),
                error=first_err.get("compiler_message", "Syntax Error"),
                error_type="syntax_error",
                diagnostics=pre_diags,
                provider="onecompiler_precheck"
            )

        # Fallback to local sandbox if API key is not configured
        if not self.api_key:
            from services.compiler.local_provider import LocalSandboxProvider
            return LocalSandboxProvider().execute(language, code, stdin, timeout)

        payload = {
            "language": one_lang,
            "stdin": stdin or "",
            "files": [
                {
                    "name": file_name,
                    "content": code
                }
            ]
        }

        headers = {
            "Content-Type": "application/json",
            "access-token": self.api_key,
            "X-API-Key": self.api_key
        }

        # Attempt remote API execution with 2 retries on network failures
        for attempt in range(2):
            try:
                start_time = time.perf_counter()
                resp = requests.post(self.api_url, json=payload, headers=headers, timeout=timeout + 2)
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

                if resp.status_code in [200, 201]:
                    data = resp.json()
                    stdout = sanitize_text(data.get("stdout") or "")
                    stderr = sanitize_text(data.get("stderr") or "")
                    exception = sanitize_text(data.get("exception") or "")
                    exec_time = float(data.get("executionTime") or elapsed_ms)
                    limit_exceeded = bool(data.get("limitExceeded", False))

                    if limit_exceeded:
                        return ExecutionResult(
                            success=False,
                            status="Time Limit Exceeded",
                            stdout=stdout,
                            stderr="Time Limit Exceeded",
                            error="Time Limit Exceeded",
                            runtime_ms=exec_time,
                            error_type="timeout",
                            provider="onecompiler"
                        )

                    # Check for compilation / syntax errors
                    if exception and ("Compilation" in exception or "SyntaxError" in exception or "error:" in exception):
                        diags = parse_diagnostics(language, exception or stderr, is_compile=True)
                        return ExecutionResult(
                            success=False,
                            status="Compilation Error",
                            stdout=stdout,
                            stderr=exception or stderr,
                            error=exception or stderr,
                            runtime_ms=exec_time,
                            diagnostics=diags,
                            error_type="compile_error",
                            provider="onecompiler"
                        )

                    # Check for runtime errors
                    if stderr or (exception and not stdout):
                        err_content = exception or stderr
                        diags = parse_diagnostics(language, err_content, is_compile=False)
                        return ExecutionResult(
                            success=False,
                            status="Runtime Error",
                            stdout=stdout,
                            stderr=err_content,
                            error=err_content,
                            runtime_ms=exec_time,
                            diagnostics=diags,
                            error_type="runtime_error",
                            provider="onecompiler"
                        )

                    return ExecutionResult(
                        success=True,
                        status="OK",
                        stdout=stdout,
                        stderr=stderr,
                        runtime_ms=exec_time,
                        provider="onecompiler"
                    )
                elif resp.status_code in [401, 403]:
                    logger.error("OneCompiler API authentication failed (HTTP %s). Check ONECOMPILER_API_KEY.", resp.status_code)
                    break
                else:
                    logger.warning("OneCompiler API returned HTTP %s on attempt %s", resp.status_code, attempt + 1)

            except (requests.RequestException, ValueError) as exc:
                logger.warning("OneCompiler request attempt %s failed: %s", attempt + 1, exc)
                time.sleep(0.25)

        # Fallback to Local Sandbox if OneCompiler API is temporarily unavailable
        logger.info("OneCompiler API unavailable or exhausted, delegating to LocalSandboxProvider.")
        from services.compiler.local_provider import LocalSandboxProvider
        return LocalSandboxProvider().execute(language, code, stdin, timeout)
