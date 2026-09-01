"""
OnlineCompiler.io API Execution Provider.
Alternative execution provider for Campus Coder.
"""

import logging
import os
import requests
import time
from typing import Optional

from services.compiler.base import CompilerProvider, ExecutionResult
from services.diagnostic_parser import parse_diagnostics, pre_validate_code, sanitize_text

logger = logging.getLogger(__name__)


class OnlineCompilerProvider(CompilerProvider):
    """Alternative Online Compiler Provider for onlinecompiler.io."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = (api_key or os.environ.get("ONLINECOMPILER_API_KEY", "")).strip()
        self.api_url = os.environ.get("ONLINECOMPILER_API_URL", "https://api.onlinecompiler.io/v1/run").strip()

    def execute(self, language: str, code: str, stdin: str = "", timeout: int = 5) -> ExecutionResult:
        lang_lower = (language or "python").lower()

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
                provider="onlinecompiler_precheck"
            )

        if not self.api_key:
            from services.compiler.local_provider import LocalSandboxProvider
            return LocalSandboxProvider().execute(language, code, stdin, timeout)

        payload = {
            "language": lang_lower,
            "source": code,
            "stdin": stdin or "",
            "timeout": timeout
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        try:
            start_time = time.perf_counter()
            resp = requests.post(self.api_url, json=payload, headers=headers, timeout=timeout + 2)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if resp.status_code == 200:
                data = resp.json()
                stdout = sanitize_text(data.get("output") or data.get("stdout") or "")
                stderr = sanitize_text(data.get("error") or data.get("stderr") or "")
                exec_time = float(data.get("time") or elapsed_ms)

                if stderr:
                    diags = parse_diagnostics(language, stderr, is_compile="Error" in stderr)
                    return ExecutionResult(
                        success=False,
                        status="Runtime Error" if "Traceback" in stderr else "Compilation Error",
                        stdout=stdout,
                        stderr=stderr,
                        error=stderr,
                        runtime_ms=exec_time,
                        diagnostics=diags,
                        provider="onlinecompiler"
                    )

                return ExecutionResult(
                    success=True,
                    status="OK",
                    stdout=stdout,
                    stderr="",
                    runtime_ms=exec_time,
                    provider="onlinecompiler"
                )
        except Exception as exc:
            logger.warning("OnlineCompiler API error: %s", exc)

        from services.compiler.local_provider import LocalSandboxProvider
        return LocalSandboxProvider().execute(language, code, stdin, timeout)
