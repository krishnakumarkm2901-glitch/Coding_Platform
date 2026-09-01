"""
Compiler Provider Factory.
Instantiates the configured compiler provider based on COMPILER_PROVIDER environment variable.
"""

import os
from typing import Optional

from services.compiler.base import CompilerProvider
from services.compiler.onecompiler_provider import OneCompilerProvider
from services.compiler.onlinecompiler_provider import OnlineCompilerProvider
from services.compiler.local_provider import LocalSandboxProvider

_global_provider: Optional[CompilerProvider] = None


def get_compiler_provider() -> CompilerProvider:
    """Returns the globally configured compiler provider (default: OneCompiler)."""
    global _global_provider
    if _global_provider is None:
        provider_name = os.environ.get("COMPILER_PROVIDER", "onecompiler").strip().lower()
        if provider_name == "onecompiler":
            _global_provider = OneCompilerProvider()
        elif provider_name == "onlinecompiler":
            _global_provider = OnlineCompilerProvider()
        else:
            _global_provider = LocalSandboxProvider()
    return _global_provider
