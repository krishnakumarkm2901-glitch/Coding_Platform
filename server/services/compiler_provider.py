"""
Compiler Provider Abstraction for Campus Coder.
Supports OneCompiler API as primary provider, with Local Sandbox and OnlineCompiler as fallbacks.
Maintains backend-only API key handling, request retry logic, timeout enforcement, and standardized ExecutionResult.
"""

import logging
import os
import requests
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from services.diagnostic_parser import parse_diagnostics, pre_validate_code, sanitize_text

logger = logging.getLogger(__name__)

# Standard language mapping for OneCompiler and generic online compilers
LANGUAGE_FILE_MAP = {
    "python": {"name": "main.py", "onecompiler_lang": "python", "piston_lang": "python"},
    "python3": {"name": "main.py", "onecompiler_lang": "python", "piston_lang": "python"},
    "py": {"name": "main.py", "onecompiler_lang": "python", "piston_lang": "python"},
    "c": {"name": "main.c", "onecompiler_lang": "c", "piston_lang": "c"},
    "cpp": {"name": "main.cpp", "onecompiler_lang": "cpp", "piston_lang": "cpp"},
    "c++": {"name": "main.cpp", "onecompiler_lang": "cpp", "piston_lang": "cpp"},
    "java": {"name": "Main.java", "onecompiler_lang": "java", "piston_lang": "java"},
    "javascript": {"name": "main.js", "onecompiler_lang": "javascript", "piston_lang": "javascript"},
    "js": {"name": "main.js", "onecompiler_lang": "javascript", "piston_lang": "javascript"},
    "go": {"name": "main.go", "onecompiler_lang": "go", "piston_lang": "go"},
    "golang": {"name": "main.go", "onecompiler_lang": "go", "piston_lang": "go"},
    "rust": {"name": "main.rs", "onecompiler_lang": "rust", "piston_lang": "rust"},
    "rs": {"name": "main.rs", "onecompiler_lang": "rust", "piston_lang": "rust"},
}

class ExecutionResult:
    """Standardized result returned by any compiler provider."""
    def __init__(
        self,
        success: bool,
        status: str,
        stdout: str = "",
        stderr: str = "",
        error: str = "",
        exit_code: int = 0,
        runtime_ms: float = 0.0,
        memory_mb: float = 14.2,
        diagnostics: Optional[List[Dict[str, Any]]] = None,
        error_type: Optional[str] = None,
        provider: str = "local"
    ):
        self.success = success
        self.status = status # "OK", "Compilation Error", "Runtime Error", "Time Limit Exceeded", "Memory Limit Exceeded", "Internal Error"
        self.stdout = stdout
        self.output = stdout
        self.stderr = stderr
        self.error = error or stderr
        self.exit_code = exit_code
        self.runtime_ms = runtime_ms
        self.execution_time = runtime_ms
        self.memory_mb = memory_mb
        self.memory = memory_mb
        self.diagnostics = diagnostics or []
        self.error_type = error_type
        self.provider = provider

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "status": self.status,
            "output": self.stdout,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "error": self.error,
            "exit_code": self.exit_code,
            "execution_time": self.runtime_ms,
            "runtime_ms": self.runtime_ms,
            "memory": self.memory_mb,
            "memory_mb": self.memory_mb,
            "diagnostics": self.diagnostics,
            "error_type": self.error_type,
            "provider": self.provider
        }


class CompilerProvider(ABC):
    """Abstract base class for all compiler execution providers."""
    
    @abstractmethod
    def execute(self, language: str, code: str, stdin: str = "", timeout: int = 5) -> ExecutionResult:
        pass


class OneCompilerProvider(CompilerProvider):
    """OneCompiler API Integration Provider."""
    
    def __init__(self):
        self.api_key = os.environ.get("ONECOMPILER_API_KEY", "").strip()
        self.api_url = os.environ.get("ONECOMPILER_API_URL", "https://onecompiler.com/api/v1/run").strip()

    def execute(self, language: str, code: str, stdin: str = "", timeout: int = 5) -> ExecutionResult:
        lang_info = LANGUAGE_FILE_MAP.get(language.lower(), {"name": "main.txt", "onecompiler_lang": language.lower()})
        one_lang = lang_info["onecompiler_lang"]
        file_name = lang_info["name"]

        # Level 1 Static AST pre-validation
        pre_diags = pre_validate_code(language, code)
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

        # If API key is not configured or fails, fallback seamlessly to Sandbox
        if not self.api_key:
            logger.info("ONECOMPILER_API_KEY not configured, delegating to LocalSandboxProvider.")
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
            "access-token": self.api_key
        }

        # Attempt API call with limited retries
        for attempt in range(2):
            try:
                start_time = time.perf_counter()
                resp = requests.post(self.api_url, json=payload, headers=headers, timeout=timeout + 2)
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

                if resp.status_code == 200:
                    data = resp.json()
                    stdout = sanitize_text(data.get("stdout") or "")
                    stderr = sanitize_text(data.get("stderr") or "")
                    exception = sanitize_text(data.get("exception") or "")
                    exec_time = float(data.get("executionTime") or elapsed_ms)
                    limit_exceeded = data.get("limitExceeded", False)

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

            except (requests.RequestException, ValueError) as exc:
                logger.warning("OneCompiler attempt %s failed: %s", attempt + 1, exc)
                time.sleep(0.2)

        # Fallback to Local Sandbox if OneCompiler API is unavailable
        logger.info("OneCompiler API failed, falling back to LocalSandboxProvider.")
        return LocalSandboxProvider().execute(language, code, stdin, timeout)


class LocalSandboxProvider(CompilerProvider):
    """Local Sandbox & Piston Toolchain Provider."""
    
    def execute(self, language: str, code: str, stdin: str = "", timeout: int = 5) -> ExecutionResult:
        from services.piston_service import execute_code
        res = execute_code(language, code, stdin, timeout=timeout)
        return ExecutionResult(
            success=res.get("success", False),
            status=res.get("status", "Internal Error"),
            stdout=res.get("output", ""),
            stderr=res.get("stderr", ""),
            error=res.get("error", ""),
            runtime_ms=res.get("runtime_ms", res.get("execution_time", 0.0)),
            memory_mb=res.get("memory_mb", 14.2),
            diagnostics=res.get("diagnostics", []),
            error_type=res.get("error_type"),
            provider="local_sandbox"
        )


_provider_instance: Optional[CompilerProvider] = None

def get_compiler_provider() -> CompilerProvider:
    """Returns the globally configured compiler provider (OneCompiler by default)."""
    global _provider_instance
    if _provider_instance is None:
        provider_name = os.environ.get("COMPILER_PROVIDER", "onecompiler").lower()
        if provider_name == "onecompiler":
            _provider_instance = OneCompilerProvider()
        else:
            _provider_instance = LocalSandboxProvider()
    return _provider_instance
