import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Award, 
  Trophy, 
  Crown, 
  Medal, 
  ChevronLeft, 
  Search, 
  Filter, 
  RotateCcw, 
  Flame, 
  Target, 
  CheckCircle2, 
  Code2, 
  Sparkles, 
  Layers, 
  Users, 
  TrendingUp, 
  Check 
} from 'lucide-react';
import { PageLoader } from '../../components/common/Loader';

const DEPARTMENTS = [
  'All',
  'Computer Science & Engineering',
  'Information Technology',
  'Artificial Intelligence & Data Science',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Cyber Security',
  'Food Technology',
  'Agriculture Engineering',
  'Aeronautical Engineering'
];

const COLLEGE_YEARS = ['All', '1st Year', '2nd Year', '3rd Year', '4th Year'];

const TIME_PERIODS = [
  { value: 'all_time', label: 'All Time' },
  { value: 'this_year', label: 'This Year' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_week', label: 'This Week' }
];

export const LeaderboardPage = () => {
  const { id: contestId } = useParams();
  const { user } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState(contestId ? 'contest' : 'practice'); // 'practice' | 'contest'

  // Practice Leaderboard States
  const [leaderboard, setLeaderboard] = useState([]);
  const [topThree, setTopThree] = useState([]);
  const [currentStudentStats, setCurrentStudentStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [timePeriod, setTimePeriod] = useState('all_time');
  const [deptFilter, setDeptFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Contest Leaderboard States (for contest tab)
  const [contestsList, setContestsList] = useState([]);
  const [selectedContestId, setSelectedContestId] = useState(contestId || '');
  const [contestLeaderboard, setContestLeaderboard] = useState([]);
  const [contestTitle, setContestTitle] = useState('');

  useEffect(() => {
    if (activeTab === 'practice') {
      fetchPracticeLeaderboard();
    } else {
      fetchContestData();
    }
  }, [activeTab, timePeriod, deptFilter, yearFilter, difficultyFilter, selectedContestId]);

  const fetchPracticeLeaderboard = async () => {
    try {
      setLoading(true);
      const params = {
        time_period: timePeriod,
        department: deptFilter !== 'All' ? deptFilter : undefined,
        year: yearFilter !== 'All' ? yearFilter : undefined,
        difficulty: difficultyFilter !== 'all' ? difficultyFilter : undefined,
        search: search.trim() || undefined
      };

      const res = await api.get('/problems/leaderboard', { params });
      if (res.data.success) {
        setLeaderboard(res.data.leaderboard || []);
        setTopThree(res.data.top_three || []);
        setCurrentStudentStats(res.data.current_student_stats);
      }
    } catch (err) {
      console.error('Failed to load practice leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContestData = async () => {
    try {
      setLoading(true);
      // Fetch contests list if needed
      if (contestsList.length === 0) {
        const cListRes = await api.get('/contests');
        if (cListRes.data.success && cListRes.data.contests?.length > 0) {
          setContestsList(cListRes.data.contests);
          if (!selectedContestId) {
            setSelectedContestId(cListRes.data.contests[0].id);
          }
        }
      }

      const targetContestId = selectedContestId || contestId;
      if (targetContestId) {
        const [lbRes, cRes] = await Promise.all([
          api.get(`/contests/${targetContestId}/leaderboard`),
          api.get(`/contests/${targetContestId}`)
        ]);
        if (lbRes.data.success) {
          setContestLeaderboard(lbRes.data.leaderboard || []);
        }
        if (cRes.data.success) {
          setContestTitle(cRes.data.contest.title);
        }
      }
    } catch (err) {
      console.error('Failed to load contest leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (activeTab === 'practice') {
      fetchPracticeLeaderboard();
    }
  };

  const handleResetFilters = () => {
    setTimePeriod('all_time');
    setDeptFilter('All');
    setYearFilter('All');
    setDifficultyFilter('all');
    setSearch('');
    setTimeout(() => {
      fetchPracticeLeaderboard();
    }, 50);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {contestId && (
            <Link
              to="/contests"
              className="p-2.5 rounded-2xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] text-[#667085] hover:text-[#172033] dark:hover:text-[#F8FAFC] shadow-sm transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
              <Award className="w-6 h-6 text-[#F2B705]" />
              {activeTab === 'practice' ? 'Coding Problems Leaderboard' : 'Contest Leaderboard'}
            </h1>
            <p className="text-sm text-[#667085] dark:text-[#94A3B8] mt-1">
              {activeTab === 'practice' 
                ? 'Practice coding challenge rankings based on difficulty points, accuracy, and daily streaks'
                : 'Contest arena attempt rankings and final scores'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex p-1 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl shadow-sm self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('practice')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'practice'
                ? 'bg-[#0757B8] dark:bg-[#0066CC] text-white shadow-md shadow-blue-500/20'
                : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Practice Problems</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contest')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'contest'
                ? 'bg-[#F2B705] text-[#172033] shadow-md shadow-amber-500/20'
                : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Contests</span>
          </button>
        </div>
      </div>

      {activeTab === 'practice' ? (
        <>
          {/* STUDENT'S OWN PERSONAL STATS BANNER */}
          {currentStudentStats && (
            <div className="p-5 rounded-3xl bg-gradient-to-r from-[#0757B8]/10 via-[#0757B8]/5 to-transparent dark:from-[#0066CC]/20 dark:via-[#142A43]/40 dark:to-transparent border border-[#0757B8]/30 dark:border-[#0066CC]/40 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#0757B8] text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-blue-600/20">
                    {currentStudentStats.rank !== '-' ? `#${currentStudentStats.rank}` : '👤'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-[#172033] dark:text-[#F8FAFC]">
                        {currentStudentStats.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#0757B8]/15 text-[#0757B8] dark:text-[#60A5FA] text-[10px] font-bold">
                        You
                      </span>
                    </div>
                    <div className="text-xs text-[#667085] dark:text-[#94A3B8] font-mono mt-0.5">
                      ID: <strong>{currentStudentStats.student_id}</strong> • {currentStudentStats.department} • {currentStudentStats.year}
                    </div>
                  </div>
                </div>

                {/* Stat Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  {/* Total Points */}
                  <div className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] shadow-sm text-center">
                    <div className="text-[10px] uppercase font-bold text-[#667085] dark:text-[#94A3B8]">Total Points</div>
                    <div className="text-lg font-extrabold text-[#0757B8] dark:text-[#60A5FA] mt-0.5">
                      {currentStudentStats.points} <span className="text-[10px] font-normal">pts</span>
                    </div>
                  </div>

                  {/* Problems Solved */}
                  <div className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] shadow-sm text-center">
                    <div className="text-[10px] uppercase font-bold text-[#667085] dark:text-[#94A3B8]">Problems Solved</div>
                    <div className="text-lg font-extrabold text-[#22B573] mt-0.5">
                      {currentStudentStats.problems_solved}
                    </div>
                    <div className="flex items-center justify-center gap-1 text-[9px] text-[#667085] dark:text-[#94A3B8] mt-0.5">
                      <span className="text-emerald-500">{currentStudentStats.easy_solved}E</span> • 
                      <span className="text-amber-500">{currentStudentStats.medium_solved}M</span> • 
                      <span className="text-rose-500">{currentStudentStats.hard_solved}H</span>
                    </div>
                  </div>

                  {/* Accuracy */}
                  <div className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] shadow-sm text-center">
                    <div className="text-[10px] uppercase font-bold text-[#667085] dark:text-[#94A3B8]">Accuracy</div>
                    <div className="text-lg font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">
                      {currentStudentStats.accuracy}%
                    </div>
                    <div className="text-[9px] text-[#667085] dark:text-[#94A3B8]">
                      {currentStudentStats.accepted_submissions}/{currentStudentStats.total_submissions} Accepted
                    </div>
                  </div>

                  {/* Daily Streak */}
                  <div className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] shadow-sm text-center">
                    <div className="text-[10px] uppercase font-bold text-orange-500 flex items-center justify-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 animate-pulse" />
                      <span>Streak</span>
                    </div>
                    <div className="text-lg font-extrabold text-orange-500 mt-0.5">
                      {currentStudentStats.streak} <span className="text-[10px] font-normal">Days</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TOP 3 PODIUM CARDS */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Rank 2 (Silver) */}
              {topThree[1] && (
                <div className="order-2 md:order-1 p-5 rounded-3xl border border-slate-300 dark:border-slate-700 bg-gradient-to-b from-slate-100/80 to-[#FFFFFF] dark:from-slate-800/40 dark:to-[#20252C] shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-sm flex items-center justify-center shadow-sm">
                      🥈 2
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold">
                      2nd Place
                    </span>
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-[#172033] dark:text-[#F8FAFC]">
                      {topThree[1].name}
                    </div>
                    <div className="text-xs text-[#667085] dark:text-[#94A3B8] font-mono mt-0.5">
                      {topThree[1].student_id} • {topThree[1].department}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 text-xs font-mono">
                    <div>
                      <span className="text-[#667085] block text-[10px] uppercase">Points</span>
                      <span className="font-extrabold text-base text-[#172033] dark:text-[#F8FAFC]">{topThree[1].points}</span>
                    </div>
                    <div>
                      <span className="text-[#667085] block text-[10px] uppercase">Solved</span>
                      <span className="font-bold text-[#22B573]">{topThree[1].problems_solved}</span>
                    </div>
                    <div>
                      <span className="text-[#667085] block text-[10px] uppercase">Streak</span>
                      <span className="font-bold text-orange-500 flex items-center gap-1">
                        <Flame className="w-3 h-3 fill-orange-500" /> {topThree[1].streak}d
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Rank 1 (Gold - Centerpiece) */}
              {topThree[0] && (
                <div className="order-1 md:order-2 p-6 rounded-3xl border-2 border-[#F2B705]/50 bg-gradient-to-b from-[#F2B705]/15 via-[#F2B705]/5 to-[#FFFFFF] dark:from-[#F2B705]/20 dark:via-[#F2B705]/5 dark:to-[#20252C] shadow-lg shadow-amber-500/10 flex flex-col justify-between transform md:-translate-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-10 h-10 rounded-2xl bg-[#F2B705] text-[#172033] font-extrabold text-base flex items-center justify-center shadow-md shadow-amber-500/20">
                      🥇 1
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#F2B705]/20 text-amber-800 dark:text-[#F2B705] text-xs font-extrabold flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-600" /> Champion
                    </span>
                  </div>
                  <div>
                    <div className="text-lg font-extrabold text-[#172033] dark:text-[#F8FAFC]">
                      {topThree[0].name}
                    </div>
                    <div className="text-xs text-[#667085] dark:text-[#94A3B8] font-mono mt-0.5">
                      {topThree[0].student_id} • {topThree[0].department}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#F2B705]/20 text-xs font-mono">
                    <div>
                      <span className="text-[#667085] block text-[10px] uppercase">Points</span>
                      <span className="font-extrabold text-xl text-[#0757B8] dark:text-[#60A5FA]">{topThree[0].points}</span>
                    </div>
                    <div>
                      <span className="text-[#667085] block text-[10px] uppercase">Solved</span>
                      <span className="font-extrabold text-base text-[#22B573]">{topThree[0].problems_solved}</span>
                    </div>
                    <div>
                      <span className="text-[#667085] block text-[10px] uppercase">Accuracy</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">{topThree[0].accuracy}%</span>
                    </div>
                    <div>
                      <span className="text-[#667085] block text-[10px] uppercase">Streak</span>
                      <span className="font-bold text-orange-500 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 fill-orange-500" /> {topThree[0].streak}d
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Rank 3 (Bronze) */}
              {topThree[2] && (
                <div className="order-3 md:order-3 p-5 rounded-3xl border border-amber-600/30 bg-gradient-to-b from-amber-700/10 to-[#FFFFFF] dark:from-amber-800/20 dark:to-[#20252C] shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-8 h-8 rounded-xl bg-amber-700/20 text-amber-700 dark:text-amber-500 font-extrabold text-sm flex items-center justify-center shadow-sm">
                      🥉 3
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-amber-700/15 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                      3rd Place
                    </span>
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-[#172033] dark:text-[#F8FAFC]">
                      {topThree[2].name}
                    </div>
                    <div className="text-xs text-[#667085] dark:text-[#94A3B8] font-mono mt-0.5">
                      {topThree[2].student_id} • {topThree[2].department}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-amber-600/20 text-xs font-mono">
                    <div>
                      <span className="text-[#667085] block text-[10px] uppercase">Points</span>
                      <span className="font-extrabold text-base text-[#172033] dark:text-[#F8FAFC]">{topThree[2].points}</span>
                    </div>
                    <div>
                      <span className="text-[#667085] block text-[10px] uppercase">Solved</span>
                      <span className="font-bold text-[#22B573]">{topThree[2].problems_solved}</span>
                    </div>
                    <div>
                      <span className="text-[#667085] block text-[10px] uppercase">Streak</span>
                      <span className="font-bold text-orange-500 flex items-center gap-1">
                        <Flame className="w-3 h-3 fill-orange-500" /> {topThree[2].streak}d
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FILTER TOOLBAR */}
          <div className="p-5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm space-y-4">
            {/* Time Period Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-xs">
                {TIME_PERIODS.map(tp => (
                  <button
                    key={tp.value}
                    type="button"
                    onClick={() => setTimePeriod(tp.value)}
                    className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                      timePeriod === tp.value
                        ? 'bg-[#0757B8] dark:bg-[#0066CC] text-white shadow-sm'
                        : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
                    }`}
                  >
                    {tp.label}
                  </button>
                ))}
              </div>

              {/* Points Legend */}
              <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-[#667085] dark:text-[#94A3B8]">
                <span className="px-2 py-0.5 rounded-md bg-[#22B573]/15 text-[#22B573] border border-[#22B573]/30">Easy: 10 pts</span>
                <span className="px-2 py-0.5 rounded-md bg-[#F2B705]/15 text-[#F2B705] border border-[#F2B705]/30">Med: 20 pts</span>
                <span className="px-2 py-0.5 rounded-md bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">Hard: 30 pts</span>
              </div>
            </div>

            {/* Dropdown Filters & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
              {/* Department Filter */}
              <div>
                <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wider text-[10px]">
                  Department
                </label>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full py-2.5 px-3 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* College Year Filter */}
              <div>
                <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wider text-[10px]">
                  College Year
                </label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full py-2.5 px-3 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
                >
                  {COLLEGE_YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Difficulty Filter */}
              <div>
                <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wider text-[10px]">
                  Difficulty
                </label>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="w-full py-2.5 px-3 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy (10 pts)</option>
                  <option value="medium">Medium (20 pts)</option>
                  <option value="hard">Hard (30 pts)</option>
                </select>
              </div>

              {/* Search Box */}
              <div>
                <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wider text-[10px]">
                  Search Student
                </label>
                <form onSubmit={handleSearchSubmit} className="relative">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name or Student ID..."
                    className="w-full pl-8 pr-3 py-2 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-xs text-[#172033] dark:text-[#F8FAFC] font-semibold"
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-[#667085]" />
                </form>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D9E0E8] dark:border-[#30363D]">
              <button
                type="button"
                onClick={fetchPracticeLeaderboard}
                className="px-4 py-2 rounded-xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Apply Filters</span>
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3.5 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] hover:bg-slate-200 dark:hover:bg-slate-800 text-[#667085] dark:text-[#94A3B8] font-bold text-xs flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* PRACTICE LEADERBOARD TABLE */}
          <div className="rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-20">
                <PageLoader text="Compiling practice problem scores and recalculating rankings..." />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="py-20 text-center text-[#667085] dark:text-[#94A3B8] text-xs">
                No students found matching the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-[#303442] text-white font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-4 px-3 text-center min-w-[55px]">Rank</th>
                      <th className="py-4 px-3 min-w-[180px]">Student</th>
                      <th className="py-4 px-3 min-w-[100px]">Student ID</th>
                      <th className="py-4 px-3 min-w-[160px]">Department</th>
                      <th className="py-4 px-3 text-center min-w-[80px]">Year</th>
                      <th className="py-4 px-3 text-center min-w-[110px]">Problems Solved</th>
                      <th className="py-4 px-3 text-center min-w-[100px]">Accepted</th>
                      <th className="py-4 px-3 text-center min-w-[80px]">Total</th>
                      <th className="py-4 px-3 text-center min-w-[90px]">Points</th>
                      <th className="py-4 px-3 text-center min-w-[90px]">Accuracy</th>
                      <th className="py-4 px-3 text-center min-w-[85px]">Streak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9E0E8] dark:divide-[#30363D]/60 text-xs">
                    {leaderboard.map((item) => {
                      const isTop1 = item.rank === 1;
                      const isTop2 = item.rank === 2;
                      const isTop3 = item.rank === 3;
                      const isSelf = item.is_current_user;

                      return (
                        <tr
                          key={item.user_id}
                          className={`transition ${
                            isSelf
                              ? 'bg-blue-500/10 dark:bg-blue-500/15 border-l-4 border-l-[#0757B8] dark:border-l-[#60A5FA] font-semibold'
                              : 'hover:bg-[#F5F7FA] dark:hover:bg-[#151A21]/60'
                          }`}
                        >
                          {/* Rank */}
                          <td className="py-3.5 px-3 text-center font-mono font-extrabold text-sm">
                            {isTop1 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#F2B705]/20 text-[#F2B705] border border-[#F2B705]/40 shadow-sm">
                                🥇
                              </span>
                            ) : isTop2 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 border border-slate-300 shadow-sm">
                                🥈
                              </span>
                            ) : isTop3 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-600/20 text-amber-700 dark:text-amber-500 border border-amber-600/40 shadow-sm">
                                🥉
                              </span>
                            ) : (
                              <span className="text-[#667085] dark:text-[#94A3B8]">#{item.rank}</span>
                            )}
                          </td>

                          {/* Student Name */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">
                                {item.name}
                              </span>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded bg-[#0757B8] text-white text-[9px] font-extrabold">
                                  YOU
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Student ID */}
                          <td className="py-3.5 px-3 font-mono font-bold text-[#0757B8] dark:text-[#60A5FA]">
                            {item.student_id}
                          </td>

                          {/* Department */}
                          <td className="py-3.5 px-3 text-[#667085] dark:text-[#94A3B8]">
                            {item.department}
                          </td>

                          {/* Year */}
                          <td className="py-3.5 px-3 text-center text-[#667085] dark:text-[#94A3B8] font-medium">
                            {item.year}
                          </td>

                          {/* Problems Solved */}
                          <td className="py-3.5 px-3 text-center font-mono">
                            <span className="font-extrabold text-[#22B573]">
                              {item.problems_solved}
                            </span>
                            <div className="flex items-center justify-center gap-1 text-[9px] text-[#667085] dark:text-[#94A3B8] mt-0.5">
                              <span className="text-emerald-500">{item.easy_solved}E</span>
                              <span>•</span>
                              <span className="text-amber-500">{item.medium_solved}M</span>
                              <span>•</span>
                              <span className="text-rose-500">{item.hard_solved}H</span>
                            </div>
                          </td>

                          {/* Accepted Submissions */}
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-[#172033] dark:text-[#F8FAFC]">
                            {item.accepted_submissions}
                          </td>

                          {/* Total Submissions */}
                          <td className="py-3.5 px-3 text-center font-mono text-[#667085] dark:text-[#94A3B8]">
                            {item.total_submissions}
                          </td>

                          {/* Points */}
                          <td className="py-3.5 px-3 text-center font-mono">
                            <span className="px-2.5 py-1 rounded-full bg-[#0757B8]/15 dark:bg-[#0066CC]/20 text-[#0757B8] dark:text-[#60A5FA] border border-[#0757B8]/30 font-extrabold text-xs">
                              {item.points} pts
                            </span>
                          </td>

                          {/* Accuracy */}
                          <td className="py-3.5 px-3 text-center font-mono font-bold">
                            <span className={`px-2 py-0.5 rounded-lg text-xs ${
                              item.accuracy >= 75
                                ? 'text-[#22B573] bg-[#22B573]/10'
                                : item.accuracy >= 50
                                  ? 'text-[#F2B705] bg-[#F2B705]/10'
                                  : 'text-[#667085] bg-slate-100 dark:bg-slate-800'
                            }`}>
                              {item.accuracy}%
                            </span>
                          </td>

                          {/* Streak */}
                          <td className="py-3.5 px-3 text-center font-mono font-bold">
                            {item.streak > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-500 border border-orange-500/30 text-[11px]">
                                <Flame className="w-3 h-3 fill-orange-500" />
                                {item.streak}d
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">0</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* CONTEST LEADERBOARD TAB */
        <div className="space-y-4">
          {/* Contest Selector & Personal Result Link */}
          <div className="p-5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="w-full sm:max-w-md">
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1.5 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#F2B705]" />
                <span>Select Contest</span>
              </label>
              <select
                value={selectedContestId}
                onChange={(e) => setSelectedContestId(e.target.value)}
                className="w-full py-2.5 px-3.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#0757B8] dark:text-[#60A5FA] font-bold text-xs"
              >
                {contestsList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.duration_minutes}m)
                  </option>
                ))}
              </select>
            </div>

            {selectedContestId && (
              <Link
                to={`/contests/${selectedContestId}/result`}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center gap-1.5 self-start sm:self-end transition"
              >
                <Award className="w-4 h-4" />
                <span>View My Performance Result</span>
              </Link>
            )}
          </div>

          <div className="rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-20">
                <PageLoader text="Loading contest standings..." />
              </div>
            ) : contestLeaderboard.length === 0 ? (
              <div className="py-20 text-center text-[#667085] dark:text-[#94A3B8] text-xs">
                No participant records found for this contest.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-[#303442] text-white font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-4 px-3 text-center min-w-[60px]">Rank</th>
                      <th className="py-4 px-3 min-w-[200px]">Student Name</th>
                      <th className="py-4 px-3 min-w-[120px]">Student ID</th>
                      <th className="py-4 px-3 min-w-[160px]">Department</th>
                      <th className="py-4 px-3 text-center min-w-[110px]">Problems Solved</th>
                      <th className="py-4 px-3 text-center min-w-[90px]">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9E0E8] dark:divide-[#30363D]/60 text-xs">
                    {contestLeaderboard.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#F5F7FA] dark:hover:bg-[#151A21]/60 transition">
                        <td className="py-3.5 px-3 text-center font-mono font-extrabold text-sm">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </td>
                        <td className="py-3.5 px-3 font-bold text-[#172033] dark:text-[#F8FAFC]">
                          {item.student_name || item.name}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[#0757B8] dark:text-[#60A5FA]">
                          {item.student_id}
                        </td>
                        <td className="py-3.5 px-3 text-[#667085] dark:text-[#94A3B8]">
                          {item.department || 'CSE'}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-[#22B573]">
                          {item.problems_solved || 0}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-extrabold text-[#0757B8] dark:text-[#60A5FA]">
                          {item.score || item.total_score || 0} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
