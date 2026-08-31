export const DEFAULT_STARTER_CODE = {
  python: `import sys

def solve():
    input_data = sys.stdin.read().strip()
    if not input_data:
        return
    # Write your solution here
    print(input_data)

if __name__ == '__main__':
    solve()
`,
  c: `#include <stdio.h>
#include <string.h>
#include <stdbool.h>

int main() {
    char s[10000];
    if (scanf("%s", s) == 1) {
        // Write your solution here
        printf("%s\\n", s);
    }
    return 0;
}
`,
  cpp: `#include <iostream>
#include <string>
#include <vector>
#include <stack>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    string s;
    if (cin >> s) {
        // Write your solution here
        cout << s << "\\n";
    }
    return 0;
}
`,
  java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNext()) {
            String s = scanner.next();
            // Write your solution here
            System.out.println(s);
        }
    }
}
`,
  javascript: `const fs = require('fs');

function solve() {
    const input = fs.readFileSync(0, 'utf-8').trim();
    if (!input) return;
    // Write your solution here
    console.log(input);
}

solve();
`,
  go: `package main

import (
    "fmt"
    "io"
    "os"
    "strings"
)

func main() {
    input, _ := io.ReadAll(os.Stdin)
    s := strings.TrimSpace(string(input))
    if len(s) == 0 {
        return
    }
    // Write your solution here
    fmt.Println(s)
}
`,
  rust: `use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    if io::stdin().read_to_string(&mut input).is_ok() {
        let s = input.trim();
        // Write your solution here
        println!("{}", s);
    }
}
`
};
