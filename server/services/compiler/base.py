"""
Base Compiler Provider interface and normalized ExecutionResult.
All execution providers (OneCompiler, OnlineCompiler, Local Sandbox) adhere to this contract.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


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
        memory_mb: Optional[float] = 14.2,
        diagnostics: Optional[List[Dict[str, Any]]] = None,
        error_type: Optional[str] = None,
        provider: str = "local_sandbox",
        verdict: Optional[str] = None
    ):
        self.success = success
        self.status = status  # "OK", "Compilation Error", "Runtime Error", "Time Limit Exceeded", "Memory Limit Exceeded", "Execution Engine Unavailable"
        self.stdout = stdout
        self.output = stdout
        self.stderr = stderr
        self.error = error or stderr
        self.exit_code = exit_code
        self.runtime_ms = runtime_ms
        self.execution_time = runtime_ms
        self.memory_mb = memory_mb if memory_mb is not None else 14.2
        self.memory = self.memory_mb
        self.diagnostics = diagnostics or []
        self.error_type = error_type
        self.provider = provider
        
        # Calculate verdict
        if verdict:
            self.verdict = verdict
        elif status == "OK" or status == "Accepted":
            self.verdict = "ACCEPTED"
        elif status == "Execution Engine Unavailable":
            self.verdict = "CONNECTION_ERROR"
        elif status in ("Compilation Error", "Syntax Error"):
            self.verdict = "COMPILATION_ERROR"
        elif status == "Time Limit Exceeded":
            self.verdict = "TIME_LIMIT_EXCEEDED"
        elif status == "Memory Limit Exceeded":
            self.verdict = "MEMORY_LIMIT_EXCEEDED"
        elif status == "Runtime Error":
            self.verdict = "RUNTIME_ERROR"
        else:
            self.verdict = status.upper().replace(" ", "_")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "status": self.status,
            "verdict": self.verdict,
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
        """Execute single code instance against stdin."""
        pass

    def health_check(self) -> Dict[str, Any]:
        """Verify provider availability and connectivity."""
        return {"status": "available", "provider": self.__class__.__name__}
