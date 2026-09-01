"""
Local Sandbox & Piston Toolchain Execution Provider.
Provides resilient local compiler execution for Campus Coder.
"""

from services.compiler.base import CompilerProvider, ExecutionResult


class LocalSandboxProvider(CompilerProvider):
    """Local Sandbox toolchain provider."""

    def execute(self, language: str, code: str, stdin: str = "", timeout: int = 5) -> ExecutionResult:
        from services.piston_service import execute_code
        res = execute_code(language, code, stdin, timeout=timeout)
        return ExecutionResult(
            success=res.get("success", False),
            status=res.get("status", "Internal Error"),
            stdout=res.get("output", ""),
            stderr=res.get("stderr", ""),
            error=res.get("error", ""),
            exit_code=res.get("exit_code", 0),
            runtime_ms=res.get("runtime_ms", res.get("execution_time", 0.0)),
            memory_mb=res.get("memory_mb", 14.2),
            diagnostics=res.get("diagnostics", []),
            error_type=res.get("error_type"),
            provider="local_sandbox"
        )
