"""
Comprehensive toolchain resolver for Campus Coder.
Automatically locates and validates Java JDK, GCC, G++, Rust, Go, Node, and Python toolchains.
"""
import glob
import logging
import os
import re
import shutil
import subprocess
import sys
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)

def _is_valid_executable(path: Optional[str]) -> bool:
    """Check if path is an existing, non-empty executable file."""
    if not path:
        return False
    clean_path = os.path.abspath(os.path.expandvars(os.path.expanduser(path.strip().strip('"'))))
    return os.path.isfile(clean_path) and os.access(clean_path, os.X_OK | os.R_OK)

def _extract_version_score(folder_name: str) -> Tuple[int, ...]:
    """Extract numeric version components for sorting JDK versions descending."""
    nums = re.findall(r"\d+", folder_name)
    return tuple(map(int, nums)) if nums else (0,)

def resolve_java_toolchain() -> Tuple[Optional[str], Optional[str]]:
    """
    Robustly resolves Java JDK (javac) and Java Runtime (java) executables.
    
    Priority Order:
    1. Explicit JAVAC_PATH and JAVA_PATH in environment/.env
    2. JAVA_HOME/bin/javac(.exe) and JAVA_HOME/bin/java(.exe)
    3. Auto-discovery in standard Windows/Linux/macOS JDK installation locations
    4. Auto-discovery in server/toolchains/jdk/
    5. PATH lookup (excluding Oracle javapath shim if real JDK is found)
    6. Windows where.exe lookup
    """
    javac_path: Optional[str] = None
    java_path: Optional[str] = None
    exe_suffix = ".exe" if os.name == "nt" else ""

    # --- 1. Check explicit JAVAC_PATH / JAVA_PATH ---
    env_javac = os.getenv("JAVAC_PATH", "").strip().strip('"')
    if env_javac and _is_valid_executable(env_javac):
        javac_path = os.path.abspath(os.path.expandvars(os.path.expanduser(env_javac)))

    env_java = os.getenv("JAVA_PATH", "").strip().strip('"')
    if env_java and _is_valid_executable(env_java):
        java_path = os.path.abspath(os.path.expandvars(os.path.expanduser(env_java)))

    # --- 2. Check JAVA_HOME ---
    java_home = os.getenv("JAVA_HOME", "").strip().strip('"')
    if java_home:
        jh_clean = os.path.abspath(os.path.expandvars(os.path.expanduser(java_home)))
        candidate_javac = os.path.join(jh_clean, "bin", f"javac{exe_suffix}")
        candidate_java = os.path.join(jh_clean, "bin", f"java{exe_suffix}")
        if not javac_path and _is_valid_executable(candidate_javac):
            javac_path = candidate_javac
        if not java_path and _is_valid_executable(candidate_java):
            java_path = candidate_java

    # --- 3. Dynamic search in common JDK directories ---
    if not javac_path or not java_path:
        search_roots = []
        server_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        toolchains_jdk = os.path.join(server_dir, "toolchains", "jdk")
        if os.path.isdir(toolchains_jdk):
            search_roots.append(toolchains_jdk)

        if os.name == "nt":
            for prog_dir in [os.environ.get("ProgramFiles", r"C:\Program Files"),
                             os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")]:
                if prog_dir and os.path.isdir(prog_dir):
                    search_roots.extend([
                        os.path.join(prog_dir, "Java"),
                        os.path.join(prog_dir, "Eclipse Adoptium"),
                        os.path.join(prog_dir, "Microsoft"),
                        os.path.join(prog_dir, "Amazon Corretto"),
                        os.path.join(prog_dir, "Zulu"),
                        os.path.join(prog_dir, "BellSoft", "LibericaJDK"),
                    ])
        else:
            search_roots.extend([
                "/usr/lib/jvm",
                "/usr/lib/jvm/default-java",
                "/Library/Java/JavaVirtualMachines",
                os.path.join(server_dir, ".jdk"),
                "/opt/render/project/src/.jdk",
                "/opt/render/project/src/server/.jdk",
                "/tmp/jdk"
            ])

        discovered_jdks = []
        for root in search_roots:
            if not os.path.isdir(root):
                continue
            # Direct check if root itself is the JDK root
            direct_javac = os.path.join(root, "bin", f"javac{exe_suffix}")
            if os.path.isfile(direct_javac):
                discovered_jdks.append((_extract_version_score(os.path.basename(root)), root))
            try:
                for entry in os.listdir(root):
                    full_entry = os.path.join(root, entry)
                    if os.path.isdir(full_entry):
                        j_candidate = os.path.join(full_entry, "bin", f"javac{exe_suffix}")
                        if os.path.isfile(j_candidate):
                            discovered_jdks.append((_extract_version_score(entry), full_entry))
            except Exception as e:
                logger.debug(f"Error scanning JDK directory {root}: {e}")

        # Sort discovered JDKs by version score descending (newest JDK first)
        discovered_jdks.sort(key=lambda x: x[0], reverse=True)

        for _, jdk_dir in discovered_jdks:
            cand_javac = os.path.join(jdk_dir, "bin", f"javac{exe_suffix}")
            cand_java = os.path.join(jdk_dir, "bin", f"java{exe_suffix}")
            if not javac_path and _is_valid_executable(cand_javac):
                javac_path = cand_javac
            if not java_path and _is_valid_executable(cand_java):
                java_path = cand_java
            if javac_path and java_path:
                break

    # --- 4. Fallback: Check System PATH ---
    if not javac_path:
        path_javac = shutil.which("javac")
        if path_javac and _is_valid_executable(path_javac):
            # Prefer non-shim if possible, but accept if valid
            javac_path = path_javac

    if not java_path:
        # If javac was found in a real bin folder, try adjacent java.exe
        if javac_path:
            adjacent_java = os.path.join(os.path.dirname(javac_path), f"java{exe_suffix}")
            if _is_valid_executable(adjacent_java):
                java_path = adjacent_java
        if not java_path:
            path_java = shutil.which("java")
            if path_java and _is_valid_executable(path_java):
                java_path = path_java

    if javac_path and java_path:
        logger.info(f"[toolchain] Java resolved: javac={javac_path}, java={java_path}")
    else:
        logger.warning(f"[toolchain] Java NOT fully resolved: javac={javac_path}, java={java_path}, "
                       f"JAVAC_PATH env='{os.getenv('JAVAC_PATH', '')}', JAVA_HOME='{os.getenv('JAVA_HOME', '')}'")

    return javac_path, java_path

def resolve_tool(env_name: str, command: str) -> Optional[str]:
    """Resolves general language compiler/runtime tool paths."""
    exe_suffix = ".exe" if os.name == "nt" else ""
    cmd_name = f"{command}{exe_suffix}" if not command.endswith(exe_suffix) else command

    # 1. Environment variable
    configured = os.getenv(env_name, "").strip().strip('"')
    if configured and _is_valid_executable(configured):
        logger.info(f"[toolchain] {command} resolved via {env_name}: {configured}")
        return os.path.abspath(os.path.expandvars(os.path.expanduser(configured)))

    # 2. System PATH
    found = shutil.which(command)
    if found and _is_valid_executable(found):
        logger.info(f"[toolchain] {command} resolved via PATH: {found}")
        return found

    # 3. Dedicated directories (Linux standard paths + Windows paths + project toolchains)
    server_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    toolchains_dir = os.path.join(server_dir, "toolchains")

    candidates = [
        # Linux standard paths (Render, Docker, Ubuntu)
        f"/usr/bin/{command}",
        f"/usr/local/bin/{command}",
        f"/opt/render/project/src/server/.jdk/bin/{command}",
        os.path.join(server_dir, ".jdk", "bin", command),
        # Project toolchains
        os.path.join(toolchains_dir, "winlibs", "mingw64", "bin", cmd_name),
        os.path.join(toolchains_dir, "go", "go", "bin", cmd_name),
        os.path.join(toolchains_dir, "go", "bin", cmd_name),
        os.path.expanduser(os.path.join("~", ".cargo", "bin", cmd_name)),
    ]

    # Windows-specific paths (only on Windows)
    if os.name == "nt":
        candidates.extend([
            os.path.join("C:\\Program Files\\nodejs", cmd_name),
            os.path.join("C:\\Program Files\\Go\\bin", cmd_name),
            os.path.join("C:\\mingw64\\bin", cmd_name),
            os.path.join("C:\\msys64\\mingw64\\bin", cmd_name),
            os.path.join("C:\\msys64\\ucrt64\\bin", cmd_name),
        ])

    for c in candidates:
        if _is_valid_executable(c):
            logger.info(f"[toolchain] {command} resolved via candidate path: {c}")
            return c

    # 4. Search recursively inside server/toolchains
    if os.path.isdir(toolchains_dir):
        for root, _, files in os.walk(toolchains_dir):
            if cmd_name in files:
                p = os.path.join(root, cmd_name)
                if _is_valid_executable(p):
                    logger.info(f"[toolchain] {command} resolved via recursive search: {p}")
                    return p

    logger.warning(f"[toolchain] {command} NOT FOUND (env={env_name}, PATH lookup failed, no candidates matched)")
    return None

def get_toolchain_diagnostics() -> Dict[str, Dict]:
    """Returns diagnostics and version information for all supported toolchains."""
    diagnostics = {}

    # Java
    javac, java = resolve_java_toolchain()
    java_ver = None
    javac_ver = None
    if javac:
        try:
            res = subprocess.run([javac, "-version"], capture_output=True, text=True, timeout=2)
            javac_ver = (res.stdout or res.stderr).strip()
        except Exception as e:
            javac_ver = f"Error: {e}"
    if java:
        try:
            res = subprocess.run([java, "-version"], capture_output=True, text=True, timeout=2)
            java_ver = (res.stdout or res.stderr).strip().split("\n")[0]
        except Exception as e:
            java_ver = f"Error: {e}"

    diagnostics["java"] = {
        "available": bool(javac and java),
        "javac_path": javac,
        "java_path": java,
        "javac_version": javac_ver,
        "java_version": java_ver,
    }

    # Python
    py_exe = sys.executable
    diagnostics["python"] = {
        "available": True,
        "path": py_exe,
        "version": sys.version.split()[0]
    }

    # C / C++
    gcc = resolve_tool("GCC_PATH", "gcc")
    gpp = resolve_tool("GPP_PATH", "g++")
    gcc_ver = None
    if gcc:
        try:
            res = subprocess.run([gcc, "--version"], capture_output=True, text=True, timeout=2)
            gcc_ver = (res.stdout or res.stderr).strip().split("\n")[0]
        except Exception:
            pass
    diagnostics["c"] = {"available": bool(gcc), "path": gcc, "version": gcc_ver}
    diagnostics["cpp"] = {"available": bool(gpp), "path": gpp, "version": gcc_ver}

    # Rust
    rustc = resolve_tool("RUSTC_PATH", "rustc")
    rust_ver = None
    if rustc:
        try:
            res = subprocess.run([rustc, "--version"], capture_output=True, text=True, timeout=2)
            rust_ver = (res.stdout or res.stderr).strip()
        except Exception:
            pass
    diagnostics["rust"] = {"available": bool(rustc), "path": rustc, "version": rust_ver}

    # Go
    go = resolve_tool("GO_PATH", "go")
    go_ver = None
    if go:
        try:
            res = subprocess.run([go, "version"], capture_output=True, text=True, timeout=2)
            go_ver = (res.stdout or res.stderr).strip()
        except Exception:
            pass
    diagnostics["go"] = {"available": bool(go), "path": go, "version": go_ver}

    # JavaScript / Node
    node = resolve_tool("NODE_PATH", "node")
    node_ver = None
    if node:
        try:
            res = subprocess.run([node, "--version"], capture_output=True, text=True, timeout=2)
            node_ver = (res.stdout or res.stderr).strip()
        except Exception:
            pass
    diagnostics["javascript"] = {"available": bool(node), "path": node, "version": node_ver}

    return diagnostics
