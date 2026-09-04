import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import Editor from '@monaco-editor/react';
import { Code, RotateCcw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const MonacoCodeEditor = forwardRef(({
  language = 'python',
  code = '',
  value = '',
  onChange,
  onReset,
  fontSize = 14,
  readOnly = false,
  diagnostics = [],
}, ref) => {
  const { isDark } = useTheme();
  const editorInstanceRef = useRef(null);
  const monacoInstanceRef = useRef(null);

  const editorValue = (code !== undefined && code !== null && code !== '') 
    ? code 
    : (value !== undefined && value !== null ? value : '');

  // Expose imperative methods to parent components (e.g. click error -> jump to line)
  useImperativeHandle(ref, () => ({
    revealPosition: (lineNumber, columnNumber = 1) => {
      if (editorInstanceRef.current && lineNumber) {
        try {
          editorInstanceRef.current.revealLineInCenter(lineNumber);
          editorInstanceRef.current.setPosition({ lineNumber, column: columnNumber || 1 });
          editorInstanceRef.current.focus();
        } catch (e) {
          // Ignore if position out of bounds
        }
      }
    },
    getEditor: () => editorInstanceRef.current,
    getMonaco: () => monacoInstanceRef.current,
  }));

  const handleEditorDidMount = (editor, monaco) => {
    editorInstanceRef.current = editor;
    monacoInstanceRef.current = monaco;
    
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
      lineHeight: 22,
      letterSpacing: 0,
      fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
      padding: { top: 12, bottom: 12 },
      lineNumbersMinChars: 3,
      automaticLayout: true,
      fixedOverflowWidgets: true,
      renderValidationDecorations: 'on',
    });

    // Apply diagnostics markers if available immediately on mount
    updateMarkers(editor, monaco, diagnostics);

    // Remeasure fonts once custom web fonts are fully loaded to prevent layer misalignment
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        try {
          monaco.editor.remeasureFonts();
          editor.layout();
        } catch (e) {
          // Quiet ignore
        }
      });
    }
  };

  const updateMarkers = (editor, monaco, diags) => {
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    if (!diags || diags.length === 0) {
      monaco.editor.setModelMarkers(model, 'compiler-diagnostics', []);
      return;
    }

    const markers = diags
      .filter((d) => d && d.line)
      .map((d) => {
        const line = Math.max(1, Math.min(d.line, model.getLineCount()));
        const maxCol = model.getLineMaxColumn(line);
        const col = Math.max(1, Math.min(d.column || 1, maxCol));
        const endLine = Math.max(line, Math.min(d.end_line || line, model.getLineCount()));
        const endCol = Math.max(col + 1, Math.min(d.end_column || maxCol, maxCol));

        return {
          severity: d.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Error,
          startLineNumber: line,
          startColumn: col,
          endLineNumber: endLine,
          endColumn: endCol,
          message: d.message || d.compiler_message || 'Error',
          source: d.source || 'Compiler'
        };
      });

    monaco.editor.setModelMarkers(model, 'compiler-diagnostics', markers);
  };

  // Synchronize diagnostics markers when diagnostics array changes
  useEffect(() => {
    if (editorInstanceRef.current && monacoInstanceRef.current) {
      updateMarkers(editorInstanceRef.current, monacoInstanceRef.current, diagnostics);
    }
  }, [diagnostics]);

  useEffect(() => {
    const handleResize = () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.layout();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const monacoLanguageMap = {
    python: 'python',
    py: 'python',
    c: 'c',
    cpp: 'cpp',
    'c++': 'cpp',
    java: 'java',
    javascript: 'javascript',
    js: 'javascript',
    node: 'javascript',
    go: 'go',
    golang: 'go',
    rust: 'rust',
    rs: 'rust',
  };

  const currentTheme = isDark ? 'custom-dark' : 'custom-light';
  const displayLang = language === 'cpp' ? 'C++' : language === 'javascript' ? 'JavaScript' : language.toUpperCase();

  return (
    <div className="flex flex-col h-full w-full rounded-2xl overflow-hidden border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#151A21] shadow-sm transition-colors">
      {/* Editor Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#F5F7FA] dark:bg-[#20252C] border-b border-[#D9E0E8] dark:border-[#30363D] text-xs text-[#667085] dark:text-[#94A3B8]">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-[#0757B8] dark:text-[#60A5FA]" />
          <span className="font-bold text-[#172033] dark:text-[#F8FAFC] tracking-wider">
            {displayLang} Solution
          </span>
          {diagnostics && diagnostics.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-[#EF4444]/15 text-[#EF4444] text-[10px] font-bold border border-[#EF4444]/30 animate-pulse">
              {diagnostics.length} error{diagnostics.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              title="Reset code template"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-transparent hover:bg-[#DDF2FF] dark:hover:bg-[#142A43] text-[#667085] dark:text-[#94A3B8] hover:text-[#0757B8] dark:hover:text-[#60A5FA] transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 w-full min-h-[320px] relative">
        <Editor
          height="100%"
          language={monacoLanguageMap[language?.toLowerCase()] || 'python'}
          value={editorValue}
          theme={currentTheme}
          onChange={(val, ev) => {
            // Clear diagnostics on edit
            if (diagnostics && diagnostics.length > 0 && editorInstanceRef.current && monacoInstanceRef.current) {
              updateMarkers(editorInstanceRef.current, monacoInstanceRef.current, []);
            }
            if (onChange) onChange(val, ev);
          }}
          onMount={handleEditorDidMount}
          options={{
            readOnly: readOnly,
            selectOnLineNumbers: true,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
          }}
        />
      </div>
    </div>
  );
});
