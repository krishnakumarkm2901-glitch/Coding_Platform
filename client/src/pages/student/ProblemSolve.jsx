import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { deduplicatedPost, pollSubmissionResult } from '../../services/api';
import confetti from 'canvas-confetti';
import { 
  Play, 
  Send, 
  Code2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import { MonacoCodeEditor } from '../../components/editor/MonacoCodeEditor';
import { OutputPanel } from '../../components/editor/OutputPanel';
import { DifficultyBadge, TopicTag } from '../../components/common/Badge';
import { PageLoader } from '../../components/common/Loader';
import { DEFAULT_STARTER_CODE } from '../../utils/starterCode';
import { normalizeTestCases } from '../../utils/testcases';

export const ProblemSolve = () => {
  const { id } = useParams();
  const [problem, setProblem] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editor states
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);

  // Execution states
  const [activeTab, setActiveTab] = useState('testcases');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);

  const outputPanelRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if (runResult || submitResult) {
      setTimeout(() => {
        outputPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [runResult, submitResult]);

  useEffect(() => {
    fetchProblemDetails();
  }, [id]);

  const activeDiagnostics = submitResult?.diagnostics || runResult?.diagnostics || [];

  const handleNavigateToLine = (line, col) => {
    if (editorRef.current && line) {
      editorRef.current.revealPosition(line, col || 1);
    }
  };

  const fetchProblemDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/problems/${id}`);
      if (res.data.success) {
        const prob = res.data.problem;
        const normalized = normalizeTestCases(prob);

        setProblem(prob);
        setTestCases(normalized);
        setSelectedCaseIndex(0);

        const initialCode = prob.starter_code?.[language] || DEFAULT_STARTER_CODE[language] || '';
        setCode(initialCode);

        if (normalized.length > 0) {
          setCustomInput(normalized[0].input);
        } else if (prob.sample_input) {
          setCustomInput(prob.sample_input);
        }
      }
    } catch (err) {
      setError('Problem could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    const newCode = problem?.starter_code?.[newLang] || DEFAULT_STARTER_CODE[newLang] || '';
    setCode(newCode);
    setVerifiedCodeHash(null);
  };

  const handleResetCode = () => {
    const resetCode = problem?.starter_code?.[language] || DEFAULT_STARTER_CODE[language] || '';
    setCode(resetCode);
    setVerifiedCodeHash(null);
  };

  const handleRunCode = async () => {
    if (!code.trim()) {
      setRunResult({
        status: 'Error',
        error: 'Code cannot be empty. Please write your solution before running.',
        output: '',
        execution_time: 0,
        inputUsed: '',
        input: '',
      });
      setActiveTab('result');
      return;
    }

    try {
      setIsRunning(true);
      setSubmitResult(null);
      setActiveTab('result');

      const isCustomTab = activeTab === 'custom';
      
      let payload = {
        language,
        code,
        problem_id: problem?.id,
        is_custom: isCustomTab,
      };

      if (isCustomTab) {
        payload.custom_input = customInput;
        payload.expected_output = '';
      } else {
        // Run against ALL sample/visible test cases for this problem
        payload.test_cases = testCases.length > 0 ? testCases : [
          { input: problem?.sample_input || '', expected_output: problem?.sample_output || '', is_sample: true }
        ];
      }

      const res = await api.post('/submissions/run', payload);

      if (res.data.success) {
        setRunResult({
          ...res.data,
          inputUsed: isCustomTab ? customInput : (testCases[selectedCaseIndex]?.input || ''),
          input: isCustomTab ? customInput : (testCases[selectedCaseIndex]?.input || ''),
          expected_output: isCustomTab ? '' : (testCases[selectedCaseIndex]?.expected_output || ''),
        });

        // Gate: ONLY unlock submit if all sample test cases passed AND it was not a custom input run
        if (!isCustomTab && res.data.all_passed) {
          setVerifiedCodeHash(currentCodeHash);
        } else {
          setVerifiedCodeHash(null);
        }
      }
    } catch (err) {
      setVerifiedCodeHash(null);
      setRunResult({
        status: 'Error',
        error: err.response?.data?.error || 'Failed to connect to execution engine.',
        output: '',
        execution_time: 0,
        inputUsed: customInput,
        input: customInput,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!code.trim()) {
      setSubmitResult({
        status: 'Submission Failed',
        error_message: 'Code cannot be empty.',
        passed_test_cases: 0,
        total_test_cases: 0,
        runtime: 0,
      });
      setActiveTab('result');
      return;
    }

    try {
      setIsSubmitting(true);
      setRunResult(null);
      setActiveTab('result');

      const res = await deduplicatedPost('/submissions/submit', {
        problem_id: problem.id,
        language,
        code,
      });

      // Async queue path: status is QUEUED, need to poll for result
      if (res.data.status === 'QUEUED' && res.data.submission_id) {
        setSubmitResult({
          status: 'Judging...',
          passed_test_cases: 0,
          total_test_cases: res.data.total_test_cases,
          runtime: 0,
          error_message: 'Your submission is being evaluated...',
        });

        const finalResult = await pollSubmissionResult(res.data.submission_id, {
          intervalMs: 1500,
          maxAttempts: 40,
          onProgress: (progress) => {
            if (progress.status !== 'QUEUED') {
              setSubmitResult((prev) => ({
                ...prev,
                status: progress.status === 'PROCESSING' ? 'Judging...' : progress.status,
              }));
            }
          },
        });

        setSubmitResult(finalResult);
        if (finalResult.status === 'Accepted') {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#0757B8', '#22B573', '#F2B705'],
          });
        }
      } else if (res.data.success) {
        // Sync fallback path: result is immediate
        setSubmitResult(res.data);
        if (res.data.status === 'Accepted') {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#0757B8', '#22B573', '#F2B705'],
          });
        }
      }
    } catch (err) {
      setSubmitResult({
        status: 'Submission Failed',
        error_message: err.response?.data?.error || 'Submission could not be evaluated.',
        passed_test_cases: 0,
        total_test_cases: 0,
        runtime: 0,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoader text="Loading coding environment..." />;
  }

  if (error || !problem) {
    return (
      <div className="p-8 text-center rounded-3xl border border-[#EF4444]/30 bg-[#FFFFFF] dark:bg-[#20252C]">
        <AlertCircle className="w-8 h-8 text-[#EF4444] mx-auto mb-3" />
        <p className="text-[#172033] dark:text-[#F8FAFC] font-semibold">{error || 'Problem not found.'}</p>
        <Link to="/problems" className="mt-4 inline-block text-xs font-bold text-[#0757B8] dark:text-[#60A5FA] hover:underline">
          &larr; Back to Problem Catalog
        </Link>
      </div>
    );
  }

  const supportedLangs = problem.supported_languages || ['python', 'c', 'cpp', 'java', 'javascript', 'go', 'rust'];

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Top Header / Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#D9E0E8] dark:border-[#30363D]">
        <div className="flex items-center gap-3">
          <Link
            to="/problems"
            className="p-2 rounded-2xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] text-[#667085] hover:text-[#172033] dark:hover:text-[#F8FAFC] shadow-sm transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-[#172033] dark:text-[#F8FAFC] tracking-tight">{problem.title}</h1>
              <DifficultyBadge difficulty={problem.difficulty} />
            </div>
            <div className="flex items-center gap-3 text-xs text-[#667085] dark:text-[#94A3B8] mt-0.5">
              <TopicTag topic={problem.topic} />
              <span>Time Limit: {problem.time_limit || 2}s</span>
              <span>Memory: {problem.memory_limit || 128}MB</span>
            </div>
          </div>
        </div>

        {/* Language Selection Bar */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#667085] dark:text-[#94A3B8] font-bold">Language:</label>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="py-1.5 px-3 bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] text-xs font-bold uppercase tracking-wide focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition shadow-sm cursor-pointer"
          >
            {supportedLangs.map((lang) => (
              <option key={lang} value={lang}>
                {lang === 'cpp' ? 'C++' : lang === 'javascript' ? 'JavaScript' : lang.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Split Grid (Problem Description & Monaco Editor + Output) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[620px]">
        
        {/* LEFT COLUMN: Problem Statement & Specs (5 Cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] flex flex-col h-full max-h-[750px] overflow-y-auto space-y-6 shadow-sm">
          {/* Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#94A3B8] mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#0757B8] dark:text-[#60A5FA]" />
              Problem Description
            </h3>
            <div className="text-sm text-[#172033] dark:text-[#F8FAFC] leading-relaxed whitespace-pre-wrap font-sans">
              {problem.description}
            </div>
          </div>

          {/* Input & Output Format */}
          <div className="space-y-3 pt-4 border-t border-[#D9E0E8] dark:border-[#30363D] text-xs">
            {problem.input_format && (
              <div>
                <h4 className="font-bold text-[#172033] dark:text-[#F8FAFC] uppercase tracking-wide mb-1">Input Format:</h4>
                <div className="p-3 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] font-mono whitespace-pre-wrap">
                  {problem.input_format}
                </div>
              </div>
            )}

            {problem.output_format && (
              <div>
                <h4 className="font-bold text-[#172033] dark:text-[#F8FAFC] uppercase tracking-wide mb-1">Output Format:</h4>
                <div className="p-3 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] font-mono whitespace-pre-wrap">
                  {problem.output_format}
                </div>
              </div>
            )}
          </div>

          {/* Constraints */}
          {problem.constraints && (
            <div className="pt-4 border-t border-[#D9E0E8] dark:border-[#30363D] text-xs">
              <h4 className="font-bold text-[#172033] dark:text-[#F8FAFC] uppercase tracking-wide mb-1.5">Constraints:</h4>
              <div className="p-3 rounded-2xl bg-[#F2B705]/10 border border-[#F2B705]/30 text-[#172033] dark:text-[#F8FAFC] font-mono whitespace-pre-wrap font-semibold">
                {problem.constraints}
              </div>
            </div>
          )}

          {/* Sample Input/Output */}
          {(problem.sample_input || problem.sample_output || (testCases.length > 0)) && (
            <div className="space-y-3 pt-4 border-t border-[#D9E0E8] dark:border-[#30363D] text-xs font-mono">
              <h4 className="font-bold text-[#172033] dark:text-[#F8FAFC] uppercase tracking-wide font-sans">Sample Case:</h4>
              {(problem.sample_input || testCases[0]?.input) && (
                <div>
                  <div className="text-[#667085] dark:text-[#94A3B8] mb-1 font-sans">Sample Input:</div>
                  <pre className="p-3 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] overflow-x-auto whitespace-pre-wrap">
                    {problem.sample_input || testCases[0]?.input}
                  </pre>
                </div>
              )}
              {(problem.sample_output || testCases[0]?.expected_output) && (
                <div>
                  <div className="text-[#667085] dark:text-[#94A3B8] mb-1 font-sans">Sample Output:</div>
                  <pre className="p-3 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#22B573] overflow-x-auto whitespace-pre-wrap font-bold">
                    {problem.sample_output || testCases[0]?.expected_output}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Monaco Code Editor + Output Panel (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          
          {/* Code Editor Container */}
          <div className="flex-1 min-h-[380px] max-h-[440px]">
            <MonacoCodeEditor
              ref={editorRef}
              language={language}
              code={code}
              diagnostics={activeDiagnostics}
              onChange={(newVal) => setCode(newVal || '')}
              onReset={handleResetCode}
            />
          </div>

          {/* Execution Action Bar */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#667085] dark:text-[#94A3B8] font-medium hidden sm:inline">
                Execution Engine: <strong className="text-[#22B573] font-semibold">Active (Local)</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRunCode}
                disabled={isRunning || isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] hover:bg-[#DDF2FF] dark:hover:bg-[#142A43] text-[#172033] dark:text-[#F8FAFC] border border-[#D9E0E8] dark:border-[#30363D] text-xs font-bold flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-[#0757B8] dark:text-[#60A5FA] fill-current" />
                <span>{isRunning ? 'Running...' : 'Run Code'}</span>
              </button>

              <button
                type="button"
                onClick={handleSubmitSolution}
                disabled={isRunning || isSubmitting || !isSubmitAllowed}
                title={!isSubmitAllowed ? "Run code and pass all sample test cases to enable submission" : "Submit your verified solution"}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  isSubmitAllowed
                    ? 'bg-[#22B573] hover:opacity-95 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-[#D9E0E8] dark:bg-[#30363D] text-[#667085] dark:text-[#94A3B8] opacity-50 cursor-not-allowed'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Evaluating...' : 'Submit Solution'}</span>
              </button>
            </div>
          </div>

          {/* Output & Testcase Results Panel */}
          <div className="min-h-[240px]" ref={outputPanelRef}>
            <OutputPanel
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedCaseIndex={selectedCaseIndex}
              setSelectedCaseIndex={setSelectedCaseIndex}
              customInput={customInput}
              setCustomInput={setCustomInput}
              sampleTestCases={testCases}
              runResult={runResult}
              submitResult={submitResult}
              isRunning={isRunning}
              isSubmitting={isSubmitting}
              onNavigateToLine={handleNavigateToLine}
            />
          </div>

        </div>

      </div>
    </div>
  );
};
