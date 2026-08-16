import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  BarChart3, 
  Trophy, 
  Search, 
  Filter, 
  RotateCcw, 
  FileSpreadsheet, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Percent, 
  Clock, 
  Cpu, 
  HardDrive, 
  ShieldAlert, 
  ShieldCheck, 
  Eye, 
  Code2, 
  Sparkles, 
  Award,
  Layers,
  Check,
  X
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
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
  'Cyber Security'
];

const COLLEGE_YEARS = ['All', '1st Year', '2nd Year', '3rd Year', '4th Year'];

export const ManageContestReports = () => {
  const [contestsList, setContestsList] = useState([]);
  const [selectedContestId, setSelectedContestId] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [search, setSearch] = useState('');

  const [reportData, setReportData] = useState({
    contest: null,
    summary: { total_candidates: 0, average_score: 0, highest_score: 0, clean_rate: 100, clean_count: 0, auto_terminated_count: 0 },
    leaderboard: [],
    problems: []
  });

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  useEffect(() => {
    fetchContestsList();
  }, []);

  useEffect(() => {
    if (selectedContestId) {
      fetchContestReport(selectedContestId);
    }
  }, [selectedContestId, deptFilter, yearFilter]);

  const fetchContestsList = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/reports/contests');
      if (res.data.success) {
        setContestsList(res.data.contests || []);
        if (res.data.contests?.length > 0) {
          setSelectedContestId(res.data.contests[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load contests list:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContestReport = async (contestId) => {
    try {
      setLoading(true);
      const params = {
        department: deptFilter !== 'All' ? deptFilter : undefined,
        year: yearFilter !== 'All' ? yearFilter : undefined,
        search: search.trim() || undefined
      };

      const res = await api.get(`/admin/reports/contests/${contestId}`, { params });
      if (res.data.success) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Failed to load contest report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (selectedContestId) {
      fetchContestReport(selectedContestId);
    }
  };

  const handleResetFilters = () => {
    setDeptFilter('All');
    setYearFilter('All');
    setSearch('');
    if (selectedContestId) {
      setTimeout(() => {
        fetchContestReport(selectedContestId);
      }, 50);
    }
  };

  const handleExportExcel = async () => {
    if (!selectedContestId) return;
    try {
      setExporting(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        department: deptFilter !== 'All' ? deptFilter : '',
        year: yearFilter !== 'All' ? yearFilter : '',
        search: search.trim()
      });

      const response = await fetch(`/api/admin/reports/contests/${selectedContestId}/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Excel export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contestTitle = reportData.contest?.title || 'Contest';
      a.download = `Contest_Report_${contestTitle.replace(/\s+/g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export Excel report:', err);
      alert('Failed to generate Excel report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const selectedContest = contestsList.find(c => c.id === selectedContestId);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[#0757B8] dark:text-[#60A5FA]" />
            Contest Performance Reports
          </h1>
          <p className="text-sm text-[#667085] dark:text-[#94A3B8] mt-1">
            Contest-wise scoring breakdown, time/space complexity analysis, integrity logs, and leaderboard
          </p>
        </div>

        {/* Export Excel Button */}
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={!selectedContestId || exporting || loading}
          className="px-5 py-2.5 rounded-2xl bg-[#22B573] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition disabled:opacity-50"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{exporting ? 'Generating Excel Report...' : 'Export Excel'}</span>
        </button>
      </div>

      {/* Contest Selector & Filter Toolbar */}
      <div className="p-5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 text-xs">
          {/* Contest Selector Dropdown */}
          <div className="lg:col-span-2">
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-[#F2B705]" />
              <span>Select Contest *</span>
            </label>
            <select
              value={selectedContestId}
              onChange={(e) => setSelectedContestId(e.target.value)}
              className="w-full py-2.5 px-3.5 bg-[#DDF2FF]/40 dark:bg-[#142A43]/40 border border-[#0757B8]/30 dark:border-[#0066CC]/40 rounded-xl text-[#0757B8] dark:text-[#60A5FA] font-bold text-xs"
            >
              {contestsList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.participants_count} Candidates • {c.duration_minutes}m)
                </option>
              ))}
            </select>
          </div>

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
        </div>

        {/* Search & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#D9E0E8] dark:border-[#30363D]">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate by name or student ID..."
              className="w-full pl-8 pr-3 py-2 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-xs text-[#172033] dark:text-[#F8FAFC] font-semibold"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#667085]" />
          </form>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => selectedContestId && fetchContestReport(selectedContestId)}
              className="px-4 py-2 rounded-xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter Report</span>
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
      </div>

      {/* KPI Overview Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Candidates */}
        <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-[#667085] dark:text-[#94A3B8]">Candidates</div>
            <div className="text-xl font-extrabold font-mono text-[#172033] dark:text-[#F8FAFC]">
              {reportData.summary?.total_candidates || 0}
            </div>
          </div>
        </div>

        {/* Average Score */}
        <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#0757B8]/15 text-[#0757B8] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-[#0757B8] dark:text-[#60A5FA]">Average Score</div>
            <div className="text-xl font-extrabold font-mono text-[#0757B8] dark:text-[#60A5FA]">
              {reportData.summary?.average_score || 0} <span className="text-xs font-normal text-[#667085]">/ 100</span>
            </div>
          </div>
        </div>

        {/* Highest Score */}
        <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#22B573]/15 text-[#22B573] flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-[#22B573]">Top Score</div>
            <div className="text-xl font-extrabold font-mono text-[#22B573]">
              {reportData.summary?.highest_score || 0} <span className="text-xs font-normal text-[#667085]">/ 100</span>
            </div>
          </div>
        </div>

        {/* Clean Integrity Rate */}
        <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">Clean Attempts</div>
            <div className="text-xl font-extrabold font-mono text-[#172033] dark:text-[#F8FAFC]">
              {reportData.summary?.clean_rate || 100}%
            </div>
          </div>
        </div>
      </div>

      {/* 5-Factor Weighted Score Formula Banner */}
      <div className="p-4 rounded-3xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0757B8] dark:text-[#60A5FA]" />
            <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">
              Standard Weighted Scoring Formula (Out of 100)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono font-bold">
            <span className="px-2.5 py-1 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Test Cases: 50%
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Problems: 20%
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Time Efficiency: 10%
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Time Comp: 10%
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/20">
              Space Comp: 10%
            </span>
          </div>
        </div>
      </div>

      {/* Ranked Leaderboard Table */}
      <div className="rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20">
            <PageLoader text="Compiling contest submissions & calculating complexity leaderboard..." />
          </div>
        ) : reportData.leaderboard.length === 0 ? (
          <div className="py-20 text-center text-[#667085] dark:text-[#94A3B8] text-xs">
            No candidate submissions or records found for this contest.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#303442] text-white font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-4 px-3 text-center min-w-[55px]">Rank</th>
                  <th className="py-4 px-3 min-w-[200px]">Candidate</th>
                  <th className="py-4 px-3 text-center min-w-[90px]">Problems</th>
                  <th className="py-4 px-3 text-center min-w-[100px]">Test Cases</th>
                  <th className="py-4 px-3 text-center min-w-[90px]">Time</th>
                  <th className="py-4 px-3 text-center min-w-[110px]">Time Comp</th>
                  <th className="py-4 px-3 text-center min-w-[110px]">Space Comp</th>
                  <th className="py-4 px-3 text-center min-w-[100px]">Final Score</th>
                  <th className="py-4 px-3 text-center min-w-[120px]">Anti-Cheat</th>
                  <th className="py-4 px-3 text-right min-w-[90px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E0E8] dark:divide-[#30363D]/60 text-xs">
                {reportData.leaderboard.map((cand) => {
                  const isTop1 = cand.rank === 1;
                  const isTop2 = cand.rank === 2;
                  const isTop3 = cand.rank === 3;
                  const ac = cand.anti_cheat;

                  return (
                    <tr key={cand.participant_id} className="hover:bg-[#F5F7FA] dark:hover:bg-[#151A21]/60 transition">
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
                          <span className="text-[#667085] dark:text-[#94A3B8]">#{cand.rank}</span>
                        )}
                      </td>

                      {/* Candidate */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-[#172033] dark:text-[#F8FAFC]">
                          {cand.name}
                        </div>
                        <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] font-mono mt-0.5">
                          <span className="font-bold text-[#0757B8] dark:text-[#60A5FA]">{cand.student_id}</span>
                          <span> • </span>
                          <span>{cand.department}</span>
                        </div>
                      </td>

                      {/* Problems Solved */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-[#172033] dark:text-[#F8FAFC]">
                        <span className={cand.solved_count === cand.total_contest_problems ? 'text-[#22B573]' : ''}>
                          {cand.solved_count} / {cand.total_contest_problems}
                        </span>
                      </td>

                      {/* Test Cases Passed */}
                      <td className="py-3.5 px-3 text-center font-mono text-[#667085] dark:text-[#94A3B8]">
                        <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">{cand.passed_test_cases}</span>
                        <span className="text-[10px]"> / {cand.total_contest_testcases}</span>
                      </td>

                      {/* Time Taken */}
                      <td className="py-3.5 px-3 text-center font-mono text-[11px] text-[#667085] dark:text-[#94A3B8]">
                        {cand.time_taken}
                      </td>

                      {/* Time Complexity */}
                      <td className="py-3.5 px-3 text-center font-mono">
                        <span className="px-2 py-0.5 rounded-lg bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[10px] font-bold text-purple-600 dark:text-purple-400">
                          {cand.time_complexity}
                        </span>
                      </td>

                      {/* Space Complexity */}
                      <td className="py-3.5 px-3 text-center font-mono">
                        <span className="px-2 py-0.5 rounded-lg bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[10px] font-bold text-pink-600 dark:text-pink-400">
                          {cand.space_complexity}
                        </span>
                      </td>

                      {/* Final Score */}
                      <td className="py-3.5 px-3 text-center font-mono">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold shadow-sm ${
                          cand.final_score >= 80
                            ? 'bg-[#22B573]/20 text-[#22B573] border border-[#22B573]/40'
                            : cand.final_score >= 50
                              ? 'bg-[#F2B705]/20 text-[#F2B705] border border-[#F2B705]/40'
                              : 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                        }`}>
                          {cand.final_score}
                        </span>
                      </td>

                      {/* Anti-Cheat */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          ac.status === 'AUTO_TERMINATED'
                            ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                            : ac.status === 'FLAGGED'
                              ? 'bg-[#F2B705]/15 text-[#F2B705] border border-[#F2B705]/30'
                              : 'bg-[#22B573]/15 text-[#22B573] border border-[#22B573]/30'
                        }`}>
                          {ac.status === 'AUTO_TERMINATED' ? (
                            <>
                              <ShieldAlert className="w-3 h-3" />
                              <span>Terminated</span>
                            </>
                          ) : ac.status === 'FLAGGED' ? (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              <span>{ac.flags_count} Flags</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3 h-3" />
                              <span>Clean</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedCandidate(cand)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#DDF2FF] dark:bg-[#142A43] hover:bg-[#0757B8] dark:hover:bg-[#0066CC] text-[#0757B8] dark:text-[#60A5FA] hover:text-white border border-[#0757B8]/20 text-xs font-bold transition shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Audit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CANDIDATE AUDIT & SUBMISSION DETAIL MODAL */}
      <Modal
        isOpen={Boolean(selectedCandidate)}
        onClose={() => setSelectedCandidate(null)}
        title="Candidate Contest Audit & Score Breakdown"
        maxWidth="max-w-3xl"
      >
        {selectedCandidate && (
          <div className="space-y-4 text-xs font-sans">
            {/* Student Banner */}
            <div className="p-4 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] flex items-center justify-between">
              <div>
                <div className="text-base font-extrabold text-[#172033] dark:text-[#F8FAFC]">
                  {selectedCandidate.name}
                </div>
                <div className="text-xs text-[#667085] dark:text-[#94A3B8] font-mono mt-0.5">
                  ID: <strong className="text-[#0757B8] dark:text-[#60A5FA]">{selectedCandidate.student_id}</strong> • {selectedCandidate.department} • {selectedCandidate.year}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-[#667085] dark:text-[#94A3B8]">Final Score</div>
                <div className="text-2xl font-extrabold font-mono text-[#0757B8] dark:text-[#60A5FA]">
                  {selectedCandidate.final_score} <span className="text-xs font-normal text-[#667085]">/ 100</span>
                </div>
              </div>
            </div>

            {/* Score Breakdown Cards */}
            <div>
              <div className="text-[11px] uppercase font-bold text-[#667085] dark:text-[#94A3B8] mb-1.5 tracking-wider">
                Weighted Score Breakdown
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <div className="text-[9px] text-blue-600 dark:text-blue-400 uppercase font-bold">Test Cases (50%)</div>
                  <div className="text-base font-bold text-[#172033] dark:text-[#F8FAFC] mt-0.5">{selectedCandidate.score_breakdown.test_cases} pts</div>
                </div>
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">Solved (20%)</div>
                  <div className="text-base font-bold text-[#172033] dark:text-[#F8FAFC] mt-0.5">{selectedCandidate.score_breakdown.problems_solved} pts</div>
                </div>
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <div className="text-[9px] text-amber-600 dark:text-amber-400 uppercase font-bold">Efficiency (10%)</div>
                  <div className="text-base font-bold text-[#172033] dark:text-[#F8FAFC] mt-0.5">{selectedCandidate.score_breakdown.time_efficiency} pts</div>
                </div>
                <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <div className="text-[9px] text-purple-600 dark:text-purple-400 uppercase font-bold">Time Comp (10%)</div>
                  <div className="text-base font-bold text-[#172033] dark:text-[#F8FAFC] mt-0.5">{selectedCandidate.score_breakdown.time_complexity} pts</div>
                </div>
                <div className="p-2.5 rounded-2xl bg-pink-500/10 border border-pink-500/20">
                  <div className="text-[9px] text-pink-600 dark:text-pink-400 uppercase font-bold">Space Comp (10%)</div>
                  <div className="text-base font-bold text-[#172033] dark:text-[#F8FAFC] mt-0.5">{selectedCandidate.score_breakdown.space_complexity} pts</div>
                </div>
              </div>
            </div>

            {/* Problem-by-Problem Evaluation Breakdown */}
            <div>
              <div className="text-[11px] uppercase font-bold text-[#667085] dark:text-[#94A3B8] mb-1.5 tracking-wider">
                Coding Challenges Performance
              </div>
              <div className="rounded-2xl border border-[#D9E0E8] dark:border-[#30363D] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#303442] text-white font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Problem Title</th>
                      <th className="py-2.5 px-3">Verdict</th>
                      <th className="py-2.5 px-3 text-center">Test Cases</th>
                      <th className="py-2.5 px-3 text-center">Runtime</th>
                      <th className="py-2.5 px-3 text-center">Memory</th>
                      <th className="py-2.5 px-3 text-right">Language</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9E0E8] dark:divide-[#30363D]/60 font-sans">
                    {selectedCandidate.problem_breakdowns?.map((pb, pIdx) => (
                      <tr key={pIdx} className="hover:bg-[#F5F7FA] dark:hover:bg-[#151A21]/50">
                        <td className="py-2.5 px-3 font-bold text-[#172033] dark:text-[#F8FAFC]">
                          {pb.problem_title}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            pb.status === 'Accepted'
                              ? 'bg-[#22B573]/20 text-[#22B573]'
                              : pb.status === 'Not Attempted'
                                ? 'bg-slate-200 text-[#667085]'
                                : 'bg-[#EF4444]/20 text-[#EF4444]'
                          }`}>
                            {pb.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {pb.passed_test_cases} / {pb.total_test_cases}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                          {pb.runtime > 0 ? `${pb.runtime} ms` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                          {pb.memory > 0 ? `${pb.memory} MB` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono uppercase text-[11px]">
                          {pb.language}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Anti-Cheat Audit Box */}
            <div className="p-3.5 rounded-2xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-bold flex items-center gap-1.5 text-[#172033] dark:text-[#F8FAFC]">
                  <ShieldAlert className="w-4 h-4 text-[#0757B8] dark:text-[#60A5FA]" />
                  <span>Anti-Cheat Security & Integrity Record</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedCandidate.anti_cheat.auto_terminated
                    ? 'bg-[#EF4444]/20 text-[#EF4444]'
                    : selectedCandidate.anti_cheat.flags_count > 0
                      ? 'bg-[#F2B705]/20 text-[#F2B705]'
                      : 'bg-[#22B573]/20 text-[#22B573]'
                }`}>
                  {selectedCandidate.anti_cheat.status}
                </span>
              </div>

              {selectedCandidate.anti_cheat.auto_terminated && (
                <div className="p-2.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/25 text-[#EF4444] text-xs font-semibold">
                  Reason: {selectedCandidate.anti_cheat.termination_reason || 'Exited strict contest mode.'}
                </div>
              )}

              {selectedCandidate.anti_cheat.logs?.length > 0 ? (
                <div className="space-y-1 pt-1 max-h-36 overflow-y-auto">
                  {selectedCandidate.anti_cheat.logs.map((log, lIdx) => (
                    <div key={lIdx} className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] flex items-center justify-between font-mono text-[10px]">
                      <div>
                        <span className="font-bold text-[#EF4444]">{log.event_type}</span>: {log.detail}
                      </div>
                      <div className="text-[#667085] dark:text-[#94A3B8]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-[#22B573] font-semibold py-1">
                  ✓ Clean attempt with 0 security violations recorded.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="px-5 py-2.5 rounded-xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold"
              >
                Close Audit
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
