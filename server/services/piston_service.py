"""Local-first code execution with concurrency isolation and optional remote Piston fallback."""
import logging
import os
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
import requests
from config import Config

from services.diagnostic_parser import parse_diagnostics, pre_validate_code, sanitize_text

logger = logging.getLogger(__name__)

LANGUAGE_CONFIG = {
    "python": ("python", "3.10.0", ["py", "python3"], "solution.py"),
    "javascript": ("javascript", "18.15.0", ["js", "node"], "solution.js"),
    "c": ("c", "10.2.0", ["gcc"], "main.c"),
    "cpp": ("c++", "10.2.0", ["c++", "g++", "cplusplus"], "main.cpp"),
    "java": ("java", "15.0.2", ["java15", "java21"], "Main.java"),
    "go": ("go", "1.16.2", ["golang"], "main.go"),
    "rust": ("rust", "1.56.0", ["rs"], "main.rs"),
}

def _key(language):
    value = (language or "").lower().strip()
    return next((k for k, v in LANGUAGE_CONFIG.items() if value == k or value in v[2]), None)

def get_language_details(language):
    key = _key(language)
    if not key:
        return None
    value = LANGUAGE_CONFIG[key]
    return {"language": value[0], "version": value[1], "aliases": value[2], "filename": value[3]}

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"), override=True)

from services.toolchain_resolver import resolve_java_toolchain, resolve_tool

def _tool(env_name, command):
    return resolve_tool(env_name, command)

def _result(success, status, output="", stderr="", elapsed=0, error_type=None, diagnostics=None, memory=14.2):
    sanitized_output = sanitize_text(output)
    sanitized_stderr = sanitize_text(stderr)
    
    # Calculate appropriate verdict
    if status == "OK" or status == "Accepted":
        verdict = "ACCEPTED"
    elif status == "Execution Engine Unavailable":
        verdict = "CONNECTION_ERROR"
    elif status in ("Compilation Error", "Syntax Error"):
        verdict = "COMPILATION_ERROR"
    elif status == "Time Limit Exceeded":
        verdict = "TIME_LIMIT_EXCEEDED"
    elif status == "Memory Limit Exceeded":
        verdict = "MEMORY_LIMIT_EXCEEDED"
    elif status == "Runtime Error":
        verdict = "RUNTIME_ERROR"
    else:
        verdict = status.upper().replace(" ", "_")

    result = {
        "success": success,
        "status": status,
        "verdict": verdict,
        "output": sanitized_output,
        "stdout": sanitized_output,
        "stderr": sanitized_stderr,
        "error": sanitized_stderr or (sanitized_output if not success else ""),
        "execution_time": elapsed,
        "runtime_ms": elapsed,
        "memory": memory,
        "memory_mb": memory,
        "diagnostics": diagnostics or []
    }
    if error_type:
        result["error_type"] = error_type
    return result

def _missing(language, executable, env_name):
    error = (f"Local {language} toolchain is not configured. Required executable: {executable}. "
             f"Install it and add it to PATH, or set {env_name} to its full executable path.")
    return _result(False, "Execution Engine Unavailable", stderr=error, error_type="configuration_error")

def _run(command, cwd, stdin_input, timeout):
    environment = os.environ.copy()
    # Use persistent Go build cache so repeated runs do not recompile standard libraries
    gocache_dir = os.path.join(tempfile.gettempdir(), "campus_coder_gocache")
    try:
        os.makedirs(gocache_dir, exist_ok=True)
        environment["GOCACHE"] = gocache_dir
    except Exception:
        environment["GOCACHE"] = os.path.join(cwd, ".go-build-cache")

    # Rust's GNU target and C/C++ invoke gcc by name, so expose the configured local
    # MinGW directory to child processes without changing the machine PATH.
    gcc = _tool("GCC_PATH", "gcc")
    if gcc:
        environment["PATH"] = os.path.dirname(gcc) + os.pathsep + environment.get("PATH", "")

    # Ensure stdin has terminating newline if non-empty to prevent Scanner/getline hangs
    input_str = stdin_input or ""
    if input_str and not input_str.endswith("\n"):
        input_str += "\n"

    return subprocess.run(
        command,
        cwd=cwd,
        input=input_str,
        capture_output=True,
        text=True,
        timeout=timeout,
        shell=False,
        env=environment
    )

def execute_locally(language, code, stdin_input="", timeout=8):
    key = _key(language)
    if not key:
        return _result(False, "Unsupported Language", stderr=f"Language '{language}' is not supported.", error_type="unsupported_language")
    
    # ---------------- Level 1: Static Pre-validation ----------------
    pre_diags = pre_validate_code(key, code)
    if pre_diags:
        first_err = pre_diags[0]
        return _result(
            success=False,
            status="Syntax Error",
            stderr=first_err.get("compiler_message", first_err.get("message", "Syntax Error")),
            elapsed=0,
            error_type="syntax_error",
            diagnostics=pre_diags
        )

    started = time.perf_counter()
    
    # Create isolated execution directory per job to support 300+ concurrent students
    exec_root = os.path.join(tempfile.gettempdir(), "campus_coder_exec")
    os.makedirs(exec_root, exist_ok=True)
    job_id = f"job_{uuid.uuid4().hex}"
    workdir = os.path.join(exec_root, job_id)
    os.makedirs(workdir, exist_ok=True)

    try:
        source = os.path.join(workdir, LANGUAGE_CONFIG[key][3])
        with open(source, "w", encoding="utf-8") as handle:
            handle.write(code)
            
        compile_command = None
        if key == "python":
            run_command = [sys.executable, "-u", source]
        elif key == "javascript":
            tool = _tool("NODE_PATH", "node")
            if not tool:
                return _missing("JavaScript", "node", "NODE_PATH")
            run_command = [tool, source]
        elif key in ("c", "cpp", "rust"):
            env_name, executable, label = {
                "c": ("GCC_PATH", "gcc", "C"),
                "cpp": ("GPP_PATH", "g++", "C++"),
                "rust": ("RUSTC_PATH", "rustc", "Rust")
            }[key]
            tool = _tool(env_name, executable)
            if not tool:
                return _missing(label, executable, env_name)
            binary = os.path.join(workdir, "main.exe" if os.name == "nt" else "main")
            compile_command = [tool, source, "-o", binary]
            if key == "rust" and os.name == "nt":
                compile_command.extend(["--target", "x86_64-pc-windows-gnu"])
            run_command = [binary]
        elif key == "java":
            javac, java = resolve_java_toolchain()
            if not javac:
                return _missing("Java JDK", "javac", "JAVAC_PATH")
            if not java:
                return _missing("Java runtime", "java", "JAVA_PATH")
            compile_command = [javac, source]
            run_command = [java, "-cp", workdir, "-Xmx256m", "Main"]
        else:
            tool = _tool("GO_PATH", "go")
            if not tool:
                return _missing("Go", "go", "GO_PATH")
            binary = os.path.join(workdir, "main.exe" if os.name == "nt" else "main")
            compile_command = [tool, "build", "-o", binary, source]
            run_command = [binary]
        
        # Level 1: Compilation Phase
        if compile_command:
            try:
                compiled = _run(compile_command, workdir, "", 15)
                if compiled.returncode:
                    raw_err = compiled.stderr or compiled.stdout or "Compilation failed"
                    diags = parse_diagnostics(key, raw_err, is_compile=True)
                    return _result(
                        success=False, 
                        status="Compilation Error", 
                        stderr=raw_err,
                        elapsed=round((time.perf_counter() - started) * 1000, 2), 
                        error_type="compile_error",
                        diagnostics=diags
                    )
            except subprocess.TimeoutExpired:
                return _result(
                    success=False,
                    status="Compilation Error",
                    stderr="Compilation timed out (exceeded 15s limit).",
                    elapsed=15000,
                    error_type="compile_error"
                )
        
        # Level 2: Runtime Execution Phase
        run_start = time.perf_counter()
        try:
            process = _run(run_command, workdir, stdin_input or "", timeout)
            elapsed = round((time.perf_counter() - run_start) * 1000, 2)
            if process.returncode:
                raw_err = process.stderr or f"Process exited with code {process.returncode}"
                diags = parse_diagnostics(key, raw_err, is_compile=False)
                return _result(
                    success=False, 
                    status="Runtime Error", 
                    output=process.stdout, 
                    stderr=raw_err, 
                    elapsed=elapsed, 
                    error_type="runtime_error",
                    diagnostics=diags
                )
            
            return _result(True, "OK", process.stdout, process.stderr, elapsed)
        except subprocess.TimeoutExpired as exc:
            output = exc.stdout or ""
            if isinstance(output, bytes):
                output = output.decode(errors="replace")
            return _result(False, "Time Limit Exceeded", output, "Time Limit Exceeded", timeout * 1000, "timeout")

    except (OSError, ValueError) as exc:
        return _result(False, "Execution Engine Unavailable", stderr=str(exc), error_type="configuration_error")
    finally:
        # Guarantee removal of temporary execution folder
        try:
            shutil.rmtree(workdir, ignore_errors=True)
        except Exception:
            pass

def _execute_piston(language, code, stdin_input, timeout):
    details = get_language_details(language)
    if not details or not Config.PISTON_API_URL:
        return None

    payload = {
        "language": details["language"],
        "version": details["version"],
        "files": [{"name": details["filename"], "content": code}],
        "stdin": stdin_input or "",
        "args": [],
        "compile_timeout": 10000,
        "run_timeout": timeout * 1000
    }
    headers = {"Content-Type": "application/json"}
    if os.getenv("PISTON_API_KEY"):
        headers["Authorization"] = f"Bearer {os.environ['PISTON_API_KEY']}"
    
    try:
        # Fast connection timeout (3s) to prevent masking connection failures as student TLE
        response = requests.post(
            f"{Config.PISTON_API_URL.rstrip('/')}/execute",
            json=payload,
            headers=headers,
            timeout=(3.0, timeout + 4.0)
        )
        if response.status_code != 200:
            logger.warning("Piston API HTTP %s: %s", response.status_code, response.text[:200])
            return None

        data = response.json()
        compiled, ran = data.get("compile") or {}, data.get("run") or {}
        key = _key(language)

        if compiled.get("code", 0):
            raw_err = compiled.get("stderr") or compiled.get("output", "Compilation failed")
            diags = parse_diagnostics(key, raw_err, is_compile=True)
            return _result(False, "Compilation Error", stderr=raw_err, error_type="compile_error", diagnostics=diags)

        if ran.get("signal") == "SIGKILL" or ran.get("status") == "Time Limit Exceeded":
            return _result(False, "Time Limit Exceeded", ran.get("stdout", ""), "Time Limit Exceeded", timeout * 1000, "timeout")

        if ran.get("code", 0):
            raw_err = ran.get("stderr") or f"Process exited with code {ran.get('code')}"
            diags = parse_diagnostics(key, raw_err, is_compile=False)
            return _result(False, "Runtime Error", ran.get("stdout", ""), raw_err, error_type="runtime_error", diagnostics=diags)

        return _result(True, "OK", ran.get("stdout", ""), ran.get("stderr", ""))

    except (requests.RequestException, ValueError) as exc:
        logger.warning("Piston execution request failed: %s", exc)
        return None

def execute_code(language, code, stdin_input="", timeout=8):
    local = execute_locally(language, code, stdin_input, timeout)
    if local.get("error_type") != "configuration_error":
        return local
    
    # If local toolchain is not configured on server, attempt remote Piston executor
    piston_res = _execute_piston(language, code, stdin_input, timeout)
    if piston_res is not None:
        return piston_res

    # If neither local nor remote is available, return unambiguous Connection Error
    return _result(
        False,
        "Execution Engine Unavailable",
        stderr="Execution engine unavailable: compiler toolchain not ready.",
        error_type="connection_error"
    )

def normalize_output(text):
    if text is None:
        return ""
    lines = str(text).replace("\r\n", "\n").replace("\r", "\n").strip().split("\n")
    return "\n".join(line.rstrip() for line in lines).strip()

