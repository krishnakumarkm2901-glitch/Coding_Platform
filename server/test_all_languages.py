from services.compiler import get_compiler_provider
p = get_compiler_provider()

tests = [
    ('python', 'import sys\nprint(input())', '42', '42'),
    ('c', '#include <stdio.h>\nint main(){int x; if(scanf("%d", &x)==1) printf("%d", x); return 0;}', '42', '42'),
    ('cpp', '#include <iostream>\nusing namespace std;\nint main(){int x; if(cin >> x) cout << x; return 0;}', '42', '42'),
    ('java', 'import java.util.Scanner;\npublic class Solution {\npublic static void main(String[] args){\nScanner sc=new Scanner(System.in);\nif(sc.hasNextInt()) System.out.print(sc.nextInt());\n}\n}', '42', '42'),
    ('rust', 'use std::io::{self, Read};\nfn main(){\nlet mut s = String::new();\nio::stdin().read_to_string(&mut s).unwrap();\nprint!("{}", s.trim());\n}', '42', '42'),
]

all_passed = True
for lang, code, stdin, expected in tests:
    res = p.execute(lang, code, stdin, timeout=10)
    matched = res.output.strip() == expected
    print(f"[{lang}] status: {res.status} | output: {repr(res.output.strip())} | match: {matched}")
    if not matched or res.status != "OK":
        all_passed = False
        print(f"  Error: {res.error}")

print("ALL LANGUAGES HEALTHY:", all_passed)
