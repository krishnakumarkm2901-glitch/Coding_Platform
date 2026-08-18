import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Code2, 
  Trophy, 
  Flame, 
  CheckCircle2, 
  ArrowRight, 
  Clock, 
  HelpCircle, 
  Play, 
  BarChart2, 
  Sparkles,
  Calendar
} from 'lucide-react';
import { DifficultyBadge, StatusBadge } from '../../components/common/Badge';
import { PageLoader } from '../../components/common/Loader';
import { formatISTDateTime as formatDateTime } from '../../utils/date';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/students/profile');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoader text="Loading your coding profile..." />;
  }

  const stats = data?.stats || {};
  const student = data?.student || user;
  const recentSubmissions = data?.recent_submissions || [];
  const recentContests = data?.recent_contests || [];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-[#0757B8] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] shadow-sm text-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white dark:text-[#60A5FA] text-xs font-semibold border border-white/20 dark:border-[#0066CC]/40 mb-3 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>NIT_Campus_Coder Platform</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="text-[#DDF2FF] dark:text-[#60A5FA]">{student?.name}</span>!
            </h1>
            <p className="text-xs sm:text-sm text-white/80 dark:text-[#94A3B8] mt-1.5 flex flex-wrap items-center gap-3">
              <span>Student ID: <strong className="font-mono text-white dark:text-[#F8FAFC]">{student?.student_id}</strong></span>
              <span>&bull;</span>
              <span>{student?.department} ({student?.year})</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              to="/problems"
              className="px-5 py-2.5 rounded-2xl bg-white dark:bg-[#0066CC] hover:bg-slate-100 dark:hover:opacity-95 text-[#0757B8] dark:text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Practice Problems</span>
            </Link>
            <Link
              to="/contests"
              className="px-4 py-2.5 rounded-2xl bg-white/15 dark:bg-[#20252C] hover:bg-white/25 dark:hover:bg-[#142A43] text-white text-xs font-semibold border border-white/20 dark:border-[#30363D] transition text-center"
            >
              View Contests
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Problems */}
        <div className="p-5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#667085] dark:text-[#94A3B8] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Problems</span>
            <Code2 className="w-4 h-4 text-[#0757B8] dark:text-[#60A5FA]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#172033] dark:text-[#F8FAFC] font-mono">
            {stats.total_problems || 0}
          </div>
          <div className="text-[11px] text-[#667085] dark:text-[#94A3B8] mt-1">Available to solve</div>
        </div>

        {/* Solved Problems */}
        <div className="p-5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] hover:border-[#22B573]/50 transition flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#22B573] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Solved</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#22B573] font-mono">
            {stats.solved_problems || 0}
          </div>
          <div className="text-[11px] text-[#667085] dark:text-[#94A3B8] mt-1">
            {stats.total_problems ? Math.round(((stats.solved_problems || 0) / stats.total_problems) * 100) : 0}% completion
          </div>
        </div>

        {/* Current Streak */}
        <div className="p-5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] hover:border-[#F2B705]/50 transition flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[#F2B705] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Daily Streak</span>
            <Flame className="w-4 h-4 fill-[#F2B705]/20" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#F2B705] font-mono flex items-baseline gap-1">
            {stats.current_streak || 0} <span className="text-xs font-normal text-[#667085] dark:text-[#94A3B8]">days</span>
          </div>
          <div className="text-[11px] text-[#667085] dark:text-[#94A3B8] mt-1">Keep it rolling!</div>
        </div>

        {/* Contests Participated */}
        <div className="p-5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] hover:border-purple-500/40 transition flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Contests</span>
            <Trophy className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400 font-mono">
            {stats.joined_contests || 0}
          </div>
          <div className="text-[11px] text-[#667085] dark:text-[#94A3B8] mt-1">{stats.total_contests || 0} hosted</div>
        </div>

        {/* Contest Score */}
        <div className="p-5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] hover:border-[#0757B8]/40 transition flex flex-col justify-between shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[#0757B8] dark:text-[#60A5FA] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Score</span>
            <BarChart2 className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0757B8] dark:text-[#60A5FA] font-mono">
            {stats.contest_score || 0}
          </div>
          <div className="text-[11px] text-[#667085] dark:text-[#94A3B8] mt-1">Platform Rating</div>
        </div>
      </div>

      {/* Middle Section: Solved Breakdown & Active Contests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Difficulty Breakdown Card */}
        <div className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC] flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#0757B8] dark:text-[#60A5FA]" />
                Problem Breakdown
              </h2>
              <span className="text-xs text-[#667085] dark:text-[#94A3B8] font-mono">
                {stats.solved_problems || 0} / {stats.total_problems || 0}
              </span>
            </div>

            {/* Easy Progress */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-[#22B573]">Easy</span>
                  <span className="text-[#667085] dark:text-[#94A3B8] font-mono">{stats.easy?.solved || 0} / {stats.easy?.total || 0}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#F5F7FA] dark:bg-[#151A21] overflow-hidden">
                  <div 
                    className="h-full bg-[#22B573] rounded-full transition-all duration-500"
                    style={{ width: `${stats.easy?.total ? (stats.easy.solved / stats.easy.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Medium Progress */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-[#F2B705]">Medium</span>
                  <span className="text-[#667085] dark:text-[#94A3B8] font-mono">{stats.medium?.solved || 0} / {stats.medium?.total || 0}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#F5F7FA] dark:bg-[#151A21] overflow-hidden">
                  <div 
                    className="h-full bg-[#F2B705] rounded-full transition-all duration-500"
                    style={{ width: `${stats.medium?.total ? (stats.medium.solved / stats.medium.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Hard Progress */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-[#EF4444]">Hard</span>
                  <span className="text-[#667085] dark:text-[#94A3B8] font-mono">{stats.hard?.solved || 0} / {stats.hard?.total || 0}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#F5F7FA] dark:bg-[#151A21] overflow-hidden">
                  <div 
                    className="h-full bg-[#EF4444] rounded-full transition-all duration-500"
                    style={{ width: `${stats.hard?.total ? (stats.hard.solved / stats.hard.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#D9E0E8] dark:border-[#30363D]">
            <Link
              to="/mcqs"
              className="flex items-center justify-between p-3 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] hover:bg-[#DDF2FF] dark:hover:bg-[#142A43] text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] transition"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#0757B8] dark:text-[#60A5FA]" />
                <span>Test your CS Knowledge with MCQs</span>
              </div>
              <ArrowRight className="w-4 h-4 text-[#667085] dark:text-[#94A3B8]" />
            </Link>
          </div>
        </div>

        {/* Contests Spotlight */}
        <div className="lg:col-span-2 p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Featured Contests
            </h2>
            <Link to="/contests" className="text-xs font-semibold text-[#0757B8] dark:text-[#60A5FA] hover:underline">
              View all &rarr;
            </Link>
          </div>

          {recentContests.length === 0 ? (
            <div className="py-12 text-center text-[#667085] dark:text-[#94A3B8] text-xs">
              No contests scheduled currently.
            </div>
          ) : (
            <div className="space-y-3">
              {recentContests.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#0757B8]/40 dark:hover:border-[#0066CC]/40 transition"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        c.status === 'Active'
                          ? 'bg-[#22B573]/15 text-[#22B573] border border-[#22B573]/30'
                          : c.status === 'Upcoming'
                          ? 'bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] border border-[#0757B8]/20'
                          : 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                      }`}>
                        {c.status || 'Upcoming'}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-[#172033] dark:text-[#F8FAFC]">{c.title}</h3>
                    </div>
                    <p className="text-xs text-[#667085] dark:text-[#94A3B8] line-clamp-1">{c.description}</p>
                    <div className="flex items-center gap-4 text-[11px] text-[#667085] dark:text-[#94A3B8] mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {c.duration_minutes} mins
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-[#0757B8] dark:text-[#60A5FA]" />
                        {formatDateTime(c.start_time)}
                      </span>
                    </div>
                  </div>

                  <Link
                    to={`/contests/${c.id}`}
                    className={`px-4 py-2 rounded-xl text-xs font-bold text-center whitespace-nowrap transition ${
                      c.status === 'Active'
                        ? 'bg-[#22B573] hover:opacity-95 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA]'
                    }`}
                  >
                    {c.status === 'Active' ? 'Enter Arena' : 'View Details'}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Submissions Section */}
      <div className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0757B8] dark:text-[#60A5FA]" />
            Recent Submissions
          </h2>
          <Link to="/submissions" className="text-xs font-semibold text-[#0757B8] dark:text-[#60A5FA] hover:underline">
            View full history &rarr;
          </Link>
        </div>

        {recentSubmissions.length === 0 ? (
          <div className="py-10 text-center text-[#667085] dark:text-[#94A3B8] text-xs">
            You haven't submitted any code yet. Start solving problems!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Problem</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Language</th>
                  <th className="py-3 px-4">Runtime</th>
                  <th className="py-3 px-4 text-right">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E0E8] dark:divide-[#30363D]/60 font-mono">
                {recentSubmissions.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F5F7FA] dark:hover:bg-[#151A21]/60 transition">
                    <td className="py-3 px-4 font-sans font-semibold text-[#172033] dark:text-[#F8FAFC]">
                      <Link to={`/problems/${s.problem_id}`} className="hover:text-[#0757B8] dark:hover:text-[#60A5FA] transition">
                        {s.problem_title}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="py-3 px-4 text-[#667085] dark:text-[#94A3B8] uppercase font-sans font-bold text-[11px]">
                      {s.language}
                    </td>
                    <td className="py-3 px-4 text-[#667085] dark:text-[#94A3B8]">
                      {s.runtime} ms
                    </td>
                    <td className="py-3 px-4 text-right text-[#667085] dark:text-[#94A3B8] font-sans">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
