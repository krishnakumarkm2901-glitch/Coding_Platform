import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  Trophy, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  HelpCircle, 
  Code2, 
  BarChart3, 
  ChevronLeft, 
  Percent, 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles,
  AlertTriangle,
  Cpu,
  HardDrive
} from 'lucide-react';
import { PageLoader } from '../../components/common/Loader';
import { formatISTDateTime as formatDateTime } from '../../utils/date';

export const StudentContestResult = () => {
  const { id: contestId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 3 Student Result Tabs: 'overall' | 'mcq' | 'coding'
  const [activeTab, setActiveTab] = useState('overall');

  useEffect(() => {
    fetchMyReport();
  }, [contestId]);

  const fetchMyReport = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/contests/${contestId}/my-report`);
      if (res.data.success) {
        setReport(res.data);
      }
    } catch (err) {
      console.error('Failed to load contest report:', err);
      setError(err.response?.data?.error || 'Unable to retrieve your contest result. Ensure you participated and submitted.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoader text="Loading your contest performance report..." />;
  }

  if (error || !report) {
    return (
      <div className="p-8 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] text-center max-w-lg mx-auto my-12 shadow-sm space-y-4 animate-fadeIn">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-[#172033] dark:text-[#F8FAFC]">Result Unavailable</h2>
        <p className="text-xs text-[#667085] dark:text-[#94A3B8]">
          {error || 'No participation or submission record found for your account.'}
        </p>
        <div className="pt-2">
          <Link
            to="/contests"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0757B8] dark:bg-[#0066CC] text-white font-bold text-xs shadow-md transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Return to Contests</span>
          </Link>
        </div>
      </div>
    );
  }

  const { contest, student, overall, mcq, coding, anti_cheat, original_attempt } = report;

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-5xl mx-auto">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/contests"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#667085] dark:text-[#94A3B8] hover:text-[#0757B8] dark:hover:text-[#60A5FA] transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Contests</span>
        </Link>
        <span className="text-xs font-mono text-[#667085] dark:text-[#94A3B8]">
          Contest Result • View Only
        </span>
      </div>

      {/* Main Student Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-3 py-0.5 rounded-full text-xs font-extrabold uppercase bg-[#0757B8]/15 text-[#0757B8] dark:text-[#60A5FA] border border-[#0757B8]/30">
                Official Result
              </span>
              {overall.is_retest && (
                <span className="px-3 py-0.5 rounded-full text-xs font-extrabold uppercase bg-[#60A5FA]/15 text-[#60A5FA] border border-[#60A5FA]/30">
                  Retest Attempt #{overall.attempt_number}
                </span>
              )}
              <span className="text-xs font-mono text-[#667085] dark:text-[#94A3B8]">
                {contest.duration_minutes} Mins
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172033] dark:text-[#F8FAFC]">
              {contest.title}
            </h1>
            <p className="text-xs sm:text-sm text-[#667085] dark:text-[#94A3B8] mt-1">
              Performance report for <strong>{student.name}</strong> ({student.student_id}) • {student.department}
            </p>
          </div>

          {/* Overall Score Badge */}
          <div className="p-4 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-center shrink-0 min-w-[140px]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#94A3B8]">
              Total Score
            </div>
            <div className="text-3xl font-extrabold font-mono text-[#0757B8] dark:text-[#60A5FA] mt-0.5">
              {overall.overall_score}
            </div>
            <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] font-mono mt-0.5">
              Rank #{overall.rank} of {overall.total_candidates}
            </div>
          </div>
        </div>

        {/* Quick KPI Overview Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {/* MCQ Score */}
          <div className="p-3.5 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D]">
            <div className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>MCQ Marks</span>
            </div>
            <div className="text-xl font-extrabold font-mono text-purple-600 dark:text-purple-400 mt-1">
              {mcq.mcq_score}
            </div>
            <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] mt-0.5">
              {mcq.mcqs_correct} / {mcq.total_mcqs} Correct ({mcq.accuracy_percentage}%)
            </div>
          </div>

          {/* Coding Score */}
          <div className="p-3.5 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D]">
            <div className="text-[10px] font-bold uppercase text-[#22B573] flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5" />
              <span>Coding Marks</span>
            </div>
            <div className="text-xl font-extrabold font-mono text-[#22B573] mt-1">
              {coding.coding_score}
            </div>
            <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] mt-0.5">
              {coding.problems_solved} / {coding.total_problems} Solved
            </div>
          </div>

          {/* Time Taken */}
          <div className="p-3.5 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D]">
            <div className="text-[10px] font-bold uppercase text-[#0757B8] dark:text-[#60A5FA] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Time Taken</span>
            </div>
            <div className="text-xl font-extrabold font-mono text-[#172033] dark:text-[#F8FAFC] mt-1">
              {overall.time_taken}
            </div>
            <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] mt-0.5">
              {overall.is_terminated ? 'Terminated' : 'Completed'}
            </div>
          </div>

          {/* Anti-Cheat Status */}
          <div className="p-3.5 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D]">
            <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Integrity</span>
            </div>
            <div className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {anti_cheat.status}
            </div>
            <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] mt-0.5">
              {anti_cheat.flags_count} Security Flags
            </div>
          </div>
        </div>

        {/* Original Attempt Info (for retest students) */}
        {overall.is_retest && original_attempt && (
          <div className="p-3.5 rounded-2xl bg-[#F59E0B]/5 border border-[#F59E0B]/20">
            <div className="text-[10px] font-bold uppercase text-[#F59E0B] tracking-wider mb-1">Original Attempt (Locked)</div>
            <div className="flex items-center gap-4 text-xs">
              <span className="font-mono font-bold text-[#172033] dark:text-[#F8FAFC]">Score: {original_attempt.score}</span>
              <span className="text-[#667085] dark:text-[#94A3B8]">MCQ: {original_attempt.mcq_score} • Coding: {original_attempt.coding_score}</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                {original_attempt.status}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3 STUDENT RESULT VIEW TABS */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] shadow-sm w-fit">
        {/* Tab 1: Overall Result */}
        <button
          type="button"
          onClick={() => setActiveTab('overall')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition ${
            activeTab === 'overall'
              ? 'bg-[#0757B8] dark:bg-[#0066CC] text-white shadow-md'
              : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Overall Result</span>
        </button>

        {/* Tab 2: MCQ Result */}
        <button
          type="button"
          onClick={() => setActiveTab('mcq')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition ${
            activeTab === 'mcq'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>MCQ Result</span>
        </button>

        {/* Tab 3: Coding Result */}
        <button
          type="button"
          onClick={() => setActiveTab('coding')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition ${
            activeTab === 'coding'
              ? 'bg-[#22B573] text-white shadow-md'
              : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Coding Result</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 📊 TAB 1: OVERALL RESULT VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overall' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* MCQ Contribution Card */}
            <div className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-extrabold text-sm">
                  <HelpCircle className="w-5 h-5" />
                  <span>Technical MCQs Performance</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  {mcq.mcq_score} Marks
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#D9E0E8] dark:border-[#30363D]">
                  <span className="text-[#667085] dark:text-[#94A3B8]">Total Questions</span>
                  <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">{mcq.total_mcqs}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#D9E0E8] dark:border-[#30363D]">
                  <span className="text-[#667085] dark:text-[#94A3B8]">Correct Answers</span>
                  <span className="font-bold text-[#22B573]">{mcq.mcqs_correct}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#D9E0E8] dark:border-[#30363D]">
                  <span className="text-[#667085] dark:text-[#94A3B8]">Accuracy Rate</span>
                  <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">{mcq.accuracy_percentage}%</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('mcq')}
                className="w-full py-2.5 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-400 font-bold text-xs text-center transition"
              >
                View MCQ Question Breakdown &rarr;
              </button>
            </div>

            {/* Coding Contribution Card */}
            <div className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#22B573] font-extrabold text-sm">
                  <Code2 className="w-5 h-5" />
                  <span>Algorithmic Coding Performance</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#22B573]/15 text-[#22B573]">
                  {coding.coding_score} Marks
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#D9E0E8] dark:border-[#30363D]">
                  <span className="text-[#667085] dark:text-[#94A3B8]">Problems Solved</span>
                  <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">{coding.problems_solved} / {coding.total_problems}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#D9E0E8] dark:border-[#30363D]">
                  <span className="text-[#667085] dark:text-[#94A3B8]">Test Cases Passed</span>
                  <span className="font-bold text-[#22B573]">{coding.passed_test_cases} / {coding.total_test_cases}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#D9E0E8] dark:border-[#30363D]">
                  <span className="text-[#667085] dark:text-[#94A3B8]">Test Case Success Rate</span>
                  <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">{coding.coding_percentage}%</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('coding')}
                className="w-full py-2.5 rounded-xl bg-[#22B573]/10 hover:bg-[#22B573]/20 text-[#22B573] font-bold text-xs text-center transition"
              >
                View Problem Test Case Breakdown &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📝 TAB 2: MCQ RESULT VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'mcq' && (
        <div className="space-y-4 animate-fadeIn">
          {(!mcq.breakdowns || mcq.breakdowns.length === 0) ? (
            <div className="p-12 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] text-center text-xs text-[#667085]">
              No MCQ questions were configured for this contest.
            </div>
          ) : (
            mcq.breakdowns.map((q, idx) => (
              <div
                key={q.id || idx}
                className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-[#172033] dark:text-[#F8FAFC] font-mono font-bold text-xs">
                      Q{idx + 1}
                    </span>
                    <h3 className="font-bold text-sm text-[#172033] dark:text-[#F8FAFC]">
                      {q.title || `Question ${idx + 1}`}
                    </h3>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5 ${
                    q.is_correct
                      ? 'bg-[#22B573]/15 text-[#22B573] border border-[#22B573]/30'
                      : 'bg-red-500/15 text-red-600 border border-red-500/30'
                  }`}>
                    {q.is_correct ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{q.is_correct ? '+10 Marks (Correct)' : '0 Marks (Incorrect)'}</span>
                  </span>
                </div>

                <p className="text-xs text-[#172033] dark:text-[#F8FAFC] font-medium leading-relaxed">
                  {q.question}
                </p>

                {/* Options List */}
                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt, oIdx) => {
                      const isSelected = String(q.selected_option).trim().toLowerCase() === String(opt).trim().toLowerCase();
                      const isCorrectOpt = String(q.correct_option).trim().toLowerCase() === String(opt).trim().toLowerCase();

                      return (
                        <div
                          key={oIdx}
                          className={`p-3 rounded-2xl border transition ${
                            isCorrectOpt
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 font-bold'
                              : isSelected && !isCorrectOpt
                                ? 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-400 font-bold'
                                : 'bg-[#F5F7FA] dark:bg-[#151A21] border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{opt}</span>
                            {isCorrectOpt && <span className="text-[10px] uppercase font-bold text-emerald-600">Correct</span>}
                            {isSelected && !isCorrectOpt && <span className="text-[10px] uppercase font-bold text-red-500">Your Choice</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Explanation */}
                {q.explanation && (
                  <div className="p-3 rounded-2xl bg-[#DDF2FF]/40 dark:bg-[#142A43]/40 border border-[#0757B8]/20 text-[11px] text-[#0757B8] dark:text-[#60A5FA]">
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 💻 TAB 3: CODING RESULT VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'coding' && (
        <div className="space-y-4 animate-fadeIn">
          {(!coding.breakdowns || coding.breakdowns.length === 0) ? (
            <div className="p-12 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] text-center text-xs text-[#667085]">
              No coding problems were configured for this contest.
            </div>
          ) : (
            coding.breakdowns.map((p, idx) => (
              <div
                key={p.problem_id || idx}
                className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-[#172033] dark:text-[#F8FAFC] font-mono font-bold text-xs">
                        Problem {idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-[#0757B8]/15 text-[#0757B8] dark:text-[#60A5FA] text-[10px] font-bold">
                        {p.difficulty}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-base text-[#172033] dark:text-[#F8FAFC]">
                      {p.title}
                    </h3>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                    p.status === 'Accepted'
                      ? 'bg-[#22B573]/15 text-[#22B573] border border-[#22B573]/30'
                      : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                  }`}>
                    {p.status}
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D]">
                    <div className="text-[10px] font-bold text-[#667085] uppercase">Test Cases</div>
                    <div className="text-base font-extrabold font-mono text-[#172033] dark:text-[#F8FAFC] mt-0.5">
                      {p.passed_test_cases} / {p.total_test_cases} Passed
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D]">
                    <div className="text-[10px] font-bold text-[#667085] uppercase">Language</div>
                    <div className="text-base font-extrabold font-mono text-[#0757B8] dark:text-[#60A5FA] mt-0.5 capitalize">
                      {p.language || 'Python'}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D]">
                    <div className="text-[10px] font-bold text-[#667085] uppercase">Marks Awarded</div>
                    <div className="text-base font-extrabold font-mono text-[#22B573] mt-0.5">
                      {p.status === 'Accepted' ? '50 Marks' : `${Math.round((p.passed_test_cases / Math.max(p.total_test_cases, 1)) * 50)} Marks`}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D]">
                    <div className="text-[10px] font-bold text-[#667085] uppercase">Status</div>
                    <div className="text-base font-extrabold font-mono text-[#172033] dark:text-[#F8FAFC] mt-0.5">
                      {p.status}
                    </div>
                  </div>
                </div>

                {/* Submitted Code Preview */}
                {p.code && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">Submitted Code Solution:</div>
                    <pre className="p-4 rounded-2xl bg-[#0B0F14] border border-[#30363D] text-xs font-mono text-slate-200 overflow-x-auto max-h-56">
                      <code>{p.code}</code>
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
