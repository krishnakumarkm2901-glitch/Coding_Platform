import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Terminal, 
  Code2, 
  Zap,
} from 'lucide-react';
import { StatusBadge } from '../common/Badge';

export const OutputPanel = ({
  activeTab = 'testcases',
  setActiveTab,
  onTabChange, // fallback
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
  // Normalize params
  const actualSetActiveTab = setActiveTab || onTabChange;
  const actualSetCustomInput = setCustomInput || onCustomInputChange;
  const actualRunResult = runResult || result;
  const actualIsRunning = isRunning || isLoading;

  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);

  useEffect(() => {
    setSelectedCaseIndex(0);
  }, [actualRunResult, submitResult]);

  return (
    <div className="flex flex-col h-full rounded-2xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] overflow-hidden shadow-sm transition-colors">
      {/* Tabs Header */}
      <div className="flex items-center justify-between px-5 bg-[#F5F7FA] dark:bg-[#151A21] border-b border-[#D9E0E8] dark:border-[#30363D] text-xs">
        <div className="flex items-center gap-3 overflow-x-auto py-3">
          <button
            onClick={() => actualSetActiveTab('testcases')}
            className={`font-bold transition flex items-center gap-1.5 ${
              activeTab === 'testcases'
                ? 'text-[#172033] dark:text-[#F8FAFC]'
                : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${activeTab === 'testcases' ? 'text-[#22B573]' : 'text-[#667085]'}`} />
            Testcase
          </button>

          <span className="text-[#D9E0E8] dark:text-[#30363D]">|</span>

          <button
            onClick={() => actualSetActiveTab('custom')}
            className={`font-bold transition flex items-center gap-1.5 ${
              activeTab === 'custom'
                ? 'text-[#172033] dark:text-[#F8FAFC]'
                : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-[#667085] dark:text-[#94A3B8]" />
            Custom Input
          </button>

          {(actualRunResult || submitResult) && (
            <>
              <span className="text-[#D9E0E8] dark:text-[#30363D]">|</span>
              <button
                onClick={() => actualSetActiveTab('result')}
                className={`font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'result'
                    ? 'text-[#172033] dark:text-[#F8FAFC]'
                    : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
                }`}
              >
                <Terminal className={`w-3.5 h-3.5 ${activeTab === 'result' ? 'text-[#22B573]' : 'text-[#667085]'}`} />
                Test Result
              </button>
            </>
          )}
        </div>
      </div>

      {/* Panel Body */}
      <div className="flex-1 p-4 overflow-y-auto text-sm">
        {/* TAB 1: Test Cases */}
        {activeTab === 'testcases' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {sampleTestCases.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCaseIndex(idx)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
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
                  <div className="text-[#667085] dark:text-[#94A3B8] mb-1 font-sans font-medium">Input:</div>
                  <pre className="p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] overflow-x-auto whitespace-pre-wrap">
                    {sampleTestCases[selectedCaseIndex].input || '(empty)'}
                  </pre>
                </div>

                <div>
                  <div className="text-[#667085] dark:text-[#94A3B8] mb-1 font-sans font-medium">Expected Output:</div>
                  <pre className="p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#22B573] overflow-x-auto whitespace-pre-wrap font-bold">
                    {sampleTestCases[selectedCaseIndex].expected_output || '(empty)'}
                  </pre>
                </div>

                {sampleTestCases[selectedCaseIndex].explanation && (
                  <div>
                    <div className="text-[#667085] dark:text-[#94A3B8] mb-1 font-sans font-medium">Explanation:</div>
                    <div className="p-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8] font-sans text-xs">
                      {sampleTestCases[selectedCaseIndex].explanation}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Custom Input */}
        {activeTab === 'custom' && (
          <div className="flex flex-col h-full space-y-2">
            <label className="text-xs text-[#667085] dark:text-[#94A3B8] font-semibold">
              Standard Input (stdin):
            </label>
            <textarea
              value={customInput}
              onChange={(e) => actualSetCustomInput(e.target.value)}
              placeholder="Enter custom test input..."
              rows={5}
              className="w-full p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] font-mono text-xs focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition resize-none"
            />
          </div>
        )}

        {/* TAB 3: Test Result */}
        {activeTab === 'result' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Loading States */}
            {(actualIsRunning || isSubmitting) && (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <div className="w-8 h-8 border-4 border-[#0757B8] dark:border-[#60A5FA] border-t-transparent rounded-full animate-spin"></div>
                <div className="text-xs text-[#667085] dark:text-[#94A3B8] font-bold uppercase tracking-wider animate-pulse">
                  {isSubmitting ? 'Evaluating Submission...' : 'Running Code...'}
                </div>
              </div>
            )}

            {/* Verdict Display */}
            {!(actualIsRunning || isSubmitting) && (
              <>
                {/* 1. COMPILATION ERROR CASE */}
                {((submitResult && submitResult.status === 'Compilation Error') || (actualRunResult && actualRunResult.status === 'Compilation Error')) ? (
                  <div className="space-y-3">
                    <div className="text-lg font-bold text-[#EF4444] flex items-center gap-2">
                      Compilation Error
                    </div>
                    <pre className="p-3.5 rounded-xl bg-red-500/5 dark:bg-red-950/15 border border-red-500/20 text-[#EF4444] font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                      {submitResult?.error_message || actualRunResult?.error || 'Compilation failed.'}
                    </pre>
                  </div>
                ) : (
                  /* 2. GENERAL VERDICT (Accepted, WA, RE, TLE, etc.) */
                  (submitResult || actualRunResult) && (
                    <div className="space-y-4">
                      {/* Verdict Header */}
                      <div className="flex items-center gap-3">
                        <span className={`text-xl font-extrabold tracking-tight ${
                          (submitResult?.status === 'Accepted' || actualRunResult?.status === 'Success' || actualRunResult?.status === 'Accepted')
                            ? 'text-[#22B573]'
                            : 'text-[#EF4444]'
                        }`}>
                          {submitResult ? submitResult.status : (actualRunResult.status === 'Success' ? 'Accepted' : actualRunResult.status)}
                        </span>
                        <span className="text-xs text-[#667085] dark:text-[#94A3B8] font-medium font-mono bg-[#F5F7FA] dark:bg-[#151A21] px-2 py-1 rounded-md border border-[#D9E0E8] dark:border-[#30363D]">
                          Runtime: {submitResult ? submitResult.runtime : actualRunResult.execution_time} ms
                        </span>
                      </div>

                      {/* Case Selection Buttons */}
                      {(() => {
                        // Build cases to show
                        const casesToShow = actualRunResult 
                          ? [{
                              input: customInput || (sampleTestCases[0]?.input) || '',
                              expected_output: sampleTestCases[0]?.expected_output || '',
                              is_custom: true
                            }]
                          : [...sampleTestCases];
                        
                        if (submitResult && submitResult.failed_case) {
                          const failedIdx = submitResult.failed_case.test_case_index;
                          if (failedIdx > sampleTestCases.length) {
                            casesToShow.push({
                              input: submitResult.failed_case.input || '(Hidden Test Case)',
                              expected_output: submitResult.failed_case.expected || '(Hidden)',
                              is_hidden: true,
                              test_case_index: failedIdx
                            });
                          }
                        }

                        if (casesToShow.length === 0) return null;

                        const selectedCase = casesToShow[selectedCaseIndex] || casesToShow[0];
                        
                        // Helper to get status of each case
                        const getCaseStatus = (idx, item) => {
                          if (submitResult) {
                            if (submitResult.status === 'Accepted') return 'passed';
                            if (submitResult.failed_case) {
                              const failedIdx = submitResult.failed_case.test_case_index;
                              const currentIdx = item.is_hidden ? item.test_case_index : (idx + 1);
                              if (currentIdx < failedIdx) return 'passed';
                              if (currentIdx === failedIdx) return 'failed';
                              return 'skipped';
                            }
                          }
                          if (actualRunResult) {
                            const isSuccess = actualRunResult.status === 'Success' || actualRunResult.status === 'Accepted';
                            return isSuccess ? 'passed' : 'failed';
                          }
                          return 'skipped';
                        };

                        // Helper to extract case values
                        const getCaseValues = () => {
                          if (!selectedCase) return { input: '', expected: '', actual: '', isError: false };
                          
                          const status = getCaseStatus(selectedCaseIndex, selectedCase);
                          let inputVal = selectedCase.input;
                          let expectedVal = selectedCase.expected_output;
                          let actualVal = '';
                          let isErr = false;

                          if (submitResult) {
                            if (status === 'passed') {
                              actualVal = selectedCase.expected_output;
                            } else if (status === 'failed') {
                              actualVal = submitResult.failed_case?.actual || submitResult.error_message || 'Execution error';
                              isErr = true;
                            } else {
                              actualVal = '(Not executed)';
                            }
                          } else if (actualRunResult) {
                            actualVal = actualRunResult.output || '';
                            if (actualRunResult.error) {
                              actualVal = actualRunResult.error;
                              isErr = true;
                            }
                          }

                          return { input: inputVal, expected: expectedVal, actual: actualVal, isError: isErr };
                        };

                        const { input, expected, actual, isError } = getCaseValues();

                        return (
                          <div className="space-y-4">
                            {/* Case Tabs Row */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 border-b border-[#D9E0E8] dark:border-[#30363D]">
                              {casesToShow.map((item, idx) => {
                                const status = getCaseStatus(idx, item);
                                const isActive = selectedCaseIndex === idx;
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => setSelectedCaseIndex(idx)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                                      isActive
                                        ? 'bg-[#F5F7FA] dark:bg-[#151A21] text-[#172033] dark:text-[#F8FAFC] border-[#D9E0E8] dark:border-[#30363D] shadow-sm'
                                        : 'bg-transparent text-[#667085] dark:text-[#94A3B8] border-transparent hover:text-[#172033] dark:hover:text-[#F8FAFC]'
                                    }`}
                                  >
                                    {status === 'passed' && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#22B573]" />
                                    )}
                                    {status === 'failed' && (
                                      <XCircle className="w-3.5 h-3.5 text-[#EF4444]" />
                                    )}
                                    {status === 'skipped' && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#667085]" />
                                    )}
                                    <span>{item.is_hidden ? `Hidden Case` : `Case ${idx + 1}`}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Case Execution Details */}
                            <div className="space-y-3 font-mono text-xs">
                              {/* 1. INPUT */}
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-[#667085] dark:text-[#94A3B8] font-sans">Input</div>
                                <pre className="p-3.5 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] overflow-x-auto whitespace-pre-wrap">
                                  {input || '(empty)'}
                                </pre>
                              </div>

                              {/* 2. OUTPUT */}
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-[#667085] dark:text-[#94A3B8] font-sans">Output</div>
                                <pre className={`p-3.5 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] overflow-x-auto whitespace-pre-wrap ${
                                  isError ? 'text-[#EF4444] bg-[#EF4444]/5' : 'text-[#172033] dark:text-[#F8FAFC]'
                                }`}>
                                  {actual || '(No output)'}
                                </pre>
                              </div>

                              {/* 3. EXPECTED OUTPUT */}
                              {expected && (
                                <div className="space-y-1">
                                  <div className="text-xs font-bold text-[#667085] dark:text-[#94A3B8] font-sans">Expected Output</div>
                                  <pre className="p-3.5 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#22B573] overflow-x-auto whitespace-pre-wrap font-bold">
                                    {expected}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

