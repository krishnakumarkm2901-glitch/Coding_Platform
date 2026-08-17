import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  Clock, 
  Code2, 
  HelpCircle, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  ChevronLeft, 
  Sparkles,
  ShieldAlert,
  Lock,
  Maximize2,
  AlertOctagon,
  XCircle,
  EyeOff,
  Calculator
} from 'lucide-react';
import { MonacoCodeEditor } from '../../components/editor/MonacoCodeEditor';
import { OutputPanel } from '../../components/editor/OutputPanel';
import { DifficultyBadge, TopicTag } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Loader';
import { ScientificCalculator } from '../../components/common/ScientificCalculator';
import { formatISTDateTime as formatDateTime } from '../../utils/date';

export const ContestArena = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Mode: 'overview' | 'arena' | 'submitted' | 'terminated'
  const [mode, setMode] = useState('overview');
  const [terminationReason, setTerminationReason] = useState('');

  // Contest countdown to start (for upcoming)
  const [countdownToStart, setCountdownToStart] = useState(0);

  // Contest timer (seconds remaining in active arena)
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const isTerminatedRef = useRef(false);
  const isSubmittedRef = useRef(false);

  // Active section inside arena: 'coding' | 'mcqs'
  const [activeSection, setActiveSection] = useState('coding');

  // Coding problem state
  const [selectedProblemIdx, setSelectedProblemIdx] = useState(0);
  const [codeSolutions, setCodeSolutions] = useState({}); // { problem_id: { language: code } }
  const [currentLanguage, setCurrentLanguage] = useState('python');
  const [currentCode, setCurrentCode] = useState('');

  // MCQ state: { mcq_id: selected_option }
  const [mcqAnswers, setMcqAnswers] = useState({});

  // Runner state
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [customInput, setCustomInput] = useState('');
  const [activeOutputTab, setActiveOutputTab] = useState('testcases');

  // Submit state
  const [isSubmittingContest, setIsSubmittingContest] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  useEffect(() => {
    fetchContestDetails(true);
    // Polling every 5s while on overview screen for real-time status transitions
    const overviewPoll = setInterval(() => {
      if (mode === 'overview') {
        fetchContestDetails(false);
      }
    }, 5000);

    return () => {
      clearInterval(overviewPoll);
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [id, mode]);

  // Countdown timer tick effect for upcoming contests
  useEffect(() => {
    if (countdownToStart <= 0) return;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setCountdownToStart((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          fetchContestDetails(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [countdownToStart > 0]);

  const fetchContestDetails = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      setError('');
      const res = await api.get(`/contests/${id}`);
      if (res.data.success) {
        const c = res.data.contest;
        setContest(c);

        if (c.status === 'Upcoming' && c.time_to_start_seconds > 0) {
          setCountdownToStart(c.time_to_start_seconds);
        } else {
          setCountdownToStart(0);
        }

        // Check if student was already terminated in database
        if (c.is_terminated) {
          isTerminatedRef.current = true;
          setTerminationReason(c.termination_reason || 'Left strict contest environment');
          setMode('terminated');
          return;
        }

        // Check if student already submitted
        if (c.has_submitted) {
          isSubmittedRef.current = true;
          setMode('submitted');
          return;
        }

        // Initialize active section (coding vs mcqs)
        const cType = c.contestType || c.contest_type || ((c.problems?.length > 0 && c.mcqs?.length > 0) ? 'BOTH' : c.problems?.length > 0 ? 'CODING' : 'MCQ');
        if (cType === 'MCQ' || (c.problems?.length === 0 && c.mcqs?.length > 0)) {
          setActiveSection('mcqs');
        } else {
          setActiveSection('coding');
        }

        // Initialize coding starter codes
        const initSolutions = {};
        c.problems?.forEach((p) => {
          initSolutions[p.id] = {
            python: p.starter_code?.python || '# Write your Python solution here\n',
            cpp: p.starter_code?.cpp || '// Write your C++ solution here\n',
            c: p.starter_code?.c || '// Write your C solution here\n',
            java: p.starter_code?.java || '// Write your Java solution here\n',
            javascript: p.starter_code?.javascript || '// Write your JavaScript solution here\n',
          };
        });
        setCodeSolutions(initSolutions);

        if (c.problems && c.problems.length > 0) {
          setCurrentCode(initSolutions[c.problems[0].id]?.python || '');
        }

        // Check if already registered and contest is active
        if (c.is_registered && c.status === 'Active' && c.remaining_seconds > 0) {
          startArena(c.remaining_seconds);
        }
      }
    } catch (err) {
      if (err.response?.data?.is_terminated) {
        isTerminatedRef.current = true;
        setTerminationReason(err.response?.data?.termination_reason || 'Violation of strict contest rules');
        setMode('terminated');
      } else {
        setError(err.response?.data?.error || 'Failed to load contest.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ----------------- STRICT AUTO-TERMINATION HANDLER -----------------

  const triggerTermination = useCallback(async (reasonCode, detail) => {
    if (isTerminatedRef.current || isSubmittedRef.current) return;
    isTerminatedRef.current = true;

    if (timerRef.current) clearInterval(timerRef.current);

    // Exit fullscreen if active
    if (document.fullscreenElement && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch (e) {}
    }

    setTerminationReason(detail);
    setMode('terminated');

    try {
      await api.post(`/contests/${id}/terminate`, {
        reason: reasonCode,
        detail: detail,
      });
    } catch (err) {
      console.error('Failed to report termination to server:', err);
    }
  }, [id]);

  // ----------------- START STRICT ARENA -----------------

  const handleStartContest = async () => {
    try {
      setLoading(true);
      setError('');

      // Request Fullscreen
      if (document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
        } catch (fsErr) {
          console.warn('Fullscreen request bypassed or denied:', fsErr);
        }
      }

      const res = await api.post(`/contests/${id}/join`);
      if (res.data.success) {
        startArena(res.data.remaining_seconds || (contest?.duration_minutes * 60) || 3600);
      }
    } catch (err) {
      if (err.response?.data?.is_terminated) {
        isTerminatedRef.current = true;
        setTerminationReason(err.response?.data?.termination_reason || 'Contest Terminated — Single attempt locked');
        setMode('terminated');
      } else {
        setError(err.response?.data?.error || 'Failed to enter contest.');
      }
    } finally {
      setLoading(false);
    }
  };

  const startArena = (durationSecs) => {
    setMode('arena');
    setTimeLeft(durationSecs);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ----------------- STRICT SECURITY LISTENERS (ARENA MODE) -----------------

  useEffect(() => {
    if (mode !== 'arena') return;

    // 1. Tab Switch / Window Hide Detection
    const handleVisibilityChange = () => {
      if (document.hidden && !isTerminatedRef.current && !isSubmittedRef.current) {
        triggerTermination('TAB_SWITCH', 'Switched browser tab or minimized window');
      }
    };

    // 2. Window Blur (Focus Lost / Clicked Outside) Detection
    const handleWindowBlur = () => {
      if (!isTerminatedRef.current && !isSubmittedRef.current) {
        triggerTermination('WINDOW_BLUR', 'Left the contest browser window (Focus lost)');
      }
    };

    // 3. Exiting Fullscreen Detection
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isTerminatedRef.current && !isSubmittedRef.current) {
        triggerTermination('EXIT_FULLSCREEN', 'Exited fullscreen contest mode');
      }
    };

    // 4. Browser Navigation / Page Reload Interception
    const handleBeforeUnload = (e) => {
      if (!isTerminatedRef.current && !isSubmittedRef.current) {
        triggerTermination('PAGE_REFRESH', 'Attempted to refresh or close contest page');
        e.preventDefault();
        e.returnValue = 'Leaving or reloading will terminate your contest attempt permanently!';
        return e.returnValue;
      }
    };

    const handlePopState = (e) => {
      if (!isTerminatedRef.current && !isSubmittedRef.current) {
        triggerTermination('LEAVE_CONTEST', 'Browser back/forward navigation attempted');
      }
    };

    // 5. Disable Context Menu & Developer Tool Shortcuts
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e) => {
      // F11, F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Alt+Tab guards
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U'))
      ) {
        e.preventDefault();
        triggerTermination('DEVTOOLS_SHORTCUT', 'Attempted to open inspection tools');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mode, triggerTermination]);

  // ----------------- PROBLEM & CODE HANDLING -----------------

  const handleProblemSelect = (idx) => {
    if (!contest?.problems) return;
    
    if (contest.problems[selectedProblemIdx]) {
      const currentProbId = contest.problems[selectedProblemIdx].id;
      setCodeSolutions((prev) => ({
        ...prev,
        [currentProbId]: {
          ...(prev[currentProbId] || {}),
          [currentLanguage]: currentCode,
        },
      }));
    }

    setSelectedProblemIdx(idx);
    const newProb = contest.problems[idx];
    const saved = codeSolutions[newProb.id]?.[currentLanguage] || newProb.starter_code?.[currentLanguage] || '';
    setCurrentCode(saved);
    setRunResult(null);
  };

  const handleLanguageChange = (newLang) => {
    const currentProblem = contest?.problems?.[selectedProblemIdx];
    if (!currentProblem) return;

    setCodeSolutions((prev) => ({
      ...prev,
      [currentProblem.id]: {
        ...(prev[currentProblem.id] || {}),
        [currentLanguage]: currentCode,
      },
    }));

    setCurrentLanguage(newLang);
    const savedCode = codeSolutions[currentProblem.id]?.[newLang] || currentProblem.starter_code?.[newLang] || '';
    setCurrentCode(savedCode);
    setRunResult(null);
  };

  const handleRunCurrentCode = async () => {
    const currentProblem = contest?.problems?.[selectedProblemIdx];
    if (!currentProblem) return;

    try {
      setIsRunning(true);
      setActiveOutputTab('result');
      const inputToUse = customInput || (currentProblem.sample_input || '');
      const res = await api.post('/submissions/run', {
        language: currentLanguage,
        code: currentCode,
        custom_input: inputToUse,
      });
      if (res.data.success) {
        setRunResult(res.data);
      }
    } catch (err) {
      setRunResult({
        status: 'Runtime Error',
        output: '',
        stderr: err.response?.data?.error || 'Execution service failed.',
      });
    } finally {
      setIsRunning(false);
    }
  };

  // ----------------- CONTEST SUBMISSION -----------------

  const handleFinalSubmit = async (isAuto = false) => {
    if (isSubmittingContest || isTerminatedRef.current || isSubmittedRef.current) return;

    if (!isAuto && !window.confirm('Are you sure you want to finish and submit your contest? This cannot be undone.')) {
      return;
    }

    try {
      setIsSubmittingContest(true);
      isSubmittedRef.current = true;

      if (timerRef.current) clearInterval(timerRef.current);

      if (document.fullscreenElement && document.exitFullscreen) {
        try { await document.exitFullscreen(); } catch (e) {}
      }

      const codingPayload = (contest.problems || []).map((p, idx) => {
        const codeForProb = idx === selectedProblemIdx
          ? currentCode
          : (codeSolutions[p.id]?.[currentLanguage] || p.starter_code?.[currentLanguage] || '');
        return {
          problem_id: p.id,
          language: currentLanguage,
          code: codeForProb,
        };
      });

      const res = await api.post(`/contests/${id}/submit`, {
        coding_submissions: codingPayload,
        mcq_answers: mcqAnswers,
        is_auto_submit: isAuto,
      });

      if (res.data.success) {
        setSubmitResult(res.data.result);
        setMode('submitted');
        setResultModalOpen(true);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit contest solutions.');
    } finally {
      setIsSubmittingContest(false);
    }
  };

  const handleAutoSubmit = () => {
    handleFinalSubmit(true);
  };

  const formatTimer = (seconds) => {
    if (!seconds || seconds <= 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <PageLoader text="Connecting to Secure Contest Arena..." />;
  }

  // =========================================================================
  // 🛑 1. CONTEST TERMINATED SCREEN (Strict Mode Violation)
  // =========================================================================
  if (mode === 'terminated') {
    return (
      <div className="fixed inset-0 z-50 bg-[#0B0F14] text-white flex items-center justify-center p-4">
        <div className="max-w-lg w-full p-8 rounded-3xl border border-[#EF4444]/40 bg-[#151A21] shadow-2xl text-center space-y-6 animate-fadeIn">
          
          <div className="w-16 h-16 rounded-3xl bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 flex items-center justify-center mx-auto shadow-lg">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-[#EF4444]/15 text-[#EF4444] text-[11px] font-mono font-bold uppercase border border-[#EF4444]/30">
              Security Status: AUTO_TERMINATED
            </span>
            <h1 className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">
              Contest Terminated
            </h1>
            <p className="text-sm font-semibold text-[#EF4444] leading-relaxed">
              You left the contest environment. Your attempt has been terminated and you cannot re-enter this contest.
            </p>
          </div>

          {/* Violation Details Box */}
          <div className="p-4 rounded-2xl bg-[#0B0F14] border border-[#30363D] text-left text-xs space-y-2">
            <div className="font-bold text-[#94A3B8] uppercase tracking-wider">Violation Logged:</div>
            <div className="font-mono text-[#F8FAFC] font-semibold">
              {terminationReason || contest?.termination_reason || 'Left strict contest environment (Tab switch, window focus lost, or exit fullscreen)'}
            </div>
            <div className="text-[11px] text-[#667085] dark:text-[#94A3B8]">
              This incident has been permanently recorded in the Platform Anti-Cheat Database. Single attempt restriction is enforced on the server.
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/contests"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#0066CC] hover:bg-[#0055AA] text-white font-bold text-xs shadow-md transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Return to Contest Directory</span>
            </Link>
          </div>

        </div>
      </div>
    );
  }

  // =========================================================================
  // 🎉 2. SUBMITTED SCREEN
  // =========================================================================
  if (mode === 'submitted') {
    return (
      <div className="p-8 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] text-center max-w-xl mx-auto my-12 shadow-sm space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#22B573]/15 text-[#22B573] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-[#172033] dark:text-[#F8FAFC]">Contest Submission Recorded</h2>
        <p className="text-xs text-[#667085] dark:text-[#94A3B8]">
          Your contest attempt has been submitted and evaluated. Your single attempt for this contest is complete.
        </p>
        <div className="pt-2">
          <Link to="/contests" className="px-5 py-2.5 rounded-xl bg-[#0757B8] dark:bg-[#0066CC] text-white font-bold text-xs shadow-md">
            Return to Contests
          </Link>
        </div>
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div className="p-8 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] text-center max-w-xl mx-auto my-12 shadow-sm space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/15 text-red-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-[#172033] dark:text-[#F8FAFC]">Contest Unavailable</h2>
        <p className="text-xs text-[#667085] dark:text-[#94A3B8]">
          {error || 'The requested contest could not be found or loaded.'}
        </p>
        <div className="pt-2">
          <Link to="/contests" className="px-5 py-2.5 rounded-xl bg-[#0757B8] dark:bg-[#0066CC] text-white font-bold text-xs shadow-md">
            Return to Contests
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 📋 3. CONTEST OVERVIEW & STRICT MODE WARNING (Before Start)
  // =========================================================================
  if (mode === 'overview') {
    const isUpcoming = contest.status === 'Upcoming';
    const isPast = contest.status === 'Past' || contest.status === 'Ended';
    const isActive = contest.status === 'Active';

    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
        {/* Header card */}
        <div className="p-6 sm:p-8 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                isActive
                  ? 'bg-[#22B573]/15 text-[#22B573] border border-[#22B573]/30'
                  : isUpcoming
                  ? 'bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] border border-[#0757B8]/20'
                  : 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
              }`}>
                {contest.status || 'Contest'}
              </span>
              <span className="text-xs text-[#667085] dark:text-[#94A3B8] font-mono">
                Duration: {contest.duration_minutes} Mins
              </span>
            </div>

            <div className="text-xs font-mono text-[#667085] dark:text-[#94A3B8]">
              {isUpcoming ? (
                <span>Starts: <strong className="text-[#172033] dark:text-[#F8FAFC]">{formatDateTime(contest.start_time)}</strong></span>
              ) : isActive ? (
                <span>Ends: <strong className="text-[#172033] dark:text-[#F8FAFC]">{formatDateTime(contest.end_time)}</strong></span>
              ) : (
                <span>Ended: <strong className="text-[#172033] dark:text-[#F8FAFC]">{formatDateTime(contest.end_time || contest.start_time)}</strong></span>
              )}
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172033] dark:text-[#F8FAFC]">
            {contest.title}
          </h1>

          <p className="text-sm text-[#667085] dark:text-[#94A3B8]">
            {contest.description || 'Welcome to the competitive coding arena. Test your algorithmic capabilities and technical accuracy.'}
          </p>

          {/* Live Countdown Banner for Upcoming Contests */}
          {isUpcoming && (
            <div className="p-4 rounded-2xl bg-[#DDF2FF]/60 dark:bg-[#142A43]/60 border border-[#0757B8]/30 dark:border-[#0066CC]/50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#0757B8] text-white">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0757B8] dark:text-[#60A5FA] uppercase tracking-wide">
                    Contest Starts In
                  </div>
                  <div className="text-lg font-extrabold font-mono text-[#172033] dark:text-[#F8FAFC]">
                    {countdownToStart > 0 ? formatTimer(countdownToStart) : 'Starting momentarily...'}
                  </div>
                </div>
              </div>
              <div className="text-right text-[11px] text-[#667085] dark:text-[#94A3B8] font-mono hidden sm:block">
                Start Time:<br />
                <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">{formatDateTime(contest.start_time)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-center">
              <div className="text-[10px] font-bold uppercase text-[#667085] dark:text-[#94A3B8]">Coding Problems</div>
              <div className="text-xl font-extrabold font-mono text-[#0757B8] dark:text-[#60A5FA] mt-0.5">
                {contest.problems?.length || 0}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-center">
              <div className="text-[10px] font-bold uppercase text-[#667085] dark:text-[#94A3B8]">Technical MCQs</div>
              <div className="text-xl font-extrabold font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                {contest.mcqs?.length || 0}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-center">
              <div className="text-[10px] font-bold uppercase text-[#667085] dark:text-[#94A3B8]">Allowed Attempts</div>
              <div className="text-xl font-extrabold font-mono text-[#22B573] mt-0.5">
                1 Attempt
              </div>
            </div>
          </div>
        </div>

        {/* 🔒 STRICT CONTEST MODE SECURITY ADVISORY */}
        <div className="p-6 rounded-3xl border-2 border-[#EF4444]/40 bg-[#EF4444]/5 dark:bg-[#EF4444]/10 space-y-3">
          <div className="flex items-center gap-2 text-[#EF4444] font-extrabold text-sm uppercase tracking-wide">
            <Lock className="w-5 h-5" />
            <span>Strict Contest Mode & Anti-Cheat Protocol</span>
          </div>

          <div className="space-y-2 text-xs text-[#172033] dark:text-[#F8FAFC]">
            <div className="flex items-start gap-2">
              <Maximize2 className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
              <span><strong>Fullscreen Mandatory:</strong> The contest arena will immediately lock into fullscreen mode upon start. Normal navigation will be hidden.</span>
            </div>
            <div className="flex items-start gap-2">
              <EyeOff className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
              <span><strong>Zero-Tolerance Window Tracking:</strong> Tab switching, minimizing the browser, exiting fullscreen, or clicking outside the contest window will <strong>IMMEDIATELY TERMINATE</strong> your attempt permanently.</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertOctagon className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
              <span><strong>One Attempt Only:</strong> The restriction is securely enforced on the server. Clearing browser cookies or changing browsers will NOT allow another attempt once terminated.</span>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <Link to="/contests" className="text-xs font-bold text-[#667085] dark:text-[#94A3B8] hover:underline">
            &larr; Back to Contests
          </Link>

          <div className="flex items-center gap-3">
            {isPast ? (
              <div className="flex items-center gap-2">
                <Link
                  to={`/contests/${contest.id}/result`}
                  className="px-5 py-3 rounded-2xl bg-purple-600 hover:opacity-95 text-white font-extrabold text-xs shadow-md transition"
                >
                  View My Result
                </Link>
                <Link
                  to={`/contests/${contest.id}/leaderboard`}
                  className="px-5 py-3 rounded-2xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-extrabold text-xs shadow-md transition"
                >
                  Contest Leaderboard
                </Link>
              </div>
            ) : isUpcoming ? (
              <button
                disabled
                className="px-6 py-3.5 rounded-2xl bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs cursor-not-allowed flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Starts at {formatDateTime(contest.start_time)}</span>
              </button>
            ) : (
              <button
                onClick={handleStartContest}
                className="px-8 py-3.5 rounded-2xl bg-[#22B573] hover:opacity-95 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/25 flex items-center gap-2.5 transition transform active:scale-95"
              >
                <Lock className="w-4 h-4" />
                <span>Start Contest & Lock Arena</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ⚡ 4. STRICT CONTEST ARENA (Fullscreen View - Normal Navigation Hidden)
  // =========================================================================
  const currentProblem = contest.problems?.[selectedProblemIdx];

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F7FA] dark:bg-[#0B0F14] text-[#172033] dark:text-[#F8FAFC] flex flex-col overflow-hidden select-none font-sans">
      
      {/* ARENA TOP BAR */}
      <div className="h-14 px-4 bg-[#FFFFFF] dark:bg-[#151A21] border-b border-[#D9E0E8] dark:border-[#30363D] flex items-center justify-between shrink-0 shadow-sm">
        
        {/* Left: Lock indicator & Contest Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 text-[11px] font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>Strict Contest Mode Active</span>
          </div>
          <span className="font-extrabold text-sm text-[#172033] dark:text-[#F8FAFC] truncate max-w-xs sm:max-w-md">
            {contest.title}
          </span>
        </div>

        {/* Center: Section Toggles (Coding / MCQs) */}
        {((contest.problems?.length > 0 && contest.mcqs?.length > 0) || contest.contestType === 'BOTH' || contest.contest_type === 'BOTH') && (
          <div className="flex items-center gap-1 p-1 bg-[#F5F7FA] dark:bg-[#0B0F14] rounded-xl border border-[#D9E0E8] dark:border-[#30363D]">
            <button
              onClick={() => setActiveSection('coding')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeSection === 'coding'
                  ? 'bg-[#0757B8] dark:bg-[#0066CC] text-white shadow-sm'
                  : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033]'
              }`}
            >
              Coding ({contest.problems?.length || 0})
            </button>
            <button
              onClick={() => setActiveSection('mcqs')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeSection === 'mcqs'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033]'
              }`}
            >
              MCQs ({contest.mcqs?.length || 0})
            </button>
          </div>
        )}
        {((contest.problems?.length > 0 && (!contest.mcqs || contest.mcqs.length === 0)) || contest.contestType === 'CODING' || contest.contest_type === 'CODING') && (
          <div className="px-3 py-1 bg-[#DDF2FF] dark:bg-[#142A43] border border-[#0757B8]/20 rounded-xl text-xs font-bold text-[#0757B8] dark:text-[#60A5FA]">
            Coding Assessment ({contest.problems?.length || 0} Problems)
          </div>
        )}
        {((contest.mcqs?.length > 0 && (!contest.problems || contest.problems.length === 0)) || contest.contestType === 'MCQ' || contest.contest_type === 'MCQ') && (
          <div className="px-3 py-1 bg-purple-500/15 border border-purple-500/30 rounded-xl text-xs font-bold text-purple-600 dark:text-purple-400">
            Technical MCQ Assessment ({contest.mcqs?.length || 0} Questions)
          </div>
        )}

        {/* Right: Calculator, Timer & Submit Button */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setCalculatorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F7FA] dark:bg-[#0B0F14] hover:bg-slate-200 dark:hover:bg-slate-800 border border-[#D9E0E8] dark:border-[#30363D] text-[#0757B8] dark:text-[#60A5FA] font-bold text-xs shadow-sm transition"
            title="Open Contest Scientific Calculator"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Calculator</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F7FA] dark:bg-[#0B0F14] border border-[#D9E0E8] dark:border-[#30363D] font-mono font-bold text-xs text-[#0757B8] dark:text-[#60A5FA]">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimer(timeLeft)}</span>
          </div>

          <button
            onClick={() => handleFinalSubmit(false)}
            disabled={isSubmittingContest}
            className="px-4 py-1.5 rounded-xl bg-[#22B573] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmittingContest ? 'Submitting...' : 'Finish & Submit'}</span>
          </button>
        </div>
      </div>

      {/* ARENA MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ===================== CODING SECTION ===================== */}
        {activeSection === 'coding' && (
          <div className="flex-1 flex overflow-hidden">
            
            {/* Left Side: Problem Statement & Selector */}
            <div className="w-1/2 flex flex-col border-r border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#151A21] overflow-hidden">
              
              {/* Problem Tabs */}
              <div className="h-10 px-3 bg-[#F5F7FA] dark:bg-[#0B0F14] border-b border-[#D9E0E8] dark:border-[#30363D] flex items-center gap-1.5 overflow-x-auto shrink-0">
                {contest.problems?.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => handleProblemSelect(idx)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                      selectedProblemIdx === idx
                        ? 'bg-[#FFFFFF] dark:bg-[#151A21] text-[#0757B8] dark:text-[#60A5FA] shadow-sm border border-[#D9E0E8] dark:border-[#30363D]'
                        : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033]'
                    }`}
                  >
                    Problem {idx + 1}: {p.title}
                  </button>
                ))}
              </div>

              {/* Problem Statement Content */}
              {currentProblem ? (
                <div className="flex-1 p-6 overflow-y-auto space-y-4 text-xs">
                  <div className="flex items-center gap-2">
                    <DifficultyBadge difficulty={currentProblem.difficulty} />
                    <TopicTag topic={currentProblem.topic} />
                  </div>

                  <h2 className="text-lg font-extrabold text-[#172033] dark:text-[#F8FAFC]">
                    {currentProblem.title}
                  </h2>

                  <div className="prose dark:prose-invert max-w-none text-[#172033] dark:text-[#F8FAFC] leading-relaxed whitespace-pre-wrap">
                    {currentProblem.description}
                  </div>

                  {currentProblem.input_format && (
                    <div className="space-y-1">
                      <div className="font-bold text-[#667085] dark:text-[#94A3B8] uppercase">Input Format:</div>
                      <div className="p-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#0B0F14] border border-[#D9E0E8] dark:border-[#30363D] font-mono">
                        {currentProblem.input_format}
                      </div>
                    </div>
                  )}

                  {currentProblem.output_format && (
                    <div className="space-y-1">
                      <div className="font-bold text-[#667085] dark:text-[#94A3B8] uppercase">Output Format:</div>
                      <div className="p-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#0B0F14] border border-[#D9E0E8] dark:border-[#30363D] font-mono">
                        {currentProblem.output_format}
                      </div>
                    </div>
                  )}

                  {currentProblem.sample_input && (
                    <div className="space-y-1">
                      <div className="font-bold text-[#667085] dark:text-[#94A3B8] uppercase">Sample Input:</div>
                      <pre className="p-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#0B0F14] border border-[#D9E0E8] dark:border-[#30363D] font-mono">
                        {currentProblem.sample_input}
                      </pre>
                    </div>
                  )}

                  {currentProblem.sample_output && (
                    <div className="space-y-1">
                      <div className="font-bold text-[#667085] dark:text-[#94A3B8] uppercase">Sample Output:</div>
                      <pre className="p-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#0B0F14] border border-[#D9E0E8] dark:border-[#30363D] font-mono">
                        {currentProblem.sample_output}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-[#667085]">No problems assigned to this contest.</div>
              )}
            </div>

            {/* Right Side: Monaco Code Editor & Output Panel */}
            <div className="w-1/2 flex flex-col bg-[#FFFFFF] dark:bg-[#151A21] overflow-hidden">
              
              {/* Editor Language Bar */}
              <div className="h-10 px-3 bg-[#F5F7FA] dark:bg-[#0B0F14] border-b border-[#D9E0E8] dark:border-[#30363D] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase text-[#667085] dark:text-[#94A3B8]">Language:</span>
                  <select
                    value={currentLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="py-1 px-2.5 rounded-lg bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-xs font-bold text-[#172033] dark:text-[#F8FAFC] uppercase"
                  >
                    {currentProblem?.supported_languages?.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang === 'cpp' ? 'C++' : lang === 'javascript' ? 'JavaScript' : lang}
                      </option>
                    )) || (
                      <>
                        <option value="python">Python</option>
                        <option value="cpp">C++</option>
                        <option value="c">C</option>
                        <option value="java">Java</option>
                        <option value="javascript">JavaScript</option>
                        <option value="go">Go</option>
                        <option value="rust">Rust</option>
                      </>
                    )}
                  </select>
                </div>

                <button
                  onClick={handleRunCurrentCode}
                  disabled={isRunning}
                  className="px-3 py-1 rounded-lg bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isRunning ? 'Executing...' : 'Run Code'}</span>
                </button>
              </div>

              {/* Monaco Editor */}
              <div className="flex-1 overflow-hidden relative">
                <MonacoCodeEditor
                  language={currentLanguage}
                  value={currentCode}
                  onChange={(val) => setCurrentCode(val || '')}
                />
              </div>

              {/* Bottom Output Panel */}
              <div className="h-44 border-t border-[#D9E0E8] dark:border-[#30363D] shrink-0 bg-[#FFFFFF] dark:bg-[#151A21]">
                <OutputPanel
                  activeTab={activeOutputTab}
                  onTabChange={setActiveOutputTab}
                  result={runResult}
                  isLoading={isRunning}
                  customInput={customInput}
                  onCustomInputChange={setCustomInput}
                />
              </div>

            </div>

          </div>
        )}

        {/* ===================== MCQS SECTION ===================== */}
        {activeSection === 'mcqs' && (
          <div className="flex-1 p-6 overflow-y-auto max-w-3xl mx-auto space-y-6">
            <div className="p-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D]">
              <h2 className="text-base font-extrabold text-[#172033] dark:text-[#F8FAFC] flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>Technical Multiple Choice Questions</span>
              </h2>
              <p className="text-xs text-[#667085] dark:text-[#94A3B8] mt-1">
                Select the correct answer for each question. Responses are saved automatically.
              </p>
            </div>

            <div className="space-y-4">
              {contest.mcqs?.map((m, idx) => (
                <div key={m.id} className="p-5 rounded-2xl bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-purple-600 dark:text-purple-400">Question {idx + 1}</span>
                    <span className="font-mono text-[#667085] dark:text-[#94A3B8]">{m.topic}</span>
                  </div>

                  <p className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC]">
                    {m.question}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {m.options?.map((opt, optIdx) => {
                      const isSelected = mcqAnswers[m.id] === opt;
                      return (
                        <button
                          key={optIdx}
                          onClick={() => setMcqAnswers({ ...mcqAnswers, [m.id]: opt })}
                          className={`p-3 rounded-xl border text-left text-xs font-semibold transition ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                              : 'bg-[#F5F7FA] dark:bg-[#0B0F14] border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] hover:border-purple-400'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Internal Contest Scientific Calculator */}
      <ScientificCalculator
        isOpen={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
      />
    </div>
  );
};
