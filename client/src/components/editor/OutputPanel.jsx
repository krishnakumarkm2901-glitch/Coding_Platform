import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Terminal, 
  AlertCircle,
  Code2, 
  Zap,
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
}) => {
  const actualSetActiveTab = setActiveTab || onTabChange || (() => {});
  const actualSetCustomInput = setCustomInput || onCustomInputChange || (() => {});
  const actualRunResult = runResult || result;
  const actualIsRunning = isRunning || isLoading;

  const handleSelectCase = (idx) => {
    if (setSelectedCaseIndex) {
      setSelectedCaseIndex(idx);
    }
    if (sampleTestCases[idx] && actualSetCustomInput) {
      actualSetCustomInput(sampleTestCases[idx].input || '');
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] overflow-hidden shadow-sm transition-colors">
      {/* Tabs Header */}
      <div className="flex items-center justify-between px-5 bg-[#F5F7FA] dark:bg-[#151A21] border-b border-[#D9E0E8] dark:border-[#30363D] text-xs">
        <div className="flex items-center gap-3 overflow-x-auto py-2.5">
          <button
            type="button"
            onClick={() => actualSetActiveTab('testcases')}
            className={`font-bold transition flex items-center gap-1.5 py-1 px-2 rounded-lg ${
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
            className={`font-bold transition flex items-center gap-1.5 py-1 px-2 rounded-lg ${
              activeTab === 'custom'
                ? 'bg-[#FFFFFF] dark:bg-[#20252C] text-[#172033] dark:text-[#F8FAFC] shadow-sm border border-[#D9E0E8] dark:border-[#30363D]'
                : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-[#667085] dark:text-[#94A3B8]" />
            <span>Custom Input</span>
          </button>

          {(actualRunResult || submitResult) && (
            <button
              type="button"
              onClick={() => actualSetActiveTab('result')}
              className={`font-bold transition flex items-center gap-1.5 py-1 px-2 rounded-lg ${
                activeTab === 'result'
                  ? 'bg-[#FFFFFF] dark:bg-[#20252C] text-[#172033] dark:text-[#F8FAFC] shadow-sm border border-[#D9E0E8] dark:border-[#30363D]'
                  : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${activeTab === 'result' ? 'text-[#22B573]' : 'text-[#667085]'}`} />
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
                Runs when you click "Run Code"
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

        {/* TAB 3: Test Result */}
        {activeTab === 'result' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Loading / Evaluating Spinner */}
            {(actualIsRunning || isSubmitting) && (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <div className="w-8 h-8 border-4 border-[#0757B8] dark:border-[#60A5FA] border-t-transparent rounded-full animate-spin"></div>
                <div className="text-xs text-[#667085] dark:text-[#94A3B8] font-bold uppercase tracking-wider animate-pulse">
                  {isSubmitting ? 'Evaluating Submission Against Test Cases...' : 'Executing Code Locally...'}
                </div>
              </div>
            )}

            {/* Verdict Display */}
            {!(actualIsRunning || isSubmitting) && (
              <>
                {/* 1. SUBMISSION RESULT VIEW */}
                {submitResult && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-xl font-extrabold tracking-tight ${
                          submitResult.status === 'Accepted' ? 'text-[#22B573]' : 'text-[#EF4444]'
                        }`}>
                          {submitResult.status}
                        </span>
                        <span className="text-xs text-[#667085] dark:text-[#94A3B8] font-bold font-mono bg-[#F5F7FA] dark:bg-[#151A21] px-2.5 py-1 rounded-lg border border-[#D9E0E8] dark:border-[#30363D]">
                          Passed: {submitResult.passed_test_cases} / {submitResult.total_test_cases}
                        </span>
                      </div>
                      <span className="text-xs text-[#667085] dark:text-[#94A3B8] font-mono">
                        Runtime: {submitResult.runtime || 0} ms
                      </span>
                    </div>

                    {submitResult.status === 'Compilation Error' && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-[#EF4444]">Compiler Output:</div>
                        <pre className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-[#EF4444] font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                          {submitResult.error_message || 'Compilation failed.'}
                        </pre>
                      </div>
                    )}

                    {submitResult.failed_case && submitResult.status !== 'Compilation Error' && (
                      <div className="space-y-2 pt-2 border-t border-[#D9E0E8] dark:border-[#30363D]">
                        <div className="text-xs font-bold text-[#EF4444] flex items-center gap-1.5">
                          <XCircle className="w-4 h-4" />
                          <span>Failed on Test Case #{submitResult.failed_case.test_case_index || 1}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 font-mono text-xs">
                          <div>
                            <div className="text-[#667085] dark:text-[#94A3B8] font-sans font-semibold mb-1">Input:</div>
                            <pre className="p-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] overflow-x-auto whitespace-pre-wrap">
                              {submitResult.failed_case.input || '(empty)'}
                            </pre>
                          </div>
                          <div>
                            <div className="text-[#667085] dark:text-[#94A3B8] font-sans font-semibold mb-1">Your Output:</div>
                            <pre className="p-2.5 rounded-xl bg-red-500/5 dark:bg-red-950/20 border border-red-500/30 text-[#EF4444] overflow-x-auto whitespace-pre-wrap">
                              {submitResult.failed_case.actual || submitResult.error_message || '(No output)'}
                            </pre>
                          </div>
                          {submitResult.failed_case.expected && (
                            <div>
                              <div className="text-[#667085] dark:text-[#94A3B8] font-sans font-semibold mb-1">Expected Output:</div>
                              <pre className="p-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#22B573] font-bold overflow-x-auto whitespace-pre-wrap">
                                {submitResult.failed_case.expected}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. RUN RESULT VIEW */}
                {!submitResult && actualRunResult && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-xl font-extrabold tracking-tight ${
                          (actualRunResult.status === 'OK' || actualRunResult.status === 'Success' || actualRunResult.status === 'Accepted')
                            ? 'text-[#22B573]'
                            : 'text-[#EF4444]'
                        }`}>
                          {actualRunResult.status === 'OK' ? 'Executed Successfully' : actualRunResult.status}
                        </span>
                      </div>
                      <span className="text-xs text-[#667085] dark:text-[#94A3B8] font-mono bg-[#F5F7FA] dark:bg-[#151A21] px-2.5 py-1 rounded-lg border border-[#D9E0E8] dark:border-[#30363D]">
                        Runtime: {actualRunResult.execution_time || 0} ms
                      </span>
                    </div>

                    {actualRunResult.status === 'Compilation Error' ? (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-[#EF4444]">Compiler Error:</div>
                        <pre className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-[#EF4444] font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                          {actualRunResult.error || actualRunResult.stderr || 'Compilation failed.'}
                        </pre>
                      </div>
                    ) : (
                      <div className="space-y-3 font-mono text-xs">
                        {/* INPUT */}
                        <div>
                          <div className="text-[#667085] dark:text-[#94A3B8] font-sans font-bold mb-1">Input:</div>
                          <pre className="p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] overflow-x-auto whitespace-pre-wrap">
                            {actualRunResult.input !== undefined && actualRunResult.input !== null && actualRunResult.input !== ''
                              ? actualRunResult.input
                              : '(empty)'}
                          </pre>
                        </div>

                        {/* OUTPUT */}
                        <div>
                          <div className="text-[#667085] dark:text-[#94A3B8] font-sans font-bold mb-1">
                            {actualRunResult.status === 'Runtime Error' ? 'Runtime Error Message:' : 'Output:'}
                          </div>
                          <pre className={`p-3 rounded-xl border overflow-x-auto whitespace-pre-wrap ${
                            actualRunResult.status === 'Runtime Error' || actualRunResult.status === 'Error'
                              ? 'bg-red-500/10 border-red-500/30 text-[#EF4444]'
                              : 'bg-[#F5F7FA] dark:bg-[#151A21] border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC]'
                          }`}>
                            {actualRunResult.error || actualRunResult.output || '(No output)'}
                          </pre>
                        </div>

                        {/* EXPECTED OUTPUT (if available) */}
                        {actualRunResult.expected_output && (
                          <div>
                            <div className="text-[#667085] dark:text-[#94A3B8] font-sans font-bold mb-1">Expected Output:</div>
                            <pre className="p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#22B573] font-bold overflow-x-auto whitespace-pre-wrap">
                              {actualRunResult.expected_output}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
