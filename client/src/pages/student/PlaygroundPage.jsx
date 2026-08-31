import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Terminal, 
  Play, 
  Code2, 
  Settings, 
  HelpCircle, 
  Clock, 
  AlertTriangle,
  FileCode,
  ShieldAlert
} from 'lucide-react';
import { MonacoCodeEditor } from '../../components/editor/MonacoCodeEditor';
import { DEFAULT_STARTER_CODE } from '../../utils/starterCode';

const STARTER_CODE = {
  python: `print("Hello, Playground!")`,
  c: `#include <stdio.h>\n\nint main() {\n    printf("Hello, Playground!\\n");\n    return 0;\n}`,
  cpp: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, Playground!" << std::endl;\n    return 0;\n}`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Playground!");\n    }\n}`,
  javascript: `console.log("Hello, Playground!");`,
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, Playground!")\n}`,
  rust: `fn main() {\n    println!("Hello, Playground!");\n}`
};

const LANG_LABELS = {
  python: 'Python',
  c: 'C',
  cpp: 'C++',
  java: 'Java',
  javascript: 'JavaScript',
  go: 'Go',
  rust: 'Rust'
};

export const PlaygroundPage = () => {
  const { user } = useAuth();
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(STARTER_CODE.python);
  const [customInput, setCustomInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [runStatus, setRunStatus] = useState('');
  const [execTime, setExecTime] = useState(0.0);
  const [running, setRunning] = useState(false);

  const outputPanelRef = useRef(null);

  useEffect(() => {
    if (output || error || runStatus) {
      setTimeout(() => {
        outputPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [output, error, runStatus]);

  // If user is Admin, block access (although route protection should block it first)
  if (user?.role === 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/20 text-red-500 flex items-center justify-center shadow-md">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-[#172033] dark:text-[#F8FAFC]">Access Denied</h2>
        <p className="text-sm text-[#667085] dark:text-[#94A3B8]">
          The Coding Playground is exclusively reserved for Student accounts practicing their programming skills.
        </p>
      </div>
    );
  }

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setCode(STARTER_CODE[lang] || '');
  };

  const handleRunCode = async () => {
    setRunning(true);
    setError('');
    setOutput('');
    setRunStatus('');
    setExecTime(0.0);

    try {
      const res = await api.post('/students/playground/run', {
        language,
        code,
        custom_input: customInput
      });

      setRunStatus(res.data.status || (res.data.success ? 'OK' : 'Execution Error'));
      setExecTime((res.data.execution_time || 0) / 1000);
      if (res.data.success) {
        
        if (res.data.status === 'OK' || res.data.status === 'Runtime Error' || res.data.status === 'Time Limit Exceeded') {
          setOutput(res.data.output);
          if (res.data.error) {
            setError(res.data.error);
          }
        } else if (res.data.status === 'Compilation Error') {
          setError(res.data.error);
        } else {
          setError(res.data.error || 'Execution failed.');
        }
      } else {
        setOutput(res.data.output || '');
        setError(res.data.stderr || res.data.error || 'Execution failed.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to connect to execution server.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
          <Terminal className="w-6 h-6 text-[#0757B8] dark:text-[#60A5FA]" />
          Coding Playground
        </h1>
        <p className="text-sm text-[#667085] dark:text-[#94A3B8] mt-1">
          Practice your programming skills in a safe sandbox environment. Playground codes do not count as problem submissions.
        </p>
      </div>

      {/* Editor & Execution Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Code Editor Pane */}
        <div className="lg:col-span-2 flex flex-col rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] overflow-hidden shadow-sm">
          {/* Editor Header controls */}
          <div className="px-5 py-3.5 border-b border-[#D9E0E8] dark:border-[#30363D] bg-[#F8FAFC] dark:bg-[#1A1F26] flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-[#667085] dark:text-[#94A3B8] uppercase tracking-wide">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#151A21] text-xs font-bold text-[#172033] dark:text-[#F8FAFC] focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition"
              >
                {Object.keys(LANG_LABELS).map((lang) => (
                  <option key={lang} value={lang}>
                    {LANG_LABELS[lang]}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRunCode}
              disabled={running || !code}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all transform duration-150 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{running ? 'Running...' : 'Run Code'}</span>
            </button>
          </div>

          {/* Editor Content Area */}
          <div className="relative flex-1 min-h-[400px]">
            <MonacoCodeEditor
              language={language}
              code={code}
              onChange={(newCode) => setCode(newCode || '')}
              onReset={() => setCode(STARTER_CODE[language])}
            />
          </div>
        </div>

        {/* Right Side: Input and Output Panels */}
        <div className="space-y-6">
          
          {/* Custom Input Box */}
          <div className="p-5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex flex-col">
            <h3 className="text-xs font-bold text-[#667085] dark:text-[#94A3B8] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-[#0757B8] dark:text-[#60A5FA]" />
              Custom Input (stdin)
            </h3>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              rows="3"
              className="w-full px-3 py-2 bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition resize-none placeholder-[#8491A5]"
              placeholder="Provide input arguments (if any)..."
            />
          </div>

          {/* Output console */}
          <div className="p-5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm min-h-[250px] flex flex-col justify-between" ref={outputPanelRef}>
            <div>
              <div className="flex items-center justify-between border-b border-[#D9E0E8] dark:border-[#30363D] pb-3 mb-3">
                <h3 className="text-xs font-bold text-[#667085] dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-[#0757B8] dark:text-[#60A5FA]" />
                  Execution Result
                </h3>

                {runStatus && (
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold tracking-wider ${
                    runStatus === 'Accepted'
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {runStatus}
                  </span>
                )}
              </div>

              {/* Console stdout/stderr display */}
              <div className="space-y-3 font-mono text-xs max-h-[250px] overflow-y-auto">
                {output && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-[#8491A5]">STDOUT:</div>
                    <pre className="bg-[#F8FAFC] dark:bg-[#151A21] p-3 rounded-xl border border-[#D9E0E8] dark:border-[#30363D] overflow-x-auto whitespace-pre-wrap break-words">
                      {output}
                    </pre>
                  </div>
                )}

                {error && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> STDERR / ERROR:
                    </div>
                    <pre className="bg-red-500/5 dark:bg-red-950/15 border border-red-500/20 text-red-500 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap break-words">
                      {error}
                    </pre>
                  </div>
                )}

                {!output && !error && (
                  <div className="text-center py-10 text-[#8491A5] dark:text-[#94A3B8] italic">
                    {running ? 'Executing code on sandbox server...' : 'Run code to see stdout/stderr output here.'}
                  </div>
                )}
              </div>
            </div>

            {/* Execution Stats */}
            {execTime > 0 && (
              <div className="border-t border-[#D9E0E8] dark:border-[#30363D] pt-3 mt-3 flex items-center justify-between text-[11px] font-bold text-[#667085] dark:text-[#94A3B8]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#8491A5]" />
                  Execution Time:
                </span>
                <span className="font-mono text-blue-500">{execTime.toFixed(3)} s</span>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
