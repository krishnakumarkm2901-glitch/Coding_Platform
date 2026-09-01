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
import { DEFAULT_STARTER_CODE } from '../../utils/starterCode';
import { normalizeTestCases } from '../../utils/testcases';

export const ContestArena = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Mode: 'overview' | 'arena' | 'submitted' | 'terminated' | 'locked' | 'retest_available'
  const [mode, setMode] = useState('overview');
  const [terminationReason, setTerminationReason] = useState('');
  const [lockReason, setLockReason] = useState('');
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  const [retestInfo, setRetestInfo] = useState(null);

  // Contest countdown to start (for upcoming)
  const [countdownToStart, setCountdownToStart] = useState(0);

  // Contest timer (seconds remaining in active arena)
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const isTerminatedRef = useRef(false);
  const isSubmittedRef = useRef(false);
  const isLockedRef = useRef(false);

  // Active section inside arena: 'coding' | 'mcqs'
  const [activeSection, setActiveSection] = useState('coding');

  // Coding problem state
  const [selectedProblemIdx, setSelectedProblemIdx] = useState(0);
  const [codeSolutions, setCodeSolutions] = useState({}); // { problem_id: { language: code } }
  const [currentLanguage, setCurrentLanguage] = useState('python');
  const [currentCode, setCurrentCode] = useState('');

  // MCQ state: { mcq_id: selected_option }
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [selectedMCQIdx, setSelectedMCQIdx] = useState(0);

  // Runner state
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [customInput, setCustomInput] = useState('');
  const [activeOutputTab, setActiveOutputTab] = useState('testcases');

  const outputPanelRef = useRef(null);
  const editorRef = useRef(null);

  // Submit & Evaluation state
  const [isSubmittingContest, setIsSubmittingContest] = useState(false);
  const [isSubmittingProblem, setIsSubmittingProblem] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [problemSubmitModalOpen, setProblemSubmitModalOpen] = useState(false);
  const [contestSubmitModalOpen, setContestSubmitModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [verifiedProblemCodeHashes, setVerifiedProblemCodeHashes] = useState({});

  const currentProbObj = contest?.problems?.[selectedProblemIdx];
  const currentProblemCodeHash = `${currentProbObj?.id || ''}_${currentLanguage}_${currentCode}`;
  const isProblemSubmitAllowed = Boolean(currentProbObj && verifiedProblemCodeHashes[currentProbObj.id] === currentProblemCodeHash);

  useEffect(() => {
    if (runResult || submitResult) {
      setTimeout(() => {
        outputPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [runResult, submitResult]);

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

  const fetchContestDetails = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      setError('');
      console.log('Fetching contest details for ID:', id);
      const res = await api.get(`/contests/${id}`);
      if (res.data?.success && res.data?.contest) {
        const c = res.data.contest;
        setContest(c);
        console.log('Contest loaded:', c);

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

        // Check if student's attempt is locked (awaiting admin restore)
        if (c.is_locked) {
          isLockedRef.current = true;
          setLockReason(c.lock_reason || 'Exited fullscreen contest mode');
          setLockTimeRemaining(c.lock_timeout_remaining_seconds || 0);
          setTimeLeft(c.remaining_seconds || 0);
          
          // Check if a retest has been activated
          if (c.is_retest_available && c.retest_info) {
            setRetestInfo(c.retest_info);
            setMode('retest_available');
          } else {
            setMode('locked');
          }
          return;
        }

        // Check if student already submitted
        if (c.has_submitted) {
          isSubmittedRef.current = true;
          setMode('submitted');
          return;
        }

        if (c.is_retest_available && c.retest_info) {
          isLockedRef.current = false;
          setRetestInfo(c.retest_info);
          setMode('retest_available');
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
      } else {
        setError(res.data?.error || 'The contest API returned an invalid response.');
      }
    } catch (err) {
      console.error('Error fetching contest details:', err);
      if (err.response?.data?.is_locked) {
        isLockedRef.current = true;
        setLockReason(err.response?.data?.lock_reason || 'Exited fullscreen');
        setMode('locked');
      } else if (err.response?.data?.is_terminated) {
        isTerminatedRef.current = true;
        setTerminationReason(err.response?.data?.termination_reason || 'Violation of strict contest rules');
        setMode('terminated');
      } else {
        const errMsg = err.response?.data?.error || err.message || 'Failed to load contest. Please check your internet connection and try again.';
        console.error('Contest load error:', errMsg);
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setError('No contest ID provided in URL.');
      setLoading(false);
      return;
    }

    fetchContestDetails(true);
    // Poll while the overview is visible so scheduled status changes appear live.
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
  }, [id, mode, fetchContestDetails]);

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

  // ----------------- LOCK HANDLER (Fullscreen Exit) -----------------

  const triggerLock = useCallback(async (detail) => {
    if (isTerminatedRef.current || isSubmittedRef.current || isLockedRef.current) return;
    isLockedRef.current = true;

    if (timerRef.current) clearInterval(timerRef.current);

    setLockReason(detail);
    setMode('locked');

    try {
      await api.post(`/contests/${id}/lock`, {
        reason: 'EXIT_FULLSCREEN',
        detail: detail,
        remaining_seconds: timeLeft,
        resume_state: {
          code_solutions: {
            ...codeSolutions,
            ...(contest?.problems?.[selectedProblemIdx] ? {
              [contest.problems[selectedProblemIdx].id]: {
                ...(codeSolutions[contest.problems[selectedProblemIdx].id] || {}),
                [currentLanguage]: currentCode,
              },
            } : {}),
          },
          mcq_answers: mcqAnswers,
          selected_problem_index: selectedProblemIdx,
          selected_mcq_index: selectedMCQIdx,
          active_section: activeSection,
          current_language: currentLanguage,
          current_code: currentCode,
        },
      });
    } catch (err) {
      console.error('Failed to report lock to server:', err);
    }
  }, [id, timeLeft, codeSolutions, contest, selectedProblemIdx, currentLanguage, currentCode, mcqAnswers, selectedMCQIdx, activeSection]);

  // ----------------- RETEST START HANDLER -----------------

  const handleStartRetest = async () => {
    try {
      setLoading(true);
      setError('');

      if (!document.documentElement.requestFullscreen) {
        throw new Error('Fullscreen is not supported by this browser.');
      }
      await document.documentElement.requestFullscreen();
      if (!document.fullscreenElement) throw new Error('Fullscreen is required to start the retest.');

      // Fetch the latest contest details to get the retest participant
      const res = await api.get(`/contests/${id}`);
      if (res.data.success) {
        const c = res.data.contest;
        setContest(c);
        
        // Verify retest is available
        if (c.is_retest_available && c.retest_info) {
          // Initialize retest with fresh questions
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
          setMcqAnswers({});
          setSelectedProblemIdx(0);
          setSelectedMCQIdx(0);
          
          if (c.problems && c.problems.length > 0) {
            setCurrentCode(initSolutions[c.problems[0].id]?.python || '');
          }

          // Reset attempt refs for new retest
          isTerminatedRef.current = false;
          isLockedRef.current = false;
          
          const joinRes = await api.post(`/contests/${id}/join`, { start_retest: true });
          startArena(joinRes.data.remaining_seconds || (c.duration_minutes * 60) || 3600);
        } else {
          setError('Retest is no longer available. Please refresh and try again.');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start retest.');
    } finally {
      setLoading(false);
    }
  };

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
      if (err.response?.data?.is_locked) {
        isLockedRef.current = true;
        setLockReason(err.response?.data?.lock_reason || 'Exited fullscreen');
        setMode('locked');
      } else if (err.response?.data?.is_terminated) {
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
      if (!document.fullscreenElement && !isTerminatedRef.current && !isSubmittedRef.current && !isLockedRef.current) {
        triggerLock('Exited fullscreen contest mode');
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
  }, [mode, triggerTermination, triggerLock]);

  // ----------------- PROBLEM & CODE HANDLING -----------------

  const activeDiagnostics = submitResult?.diagnostics || runResult?.diagnostics || [];

  const handleNavigateToLine = (line, col) => {
    if (editorRef.current && line) {
      editorRef.current.revealPosition(line, col || 1);
    }
  };

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
    const saved = codeSolutions[newProb.id]?.[currentLanguage] || newProb.starter_code?.[currentLanguage] || DEFAULT_STARTER_CODE[currentLanguage] || '';
    setCurrentCode(saved);
    setRunResult(null);
    setSubmitResult(null);
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
    const savedCode = codeSolutions[currentProblem.id]?.[newLang] || currentProblem.starter_code?.[newLang] || DEFAULT_STARTER_CODE[newLang] || '';
    setCurrentCode(savedCode);
    setRunResult(null);
    setSubmitResult(null);
  };

  const handleRunCurrentCode = async () => {
    const currentProblem = contest?.problems?.[selectedProblemIdx];
    if (!currentProblem) return;

    if (!currentCode.trim()) {
      setRunResult({
        status: 'Error',
        output: '',
        error: 'Code cannot be empty. Please write your solution before running.',
        execution_time: 0,
        inputUsed: '',
        input: '',
      });
      setActiveOutputTab('result');
      return;
    }

    try {
      setIsRunning(true);
      setSubmitResult(null);
      setActiveOutputTab('result');
      const normalizedCases = normalizeTestCases(currentProblem);
      const isCustomTab = activeOutputTab === 'custom';

      let payload = {
        language: currentLanguage,
        code: currentCode,
        problem_id: currentProblem?.id,
        is_custom: isCustomTab,
      };

      if (isCustomTab) {
        payload.custom_input = customInput;
        payload.expected_output = '';
      } else {
        payload.test_cases = normalizedCases.length > 0 ? normalizedCases : [
          { input: currentProblem?.sample_input || '', expected_output: currentProblem?.sample_output || '', is_sample: true }
        ];
      }

      const res = await api.post('/submissions/run', payload);
      if (res.data.success) {
        setRunResult({
          ...res.data,
          inputUsed: isCustomTab ? customInput : (normalizedCases[0]?.input || ''),
          input: isCustomTab ? customInput : (normalizedCases[0]?.input || ''),
          expected_output: isCustomTab ? '' : (normalizedCases[0]?.expected_output || ''),
        });

        // Gate: ONLY unlock submit if all sample test cases passed AND it was not a custom input run
        if (!isCustomTab && res.data.all_passed && currentProblem) {
          const validHash = `${currentProblem.id}_${currentLanguage}_${currentCode}`;
          setVerifiedProblemCodeHashes(prev => ({ ...prev, [currentProblem.id]: validHash }));
        } else if (currentProblem) {
          setVerifiedProblemCodeHashes(prev => ({ ...prev, [currentProblem.id]: null }));
        }
      }
    } catch (err) {
      if (currentProblem) {
        setVerifiedProblemCodeHashes(prev => ({ ...prev, [currentProblem.id]: null }));
      }
      setRunResult({
        status: 'Runtime Error',
        output: '',
        error: err.response?.data?.error || 'Execution service failed.',
        execution_time: 0,
        inputUsed: customInput,
        input: customInput,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleOpenProblemSubmitModal = () => {
    if (!currentCode.trim()) {
      setRunResult({
        status: 'Error',
        output: '',
        error: 'Code cannot be empty. Please write your solution before submitting.',
        execution_time: 0,
        inputUsed: '',
        input: '',
      });
      setActiveOutputTab('result');
      return;
    }
    setProblemSubmitModalOpen(true);
  };

  const handleConfirmProblemSubmit = async () => {
    const currentProblem = contest?.problems?.[selectedProblemIdx];
    if (!currentProblem) return;
    setProblemSubmitModalOpen(false);

    try {
      setIsSubmittingProblem(true);
      setRunResult(null);
      setActiveOutputTab('result');

      const res = await api.post(`/contests/${id}/problems/${currentProblem.id}/submit`, {
        language: currentLanguage,
        code: currentCode,
      });

      if (res.data.success) {
        setSubmitResult(res.data);
        if (res.data.status === 'Accepted' || res.data.verdict === 'ACCEPTED') {
          confetti({
            particleCount: 100,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#0757B8', '#22B573', '#F2B705'],
          });
        }
      }
    } catch (err) {
      setSubmitResult({
        status: 'Submission Error',
        error_message: err.response?.data?.error || 'Problem submission failed.',
        passed_test_cases: 0,
        total_test_cases: 0,
        runtime: 0,
      });
    } finally {
      setIsSubmittingProblem(false);
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
        navigate(`/contests/${id}/result`, { replace: true });
      }
    } catch (err) {
      isSubmittedRef.current = false;
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

  // Locked mode effect - auto-check and countdown timer
  useEffect(() => {
    if (mode !== 'locked') return;

    const checkStatusInterval = setInterval(async () => {
      try {
        const res = await api.get(`/contests/${id}`);
        if (res.data.success) {
          const c = res.data.contest;
          setLockTimeRemaining(c.lock_timeout_remaining_seconds || 0);
          
          if (c.is_retest_available && c.retest_info) {
            isLockedRef.current = false;
            setContest(c);
            setRetestInfo(c.retest_info);
            setMode('retest_available');
            return;
          }
          if (c.is_terminated) {
            isTerminatedRef.current = true;
            setTerminationReason(c.termination_reason || 'Lock resolution window expired without admin action');
            setMode('terminated');
            return;
          }
        }
      } catch (err) {
        console.error('Failed to check status:', err);
      }
    }, 5000);

    const countdownTimer = setInterval(() => {
      setLockTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearInterval(checkStatusInterval);
      clearInterval(countdownTimer);
    };
  }, [mode, id]);

  if (loading) {
    return <PageLoader text="Connecting to Secure Contest Arena..." />;
  }

  // =========================================================================
  // 🔒 1a. CONTEST LOCKED SCREEN (Fullscreen Exit — Awaiting Admin Restore)
  // =========================================================================
  if (mode === 'locked') {
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div className="fixed inset-0 z-50 bg-[#0B0F14] text-white flex items-center justify-center p-4">
        <div className="max-w-lg w-full p-8 rounded-3xl border border-[#F59E0B]/40 bg-[#151A21] shadow-2xl text-center space-y-6 animate-fadeIn">
          
          <div className="w-16 h-16 rounded-3xl bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 flex items-center justify-center mx-auto shadow-lg">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] text-[11px] font-mono font-bold uppercase border border-[#F59E0B]/30">
              Status: LOCKED
            </span>
            <h1 className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">
              Test Locked
            </h1>
            <p className="text-sm font-semibold text-[#F59E0B] leading-relaxed">
              Please contact the administrator.
            </p>
          </div>

          {/* Resolution Window Timer */}
          <div className="p-4 rounded-2xl bg-[#0B0F14] border border-[#3B82F6]/50 text-center space-y-3">
            <div className="text-xs uppercase tracking-widest text-[#3B82F6] font-bold">
              Resolution Window
            </div>
            <div className="text-4xl font-mono font-bold text-[#F8FAFC] tabular-nums">
              {formatTime(lockTimeRemaining)}
            </div>
            <div className="text-[11px] text-[#94A3B8]">
              Admin has up to 30 minutes to restore your access
            </div>
            {lockTimeRemaining < 300 && lockTimeRemaining > 0 && (
              <div className="text-[11px] text-[#EF4444] font-semibold">
                ⚠️ Window expiring soon - attempt will auto-terminate if not resolved
              </div>
            )}
            {lockTimeRemaining === 0 && (
              <div className="text-[11px] text-[#EF4444] font-semibold">
                Resolution window expired - attempt auto-terminated
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-[#0B0F14] border border-[#30363D] text-left text-xs space-y-2">
            <div className="font-bold text-[#94A3B8] uppercase tracking-wider">Reason:</div>
            <div className="font-mono text-[#F8FAFC] font-semibold">
              {lockReason || 'Exited fullscreen contest mode'}
            </div>
            <div className="text-[11px] text-[#94A3B8]">
              Your progress, code, answers, and remaining time have been preserved. Once the administrator restores your access, you can continue the contest from where you left off.
            </div>
          </div>

          <div className="pt-2 flex flex-col items-center gap-3">
            <p className="text-[11px] text-[#94A3B8]">
              Checking for admin restore every 5 seconds...
            </p>
            <Link
              to="/contests"
              className="text-xs font-bold text-[#667085] hover:text-[#94A3B8] transition"
            >
              ← Back to Contests
            </Link>
          </div>

        </div>
      </div>
    );
  }

  // =========================================================================
  // � 1c. RETEST AVAILABLE SCREEN (Locked → Admin Restored)
  // =========================================================================
  if (mode === 'retest_available') {
    return (
      <div className="fixed inset-0 z-50 bg-[#0B0F14] text-white flex items-center justify-center p-4">
        <div className="max-w-lg w-full p-8 rounded-3xl border border-[#60A5FA]/40 bg-[#151A21] shadow-2xl text-center space-y-6 animate-fadeIn">
          
          <div className="w-16 h-16 rounded-3xl bg-[#60A5FA]/20 text-[#60A5FA] border border-[#60A5FA]/40 flex items-center justify-center mx-auto shadow-lg">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-[#60A5FA]/15 text-[#60A5FA] text-[11px] font-mono font-bold uppercase border border-[#60A5FA]/30">
              Retest Activated
            </span>
            <h1 className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">
              Your Retest is Ready
            </h1>
            <p className="text-sm font-semibold text-[#94A3B8] leading-relaxed">
              The administrator has activated a retest for you. A new set of questions has been prepared.
            </p>
          </div>

          {/* Retest Details Box */}
          <div className="p-4 rounded-2xl bg-[#0B0F14] border border-[#30363D] text-left text-xs space-y-3">
            <div>
              <div className="font-bold text-[#94A3B8] uppercase tracking-wider text-[10px] mb-1">Retest Info</div>
              <div className="font-mono text-[#F8FAFC] font-semibold">Attempt #{retestInfo?.attempt_number || 2}</div>
              <div className="text-[11px] text-[#667085] mt-1">
                You will receive a fresh set of questions excluding those from your first attempt.
              </div>
            </div>
            <div className="pt-2 border-t border-[#30363D]">
              <div className="font-bold text-[#60A5FA] text-[11px] uppercase tracking-wider mb-1">🔒 Important</div>
              <div className="text-[#94A3B8] text-[11px] leading-relaxed">
                Fullscreen mode is <strong>required</strong>. Exiting fullscreen will lock this retest and require admin approval again.
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setMode('locked')}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-[#30363D] hover:bg-[#3D444D] text-[#F8FAFC] font-bold text-xs shadow-md transition"
            >
              Cancel
            </button>
            <button
              onClick={handleStartRetest}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#60A5FA] hover:bg-[#4A9AE3] text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Start Retest</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // =========================================================================
  // �🛑 1b. CONTEST TERMINATED SCREEN (Strict Mode Violation)
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
      <div className="px-3 sm:px-4 py-2 sm:py-0 bg-[#FFFFFF] dark:bg-[#151A21] border-b border-[#D9E0E8] dark:border-[#30363D] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0 shadow-sm">
        
        {/* Left: Lock indicator & Contest Title */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 text-[11px] font-bold w-fit">
            <Lock className="w-3.5 h-3.5" />
            <span>Strict Contest Mode Active</span>
          </div>
          <span className="font-extrabold text-sm text-[#172033] dark:text-[#F8FAFC] truncate max-w-full sm:max-w-md">
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
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {Boolean(contest?.allow_calculator || contest?.allowCalculator) && (
            <button
              type="button"
              onClick={() => setCalculatorOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F7FA] dark:bg-[#0B0F14] hover:bg-slate-200 dark:hover:bg-slate-800 border border-[#D9E0E8] dark:border-[#30363D] text-[#0757B8] dark:text-[#60A5FA] font-bold text-xs shadow-sm transition"
              title="Open Contest Scientific Calculator"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Calculator</span>
            </button>
          )}

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
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* ===================== CODING SECTION ===================== */}
        {activeSection === 'coding' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            
            {/* Left Side: Problem Statement & Selector */}
            <div className="w-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#151A21] overflow-hidden">
              
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
            <div className="w-full lg:w-1/2 flex flex-col bg-[#FFFFFF] dark:bg-[#151A21] overflow-hidden">
              
              {/* Editor Language Bar */}
              <div className="h-10 px-3 bg-[#F5F7FA] dark:bg-[#0B0F14] border-b border-[#D9E0E8] dark:border-[#30363D] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase text-[#667085] dark:text-[#94A3B8]">Language:</span>
                  <select
                    value={currentLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="py-1 px-2.5 rounded-lg bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-xs font-bold text-[#172033] dark:text-[#F8FAFC] uppercase cursor-pointer"
                  >
                    {(currentProblem?.supported_languages || ['python', 'cpp', 'c', 'java', 'rust'])
                      .filter(lang => lang !== 'go' && lang !== 'javascript' && lang !== 'js')
                      .map((lang) => (
                        <option key={lang} value={lang}>
                          {lang === 'cpp' ? 'C++' : lang.toUpperCase()}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRunCurrentCode}
                    disabled={isRunning || isSubmittingProblem}
                    className="px-3 py-1 rounded-lg bg-[#F5F7FA] dark:bg-[#151A21] hover:bg-[#DDF2FF] dark:hover:bg-[#142A43] text-[#172033] dark:text-[#F8FAFC] border border-[#D9E0E8] dark:border-[#30363D] font-bold text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-40 transition cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-[#0757B8] dark:text-[#60A5FA] fill-current" />
                    <span>{isRunning ? 'Running...' : 'Run Code'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenProblemSubmitModal}
                    disabled={isRunning || isSubmittingProblem || !isProblemSubmitAllowed}
                    title={!isProblemSubmitAllowed ? "Run code and pass all sample test cases to enable submission" : "Submit your verified solution"}
                    className={`px-3.5 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition cursor-pointer ${
                      isProblemSubmitAllowed
                        ? 'bg-[#22B573] hover:opacity-95 text-white'
                        : 'bg-[#D9E0E8] dark:bg-[#30363D] text-[#667085] dark:text-[#94A3B8] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-3 h-3" />
                    <span>{isSubmittingProblem ? 'Evaluating...' : 'Submit Solution'}</span>
                  </button>
                </div>
              </div>

              {/* Monaco Editor */}
              <div className="flex-1 overflow-hidden relative">
                <MonacoCodeEditor
                  ref={editorRef}
                  language={currentLanguage}
                  code={currentCode}
                  value={currentCode}
                  diagnostics={activeDiagnostics}
                  onChange={(val) => setCurrentCode(val || '')}
                  onReset={() => {
                    const currentProblem = contest?.problems?.[selectedProblemIdx];
                    const resetCode = currentProblem?.starter_code?.[currentLanguage] || DEFAULT_STARTER_CODE[currentLanguage] || '';
                    setCurrentCode(resetCode);
                  }}
                />
              </div>

              {/* Bottom Output Panel */}
              <div className="h-56 border-t border-[#D9E0E8] dark:border-[#30363D] shrink-0 bg-[#FFFFFF] dark:bg-[#151A21]" ref={outputPanelRef}>
                <OutputPanel
                  activeTab={activeOutputTab}
                  setActiveTab={setActiveOutputTab}
                  onTabChange={setActiveOutputTab}
                  runResult={runResult}
                  submitResult={submitResult}
                  result={runResult}
                  isRunning={isRunning}
                  isSubmitting={isSubmittingProblem}
                  isLoading={isRunning || isSubmittingProblem}
                  customInput={customInput}
                  setCustomInput={setCustomInput}
                  onCustomInputChange={setCustomInput}
                  sampleTestCases={currentProblem ? normalizeTestCases(currentProblem) : []}
                  onNavigateToLine={handleNavigateToLine}
                />
              </div>

            </div>

          </div>
        )}

        {/* ===================== MCQS SECTION ===================== */}
        {activeSection === 'mcqs' && (
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-3xl mx-auto space-y-6 w-full">
            <div className="p-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D]">
              <h2 className="text-base font-extrabold text-[#172033] dark:text-[#F8FAFC] flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>Technical Multiple Choice Questions</span>
              </h2>
              <p className="text-xs text-[#667085] dark:text-[#94A3B8] mt-1">
                Select the correct answer for each question. Responses are saved automatically.
              </p>
            </div>

            {/* MCQ Question Navigation Grid */}
            {contest.mcqs && contest.mcqs.length > 0 && (
              <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] justify-center">
                {contest.mcqs.map((m, idx) => {
                  const isAnswered = mcqAnswers[m.id] !== undefined && mcqAnswers[m.id] !== '';
                  const isActive = selectedMCQIdx === idx;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMCQIdx(idx)}
                      className={`w-9 h-9 rounded-xl font-bold font-mono text-xs flex items-center justify-center transition shadow-sm ${
                        isActive
                          ? 'bg-purple-600 text-white border-purple-600'
                          : isAnswered
                          ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                          : 'bg-[#F5F7FA] dark:bg-[#0B0F14] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] hover:border-purple-400'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            )}

            {/* MCQ Question Attempt Area */}
            {contest.mcqs && contest.mcqs.length > 0 && selectedMCQIdx >= 0 && selectedMCQIdx < contest.mcqs.length && (
              <div className="p-6 rounded-2xl bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] space-y-4">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-purple-600 dark:text-purple-400">
                    Question {selectedMCQIdx + 1} of {contest.mcqs.length}
                  </span>
                  <span className="font-mono text-[#667085] dark:text-[#94A3B8]">
                    {contest.mcqs[selectedMCQIdx].topic}
                  </span>
                </div>

                <p className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC] leading-relaxed">
                  {contest.mcqs[selectedMCQIdx].question}
                </p>

                <div className="grid grid-cols-1 gap-2.5 pt-2">
                  {contest.mcqs[selectedMCQIdx].options?.map((opt, optIdx) => {
                    const isSelected = mcqAnswers[contest.mcqs[selectedMCQIdx].id] === opt;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() =>
                          setMcqAnswers({
                            ...mcqAnswers,
                            [contest.mcqs[selectedMCQIdx].id]: opt,
                          })
                        }
                        className={`p-3.5 rounded-xl border text-left text-xs font-semibold transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-[#F5F7FA] dark:bg-[#0B0F14] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] hover:border-purple-400'
                        }`}
                      >
                        <span>{opt}</span>
                        {isSelected && (
                          <span className="font-extrabold text-[10px] bg-white text-purple-600 px-2 py-0.5 rounded-md">
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Prev / Next Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-[#D9E0E8] dark:border-[#30363D]">
                  <button
                    type="button"
                    disabled={selectedMCQIdx === 0}
                    onClick={() => setSelectedMCQIdx(prev => prev - 1)}
                    className="px-4 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#0B0F14] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] font-bold text-xs transition hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40"
                  >
                    Previous Question
                  </button>

                  <button
                    type="button"
                    disabled={selectedMCQIdx === contest.mcqs.length - 1}
                    onClick={() => setSelectedMCQIdx(prev => prev + 1)}
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs transition hover:bg-purple-700 disabled:opacity-40"
                  >
                    Next Question
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Internal Contest Scientific Calculator */}
      {Boolean(contest?.allow_calculator || contest?.allowCalculator) && (
        <ScientificCalculator
          isOpen={calculatorOpen}
          onClose={() => setCalculatorOpen(false)}
        />
      )}

      {/* Problem Solution Submit Confirmation Modal */}
      <Modal
        isOpen={problemSubmitModalOpen}
        onClose={() => setProblemSubmitModalOpen(false)}
        title={`Submit Solution — ${currentProblem?.title || 'Coding Problem'}`}
      >
        <div className="space-y-4 text-sm text-[#172033] dark:text-[#F8FAFC]">
          <div className="p-3.5 rounded-2xl bg-[#DDF2FF] dark:bg-[#142A43] border border-[#0757B8]/20 flex items-start gap-3">
            <Code2 className="w-5 h-5 text-[#0757B8] dark:text-[#60A5FA] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs">
                Your solution for <strong>{currentProblem?.title}</strong> will be evaluated against all test cases.
              </p>
              <p className="text-[11px] text-[#667085] dark:text-[#94A3B8] mt-1">
                Clicking Submit evaluates and saves your code for this problem. You can continue working on other problems in the contest.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setProblemSubmitModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-xs font-bold text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmProblemSubmit}
              className="px-5 py-2 rounded-xl bg-[#22B573] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Solution</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
