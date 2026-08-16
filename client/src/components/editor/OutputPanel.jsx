import React, { useState } from 'react';
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
  customInput = '',
  setCustomInput,
  sampleTestCases = [],
  runResult = null,
  submitResult = null,
  isRunning = false,
  isSubmitting = false,
}) => {
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);

  return (
    <div className="flex flex-col h-full rounded-2xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] overflow-hidden shadow-sm transition-colors">
      {/* Tabs Header */}
      <div className="flex items-center justify-between px-4 bg-[#F5F7FA] dark:bg-[#151A21] border-b border-[#D9E0E8] dark:border-[#30363D] text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab('testcases')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'testcases'
                ? 'bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] border border-[#0757B8]/20 dark:border-[#0066CC]/40'
                : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Test Cases
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'custom'
                ? 'bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] border border-[#0757B8]/20 dark:border-[#0066CC]/40'
                : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Custom Input
          </button>

          {(runResult || submitResult) && (
            <button
              onClick={() => setActiveTab('result')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'result'
                  ? 'bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] border border-[#0757B8]/20 dark:border-[#0066CC]/40'
                : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Verdict / Output
            </button>
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
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Enter custom test input..."
              rows={5}
              className="w-full p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] font-mono text-xs focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition resize-none"
            />
          </div>
        )}

        {/* TAB 3: Execution / Verdict Result */}
        {activeTab === 'result' && (
          <div className="space-y-4">
            {/* SUBMISSION VERDICT */}
            {submitResult && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D]">
                  <div className="flex items-center gap-3">
                    {submitResult.status === 'Accepted' ? (
                      <div className="w-10 h-10 rounded-2xl bg-[#22B573]/20 text-[#22B573] flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-2xl bg-[#EF4444]/20 text-[#EF4444] flex items-center justify-center">
                        <XCircle className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <div className="text-base font-bold text-[#172033] dark:text-[#F8FAFC] flex items-center gap-2">
                        {submitResult.status}
                      </div>
                      <div className="text-xs text-[#667085] dark:text-[#94A3B8]">
                        Passed {submitResult.passed_test_cases} / {submitResult.total_test_cases} test cases
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-xs text-[#667085] dark:text-[#94A3B8]">
                      <Clock className="w-3.5 h-3.5" />
                      {submitResult.runtime} ms
                    </div>
                  </div>
                </div>

                {submitResult.failed_case && (
                  <div className="p-3.5 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/25 space-y-2 text-xs font-mono">
                    <div className="font-sans font-semibold text-[#EF4444]">
                      Failed on Test Case #{submitResult.failed_case.test_case_index}:
                    </div>
                    {submitResult.failed_case.input !== '(Hidden Test Case)' && (
                      <div>
                        <div className="text-[#667085] dark:text-[#94A3B8]">Input:</div>
                        <pre className="p-2 rounded-lg bg-[#FFFFFF] dark:bg-[#151A21] text-[#172033] dark:text-[#F8FAFC] border border-[#D9E0E8] dark:border-[#30363D]">{submitResult.failed_case.input}</pre>
                      </div>
                    )}
                    <div>
                      <div className="text-[#667085] dark:text-[#94A3B8]">Your Output:</div>
                      <pre className="p-2 rounded-lg bg-[#FFFFFF] dark:bg-[#151A21] text-[#EF4444] border border-[#D9E0E8] dark:border-[#30363D]">{submitResult.failed_case.actual}</pre>
                    </div>
                    {submitResult.failed_case.expected !== '(Hidden)' && (
                      <div>
                        <div className="text-[#667085] dark:text-[#94A3B8]">Expected Output:</div>
                        <pre className="p-2 rounded-lg bg-[#FFFFFF] dark:bg-[#151A21] text-[#22B573] border border-[#D9E0E8] dark:border-[#30363D] font-bold">{submitResult.failed_case.expected}</pre>
                      </div>
                    )}
                  </div>
                )}

                {submitResult.error_message && (
                  <div className="p-3.5 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/25 text-[#EF4444] font-mono text-xs whitespace-pre-wrap">
                    {submitResult.error_message}
                  </div>
                )}
              </div>
            )}

            {/* RUN CODE RESULT */}
            {runResult && !submitResult && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <StatusBadge status={runResult.status} />
                  <span className="text-[#667085] dark:text-[#94A3B8] text-[11px] font-sans">
                    Runtime: {runResult.execution_time} ms
                  </span>
                </div>

                {runResult.error ? (
                  <div>
                    <div className="text-[#EF4444] font-sans font-semibold mb-1">Standard Error / Error:</div>
                    <pre className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/25 text-[#EF4444] overflow-x-auto whitespace-pre-wrap">
                      {runResult.error}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <div className="text-[#667085] dark:text-[#94A3B8] font-sans font-medium mb-1">Standard Output:</div>
                    <pre className="p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] overflow-x-auto whitespace-pre-wrap">
                      {runResult.output || '(No standard output produced)'}
                    </pre>
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
