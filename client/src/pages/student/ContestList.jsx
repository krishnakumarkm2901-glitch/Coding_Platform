import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  Trophy, 
  Clock, 
  Calendar, 
  Code2, 
  HelpCircle, 
  Users, 
  ArrowRight, 
  Award,
  Zap
} from 'lucide-react';
import { PageLoader } from '../../components/common/Loader';
import { formatISTDateTime as formatDateTime } from '../../utils/date';

export const ContestList = () => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active'); // 'active', 'upcoming', 'past'

  useEffect(() => {
    fetchContests(true);
    // Lightweight polling every 5 seconds for live status transitions
    const interval = setInterval(() => {
      fetchContests(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchContests = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const res = await api.get('/contests');
      if (res.data.success) {
        setContests(res.data.contests || []);
      }
    } catch (err) {
      console.error('Failed to load contests:', err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const activeContests = contests.filter((c) => c.status === 'Active');
  const upcomingContests = contests.filter((c) => c.status === 'Upcoming');
  const pastContests = contests.filter((c) => c.status === 'Past' || c.status === 'Ended');

  const getDisplayList = () => {
    if (tab === 'active') return activeContests;
    if (tab === 'upcoming') return upcomingContests;
    return pastContests;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Coding Contests & Hackathons
          </h1>
          <p className="text-sm text-[#667085] dark:text-[#94A3B8] mt-1">
            Compete with fellow college students in timed assessments
          </p>
        </div>
      </div>

      {/* Contest Category Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-[#D9E0E8] dark:border-[#30363D] pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setTab('active')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition whitespace-nowrap flex-shrink-0 ${
            tab === 'active'
              ? 'bg-[#22B573]/15 text-[#22B573] border border-[#22B573]/30 shadow-sm'
              : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC] hover:bg-[#F5F7FA] dark:hover:bg-[#20252C]'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Active Contests ({activeContests.length})</span>
        </button>

        <button
          onClick={() => setTab('upcoming')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition whitespace-nowrap flex-shrink-0 ${
            tab === 'upcoming'
              ? 'bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] border border-[#0757B8]/20 dark:border-[#0066CC]/40 shadow-sm'
              : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC] hover:bg-[#F5F7FA] dark:hover:bg-[#20252C]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Upcoming ({upcomingContests.length})</span>
        </button>

        <button
          onClick={() => setTab('past')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition whitespace-nowrap flex-shrink-0 ${
            tab === 'past'
              ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 shadow-sm'
              : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC] hover:bg-[#F5F7FA] dark:hover:bg-[#20252C]'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Past Contests ({pastContests.length})</span>
        </button>
      </div>

      {/* Contests Grid */}
      {loading ? (
        <PageLoader text="Loading college contests..." />
      ) : getDisplayList().length === 0 ? (
        <div className="p-12 text-center text-[#667085] dark:text-[#94A3B8] rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C]">
          No {tab} contests found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {getDisplayList().map((c) => (
            <div
              key={c.id}
              className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] hover:border-[#0757B8]/40 dark:hover:border-[#0066CC]/40 transition flex flex-col justify-between space-y-5 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      c.status === 'Active'
                        ? 'bg-[#22B573]/15 text-[#22B573] border border-[#22B573]/30'
                        : c.status === 'Upcoming'
                        ? 'bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] border border-[#0757B8]/20 dark:border-[#0066CC]/40'
                        : 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                    }`}>
                      {c.status}
                    </span>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      (c.contestType === 'BOTH' || c.contest_type === 'BOTH' || (c.problems_count > 0 && c.mcqs_count > 0))
                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                        : (c.contestType === 'CODING' || c.contest_type === 'CODING' || (c.problems_count > 0 && !c.mcqs_count))
                          ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                          : 'bg-purple-500/15 text-purple-600 border border-purple-500/30'
                    }`}>
                      {(c.contestType === 'BOTH' || c.contest_type === 'BOTH' || (c.problems_count > 0 && c.mcqs_count > 0))
                        ? 'Coding + MCQ'
                        : (c.contestType === 'CODING' || c.contest_type === 'CODING' || (c.problems_count > 0 && !c.mcqs_count))
                          ? 'Coding'
                          : 'MCQ'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-[#667085] dark:text-[#94A3B8] font-mono">
                    <Users className="w-3.5 h-3.5" />
                    <span>{c.participants_count} joined</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-[#172033] dark:text-[#F8FAFC] mb-2">{c.title}</h3>
                <p className="text-xs text-[#667085] dark:text-[#94A3B8] leading-relaxed line-clamp-2 mb-4 font-sans">
                  {c.description}
                </p>

                {/* Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 px-3.5 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-xs">
                  <div>
                    <div className="text-[#667085] dark:text-[#94A3B8] text-[10px] uppercase font-bold">Coding</div>
                    <div className="font-bold text-[#172033] dark:text-[#F8FAFC] font-mono flex items-center gap-1 mt-0.5">
                      <Code2 className="w-3.5 h-3.5 text-[#0757B8] dark:text-[#60A5FA]" />
                      {c.problems_count} Problems
                    </div>
                    {c.marks_per_coding_problem != null && (
                      <div className="text-[10px] text-[#0757B8]/80 dark:text-[#60A5FA]/80 font-mono mt-0.5">
                        {c.marks_per_coding_problem} pts/prob
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[#667085] dark:text-[#94A3B8] text-[10px] uppercase font-bold">MCQs</div>
                    <div className="font-bold text-[#172033] dark:text-[#F8FAFC] font-mono flex items-center gap-1 mt-0.5">
                      <HelpCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      {c.mcqs_per_student != null ? `${c.mcqs_per_student} Qs` : `${c.mcqs_count || 0} Qs`}
                    </div>
                    {c.marks_per_mcq != null && (
                      <div className="text-[10px] text-purple-600/80 dark:text-purple-400/80 font-mono mt-0.5">
                        {c.marks_per_mcq} pts/MCQ
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[#667085] dark:text-[#94A3B8] text-[10px] uppercase font-bold">Duration</div>
                    <div className="font-bold text-[#172033] dark:text-[#F8FAFC] font-mono flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-[#F2B705]" />
                      {c.duration_minutes} Mins
                    </div>
                  </div>
                  <div>
                    <div className="text-[#667085] dark:text-[#94A3B8] text-[10px] uppercase font-bold">Total Marks</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                      <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {c.total_points != null ? `${c.total_points} Pts` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#D9E0E8] dark:border-[#30363D]">
                <div className="text-[11px] text-[#667085] dark:text-[#94A3B8] font-medium flex items-center gap-1.5 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-[#0757B8] dark:text-[#60A5FA]" />
                  <span>
                    {c.status === 'Active' ? 'Ends: ' : c.status === 'Past' || c.status === 'Ended' ? 'Ended: ' : 'Starts: '}
                    <strong className="text-[#172033] dark:text-[#F8FAFC] font-semibold">
                      {formatDateTime(c.status === 'Active' || c.status === 'Past' || c.status === 'Ended' ? (c.end_time || c.start_time) : c.start_time)}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {(c.status === 'Past' || c.status === 'Ended' || c.has_joined) && (
                    <Link
                      to={`/contests/${c.id}/result`}
                      className="px-3.5 py-2 rounded-xl bg-purple-600/10 hover:bg-purple-600 text-purple-600 dark:text-purple-400 hover:text-white text-xs font-bold border border-purple-500/20 transition shadow-sm"
                    >
                      My Result
                    </Link>
                  )}

                  <Link
                    to={`/contests/${c.id}/leaderboard`}
                    className="px-3.5 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] hover:bg-[#DDF2FF] dark:hover:bg-[#142A43] text-[#172033] dark:text-[#F8FAFC] hover:text-[#0757B8] dark:hover:text-[#60A5FA] text-xs font-bold border border-[#D9E0E8] dark:border-[#30363D] transition shadow-sm"
                  >
                    Rankings
                  </Link>

                  <Link
                    to={`/contests/${c.id}`}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      c.status === 'Active'
                        ? 'bg-[#22B573] hover:opacity-95 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white shadow-md shadow-blue-500/20'
                    }`}
                  >
                    <span>{c.status === 'Active' ? 'Enter Arena' : 'Contest Info'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
