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
    """Returns the globally configured compiler provider (default: LocalSandboxProvider or OneCompiler when API key is provided)."""
    global _global_provider
    if _global_provider is None:
        provider_name = os.environ.get("COMPILER_PROVIDER", "auto").strip().lower()
        onecompiler_key = os.environ.get("ONECOMPILER_API_KEY", "").strip()
        onlinecompiler_key = os.environ.get("ONLINECOMPILER_API_KEY", "").strip()

        if provider_name == "onecompiler" and onecompiler_key:
            _global_provider = OneCompilerProvider()
        elif provider_name == "onlinecompiler" and onlinecompiler_key:
            _global_provider = OnlineCompilerProvider()
        else:
            _global_provider = LocalSandboxProvider()
    return _global_provider

