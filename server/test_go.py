from services.piston_service import execute_locally, _execute_piston
code = '''package main
import "fmt"
func main() {
    fmt.Print("hello go")
}
'''
print("Local Go:", execute_locally("go", code, timeout=5))
print("Piston Go:", _execute_piston("go", code, "", timeout=5))
