"""
Compiler Provider Bridge for Campus Coder.
Exports the unified CompilerProvider, ExecutionResult, and get_compiler_provider factory.
"""

from services.compiler.base import CompilerProvider, ExecutionResult
from services.compiler.factory import get_compiler_provider
from services.compiler.local_provider import LocalSandboxProvider
from services.compiler.onecompiler_provider import OneCompilerProvider
from services.compiler.onlinecompiler_provider import OnlineCompilerProvider

__all__ = [
    "CompilerProvider",
    "ExecutionResult",
    "get_compiler_provider",
    "LocalSandboxProvider",
    "OneCompilerProvider",
    "OnlineCompilerProvider",
]
