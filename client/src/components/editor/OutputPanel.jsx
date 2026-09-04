import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Terminal, 
  AlertCircle,
  AlertTriangle,
  Code2, 
  Zap,
  ExternalLink,
  Layers,
  Copy,
  Check
} from 'lucide-react';

export const OutputPanel = ({
  activeTab = 'testcases',
  setActiveTab,
  onTabChange, // fallback
  onInputModeChange,
  selectedCaseIndex = 0,
  setSelectedCaseIndex,
  customInput = '',
  setCustomInput,
  onCustomInputChange, // fallback
  sampleTestCases = [],
  runResult = null,
  result = null, // fallback
  submitResult = null,
  isRunning = false,
  isLoading = false, // fallback
  isSubmitting = false,
  onNavigateToLine = null,
}) => {
  const actualSetActiveTab = setActiveTab || onTabChange || (() => {});
  const actualSetCustomInput = setCustomInput || onCustomInputChange || (() => {});
  const actualRunResult = runResult || result;
  const actualIsRunning = isRunning || isLoading;

  const [copied, setCopied] = useState(false);
  const [selectedResultCaseIdx, setSelectedResultCaseIdx] = useState(0);

  // Auto-select first failing test case if any exists
  useEffect(() => {
    if (activeResult?.test_results && activeResult.test_results.length > 0) {
      const firstFailIdx = activeResult.test_results.findIndex((tr) => !tr.passed);
      if (firstFailIdx !== -1) {
        setSelectedResultCaseIdx(firstFailIdx);
      } else {
        setSelectedResultCaseIdx(0);
      }
    }
  }, [submitResult, actualRunResult]);

  const handleSelectCase = (idx) => {
    if (setSelectedCaseIndex) {
      setSelectedCaseIndex(idx);
    }
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const normalizeText = (text) => {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim()
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .trim();
  };

  const activeResult = submitResult || actualRunResult;
  const diagnostics = activeResult?.diagnostics || [];
  const rawStatus = activeResult?.status || '';
  const rawVerdict = activeResult?.verdict || rawStatus.toUpperCase().replace(/\s+/g, '_');

  const outputVal = activeResult?.output !== undefined ? activeResult.output : (activeResult?.actual || '');
  const expectedVal = activeResult?.expected_output !== undefined ? activeResult.expected_output : (activeResult?.expected || '');
  const hasExpected = expectedVal !== '' && expectedVal !== null && expectedVal !== undefined;

  const outputMatches = hasExpected && (
    normalizeText(outputVal) === normalizeText(expectedVal) ||
    normalizeText(outputVal).toLowerCase() === normalizeText(expectedVal).toLowerCase()
  );

  const isCompileOrSyntaxError = rawStatus === 'Compilation Error' || rawStatus === 'Syntax Error' || rawVerdict === 'COMPILATION_ERROR' || rawVerdict === 'SYNTAX_ERROR';
  const isRuntimeError = rawStatus === 'Runtime Error' || rawVerdict === 'RUNTIME_ERROR';
  const isTLE = rawStatus === 'Time Limit Exceeded' || rawVerdict === 'TIME_LIMIT_EXCEEDED';
  const isMLE = rawStatus === 'Memory Limit Exceeded' || rawVerdict === 'MEMORY_LIMIT_EXCEEDED';

  let status = rawStatus || (actualIsRunning ? 'Running' : '');
  let verdict = rawVerdict || (actualIsRunning ? 'RUNNING' : '');

  // If backend provided a verdict for multiple test cases (or submission evaluation), respect it directly!
  if (activeResult?.test_results && activeResult.test_results.length > 0) {
    status = rawStatus || (activeResult.passed_test_cases === activeResult.total_test_cases ? 'Accepted' : 'Wrong Answer');
    verdict = rawVerdict || (activeResult.passed_test_cases === activeResult.total_test_cases ? 'ACCEPTED' : 'WRONG_ANSWER');
  } else if (!isCompileOrSyntaxError && !isRuntimeError && !isTLE && !isMLE) {
    if (hasExpected) {
      if (outputMatches) {
        status = 'Accepted';
        verdict = 'ACCEPTED';
      } else {
        status = 'Wrong Answer';
        verdict = 'WRONG_ANSWER';
      }
    } else if (rawStatus === 'OK' || rawStatus === 'Success') {
      status = 'Executed Successfully';
      verdict = 'OK';
    }
  }

  const isAccepted = status === 'Accepted' || verdict === 'ACCEPTED' || status === 'Executed Successfully';
  const isWrongAnswer = status === 'Wrong Answer' || verdict === 'WRONG_ANSWER';

  return (
    <div className="flex flex-col h-full rounded-2xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] overflow-hidden shadow-sm transition-colors">
      {/* Tabs Header */}
      <div className="flex items-center justify-between px-5 bg-[#F5F7FA] dark:bg-[#151A21] border-b border-[#D9E0E8] dark:border-[#30363D] text-xs">
        <div className="flex items-center gap-3 overflow-x-auto py-2.5">
          <button
            type="button"
            onClick={() => {
              actualSetActiveTab('testcases');
              if (onInputModeChange) onInputModeChange('testcases');
            }}
            className={`font-bold transition flex items-center gap-1.5 py-1 px-2.5 rounded-lg ${
              activeTab === 'testcases'
                ? 'bg-[#FFFFFF] dark:bg-[#20252C] text-[#172033] dark:text-[#F8FAFC] shadow-sm border border-[#D9E0E8] dark:border-[#30363D]'
                : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${activeTab === 'testcases' ? 'text-[#22B573]' : 'text-[#667085]'}`} />
            <span>Testcase</span>
          </button>

          <button
            type="button"
            onClick={() => {
              actualSetActiveTab('custom');
              if (onInputModeChange) onInputModeChange('custom');
            }}
            className={`font-bold transition flex items-center gap-1.5 py-1 px-2.5 rounded-lg ${
              activeTab === 'custom'
                ? 'bg-[#FFFFFF] dark:bg-[#20252C] text-[#172033] dark:text-[#F8FAFC] shadow-sm border border-[#D9E0E8] dark:border-[#30363D]'
                : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-[#667085] dark:text-[#94A3B8]" />
            <span>Custom Input</span>
          </button>

          {activeResult && (
            <button
              type="button"
              onClick={() => actualSetActiveTab('result')}
              className={`font-bold transition flex items-center gap-1.5 py-1 px-2.5 rounded-lg ${
                activeTab === 'result'
                  ? 'bg-[#FFFFFF] dark:bg-[#20252C] text-[#172033] dark:text-[#F8FAFC] shadow-sm border border-[#D9E0E8] dark:border-[#30363D]'
                  : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${isAccepted ? 'text-[#22B573]' : isCompileOrSyntaxError || isRuntimeError || isWrongAnswer ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`} />
              <span>Test Result</span>
            </button>
          )}
        </div>
      </div>

      {/* Panel Body */}
      <div className="flex-1 p-4 overflow-y-auto text-sm">
        {/* TAB 1: Test Cases */}
        {activeTab === 'testcases' && (
          <div className="space-y-4">
            {sampleTestCases && sampleTestCases.length > 0 ? (
              <>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {sampleTestCases.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectCase(idx)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        selectedCaseIndex === idx
                          ? 'bg-[#0757B8] dark:bg-[#0066CC] text-white shadow-sm'
                          : 'bg-[#F5F7FA] dark:bg-[#151A21] text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC] border border-[#D9E0E8] dark:border-[#30363D]'
                      }`}
                    >
                      Case {idx + 1}
                    </button>
                  ))}
                </div>

                {sampleTestCases[selectedCaseIndex] && (
                  <div className="space-y-3 font-mono text-xs">
                    <div>
                      <div className="text-[#667085] dark:text-[#94A3B8] mb-1 font-sans font-bold">Input:</div>
                      <pre className="p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] overflow-x-auto whitespace-pre-wrap">
                        {sampleTestCases[selectedCaseIndex].input !== undefined && sampleTestCases[selectedCaseIndex].input !== null && sampleTestCases[selectedCaseIndex].input !== ''
                          ? sampleTestCases[selectedCaseIndex].input
                          : '(empty)'}
                      </pre>
                    </div>

                    <div>
                      <div className="text-[#667085] dark:text-[#94A3B8] mb-1 font-sans font-bold">Expected Output:</div>
                      <pre className="p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#22B573] overflow-x-auto whitespace-pre-wrap font-bold">
                        {sampleTestCases[selectedCaseIndex].expected_output || sampleTestCases[selectedCaseIndex].output || '(empty)'}
                      </pre>
                    </div>

                    {sampleTestCases[selectedCaseIndex].explanation && (
                      <div>
                        <div className="text-[#667085] dark:text-[#94A3B8] mb-1 font-sans font-bold">Explanation:</div>
                        <div className="p-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8] font-sans text-xs">
                          {sampleTestCases[selectedCaseIndex].explanation}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center text-[#667085] dark:text-[#94A3B8] text-xs">
                No predefined sample testcases for this problem. Use Custom Input tab to test code.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Custom Input */}
        {activeTab === 'custom' && (
          <div className="flex flex-col h-full space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-[#667085] dark:text-[#94A3B8] font-bold">
                Standard Input (stdin):
              </label>
              <span className="text-[11px] text-[#667085] dark:text-[#94A3B8]">
                Passes to program when you click "Run Code"
              </span>
            </div>
            <textarea
              value={customInput}
              onChange={(e) => actualSetCustomInput(e.target.value)}
              placeholder="Enter custom input here..."
              rows={4}
              className="w-full p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] font-mono text-xs focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition resize-none"
            />
          </div>
        )}

        {/* TAB 3: LeetCode-Style Test Result */}
        {activeTab === 'result' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Loading / Evaluating Spinner */}
            {(actualIsRunning || isSubmitting) && (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <div className="w-8 h-8 border-4 border-[#0757B8] dark:border-[#60A5FA] border-t-transparent rounded-full animate-spin"></div>
                <div className="text-xs text-[#667085] dark:text-[#94A3B8] font-bold uppercase tracking-wider animate-pulse">
                  {isSubmitting ? 'Evaluating Solution Against Sample Testcases...' : 'Compiling & Executing Code...'}
                </div>
              </div>
            )}

            {/* Verdict Views */}
            {!(actualIsRunning || isSubmitting) && activeResult && (
              <div className="space-y-4">
                
                {/* 1. STATUS HEADER BAR */}
                <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-2 pb-2 border-b border-[#D9E0E8] dark:border-[#30363D]">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className={`text-xl font-extrabold tracking-tight flex items-center gap-2 ${
                      isAccepted
                        ? 'text-[#22B573]'
                        : isCompileOrSyntaxError || isRuntimeError || isWrongAnswer
                        ? 'text-[#EF4444]'
                        : 'text-[#F59E0B]'
                    }`}>
                      {isAccepted ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                      <span className="whitespace-nowrap">{status === 'OK' ? 'Accepted' : status}</span>
                    </span>

                    {activeResult.total_test_cases !== undefined && activeResult.total_test_cases > 0 && !activeResult.is_custom && (() => {
                      const total = activeResult.total_test_cases;
                      const passed = activeResult.passed_test_cases || 0;
                      const failed = activeResult.failed_test_cases !== undefined 
                        ? activeResult.failed_test_cases 
                        : Math.max(0, total - passed);

                      return (
                        <span className="shrink-0 text-xs font-bold font-mono bg-[#F5F7FA] dark:bg-[#151A21] px-2.5 py-1 rounded-lg border border-[#D9E0E8] dark:border-[#30363D] flex items-center gap-1">
                          {failed > 0 ? (
                            <>
                              <span className="text-emerald-600 dark:text-emerald-400">{passed} / {total} passed</span>
                              <span className="text-[#667085] dark:text-[#94A3B8]">, </span>
                              <span className="text-[#EF4444] font-extrabold">{failed} failed</span>
                            </>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">{passed} / {total} passed</span>
                          )}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 text-xs text-[#667085] dark:text-[#94A3B8] font-mono flex-wrap">
                    <span className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D]">
                      Runtime: {activeResult.runtime_ms || activeResult.runtime || activeResult.execution_time || 0} ms
                    </span>
                    {activeResult.memory_mb && (
                      <span className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D]">
                        Memory: {activeResult.memory_mb} MB
                      </span>
                    )}
                    {activeResult.complexity?.time && activeResult.complexity?.time !== 'Unable to determine automatically with high confidence' && (
                      <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 dark:bg-purple-950/20 border border-purple-500/30 text-purple-600 dark:text-purple-400 font-bold">
                        Time: {activeResult.complexity.time}
                      </span>
                    )}
                    {activeResult.complexity?.space && activeResult.complexity?.space !== 'Unable to determine automatically with high confidence' && (
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 dark:bg-indigo-950/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-bold">
                        Space: {activeResult.complexity.space}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. COMPILATION / SYNTAX ERROR PANEL */}
                {isCompileOrSyntaxError && (
                  <div className="space-y-3">
                    {diagnostics && diagnostics.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-[#EF4444] uppercase tracking-wider flex items-center justify-between">
                          <span>Compiler Diagnostics ({diagnostics.length}):</span>
                          <span className="text-[10px] text-[#667085] dark:text-[#94A3B8] normal-case">Click an error to jump to line</span>
                        </div>
                        <div className="space-y-1.5">
                          {diagnostics.map((diag, idx) => (
                            <div
                              key={idx}
                              onClick={() => diag.line && onNavigateToLine && onNavigateToLine(diag.line, diag.column)}
                              className={`p-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-[#EF4444] font-mono flex items-start justify-between gap-3 ${
                                diag.line && onNavigateToLine ? 'cursor-pointer hover:bg-red-500/20 transition' : ''
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-bold">
                                    {diag.line ? `Line ${diag.line}${diag.column ? `, Col ${diag.column}` : ''}` : 'General Error'}
                                    {diag.code ? ` [${diag.code}]` : ''}
                                  </div>
                                  <div className="text-xs text-[#EF4444]/90 mt-0.5 whitespace-pre-wrap">{diag.message}</div>
                                </div>
                              </div>
                              {diag.line && onNavigateToLine && (
                                <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0 mt-1" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Raw compiler output */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-[#667085] dark:text-[#94A3B8]">
                        <span>Raw Compiler Output:</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeResult.error || activeResult.stderr || '')}
                          className="flex items-center gap-1 text-[11px] text-[#0757B8] dark:text-[#60A5FA] hover:underline"
                        >
                          {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <pre className="p-3.5 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#EF4444] font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {activeResult.error || activeResult.stderr || 'Compilation failed.'}
                      </pre>
                    </div>
                  </div>
                )}

                {/* 3. CUSTOM INPUT RESULT VIEW */}
                {!isCompileOrSyntaxError && activeResult.is_custom && (
                  <div className="space-y-3 font-mono text-xs">
                    {/* Custom Input */}
                    <div>
                      <div className="text-[#667085] dark:text-[#94A3B8] font-sans font-bold mb-1 flex items-center justify-between">
                        <span>Custom Input:</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeResult.input || '')}
                          className="text-[10px] text-[#0757B8] dark:text-[#60A5FA] hover:underline cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>
                      <pre className="p-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] overflow-x-auto whitespace-pre-wrap">
                        {activeResult.input !== undefined && activeResult.input !== null && activeResult.input !== ''
                          ? activeResult.input
                          : '(No input)'}
                      </pre>
                    </div>

                    {/* Your Output */}
                    <div>
                      <div className="text-[#667085] dark:text-[#94A3B8] font-sans font-bold mb-1">Your Output:</div>
                      {(() => {
                        const rawOut = activeResult.stdout !== undefined ? activeResult.stdout : (activeResult.output !== undefined ? activeResult.output : '');
                        const trimmedOut = typeof rawOut === 'string' ? rawOut.trim() : String(rawOut || '').trim();
                        const hasOutput = trimmedOut !== '';
                        const isError = isRuntimeError;

                        return (
                          <pre className={`p-2.5 rounded-xl border overflow-x-auto whitespace-pre-wrap font-mono ${
                            isError
                              ? 'bg-red-500/10 border-red-500/30 text-[#EF4444]'
                              : hasOutput
                              ? 'bg-[#F5F7FA] dark:bg-[#151A21] border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] font-semibold'
                              : 'bg-[#F5F7FA] dark:bg-[#151A21] border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8] italic'
                          }`}>
                            {hasOutput ? trimmedOut : '(No output)'}
                          </pre>
                        );
                      })()}
                    </div>

                    {/* Runtime Error if any on custom input */}
                    {isRuntimeError && (
                      <div className="space-y-2 pt-1">
                        <div className="text-xs font-bold text-[#EF4444] font-sans flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Runtime Error on Custom Input:</span>
                        </div>
                        {diagnostics && diagnostics.length > 0 && (
                          <div className="space-y-1.5">
                            {diagnostics.map((diag, idx) => (
                              <div
                                key={idx}
                                onClick={() => diag.line && onNavigateToLine && onNavigateToLine(diag.line, diag.column)}
                                className={`p-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-[#EF4444] font-mono flex items-start justify-between gap-3 ${
                                  diag.line && onNavigateToLine ? 'cursor-pointer hover:bg-red-500/20 transition' : ''
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                  <div>
                                    <div className="font-bold">
                                      {diag.line ? `Runtime Error at Line ${diag.line}` : 'Runtime Exception'}
                                    </div>
                                    <div className="text-xs text-[#EF4444]/90 mt-0.5 whitespace-pre-wrap">{diag.message}</div>
                                  </div>
                                </div>
                                {diag.line && onNavigateToLine && (
                                  <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0 mt-1" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <pre className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-[#EF4444] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {activeResult.error || activeResult.stderr || 'Runtime error occurred.'}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. TEST CASE EVALUATION VIEW (For all sample test cases) */}
                {!isCompileOrSyntaxError && !activeResult.is_custom && (() => {
                  const testResults = activeResult.test_results || [];
                  const hasTestResults = testResults.length > 0;
                  const failedCases = hasTestResults ? testResults.filter((tr) => !tr.passed) : [];

                  const renderTestCaseCard = (tc, idx) => {
                    const isPassed = Boolean(tc.passed);
                    const caseNum = tc.test_case || idx + 1;
                    const caseStatus = tc.status || (isPassed ? 'Passed' : 'Failed');
                    const isCaseRuntimeError = tc.status === 'Runtime Error' || tc.verdict === 'RUNTIME_ERROR' || Boolean(tc.error && tc.status !== 'Wrong Answer');
                    const tcDiags = (tc.diagnostics && tc.diagnostics.length > 0) ? tc.diagnostics : (isCaseRuntimeError ? diagnostics : []);
                    const errorDetails = tc.error || tc.stderr || (isCaseRuntimeError ? (activeResult.error || activeResult.stderr) : '');

                    return (
                      <div className="w-full min-w-0 space-y-3 font-mono text-xs">
                        {/* Case Status Banner */}
                        <div className={`flex min-w-0 items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold font-sans ${
                          isPassed
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
                        }`}>
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            {isPassed ? (
                              <CheckCircle2 className="w-4 h-4 text-[#22B573] shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
                            )}
                            <span className="min-w-0 text-sm font-extrabold tracking-tight break-words">
                              {isPassed ? `✅ Test Case ${caseNum} Passed` : `❌ Test Case ${caseNum} Failed`}
                            </span>
                          </span>
                          <span className="shrink-0 whitespace-nowrap uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[11px]">
                            {caseStatus}
                          </span>
                        </div>

                        {/* Input */}
                        <div className="w-full min-w-0">
                          <div className="flex min-h-5 items-center justify-between gap-3 text-[#667085] dark:text-[#94A3B8] font-sans font-bold mb-1">
                            <span>Input:</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(tc.input || '')}
                              className="text-[10px] text-[#0757B8] dark:text-[#60A5FA] hover:underline cursor-pointer"
                            >
                              Copy
                            </button>
                          </div>
                          <pre className="w-full min-w-0 p-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] overflow-x-auto whitespace-pre-wrap break-words">
                            {tc.input !== undefined && tc.input !== null && tc.input !== '' ? tc.input : '(empty)'}
                          </pre>
                        </div>

                        {/* Expected Output */}
                        {(tc.expected !== undefined || tc.expected_output !== undefined) && (
                          <div className="w-full min-w-0">
                            <div className="text-[#667085] dark:text-[#94A3B8] font-sans font-bold mb-1">Expected Output:</div>
                            <pre className="w-full min-w-0 p-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#22B573] font-bold overflow-x-auto whitespace-pre-wrap break-words">
                              {tc.expected !== undefined && tc.expected !== null && tc.expected !== ''
                                ? tc.expected
                                : (tc.expected_output || '(empty)')}
                            </pre>
                          </div>
                        )}

                        {/* Actual Output */}
                        <div className="w-full min-w-0">
                          <div className="text-[#667085] dark:text-[#94A3B8] font-sans font-bold mb-1">Actual Output:</div>
                          <pre className={`w-full min-w-0 p-2.5 rounded-xl border overflow-x-auto whitespace-pre-wrap break-words font-bold ${
                            isPassed
                              ? 'bg-[#F5F7FA] dark:bg-[#151A21] border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC]'
                              : 'bg-red-500/10 border-red-500/30 text-[#EF4444]'
                          }`}>
                            {tc.actual !== undefined && tc.actual !== null && tc.actual !== ''
                              ? tc.actual
                              : (tc.actual_output !== undefined && tc.actual_output !== null && tc.actual_output !== ''
                                ? tc.actual_output
                                : '(No output)')}
                          </pre>
                        </div>

                        {/* Runtime Error Details (if any on this testcase) */}
                        {(!isPassed && (isCaseRuntimeError || errorDetails)) && (
                          <div className="space-y-2 pt-1">
                            <div className="text-xs font-bold text-[#EF4444] font-sans flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>Runtime Error Details for Test Case {caseNum}:</span>
                            </div>

                            {tcDiags && tcDiags.length > 0 && (
                              <div className="space-y-1.5">
                                {tcDiags.map((diag, dIdx) => (
                                  <div
                                    key={dIdx}
                                    onClick={() => diag.line && onNavigateToLine && onNavigateToLine(diag.line, diag.column)}
                                    className={`p-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-[#EF4444] font-mono flex items-start justify-between gap-3 ${
                                      diag.line && onNavigateToLine ? 'cursor-pointer hover:bg-red-500/20 transition' : ''
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                      <div>
                                        <div className="font-bold">
                                          {diag.line ? `Runtime Error at Line ${diag.line}` : 'Runtime Exception'}
                                        </div>
                                        <div className="text-xs text-[#EF4444]/90 mt-0.5 whitespace-pre-wrap">{diag.message}</div>
                                      </div>
                                    </div>
                                    {diag.line && onNavigateToLine && (
                                      <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0 mt-1" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="space-y-1 font-mono text-xs">
                              <div className="text-[11px] font-bold text-[#EF4444]/80 font-sans">Exception Stack Trace:</div>
                              <pre className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-[#EF4444] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                {errorDetails || 'Runtime error occurred.'}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  };

                  if (hasTestResults) {
                    return (
                      <div className="w-full min-w-0 space-y-4">
                        {/* 1. Interactive Testcase Selector Tabs */}
                        <div className="space-y-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="shrink-0 text-xs font-bold text-[#667085] dark:text-[#94A3B8] font-sans">
                            Test Cases Status:
                            </div>
                            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                              {testResults.map((tr, idx) => {
                                const isCurrent = selectedResultCaseIdx === idx;
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setSelectedResultCaseIdx(idx)}
                                    className={`inline-flex min-h-8 items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                                      isCurrent
                                        ? tr.passed
                                          ? 'bg-[#22B573] text-white shadow-sm ring-2 ring-emerald-400/30'
                                          : 'bg-[#EF4444] text-white shadow-sm ring-2 ring-red-400/30'
                                        : tr.passed
                                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                        : 'bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20'
                                    }`}
                                  >
                                    {tr.passed ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                    ) : (
                                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                                    )}
                                    <span className="whitespace-nowrap">Case {idx + 1}: {tr.passed ? '✅ Passed' : '❌ Failed'}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* 2. Detail view for Selected Test Case */}
                        {testResults[selectedResultCaseIdx] && (
                          <div className="w-full min-w-0 p-4 rounded-2xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#F5F7FA]/30 dark:bg-[#151A21]/30">
                            {renderTestCaseCard(testResults[selectedResultCaseIdx], selectedResultCaseIdx)}
                          </div>
                        )}

                        {/* 3. Dedicated Listing for Multiple Failed Test Cases */}
                        {failedCases.length > 1 && (
                          <div className="space-y-3 pt-4 border-t border-[#D9E0E8] dark:border-[#30363D]">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-extrabold text-[#EF4444] uppercase tracking-wider flex items-center gap-2">
                                <XCircle className="w-4 h-4 shrink-0" />
                                <span>All Failed Test Cases ({failedCases.length}):</span>
                              </div>
                              <span className="text-[11px] text-[#667085] dark:text-[#94A3B8]">
                                Every failed test case listed separately
                              </span>
                            </div>

                            <div className="space-y-3">
                              {failedCases.map((fc, fIdx) => (
                                <div
                                  key={fIdx}
                                  className="w-full min-w-0 p-4 rounded-2xl border border-red-500/30 bg-red-500/5 dark:bg-red-950/10 space-y-3"
                                >
                                  {renderTestCaseCard(fc, fc.test_case ? fc.test_case - 1 : fIdx)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Fallback for single-case test result without test_results array
                  return (
                    <div className="p-4 rounded-2xl border border-[#D9E0E8] dark:border-[#30363D]">
                      {renderTestCaseCard(activeResult, 0)}
                    </div>
                  );
                })()}

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
