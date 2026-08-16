import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  Users, 
  FileCode, 
  CheckSquare, 
  Trophy, 
  History, 
  Zap, 
  ShieldCheck, 
  BarChart3,
  TrendingUp,
  PieChart,
  Activity,
  Award,
  Layers,
  Code2
} from 'lucide-react';
import { PageLoader } from '../../components/common/Loader';

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState(null);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/stats');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoader text="Loading college platform analytics & intelligence..." />;
  }

  const stats = data?.stats || {};
  const analytics = data?.analytics || {};
  const activityTrend = analytics?.activity_trend || [];
  const verdicts = analytics?.verdicts || [];
  const languages = analytics?.languages || [];
  const departments = analytics?.departments || [];
  const difficulty = analytics?.difficulty || [];
  const topics = analytics?.topics || [];

  const maxSubInTrend = Math.max(...activityTrend.map(d => d.submissions), 1);
  const totalVerdicts = verdicts.reduce((acc, curr) => acc + curr.count, 0) || 0;
  const totalLangs = languages.reduce((acc, curr) => acc + curr.count, 0) || 0;
  const totalDepts = departments.reduce((acc, curr) => acc + curr.students, 0) || 0;
  const totalDiff = difficulty.reduce((acc, curr) => acc + curr.count, 0) || 0;

  // Dynamic Top Metrics
  const topLang = languages.reduce((max, l) => (l.count > (max?.count || 0) ? l : max), languages[0] || null);
  const topLangPct = totalLangs > 0 && topLang ? ((topLang.count / totalLangs) * 100).toFixed(1) : '0.0';

  const peakDay = activityTrend.reduce((max, d) => (d.submissions > (max?.submissions || 0) ? d : max), activityTrend[0] || null);
  const acceptedVerdicts = verdicts.find(v => v.name === 'Accepted')?.count || 0;
  const successRatePct = totalVerdicts > 0 ? ((acceptedVerdicts / totalVerdicts) * 100).toFixed(1) : '0.0';

  const topDept = departments.reduce((max, d) => (d.students > (max?.students || 0) ? d : max), departments[0] || null);

  // Donut chart calculation
  let cumulativeAngle = 0;
  const effectiveTotalVerdicts = totalVerdicts || 1;
  const donutSegments = verdicts.map((v) => {
    const percentage = totalVerdicts > 0 ? (v.count / totalVerdicts) * 100 : 0;
    const strokeDasharray = `${percentage} ${100 - percentage}`;
    const strokeDashoffset = -cumulativeAngle;
    cumulativeAngle += percentage;
    return {
      ...v,
      percentage: percentage.toFixed(1),
      strokeDasharray,
      strokeDashoffset
    };
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-[#0757B8] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] shadow-sm text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white dark:text-[#60A5FA] text-xs font-semibold border border-white/20 dark:border-[#0066CC]/40 mb-3 backdrop-blur-sm">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Platform Intelligence & Performance Graphs</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              NIT_Campus_Coder Analytics
            </h1>
            <p className="text-sm text-white/80 dark:text-[#94A3B8] mt-1 font-sans">
              Comprehensive analytics, submission trends, language distribution, and student participation metrics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/contests"
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#0066CC] hover:bg-slate-100 dark:hover:opacity-95 text-[#0757B8] dark:text-white font-bold text-xs shadow-md flex items-center gap-2 transition"
            >
              <Trophy className="w-4 h-4" />
              <span>Create Contest</span>
            </Link>
            <Link
              to="/admin/problems"
              className="px-4 py-2.5 rounded-2xl bg-white/15 dark:bg-[#20252C] hover:bg-white/25 dark:hover:bg-[#142A43] text-white text-xs font-bold border border-white/20 dark:border-[#30363D] transition"
            >
              Add Problem
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Students */}
        <Link to="/admin/students" className="p-5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] hover:border-[#0757B8]/40 transition shadow-sm">
          <div className="flex items-center justify-between text-[#667085] dark:text-[#94A3B8] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Students</span>
            <Users className="w-4 h-4 text-[#0757B8] dark:text-[#60A5FA]" />
          </div>
          <div className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC] font-mono">{stats.total_students || 0}</div>
          <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] mt-1">Registered users</div>
        </Link>

        {/* Total Problems */}
        <Link to="/admin/problems" className="p-5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] hover:border-[#22B573]/40 transition shadow-sm">
          <div className="flex items-center justify-between text-[#22B573] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Problems</span>
            <FileCode className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-[#22B573] font-mono">{stats.total_problems || 0}</div>
          <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] mt-1">Active challenges</div>
        </Link>

        {/* Total MCQs */}
        <Link to="/admin/mcqs" className="p-5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] hover:border-purple-500/40 transition shadow-sm">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">MCQs</span>
            <CheckSquare className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 font-mono">{stats.total_mcqs || 0}</div>
          <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] mt-1">CS Questions</div>
        </Link>

        {/* Total Contests */}
        <Link to="/admin/contests" className="p-5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] hover:border-[#F2B705]/40 transition shadow-sm">
          <div className="flex items-center justify-between text-[#F2B705] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Contests</span>
            <Trophy className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-[#F2B705] font-mono">{stats.total_contests || 0}</div>
          <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] mt-1">Events scheduled</div>
        </Link>

        {/* Active Contests */}
        <Link to="/admin/contests" className="p-5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] hover:border-[#22B573]/40 transition shadow-sm">
          <div className="flex items-center justify-between text-[#22B573] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Live Now</span>
            <Zap className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-[#22B573] font-mono">{stats.active_contests || 0}</div>
          <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] mt-1">Ongoing arenas</div>
        </Link>

        {/* Total Submissions */}
        <Link to="/admin/submissions" className="p-5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] hover:border-[#0757B8]/40 transition shadow-sm">
          <div className="flex items-center justify-between text-[#0757B8] dark:text-[#60A5FA] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Submissions</span>
            <History className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-[#0757B8] dark:text-[#60A5FA] font-mono">{stats.total_submissions || 0}</div>
          <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] mt-1">Total evaluated</div>
        </Link>
      </div>

      {/* ANALYTICS SECTION - ROW 1: Activity Bar Graph & Verdicts Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Submissions Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC]">Weekly Code Submissions Volume</h3>
                  <p className="text-xs text-[#667085] dark:text-[#94A3B8]">Evaluation throughput across the last 7 days</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-[#667085] dark:text-[#94A3B8]">
                  <span className="w-3 h-3 rounded bg-[#0757B8] dark:bg-[#0066CC]"></span>
                  <span>Total Submissions</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#667085] dark:text-[#94A3B8]">
                  <span className="w-3 h-3 rounded bg-[#22B573]"></span>
                  <span>Accepted</span>
                </div>
              </div>
            </div>

            {/* Custom Interactive SVG / CSS Chart */}
            <div className="mt-8 h-56 flex items-end justify-between gap-3 sm:gap-6 px-2 border-b border-[#D9E0E8] dark:border-[#30363D] pb-3">
              {activityTrend.map((item, idx) => {
                const totalHeight = Math.max(Math.round((item.submissions / maxSubInTrend) * 100), 8);
                const acceptedHeight = Math.max(Math.round((item.accepted / maxSubInTrend) * 100), 4);
                const isHovered = hoveredDay === idx;

                return (
                  <div 
                    key={idx} 
                    className="flex-1 flex flex-col items-center gap-2 group cursor-pointer relative"
                    onMouseEnter={() => setHoveredDay(idx)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div className="absolute -top-14 bg-[#172033] dark:bg-[#151A21] text-white text-[11px] py-1.5 px-2.5 rounded-xl shadow-xl border border-slate-700 whitespace-nowrap z-20 font-mono">
                        <div>Submissions: <strong>{item.submissions}</strong></div>
                        <div className="text-[#22B573]">Accepted: <strong>{item.accepted}</strong></div>
                      </div>
                    )}

                    {/* Bar columns */}
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-44">
                      {/* Total Bar */}
                      <div 
                        style={{ height: `${totalHeight}%` }} 
                        className={`w-full max-w-[20px] rounded-t-lg bg-[#0757B8] dark:bg-[#0066CC] transition-all duration-300 ${
                          isHovered ? 'opacity-100 scale-y-105' : 'opacity-85'
                        }`}
                      />
                      {/* Accepted Bar */}
                      <div 
                        style={{ height: `${acceptedHeight}%` }} 
                        className={`w-full max-w-[20px] rounded-t-lg bg-[#22B573] transition-all duration-300 ${
                          isHovered ? 'opacity-100 scale-y-105' : 'opacity-85'
                        }`}
                      />
                    </div>

                    <span className={`text-xs font-bold transition ${isHovered ? 'text-[#0757B8] dark:text-[#60A5FA]' : 'text-[#667085] dark:text-[#94A3B8]'}`}>
                      {item.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#667085] dark:text-[#94A3B8] pt-3">
            <span>Peak Activity: <strong className="text-[#172033] dark:text-[#F8FAFC]">{peakDay?.submissions ? `${peakDay.day} (${peakDay.submissions} subs)` : 'No activity yet'}</strong></span>
            <span>Average Success Rate: <strong className="text-[#22B573]">{successRatePct}%</strong></span>
          </div>
        </div>

        {/* Verdicts Distribution Donut Chart */}
        <div className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#22B573]/15 text-[#22B573] flex items-center justify-center">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC]">Evaluation Verdicts</h3>
                <p className="text-xs text-[#667085] dark:text-[#94A3B8]">Breakdown of submission outcomes</p>
              </div>
            </div>

            {/* Circular Donut Diagram */}
            <div className="flex items-center justify-center my-4 relative">
              <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Ring */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  className="text-[#D9E0E8] dark:text-[#30363D]"
                />
                {/* Donut Slices */}
                {donutSegments.map((seg, idx) => (
                  <circle
                    key={idx}
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="3.4"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    className="transition-all duration-500 hover:stroke-[4]"
                  />
                ))}
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-2xl font-mono font-extrabold text-[#172033] dark:text-[#F8FAFC]">
                  {totalVerdicts}
                </span>
                <span className="text-[10px] text-[#667085] dark:text-[#94A3B8] uppercase font-bold tracking-wider">
                  Evaluated
                </span>
              </div>
            </div>

            {/* Legend List */}
            <div className="space-y-2 mt-2">
              {donutSegments.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[#172033] dark:text-[#F8FAFC]">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[#667085] dark:text-[#94A3B8]">{item.count}</span>
                    <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ANALYTICS SECTION - ROW 2: Language Popularity & Department Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Programming Language Distribution */}
        <div className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#0757B8]/15 text-[#0757B8] dark:text-[#60A5FA] flex items-center justify-center">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC]">Language Popularity</h3>
                <p className="text-xs text-[#667085] dark:text-[#94A3B8]">Programming languages adopted</p>
              </div>
            </div>

            <div className="space-y-3.5 mt-4">
              {languages.map((lang, idx) => {
                const pct = totalLangs > 0 ? ((lang.count / totalLangs) * 100).toFixed(1) : '0.0';
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#172033] dark:text-[#F8FAFC]">{lang.name}</span>
                      <span className="font-mono text-[#0757B8] dark:text-[#60A5FA]">{lang.count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#F5F7FA] dark:bg-[#151A21] overflow-hidden border border-[#D9E0E8] dark:border-[#30363D]">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${pct}%`, backgroundColor: lang.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9E0E8] dark:border-[#30363D] text-[11px] text-[#667085] dark:text-[#94A3B8]">
            Primary Choice: <strong className="text-[#0757B8] dark:text-[#60A5FA]">{topLang && totalLangs > 0 ? `${topLang.name} (${topLangPct}%)` : 'No submissions yet'}</strong>
          </div>
        </div>

        {/* Department Engagement */}
        <div className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC]">Department Engagement</h3>
                <p className="text-xs text-[#667085] dark:text-[#94A3B8]">Active participation by academic branch</p>
              </div>
            </div>

            <div className="space-y-3.5 mt-4">
              {departments.map((dept, idx) => {
                const pct = totalDepts > 0 ? ((dept.students / totalDepts) * 100).toFixed(1) : '0.0';
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#172033] dark:text-[#F8FAFC] truncate max-w-[200px]">{dept.department}</span>
                      <span className="font-mono text-purple-600 dark:text-purple-400">{dept.students} students ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#F5F7FA] dark:bg-[#151A21] overflow-hidden border border-[#D9E0E8] dark:border-[#30363D]">
                      <div 
                        className="h-full rounded-full bg-purple-600 dark:bg-purple-500 transition-all duration-500" 
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9E0E8] dark:border-[#30363D] text-[11px] text-[#667085] dark:text-[#94A3B8]">
            Highest Active Branch: <strong className="text-purple-600 dark:text-purple-400">{topDept?.department || 'N/A'}</strong>
          </div>
        </div>

        {/* Difficulty & Problem Catalog Distribution */}
        <div className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#F2B705]/15 text-[#F2B705] flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC]">Challenge Distribution</h3>
                <p className="text-xs text-[#667085] dark:text-[#94A3B8]">Catalog balance & topic density</p>
              </div>
            </div>

            {/* Difficulty Pills */}
            <div className="space-y-2 mb-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#94A3B8]">By Difficulty Level</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {difficulty.map((diff, idx) => (
                  <div key={idx} className="p-2.5 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D]">
                    <div className="text-[10px] font-bold uppercase" style={{ color: diff.color }}>{diff.name}</div>
                    <div className="text-lg font-mono font-extrabold text-[#172033] dark:text-[#F8FAFC]">{diff.count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Topics Density */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#94A3B8]">Top Topic Coverage</div>
              <div className="flex flex-wrap gap-1.5">
                {topics.map((t, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-xs font-semibold text-[#172033] dark:text-[#F8FAFC]"
                  >
                    <span>{t.topic}</span>
                    <span className="font-mono text-[#0757B8] dark:text-[#60A5FA] font-bold">({t.count})</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9E0E8] dark:border-[#30363D] flex items-center justify-between text-xs">
            <span className="text-[#667085] dark:text-[#94A3B8]">Total Curriculum Pool</span>
            <strong className="text-[#172033] dark:text-[#F8FAFC] font-mono">{stats.total_problems} Problems</strong>
          </div>
        </div>

      </div>
    </div>
  );
};
