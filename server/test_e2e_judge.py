import os
from dotenv import load_dotenv
load_dotenv()

from services.piston_service import execute_code, normalize_output

test_inputs = [
    ("{[()]}", "True"),
    ("()", "True"),
    ("([)]", "False"),
    ("{[(])}", "False"),
    ("{}", "True"),
    ("[", "False"),
    ("]", "False"),
]

solutions = {
    "python": '''
import sys

def isValid(s: str) -> bool:
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping.values():
            stack.append(char)
        elif char in mapping:
            if not stack or stack.pop() != mapping[char]:
                return False
        else:
            return False
    return not stack

def main():
    s = sys.stdin.read().strip()
    print("True" if isValid(s) else "False")

if __name__ == "__main__":
    main()
''',
    "c": '''
#include <stdio.h>
#include <string.h>
#include <stdbool.h>

bool isValid(char* s) {
    int len = strlen(s);
    char stack[10000];
    int top = -1;
    for (int i = 0; i < len; i++) {
        char c = s[i];
        if (c == '(' || c == '{' || c == '[') {
            stack[++top] = c;
        } else {
            if (top == -1) return false;
            char open = stack[top--];
            if (c == ')' && open != '(') return false;
            if (c == '}' && open != '{') return false;
            if (c == ']' && open != '[') return false;
        }
    }
    return top == -1;
}

int main() {
    char s[10000];
    if (scanf("%s", s) == 1) {
        printf(isValid(s) ? "True\\n" : "False\\n");
    } else {
        printf("True\\n");
    }
    return 0;
}
''',
    "cpp": '''
#include <iostream>
#include <string>
#include <stack>
using namespace std;

bool isValid(string s) {
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '{' || c == '[') {
            st.push(c);
        } else {
            if (st.empty()) return false;
            char top = st.top();
            st.pop();
            if (c == ')' && top != '(') return false;
            if (c == '}' && top != '{') return false;
            if (c == ']' && top != '[') return false;
        }
    }
    return st.empty();
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    string s;
    if (cin >> s) {
        cout << (isValid(s) ? "True" : "False") << "\\n";
    }
    return 0;
}
''',
    "java": '''
import java.util.Scanner;
import java.util.Stack;

public class Main {
    public static boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '{' || c == '[') {
                stack.push(c);
            } else {
                if (stack.isEmpty()) return false;
                char top = stack.pop();
                if (c == ')' && top != '(') return false;
                if (c == '}' && top != '{') return false;
                if (c == ']' && top != '[') return false;
            }
        }
        return stack.isEmpty();
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNext()) {
            String s = scanner.next();
            System.out.println(isValid(s) ? "True" : "False");
        }
    }
}
''',
    "javascript": '''
const fs = require('fs');

function isValid(s) {
    const stack = [];
    const mapping = { ')': '(', '}': '{', ']': '[' };
    for (const char of s) {
        if (char === '(' || char === '{' || char === '[') {
            stack.push(char);
        } else if (mapping[char]) {
            if (!stack.length || stack.pop() !== mapping[char]) {
                return false;
            }
        } else {
            return false;
        }
    }
    return stack.length === 0;
}

function solve() {
    const input = fs.readFileSync(0, 'utf-8').trim();
    if (!input) return;
    console.log(isValid(input) ? "True" : "False");
}

solve();
''',
    "go": '''
package main

import (
    "fmt"
    "io"
    "os"
    "strings"
)

func isValid(s string) bool {
    stack := []rune{}
    mapping := map[rune]rune{')': '(', '}': '{', ']': '['}
    for _, c := range s {
        if c == '(' || c == '{' || c == '[' {
            stack = append(stack, c)
        } else if open, ok := mapping[c]; ok {
            if len(stack) == 0 || stack[len(stack)-1] != open {
                return false
            }
            stack = stack[:len(stack)-1]
        } else {
            return false
        }
    }
    return len(stack) == 0
}

func main() {
    input, _ := io.ReadAll(os.Stdin)
    s := strings.TrimSpace(string(input))
    if len(s) == 0 {
        return
    }
    if isValid(s) {
        fmt.Println("True")
    } else {
        fmt.Println("False")
    }
}
''',
    "rust": '''
use std::io::{self, Read};

fn is_valid(s: &str) -> bool {
    let mut stack = Vec::new();
    for c in s.chars() {
        match c {
            '(' | '{' | '[' => stack.push(c),
            ')' => if stack.pop() != Some('(') { return false; },
            '}' => if stack.pop() != Some('{') { return false; },
            ']' => if stack.pop() != Some('[') { return false; },
            _ => return false,
        }
    }
    stack.is_empty()
}

fn main() {
    let mut input = String::new();
    if io::stdin().read_to_string(&mut input).is_ok() {
        let s = input.trim();
        if !s.is_empty() {
            println!("{}", if is_valid(s) { "True" } else { "False" });
        }
    }
}
'''
}

print("==================================================")
print("RUNNING FULL LANGUAGE MATRIX FOR VALID PARENTHESES")
print("==================================================")

results_matrix = {}

for lang, code in solutions.items():
    print(f"\n--- Testing Language: {lang.upper()} ---")
    all_passed = True
    for inp, expected in test_inputs:
        res = execute_code(lang, code, inp, timeout=8)
        actual = normalize_output(res.get("output", ""))
        is_ok = (actual == expected or actual.lower() == expected.lower()) and res.get("status") == "OK"
        if not is_ok:
            all_passed = False
            print(f"  [FAIL] on input '{inp}' -> expected '{expected}', got '{actual}', status='{res.get('status')}', err='{res.get('error')}'")
        else:
            print(f"  [OK] PASSED: input '{inp}' => output '{actual}' ({res.get('execution_time')} ms)")
    results_matrix[lang] = all_passed

print("\n==================================================")
print("TESTING ERROR CONDITIONS (SYNTAX, RUNTIME, TIMEOUT)")
print("==================================================")

# 1. Syntax / Compilation Error Test
syntax_test = execute_code("python", "def broken_code(", "", timeout=5)
print("Syntax Error (Python):", "[OK] PASSED" if (syntax_test.get("status") == "Runtime Error" or "SyntaxError" in syntax_test.get("error", "")) else "[FAIL]", "|", syntax_test.get("error", "")[:80])

# 2. C Compilation Error Test
c_syntax_test = execute_code("c", "int main() { broken_syntax; }", "", timeout=5)
print("Compile Error (C):", "[OK] PASSED" if c_syntax_test.get("status") == "Compilation Error" else "[FAIL]", "|", c_syntax_test.get("error", "")[:80])

# 3. Runtime Error Test (Division by Zero)
runtime_test = execute_code("python", "print(1 / 0)", "", timeout=5)
print("Runtime Error (Python):", "[OK] PASSED" if "ZeroDivisionError" in runtime_test.get("error", "") else "[FAIL]", "|", runtime_test.get("error", "")[:80])

# 4. Timeout / Infinite Loop Test
timeout_test = execute_code("python", "while True: pass", "", timeout=2)
print("Timeout Test (Python):", "[OK] PASSED" if timeout_test.get("status") == "Time Limit Exceeded" else "[FAIL]", "| Status:", timeout_test.get("status"))

print("\n==================================================")
print("SUMMARY RESULTS MATRIX")
print("==================================================")
for lang, passed in results_matrix.items():
    print(f"  {lang.capitalize():12}: {'PASS (100%)' if passed else 'FAIL'}")
