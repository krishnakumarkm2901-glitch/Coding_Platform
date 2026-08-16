import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Code, RotateCcw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const MonacoCodeEditor = ({
  language = 'python',
  code = '',
  onChange,
  onReset,
  fontSize = 14,
  readOnly = false,
}) => {
  const { isDark } = useTheme();
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Define custom themes matching exact dark/light background
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#151A21',
        'editor.lineHighlightBackground': '#20252C',
        'editorGutter.background': '#151A21',
        'editorLineNumber.foreground': '#667085',
        'editorLineNumber.activeForeground': '#F8FAFC',
      }
    });

    monaco.editor.defineTheme('custom-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#FFFFFF',
        'editor.lineHighlightBackground': '#F5F7FA',
        'editorGutter.background': '#FFFFFF',
        'editorLineNumber.foreground': '#94A3B8',
        'editorLineNumber.activeForeground': '#0757B8',
      }
    });

    editor.updateOptions({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      formatOnPaste: true,
      fontLigatures: true,
      fontSize: fontSize,
      fontFamily: "'Fira Code', monospace",
      padding: { top: 12, bottom: 12 },
      lineNumbersMinChars: 3,
    });
  };

  const monacoLanguageMap = {
    python: 'python',
    c: 'c',
    cpp: 'cpp',
    java: 'java',
    javascript: 'javascript',
    go: 'go',
    rust: 'rust',
  };

  const currentTheme = isDark ? 'vs-dark' : 'light';

  return (
    <div className="flex flex-col h-full w-full rounded-2xl overflow-hidden border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#151A21] shadow-sm transition-colors">
      {/* Editor Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#F5F7FA] dark:bg-[#20252C] border-b border-[#D9E0E8] dark:border-[#30363D] text-xs text-[#667085] dark:text-[#94A3B8]">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-[#0757B8] dark:text-[#60A5FA]" />
          <span className="font-bold text-[#172033] dark:text-[#F8FAFC] uppercase tracking-wider">
            {language === 'cpp' ? 'C++' : language} Solution
          </span>
        </div>
        <div className="flex items-center gap-3">
          {onReset && (
            <button
              onClick={onReset}
              title="Reset code template"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-transparent hover:bg-[#DDF2FF] dark:hover:bg-[#142A43] text-[#667085] dark:text-[#94A3B8] hover:text-[#0757B8] dark:hover:text-[#60A5FA] transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
          <span className="hidden sm:inline-block text-[11px] text-[#667085] dark:text-[#94A3B8] font-mono">
            {fontSize}px
          </span>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 w-full min-h-[300px]">
        <Editor
          height="100%"
          language={monacoLanguageMap[language] || 'python'}
          value={code}
          theme={currentTheme}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={{
            readOnly: readOnly,
            selectOnLineNumbers: true,
            automaticLayout: true,
            tabSize: 4,
          }}
        />
      </div>
    </div>
  );
};
