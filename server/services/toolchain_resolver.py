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
    # On Linux, reject Windows paths immediately (containing backslash or drive letter)
    if os.name != "nt" and ("\\" in path or ":" in path):
        return False
    clean_path = os.path.abspath(os.path.expandvars(os.path.expanduser(path.strip().strip('"'))))
    return os.path.isfile(clean_path) and os.access(clean_path, os.X_OK)

def _extract_version_score(folder_name: str) -> Tuple[int, ...]:
    """Extract numeric version components for sorting JDK versions descending."""
    nums = re.findall(r"\d+", folder_name)
    return tuple(map(int, nums)) if nums else (0,)

def _load_jdk_env_sh(server_dir: str):
    """Auto-load .jdk_env.sh into os.environ if present and not already set."""
    candidates = [
        os.path.join(server_dir, ".jdk_env.sh"),
        os.path.join(os.getcwd(), ".jdk_env.sh"),
        "/opt/render/project/src/server/.jdk_env.sh",
        "/opt/render/project/src/.jdk_env.sh",
    ]
    for env_sh in candidates:
        if os.path.isfile(env_sh):
            try:
                with open(env_sh, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("export "):
                            parts = line[7:].split("=", 1)
                            if len(parts) == 2:
                                k = parts[0].strip()
                                v = parts[1].strip().strip('"').strip("'")
                                if k and (k not in os.environ or not os.environ[k]):
                                    os.environ[k] = v
                logger.info(f"[toolchain] Sourced environment from {env_sh}")
                break
            except Exception as e:
                logger.debug(f"[toolchain] Failed to read {env_sh}: {e}")

def _bootstrap_linux_jdk(server_dir: str) -> Tuple[Optional[str], Optional[str]]:
    """Auto-bootstrap Eclipse Temurin OpenJDK 21 on Linux if missing from host environment."""
    if os.name == "nt":
        return None, None
    target_dir = os.path.join(server_dir, ".jdk")
    javac_path = os.path.join(target_dir, "bin", "javac")
    java_path = os.path.join(target_dir, "bin", "java")
    if _is_valid_executable(javac_path) and _is_valid_executable(java_path):
        return javac_path, java_path

    try:
        import urllib.request
        import tarfile
        import tempfile
        logger.info(f"[toolchain] Auto-bootstrapping OpenJDK 21 to {target_dir}...")
        os.makedirs(target_dir, exist_ok=True)
        url = "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.2%2B13/OpenJDK21U-jdk_x64_linux_hotspot_21.0.2_13.tar.gz"
        tar_gz = os.path.join(tempfile.gettempdir(), "temurin21.tar.gz")
        urllib.request.urlretrieve(url, tar_gz)
        with tarfile.open(tar_gz, "r:gz") as tar:
            for member in tar.getmembers():
                parts = member.name.split("/", 1)
                if len(parts) > 1 and parts[1]:
                    member.name = parts[1]
                    tar.extract(member, path=target_dir)
        try:
            os.remove(tar_gz)
        except Exception:
            pass

        bin_dir = os.path.join(target_dir, "bin")
        if os.path.isdir(bin_dir):
            for f in os.listdir(bin_dir):
                fp = os.path.join(bin_dir, f)
                try:
                    os.chmod(fp, 0o755)
                except Exception:
                    pass

        if _is_valid_executable(javac_path) and _is_valid_executable(java_path):
            logger.info(f"[toolchain] OpenJDK 21 auto-bootstrap SUCCESS: javac={javac_path}")
            return javac_path, java_path
    except Exception as e:
        logger.warning(f"[toolchain] OpenJDK 21 auto-bootstrap failed: {e}")
    return None, None

def resolve_java_toolchain() -> Tuple[Optional[str], Optional[str]]:
    """
    Robustly resolves Java JDK (javac) and Java Runtime (java) executables.
    
    Priority Order:
    1. Explicit JAVAC_PATH and JAVA_PATH in environment (if valid executable)
    2. JAVA_HOME/bin/javac and JAVA_HOME/bin/java (if both valid executables)
    3. Known standard Linux locations (/opt/render/project/src/server/.jdk, .jdk, /usr/bin)
    4. PATH lookup (javac with sibling java)
    5. Windows standard paths (on Windows only)
    6. Linux auto-bootstrap (downloads Temurin 21 if missing)
    """
    server_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    _load_jdk_env_sh(server_dir)

    javac_path: Optional[str] = None
    java_path: Optional[str] = None
    exe_suffix = ".exe" if os.name == "nt" else ""

    # --- 1. Check explicit JAVAC_PATH / JAVA_PATH ---
    env_javac = os.getenv("JAVAC_PATH", "").strip().strip('"')
    if env_javac and _is_valid_executable(env_javac):
        javac_path = os.path.abspath(os.path.expandvars(os.path.expanduser(env_javac)))
        # Verify adjacent java executable
        env_java = os.getenv("JAVA_PATH", "").strip().strip('"')
        if env_java and _is_valid_executable(env_java):
            java_path = os.path.abspath(os.path.expandvars(os.path.expanduser(env_java)))
        else:
            adjacent_java = os.path.join(os.path.dirname(javac_path), f"java{exe_suffix}")
            if _is_valid_executable(adjacent_java):
                java_path = adjacent_java

        if javac_path and java_path:
            logger.info(f"[toolchain] Java resolved via JAVAC_PATH/JAVA_PATH: javac={javac_path}, java={java_path}")
            return javac_path, java_path

    # --- 2. Check JAVA_HOME ---
    java_home = os.getenv("JAVA_HOME", "").strip().strip('"')
    if java_home:
        jh_clean = os.path.abspath(os.path.expandvars(os.path.expanduser(java_home)))
        candidate_javac = os.path.join(jh_clean, "bin", f"javac{exe_suffix}")
        candidate_java = os.path.join(jh_clean, "bin", f"java{exe_suffix}")
        if _is_valid_executable(candidate_javac) and _is_valid_executable(candidate_java):
            logger.info(f"[toolchain] Java resolved via JAVA_HOME: javac={candidate_javac}, java={candidate_java}")
            return candidate_javac, candidate_java

    # --- 3. Check Known Standard Linux & Project Locations ---
    direct_candidates = [
        os.path.join(server_dir, ".jdk", "bin", f"javac{exe_suffix}"),
        os.path.join(os.getcwd(), ".jdk", "bin", f"javac{exe_suffix}"),
        "/opt/render/project/src/server/.jdk/bin/javac",
        "/opt/render/project/src/.jdk/bin/javac",
        os.path.expanduser("~/.jdk/bin/javac"),
        "/tmp/jdk/bin/javac",
        "/usr/bin/javac",
        "/usr/local/bin/javac",
    ]
    for c_javac in direct_candidates:
        if _is_valid_executable(c_javac):
            c_java = os.path.join(os.path.dirname(c_javac), f"java{exe_suffix}")
            if _is_valid_executable(c_java):
                logger.info(f"[toolchain] Java resolved via direct candidate: javac={c_javac}, java={c_java}")
                return c_javac, c_java

    # --- 4. Fallback: Check System PATH ---
    path_javac = shutil.which("javac")
    if path_javac and _is_valid_executable(path_javac):
        adjacent_java = os.path.join(os.path.dirname(path_javac), f"java{exe_suffix}")
        if _is_valid_executable(adjacent_java):
            logger.info(f"[toolchain] Java resolved via PATH with sibling: javac={path_javac}, java={adjacent_java}")
            return path_javac, adjacent_java
        path_java = shutil.which("java")
        if path_java and _is_valid_executable(path_java):
            logger.info(f"[toolchain] Java resolved via PATH: javac={path_javac}, java={path_java}")
            return path_javac, path_java

    # --- 5. Windows Standard Directory Search (on Windows only) ---
    if os.name == "nt":
        search_roots = []
        toolchains_jdk = os.path.join(server_dir, "toolchains", "jdk")
        if os.path.isdir(toolchains_jdk):
            search_roots.append(toolchains_jdk)

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

        discovered_jdks = []
        for root in search_roots:
            if not os.path.isdir(root):
                continue
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

        discovered_jdks.sort(key=lambda x: x[0], reverse=True)
        for _, jdk_dir in discovered_jdks:
            cand_javac = os.path.join(jdk_dir, "bin", f"javac{exe_suffix}")
            cand_java = os.path.join(jdk_dir, "bin", f"java{exe_suffix}")
            if _is_valid_executable(cand_javac) and _is_valid_executable(cand_java):
                logger.info(f"[toolchain] Windows Java resolved: javac={cand_javac}, java={cand_java}")
                return cand_javac, cand_java

    # --- 6. Linux Auto-Bootstrap (downloads OpenJDK 21 if missing on Linux) ---
    if os.name != "nt":
        boot_javac, boot_java = _bootstrap_linux_jdk(server_dir)
        if boot_javac and boot_java:
            return boot_javac, boot_java

    logger.warning(
        "[toolchain] Java NOT resolved. Checked JAVAC_PATH, JAVA_HOME, candidates, and system PATH."
    )
    return None, None


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
