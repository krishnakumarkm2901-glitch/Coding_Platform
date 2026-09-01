"""Language-specific diagnostic parsers that normalize compiler and interpreter outputs
into a clean, standardized LeetCode-style diagnostic data structure.
"""
import ast
import re
from typing import List, Dict, Any, Optional

def sanitize_text(text: str) -> str:
    """Remove internal backend paths and temporary workdir references."""
    if not text:
        return ""
    # Strip temporary directory paths
    sanitized = re.sub(r'[A-Za-z]:\\[^\s:"\']+[\\/](?:code_exec_[^\\/\s:"\']+[\\/])?', '', text)
    sanitized = re.sub(r'/(?:tmp|var|tmp/[^/\s:"\']+)/(?:code_exec_[^/\s:"\']+/)?', '', sanitized)
    sanitized = re.sub(r'code_exec_[A-Za-z0-9_-]+[\\/]', '', sanitized)
    return sanitized.strip()

class Diagnostic:
    """Standardized diagnostic representation."""
    def __init__(
        self,
        error_type: str,
        message: str,
        line: Optional[int] = None,
        column: Optional[int] = None,
        end_line: Optional[int] = None,
        end_column: Optional[int] = None,
        severity: str = "error",
        compiler_message: Optional[str] = None,
        source: str = "compiler",
        code: Optional[str] = None
    ):
        self.type = error_type
        self.message = message
        self.line = line
        self.column = column
        self.end_line = end_line or line
        self.end_column = end_column
        self.severity = severity
        self.compiler_message = compiler_message or message
        self.source = source
        self.code = code

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "severity": self.severity,
            "line": self.line,
            "column": self.column,
            "end_line": self.end_line,
            "end_column": self.end_column,
            "message": self.message,
            "compiler_message": self.compiler_message,
            "source": self.source,
            "code": self.code
        }

# ============================================================================
# PYTHON DIAGNOSTIC PARSER
# ============================================================================
class PythonDiagnosticParser:
    @staticmethod
    def pre_validate(code: str) -> List[Diagnostic]:
        """Perform static AST parsing to detect Python syntax errors without running code."""
        diagnostics = []
        try:
            ast.parse(code)
        except SyntaxError as e:
            line = e.lineno
            col = e.offset
            msg = e.msg or "Syntax error"
            diag = Diagnostic(
                error_type="SYNTAX_ERROR",
                message=f"SyntaxError: {msg}",
                line=line,
                column=col,
                compiler_message=f"File \"solution.py\", line {line}, col {col}\n  {e.text or ''}\nSyntaxError: {msg}",
                source="ast_parser"
            )
            diagnostics.append(diag)
        except Exception as e:
            diagnostics.append(Diagnostic(
                error_type="SYNTAX_ERROR",
                message=str(e),
                compiler_message=str(e),
                source="ast_parser"
            ))
        return diagnostics

    @staticmethod
    def parse_stderr(stderr: str, is_compile: bool = False) -> List[Diagnostic]:
        diagnostics = []
        clean_err = sanitize_text(stderr)
        if not clean_err:
            return diagnostics

        # Check for SyntaxError / IndentationError
        syntax_match = re.search(
            r'File\s+["\'].*?["\'],\s+line\s+(\d+)(?:,\s+in\s+.*)?\n(?:\s*(.*?)\n)?(?:\s*(\^+)\n)?([A-Za-z_]+Error):\s*(.*)',
            clean_err,
            re.DOTALL
        )
        if syntax_match:
            line_no = int(syntax_match.group(1))
            code_line = syntax_match.group(2) or ""
            carets = syntax_match.group(3) or ""
            col_no = len(carets.split('^')[0]) + 1 if carets else 1
            err_class = syntax_match.group(4)
            err_msg = syntax_match.group(5).strip().split('\n')[0]
            
            diag_type = "SYNTAX_ERROR" if "Syntax" in err_class or "Indentation" in err_class or "Tab" in err_class else "RUNTIME_ERROR"
            
            diagnostics.append(Diagnostic(
                error_type=diag_type,
                message=f"{err_class}: {err_msg}",
                line=line_no,
                column=col_no,
                compiler_message=f"Line {line_no}: {err_class}: {err_msg}",
                source="interpreter"
            ))
            return diagnostics

        # Check for Runtime traceback
        traceback_lines = clean_err.split("\n")
        last_file_line = None
        last_file_col = None
        exception_msg = ""
        for line in traceback_lines:
            file_match = re.search(r'File\s+["\'].*?["\'],\s+line\s+(\d+)', line)
            if file_match:
                last_file_line = int(file_match.group(1))
            if re.match(r'^[A-Za-z_]+Error:\s*', line) or re.match(r'^[A-Za-z_]+Exception:\s*', line):
                exception_msg = line.strip()

        if last_file_line:
            diagnostics.append(Diagnostic(
                error_type="RUNTIME_ERROR",
                message=exception_msg or "Runtime Error",
                line=last_file_line,
                column=last_file_col or 1,
                compiler_message=exception_msg or clean_err,
                source="runtime"
            ))
        else:
            diagnostics.append(Diagnostic(
                error_type="COMPILATION_ERROR" if is_compile else "RUNTIME_ERROR",
                message=clean_err.split("\n")[0] if clean_err else "Error",
                compiler_message=clean_err,
                source="compiler" if is_compile else "runtime"
            ))

        return diagnostics


# ============================================================================
# C / C++ DIAGNOSTIC PARSER (GCC / G++)
# ============================================================================
class CppDiagnosticParser:
    @staticmethod
    def parse_stderr(stderr: str, is_compile: bool = True) -> List[Diagnostic]:
        diagnostics = []
        clean_err = sanitize_text(stderr)
        if not clean_err:
            return diagnostics

        # GCC pattern: file:line:column: (error|warning|fatal error): message
        gcc_pattern = re.compile(
            r'(?:[A-Za-z0-9_./\\-]+\.(?:c|cpp|cc|cxx|h|hpp)|<stdin>|input):(\d+):(?:(\d+):)?\s*(error|warning|fatal error|note):\s*(.*?)(?=(?:\n[A-Za-z0-9_./\\-]+\.(?:c|cpp|cc|cxx|h|hpp)|\Z))',
            re.DOTALL | re.MULTILINE
        )

        matches = gcc_pattern.findall(clean_err)
        if matches:
            for match in matches:
                line_no = int(match[0])
                col_no = int(match[1]) if match[1] else 1
                severity_str = match[2].lower()
                msg = match[3].strip().split('\n')[0]
                
                err_type = "COMPILATION_ERROR" if "error" in severity_str else "COMPILER_WARNING"
                severity = "error" if "error" in severity_str else "warning"

                diagnostics.append(Diagnostic(
                    error_type=err_type,
                    message=msg,
                    line=line_no,
                    column=col_no,
                    severity=severity,
                    compiler_message=f"Line {line_no}, Col {col_no}: {msg}",
                    source="gcc"
                ))
            return diagnostics

        # Linker errors (undefined reference to `main`, etc.)
        if "undefined reference" in clean_err:
            diagnostics.append(Diagnostic(
                error_type="LINKER_ERROR",
                message=clean_err.split("\n")[0],
                compiler_message=clean_err,
                source="linker"
            ))
            return diagnostics

        diagnostics.append(Diagnostic(
            error_type="COMPILATION_ERROR" if is_compile else "RUNTIME_ERROR",
            message=clean_err.split("\n")[0],
            compiler_message=clean_err,
            source="compiler" if is_compile else "runtime"
        ))
        return diagnostics


# ============================================================================
# JAVA DIAGNOSTIC PARSER (JAVAC & JVM)
# ============================================================================
class JavaDiagnosticParser:
    @staticmethod
    def parse_stderr(stderr: str, is_compile: bool = True) -> List[Diagnostic]:
        diagnostics = []
        clean_err = sanitize_text(stderr)
        if not clean_err:
            return diagnostics

        # Javac pattern: Main.java:line: error: message
        javac_pattern = re.compile(
            r'(?:[A-Za-z0-9_./\\-]+\.java):(\d+):(?:\s*(\d+):)?\s*(error|warning):\s*(.*?)(?=(?:\n[A-Za-z0-9_./\\-]+\.java:|\n\d+\s+error|\Z))',
            re.DOTALL
        )

        matches = javac_pattern.findall(clean_err)
        if matches:
            for match in matches:
                line_no = int(match[0])
                col_no = int(match[1]) if match[1] else 1
                severity_str = match[2].lower()
                msg = match[3].strip().split('\n')[0]
                
                diagnostics.append(Diagnostic(
                    error_type="COMPILATION_ERROR",
                    message=msg,
                    line=line_no,
                    column=col_no,
                    severity="error" if "error" in severity_str else "warning",
                    compiler_message=f"Line {line_no}: {msg}",
                    source="javac"
                ))
            return diagnostics

        # Java Runtime Exceptions: Exception in thread "main" java.lang.NullPointerException
        jvm_match = re.search(
            r'Exception in thread ["\']\w+["\']\s+([\w\.$]+)(?::\s*(.*))?',
            clean_err
        )
        stack_match = re.search(r'at\s+[\w\.$]+\((?:Main\.java|Solution\.java):(\d+)\)', clean_err)
        
        if jvm_match or stack_match:
            line_no = int(stack_match.group(1)) if stack_match else None
            exc_class = jvm_match.group(1) if jvm_match else "Java Runtime Exception"
            exc_detail = jvm_match.group(2) if (jvm_match and jvm_match.group(2)) else ""
            msg = f"{exc_class}: {exc_detail}" if exc_detail else exc_class
            
            diagnostics.append(Diagnostic(
                error_type="RUNTIME_ERROR",
                message=msg,
                line=line_no,
                column=1 if line_no else None,
                compiler_message=clean_err,
                source="jvm"
            ))
            return diagnostics

        diagnostics.append(Diagnostic(
            error_type="COMPILATION_ERROR" if is_compile else "RUNTIME_ERROR",
            message=clean_err.split("\n")[0],
            compiler_message=clean_err,
            source="compiler" if is_compile else "runtime"
        ))
        return diagnostics


# ============================================================================
# JAVASCRIPT DIAGNOSTIC PARSER (NODE.JS)
# ============================================================================
class JavaScriptDiagnosticParser:
    @staticmethod
    def parse_stderr(stderr: str, is_compile: bool = False) -> List[Diagnostic]:
        diagnostics = []
        clean_err = sanitize_text(stderr)
        if not clean_err:
            return diagnostics

        # Node syntax error: solution.js:7
        syntax_match = re.search(
            r'(?:[A-Za-z0-9_./\\-]+\.js):(\d+)(?:\n\s*(.*?)\n\s*(\^+))?\n\s*([A-Za-z_]+Error):\s*(.*)',
            clean_err
        )
        if syntax_match:
            line_no = int(syntax_match.group(1))
            code_snippet = syntax_match.group(2) or ""
            carets = syntax_match.group(3) or ""
            col_no = len(carets.split('^')[0]) + 1 if carets else 1
            err_class = syntax_match.group(4)
            err_msg = syntax_match.group(5).strip().split('\n')[0]
            
            diagnostics.append(Diagnostic(
                error_type="SYNTAX_ERROR" if "Syntax" in err_class else "RUNTIME_ERROR",
                message=f"{err_class}: {err_msg}",
                line=line_no,
                column=col_no,
                compiler_message=f"Line {line_no}, Col {col_no}: {err_class}: {err_msg}",
                source="node"
            ))
            return diagnostics

        # Node stack trace: ReferenceError: x is not defined at Object.<anonymous> (solution.js:12:5)
        stack_match = re.search(
            r'([A-Za-z_]+Error):\s*(.*?)\n\s*at\s+.*?\((?:[A-Za-z0-9_./\\-]+\.js):(\d+):(\d+)\)',
            clean_err
        )
        if stack_match:
            err_class = stack_match.group(1)
            err_msg = stack_match.group(2)
            line_no = int(stack_match.group(3))
            col_no = int(stack_match.group(4))
            
            diagnostics.append(Diagnostic(
                error_type="RUNTIME_ERROR",
                message=f"{err_class}: {err_msg}",
                line=line_no,
                column=col_no,
                compiler_message=clean_err,
                source="node"
            ))
            return diagnostics

        diagnostics.append(Diagnostic(
            error_type="COMPILATION_ERROR" if is_compile else "RUNTIME_ERROR",
            message=clean_err.split("\n")[0],
            compiler_message=clean_err,
            source="compiler" if is_compile else "runtime"
        ))
        return diagnostics


# ============================================================================
# GO DIAGNOSTIC PARSER
# ============================================================================
class GoDiagnosticParser:
    @staticmethod
    def parse_stderr(stderr: str, is_compile: bool = True) -> List[Diagnostic]:
        diagnostics = []
        clean_err = sanitize_text(stderr)
        if not clean_err:
            return diagnostics

        # Go pattern: main.go:7:15: syntax error: unexpected newline
        go_pattern = re.compile(
            r'(?:[A-Za-z0-9_./\\-]+\.go):(\d+):(\d+):\s*(.*)'
        )
        matches = go_pattern.findall(clean_err)
        if matches:
            for match in matches:
                line_no = int(match[0])
                col_no = int(match[1])
                msg = match[2].strip()
                diagnostics.append(Diagnostic(
                    error_type="COMPILATION_ERROR",
                    message=msg,
                    line=line_no,
                    column=col_no,
                    compiler_message=f"Line {line_no}, Col {col_no}: {msg}",
                    source="go"
                ))
            return diagnostics

        # Panic check
        panic_match = re.search(r'panic:\s*(.*)', clean_err)
        stack_match = re.search(r'(?:[A-Za-z0-9_./\\-]+\.go):(\d+)', clean_err)
        if panic_match:
            line_no = int(stack_match.group(1)) if stack_match else None
            diagnostics.append(Diagnostic(
                error_type="RUNTIME_ERROR",
                message=f"panic: {panic_match.group(1).strip()}",
                line=line_no,
                column=1 if line_no else None,
                compiler_message=clean_err,
                source="go_runtime"
            ))
            return diagnostics

        diagnostics.append(Diagnostic(
            error_type="COMPILATION_ERROR" if is_compile else "RUNTIME_ERROR",
            message=clean_err.split("\n")[0],
            compiler_message=clean_err,
            source="compiler" if is_compile else "runtime"
        ))
        return diagnostics


# ============================================================================
# RUST DIAGNOSTIC PARSER
# ============================================================================
class RustDiagnosticParser:
    @staticmethod
    def parse_stderr(stderr: str, is_compile: bool = True) -> List[Diagnostic]:
        diagnostics = []
        clean_err = sanitize_text(stderr)
        if not clean_err:
            return diagnostics

        # Rust pattern: error[E0425]: ... --> main.rs:7:5
        rust_pattern = re.compile(
            r'error(?:\[(E\d+)\])?:\s*(.*?)\n\s*-->\s*(?:[A-Za-z0-9_./\\-]+\.rs):(\d+):(\d+)',
            re.DOTALL
        )
        matches = rust_pattern.findall(clean_err)
        if matches:
            for match in matches:
                code_str = match[0] or None
                msg = match[1].strip()
                line_no = int(match[2])
                col_no = int(match[3])
                diagnostics.append(Diagnostic(
                    error_type="COMPILATION_ERROR",
                    message=msg,
                    line=line_no,
                    column=col_no,
                    code=code_str,
                    compiler_message=f"Line {line_no}, Col {col_no}: error{f'[{code_str}]' if code_str else ''}: {msg}",
                    source="rustc"
                ))
            return diagnostics

        diagnostics.append(Diagnostic(
            error_type="COMPILATION_ERROR" if is_compile else "RUNTIME_ERROR",
            message=clean_err.split("\n")[0],
            compiler_message=clean_err,
            source="compiler" if is_compile else "runtime"
        ))
        return diagnostics


# ============================================================================
# CENTRALIZED DISPATCHER
# ============================================================================
PARSERS = {
    "python": PythonDiagnosticParser,
    "py": PythonDiagnosticParser,
    "c": CppDiagnosticParser,
    "cpp": CppDiagnosticParser,
    "c++": CppDiagnosticParser,
    "java": JavaDiagnosticParser,
    "javascript": JavaScriptDiagnosticParser,
    "js": JavaScriptDiagnosticParser,
    "node": JavaScriptDiagnosticParser,
    "go": GoDiagnosticParser,
    "golang": GoDiagnosticParser,
    "rust": RustDiagnosticParser,
    "rs": RustDiagnosticParser
}

def parse_diagnostics(language: str, stderr: str, is_compile: bool = False) -> List[Dict[str, Any]]:
    """Parse raw stderr into standardized diagnostic list."""
    lang_key = (language or "python").lower().strip()
    parser = PARSERS.get(lang_key, PythonDiagnosticParser)
    diag_objs = parser.parse_stderr(stderr, is_compile=is_compile)
    return [d.to_dict() for d in diag_objs]

def pre_validate_code(language: str, code: str) -> List[Dict[str, Any]]:
    """Perform pre-execution validation when available (e.g. Python AST)."""
    lang_key = (language or "python").lower().strip()
    if lang_key in ("python", "py"):
        diag_objs = PythonDiagnosticParser.pre_validate(code)
        return [d.to_dict() for d in diag_objs]
    return []
