from dotenv import load_dotenv
load_dotenv()
from services.piston_service import execute_code

languages = [
    ("python", "import sys; print(sys.stdin.read().strip())", "hello python"),
    ("c", "#include <stdio.h>\nint main() { char buf[100]; if(scanf(\"%s\", buf)==1) printf(\"%s\", buf); return 0; }", "hello_c"),
    ("cpp", "#include <iostream>\nusing namespace std;\nint main() { string s; if(cin >> s) cout << s; return 0; }", "hello_cpp"),
    ("java", "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner s = new Scanner(System.in);\n        if(s.hasNext()) System.out.print(s.next());\n    }\n}", "hello_java"),
    ("javascript", "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(input);", "hello_js"),
    ("go", "package main\nimport (\"fmt\"; \"os\"; \"io\")\nfunc main() {\n    b, _ := io.ReadAll(os.Stdin)\n    fmt.Print(string(b))\n}", "hello_go"),
    ("rust", "use std::io::{self, Read};\nfn main() {\n    let mut s = String::new();\n    io::stdin().read_to_string(&mut s).unwrap();\n    print!(\"{}\", s.trim());\n}", "hello_rust"),
]

for lang, code, inp in languages:
    res = execute_code(lang, code, inp)
    print(f"=== {lang.upper()} ===")
    print("Status:", res.get("status"))
    print("Success:", res.get("success"))
    print("Output:", repr(res.get("output")))
    print("Error:", repr(res.get("error") or res.get("stderr")))
    print("Execution time:", res.get("execution_time"), "ms")
    print()
