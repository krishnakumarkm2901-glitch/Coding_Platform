import React, { useState } from 'react';
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

  const handleSelectCase = (idx) => {
    if (setSelectedCaseIndex) {
      setSelectedCaseIndex(idx);
    }
    if (sampleTestCases[idx] && actualSetCustomInput) {
      actualSetCustomInput(sampleTestCases[idx].input || '');
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

  let status = rawStatus;
  let verdict = rawVerdict;

  if (!isCompileOrSyntaxError && !isRuntimeError && !isTLE && !isMLE) {
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
            onClick={() => actualSetActiveTab('testcases')}
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
            onClick={() => actualSetActiveTab('custom')}
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
                  {isSubmitting ? 'Evaluating Solution Against Official & Hidden Tests...' : 'Compiling & Executing Code...'}
                </div>
              </div>
            )}

            {/* Verdict Views */}
            {!(actualIsRunning || isSubmitting) && activeResult && (
              <div className="space-y-4">
                
                {/* 1. STATUS HEADER BAR */}
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#D9E0E8] dark:border-[#30363D]">
                  <div className="flex items-center gap-3">
                    <span className={`text-xl font-extrabold tracking-tight flex items-center gap-2 ${
                      isAccepted
                        ? 'text-[#22B573]'
                        : isCompileOrSyntaxError || isRuntimeError || isWrongAnswer
                        ? 'text-[#EF4444]'
                        : 'text-[#F59E0B]'
                    }`}>
                      {isAccepted ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                      <span>{status === 'OK' ? 'Accepted' : status}</span>
                    </span>

                    {activeResult.total_test_cases !== undefined && activeResult.total_test_cases > 0 && (
                      <span className="text-xs text-[#667085] dark:text-[#94A3B8] font-bold font-mono bg-[#F5F7FA] dark:bg-[#151A21] px-2.5 py-1 rounded-lg border border-[#D9E0E8] dark:border-[#30363D]">
                        {activeResult.passed_test_cases} / {activeResult.total_test_cases} passed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#667085] dark:text-[#94A3B8] font-mono">
                    <span className="px-2.5 py-1 rounded-lg bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D]">
                      Runtime: {activeResult.runtime_ms || activeResult.runtime || activeResult.execution_time || 0} ms
                    </span>
                    {activeResult.memory_mb && (
                      <span className="px-2.5 py-1 rounded-lg bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D]">
                        Memory: {activeResult.memory_mb} MB
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

                {/* 3. RUNTIME ERROR PANEL */}
                {isRuntimeError && (
                  <div className="space-y-3">
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
                                <div className="text-xs text-[#EF4444]/90 mt-0.5">{diag.message}</div>
                              </div>
                            </div>
                            {diag.line && onNavigateToLine && (
                              <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0 mt-1" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-1.5 font-mono text-xs">
                      <div className="text-xs font-bold text-[#EF4444]">Exception Stack Trace:</div>
                      <pre className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-[#EF4444] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {activeResult.error || activeResult.stderr || 'Runtime error occurred.'}
                      </pre>
                    </div>
                  </div>
                )}

                {/* 4. WRONG ANSWER / TESTCASE EVALUATION */}
                {(isWrongAnswer || isAccepted || isTLE || isMLE || (!isCompileOrSyntaxError && !isRuntimeError)) && (
                  <div className="space-y-3">
                    {/* Test Results Breakdown (if multiple cases) */}
                    {activeResult.test_results && activeResult.test_results.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                          {activeResult.test_results.map((tr, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedResultCaseIdx(idx)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                                selectedResultCaseIdx === idx
                                  ? 'bg-[#0757B8] dark:bg-[#0066CC] text-white shadow-sm'
                                  : 'bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8]'
                              }`}
                            >
                              {tr.passed ? (
                                <CheckCircle2 className="w-3 h-3 text-[#22B573]" />
                              ) : (
                                <XCircle className="w-3 h-3 text-[#EF4444]" />
                              )}
                              <span>Case {idx + 1}</span>
                            </button>
                          ))}
                        </div>

                        {activeResult.test_results[selectedResultCaseIdx] && (
                          <div className="space-y-2.5 font-mono text-xs pt-1">
                            {/* Input */}
                            <div>
                              <div className="text-[#667085] dark:text-[#94A3B8] font-sans font-bold mb-1">Input:</div>
                              <pre className="p-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] overflow-x-auto whitespace-pre-wrap">
                                {activeResult.test_results[selectedResultCaseIdx].input || '(empty)'}
                              </pre>
                            </div>

                            {/* Output */}
                            <div>
                              <div className="text-[#667085] dark:text-[#94A3B8] font-sans font-bold mb-1">Your Output:</div>
                              <pre className={`p-2.5 rounded-xl border overflow-x-auto whitespace-pre-wrap ${
                                activeResult.test_results[selectedResultCaseIdx].passed
                                  ? 'bg-[#F5F7FA] dark:bg-[#151A21] border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC]'
                                  : 'bg-red-500/10 border-red-500/30 text-[#EF4444]'
                              }`}>
                                {activeResult.test_results[selectedResultCaseIdx].actual || activeResult.test_results[selectedResultCaseIdx].actual_output || '(No output)'}
                              </pre>
                            </div>

                            {/* Expected */}
                            {activeResult.test_results[selectedResultCaseIdx].expected && (
                              <div>
                                <div className="text-[#667085] dark:text-[#94A3B8] font-sans font-bold mb-1">Expected Output:</div>
                                <pre className="p-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#22B573] font-bold overflow-x-auto whitespace-pre-wrap">
                                  {activeResult.test_results[selectedResultCaseIdx].expected || activeResult.test_results[selectedResultCaseIdx].expected_output}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Single run / custom input view fallback */}
                    {(!activeResult.test_results || activeResult.test_results.length === 0) && (
                      <div className="space-y-2.5 font-mono text-xs">
                        {/* Input */}
                        <div>
                          <div className="text-[#667085] dark:text-[#94A3B8] font-sans font-bold mb-1">Input:</div>
                          <pre className="p-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] overflow-x-auto whitespace-pre-wrap">
                            {activeResult.input !== undefined && activeResult.input !== null && activeResult.input !== ''
                              ? activeResult.input
                              : '(empty)'}
                          </pre>
                        </div>

                        {/* Your Output */}
                        <div>
                          <div className="text-[#667085] dark:text-[#94A3B8] font-sans font-bold mb-1">Your Output:</div>
                          <pre className={`p-2.5 rounded-xl border overflow-x-auto whitespace-pre-wrap ${
                            isAccepted
                              ? 'bg-[#F5F7FA] dark:bg-[#151A21] border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC]'
                              : 'bg-red-500/10 border-red-500/30 text-[#EF4444]'
                          }`}>
                            {activeResult.output || activeResult.error || '(No output)'}
                          </pre>
                        </div>

                        {/* Expected Output */}
                        {activeResult.expected_output && (
                          <div>
                            <div className="text-[#667085] dark:text-[#94A3B8] font-sans font-bold mb-1">Expected Output:</div>
                            <pre className="p-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#22B573] font-bold overflow-x-auto whitespace-pre-wrap">
                              {activeResult.expected_output}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
