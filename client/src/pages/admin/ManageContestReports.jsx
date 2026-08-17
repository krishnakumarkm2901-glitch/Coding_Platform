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
  HelpCircle,
  Download,
  FileText,
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

  // 3 Report Views: 'overall' | 'mcq' | 'coding'
  const [activeReportTab, setActiveReportTab] = useState('overall');

  const [reportData, setReportData] = useState({
    contest: null,
    summary: {
      total_candidates: 0,
      average_score: 0,
      highest_score: 0,
      clean_rate: 100,
      clean_count: 0,
      auto_terminated_count: 0,
      total_mcqs: 0,
      avg_mcq_score: 0,
      highest_mcq_score: 0,
      avg_mcq_accuracy: 0,
      total_coding_problems: 0,
      avg_coding_score: 0,
      highest_coding_score: 0,
      avg_test_cases_passed: 0
    },
    leaderboard: [],
    problems: []
  });

  const [loading, setLoading] = useState(true);
  const [exportingType, setExportingType] = useState(null); // 'overall_excel' | 'mcq_excel' | 'coding_excel' | ...
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [modalTab, setModalTab] = useState('overall'); // 'overall' | 'coding' | 'anticheat'

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

  // Download Handler for Overall, MCQ, and Coding Reports (Excel / CSV)
  const handleExportReport = async (reportType = 'overall', format = 'excel') => {
    if (!selectedContestId) return;
    try {
      setExportingType(`${reportType}_${format}`);
      const params = {
        department: deptFilter !== 'All' ? deptFilter : undefined,
        year: yearFilter !== 'All' ? yearFilter : undefined,
        search: search.trim() || undefined,
        report_type: reportType,
        format: format
      };

      const response = await api.get(`/admin/reports/contests/${selectedContestId}/export`, {
        params,
        responseType: 'blob'
      });

      const mimeType = format === 'csv'
        ? 'text/csv;charset=utf-8;'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      const blob = new Blob([response.data], { type: mimeType });

      const contestTitle = (reportData.contest?.title || 'Contest').replace(/[^a-zA-Z0-9_-]/g, '_');
      const extension = format === 'csv' ? 'csv' : 'xlsx';
      const filename = `${reportType.toUpperCase()}_Report_${contestTitle}.${extension}`;

      // 1. Try Native File System Access API (Never blocked by Chrome on local IP)
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: format === 'csv' ? 'CSV File (*.csv)' : 'Excel Spreadsheet (*.xlsx)',
              accept: { [mimeType]: [`.${extension}`] }
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        } catch (pickerErr) {
          if (pickerErr.name === 'AbortError') {
            // User cancelled save dialog
            return;
          }
          // If picker fails (e.g. security policy), fall through to standard anchor download
        }
      }

      // 2. Standard Blob Object URL Anchor Download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 300);
    } catch (err) {
      console.error(`Failed to export ${reportType} report:`, err);
      alert(`Failed to generate ${reportType.toUpperCase()} report. Please try again.`);
    } finally {
      setExportingType(null);
    }
  };

  const selectedContest = contestsList.find(c => c.id === selectedContestId);

  // Filter and sort leaderboard based on active tab
  const displayLeaderboard = [...(reportData.leaderboard || [])].sort((a, b) => {
    if (activeReportTab === 'mcq') {
      return (b.mcq_score || 0) - (a.mcq_score || 0) || (b.mcqs_correct || 0) - (a.mcqs_correct || 0);
    }
    if (activeReportTab === 'coding') {
      return (b.coding_score || 0) - (a.coding_score || 0) || (b.solved_count || 0) - (a.solved_count || 0);
    }
    return (b.overall_score || 0) - (a.overall_score || 0) || (b.final_score || 0) - (a.final_score || 0);
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[#0757B8] dark:text-[#60A5FA]" />
            Contest Performance Reports
          </h1>
          <p className="text-sm text-[#667085] dark:text-[#94A3B8] mt-1">
            Overall, Technical MCQ, and Algorithmic Coding performance breakdown with candidate auditing
          </p>
        </div>

        {/* 3 Admin Download Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download Overall */}
          <button
            type="button"
            onClick={() => handleExportReport('overall', 'excel')}
            disabled={!selectedContestId || loading || exportingType !== null}
            className="px-4 py-2.5 rounded-2xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition disabled:opacity-50"
            title="Download Overall Performance Report (Excel)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exportingType === 'overall_excel' ? 'Downloading...' : 'Download Overall'}</span>
          </button>

          {/* Download MCQ */}
          <button
            type="button"
            onClick={() => handleExportReport('mcq', 'excel')}
            disabled={!selectedContestId || loading || exportingType !== null}
            className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center gap-2 transition disabled:opacity-50"
            title="Download MCQ Performance Report (Excel)"
          >
            <HelpCircle className="w-4 h-4" />
            <span>{exportingType === 'mcq_excel' ? 'Downloading...' : 'Download MCQ'}</span>
          </button>

          {/* Download Coding */}
          <button
            type="button"
            onClick={() => handleExportReport('coding', 'excel')}
            disabled={!selectedContestId || loading || exportingType !== null}
            className="px-4 py-2.5 rounded-2xl bg-[#22B573] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition disabled:opacity-50"
            title="Download Coding Performance Report (Excel)"
          >
            <Code2 className="w-4 h-4" />
            <span>{exportingType === 'coding_excel' ? 'Downloading...' : 'Download Coding'}</span>
          </button>
        </div>
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

      {/* 3 ADMIN REPORT NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] shadow-sm">
          {/* Overall Report Tab */}
          <button
            type="button"
            onClick={() => setActiveReportTab('overall')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition ${activeReportTab === 'overall'
                ? 'bg-[#0757B8] dark:bg-[#0066CC] text-white shadow-md'
                : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
              }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Overall Report</span>
          </button>

          {/* MCQ Report Tab */}
          <button
            type="button"
            onClick={() => setActiveReportTab('mcq')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition ${activeReportTab === 'mcq'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
              }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>MCQ Report</span>
          </button>

          {/* Coding Report Tab */}
          <button
            type="button"
            onClick={() => setActiveReportTab('coding')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition ${activeReportTab === 'coding'
                ? 'bg-[#22B573] text-white shadow-md'
                : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
              }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Coding Report</span>
          </button>
        </div>

        {/* CSV Alternative Download Link */}
        <div className="flex items-center gap-2 text-xs font-mono text-[#667085] dark:text-[#94A3B8]">
          <span>Export active view as CSV:</span>
          <button
            onClick={() => handleExportReport(activeReportTab, 'csv')}
            disabled={!selectedContestId || loading || exportingType !== null}
            className="font-bold text-[#0757B8] dark:text-[#60A5FA] hover:underline"
          >
            {activeReportTab.toUpperCase()}.CSV
          </button>
        </div>
      </div>

      {/* KPI Overview Summary Cards (Customized per Active Tab) */}
      {activeReportTab === 'overall' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fadeIn">
          {/* Candidates */}
          <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[#667085] dark:text-[#94A3B8]">Total Candidates</div>
              <div className="text-xl font-extrabold font-mono text-[#172033] dark:text-[#F8FAFC]">
                {reportData.summary?.total_candidates || 0}
              </div>
            </div>
          </div>

          {/* Average Overall Score */}
          <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0757B8]/15 text-[#0757B8] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[#0757B8] dark:text-[#60A5FA]">Average Score</div>
              <div className="text-xl font-extrabold font-mono text-[#0757B8] dark:text-[#60A5FA]">
                {reportData.summary?.avg_overall_score || 0}
              </div>
            </div>
          </div>

          {/* Top Overall Score */}
          <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#22B573]/15 text-[#22B573] flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[#22B573]">Top Score</div>
              <div className="text-xl font-extrabold font-mono text-[#22B573]">
                {reportData.summary?.highest_overall_score || 0}
              </div>
            </div>
          </div>

          {/* Clean Integrity Rate */}
          <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">Clean Rate</div>
              <div className="text-xl font-extrabold font-mono text-[#172033] dark:text-[#F8FAFC]">
                {reportData.summary?.clean_rate || 100}%
              </div>
            </div>
          </div>
        </div>
      )}

      {activeReportTab === 'mcq' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fadeIn">
          {/* Total MCQs */}
          <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">Total MCQs</div>
              <div className="text-xl font-extrabold font-mono text-[#172033] dark:text-[#F8FAFC]">
                {reportData.summary?.total_mcqs || reportData.contest?.mcqs_count || 0}
              </div>
            </div>
          </div>

          {/* Average MCQ Score */}
          <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">Avg MCQ Score</div>
              <div className="text-xl font-extrabold font-mono text-purple-600 dark:text-purple-400">
                {reportData.summary?.avg_mcq_score || 0}
              </div>
            </div>
          </div>

          {/* Top MCQ Score */}
          <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#22B573]/15 text-[#22B573] flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[#22B573]">Top MCQ Score</div>
              <div className="text-xl font-extrabold font-mono text-[#22B573]">
                {reportData.summary?.highest_mcq_score || 0}
              </div>
            </div>
          </div>

          {/* Average Accuracy */}
          <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[#0757B8] dark:text-[#60A5FA]">Avg MCQ Accuracy</div>
              <div className="text-xl font-extrabold font-mono text-[#172033] dark:text-[#F8FAFC]">
                {reportData.summary?.avg_mcq_accuracy || 0}%
              </div>
            </div>
          </div>
        </div>
      )}

      {activeReportTab === 'coding' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fadeIn">
          {/* Coding Problems */}
          <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0757B8]/15 text-[#0757B8] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[#0757B8] dark:text-[#60A5FA]">Coding Problems</div>
              <div className="text-xl font-extrabold font-mono text-[#172033] dark:text-[#F8FAFC]">
                {reportData.summary?.total_coding_problems || reportData.contest?.problems_count || 0}
              </div>
            </div>
          </div>

          {/* Average Coding Score */}
          <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#22B573]/15 text-[#22B573] flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[#22B573]">Avg Coding Score</div>
              <div className="text-xl font-extrabold font-mono text-[#22B573]">
                {reportData.summary?.avg_coding_score || 0}
              </div>
            </div>
          </div>

          {/* Top Coding Score */}
          <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#22B573]/15 text-[#22B573] flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[#22B573]">Top Coding Score</div>
              <div className="text-xl font-extrabold font-mono text-[#22B573]">
                {reportData.summary?.highest_coding_score || 0}
              </div>
            </div>
          </div>

          {/* Avg Test Cases Passed */}
          <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Avg Test Cases</div>
              <div className="text-xl font-extrabold font-mono text-[#172033] dark:text-[#F8FAFC]">
                {reportData.summary?.avg_test_cases_passed || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC REPORT TABLE BASED ON ACTIVE TAB */}
      <div className="rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20">
            <PageLoader text="Compiling contest report data..." />
          </div>
        ) : displayLeaderboard.length === 0 ? (
          <div className="py-20 text-center text-[#667085] dark:text-[#94A3B8] text-xs">
            No candidate submissions or records found for this contest.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              {/* TABLE HEADERS */}
              <thead className="bg-[#303442] text-white font-bold uppercase tracking-wider text-[11px]">
                {activeReportTab === 'overall' && (
                  <tr>
                    <th className="py-4 px-3 text-center min-w-[55px]">Rank</th>
                    <th className="py-4 px-3 min-w-[200px]">Candidate</th>
                    <th className="py-4 px-3 text-center min-w-[90px]">MCQ Marks</th>
                    <th className="py-4 px-3 text-center min-w-[90px]">Coding Marks</th>
                    <th className="py-4 px-3 text-center min-w-[100px]">Total Score</th>
                    <th className="py-4 px-3 text-center min-w-[90px]">Problems</th>
                    <th className="py-4 px-3 text-center min-w-[95px]">Test Cases</th>
                    <th className="py-4 px-3 text-center min-w-[90px]">Time</th>
                    <th className="py-4 px-3 text-center min-w-[120px]">Anti-Cheat</th>
                    <th className="py-4 px-3 text-right min-w-[90px]">Action</th>
                  </tr>
                )}

                {activeReportTab === 'mcq' && (
                  <tr>
                    <th className="py-4 px-3 text-center min-w-[55px]">Rank</th>
                    <th className="py-4 px-3 min-w-[200px]">Candidate</th>
                    <th className="py-4 px-3 text-center min-w-[110px]">MCQs Correct</th>
                    <th className="py-4 px-3 text-center min-w-[100px]">MCQ Marks</th>
                    <th className="py-4 px-3 text-center min-w-[100px]">Accuracy</th>
                    <th className="py-4 px-3 text-center min-w-[100px]">Time Taken</th>
                    <th className="py-4 px-3 text-center min-w-[120px]">Status</th>
                    <th className="py-4 px-3 text-right min-w-[90px]">Action</th>
                  </tr>
                )}

                {activeReportTab === 'coding' && (
                  <tr>
                    <th className="py-4 px-3 text-center min-w-[55px]">Rank</th>
                    <th className="py-4 px-3 min-w-[200px]">Candidate</th>
                    <th className="py-4 px-3 text-center min-w-[100px]">Problems</th>
                    <th className="py-4 px-3 text-center min-w-[100px]">Test Cases</th>
                    <th className="py-4 px-3 text-center min-w-[110px]">Coding Marks</th>
                    <th className="py-4 px-3 text-center min-w-[90px]">Time</th>
                    <th className="py-4 px-3 text-center min-w-[110px]">Time Comp</th>
                    <th className="py-4 px-3 text-center min-w-[110px]">Space Comp</th>
                    <th className="py-4 px-3 text-center min-w-[120px]">Anti-Cheat</th>
                    <th className="py-4 px-3 text-right min-w-[90px]">Action</th>
                  </tr>
                )}
              </thead>

              {/* TABLE BODY */}
              <tbody className="divide-y divide-[#D9E0E8] dark:divide-[#30363D]/60 text-xs">
                {displayLeaderboard.map((cand, idx) => {
                  const rank = idx + 1;
                  const isTop1 = rank === 1;
                  const isTop2 = rank === 2;
                  const isTop3 = rank === 3;
                  const ac = cand.anti_cheat || {};

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
                          <span className="text-[#667085] dark:text-[#94A3B8]">#{rank}</span>
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

                      {/* OVERALL VIEW COLUMNS */}
                      {activeReportTab === 'overall' && (
                        <>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-purple-600 dark:text-purple-400">
                            {cand.mcq_score || 0}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-[#22B573]">
                            {cand.coding_score || 0}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono">
                            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#0757B8]/15 text-[#0757B8] dark:text-[#60A5FA] border border-[#0757B8]/30">
                              {cand.overall_score || 0}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-[#667085] dark:text-[#94A3B8]">
                            {cand.solved_count} / {cand.total_contest_problems}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-[#667085] dark:text-[#94A3B8]">
                            {cand.passed_test_cases} / {cand.total_contest_testcases}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-[11px] text-[#667085] dark:text-[#94A3B8]">
                            {cand.time_taken}
                          </td>
                        </>
                      )}

                      {/* MCQ VIEW COLUMNS */}
                      {activeReportTab === 'mcq' && (
                        <>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-[#172033] dark:text-[#F8FAFC]">
                            {cand.mcqs_correct} / {cand.total_contest_mcqs}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono">
                            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                              {cand.mcq_score || 0}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-[#22B573]">
                            {cand.mcq_percentage || 0}%
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-[11px] text-[#667085] dark:text-[#94A3B8]">
                            {cand.time_taken}
                          </td>
                        </>
                      )}

                      {/* CODING VIEW COLUMNS */}
                      {activeReportTab === 'coding' && (
                        <>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-[#172033] dark:text-[#F8FAFC]">
                            {cand.solved_count} / {cand.total_contest_problems}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-[#667085] dark:text-[#94A3B8]">
                            {cand.passed_test_cases} / {cand.total_contest_testcases}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono">
                            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#22B573]/15 text-[#22B573] border border-[#22B573]/30">
                              {cand.coding_score || 0}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-[11px] text-[#667085] dark:text-[#94A3B8]">
                            {cand.time_taken}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono">
                            <span className="px-2 py-0.5 rounded-lg bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[10px] font-bold text-purple-600 dark:text-purple-400">
                              {cand.time_complexity}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono">
                            <span className="px-2 py-0.5 rounded-lg bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[10px] font-bold text-pink-600 dark:text-pink-400">
                              {cand.space_complexity}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Anti-Cheat Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${ac.status === 'AUTO_TERMINATED'
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

                      {/* Audit Button */}
                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCandidate(cand);
                            setModalTab('overall');
                          }}
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
        title="Candidate Contest Audit & Performance Breakdown"
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
                <div className="text-[10px] uppercase font-bold text-[#667085] dark:text-[#94A3B8]">Total Marks</div>
                <div className="text-2xl font-extrabold font-mono text-[#0757B8] dark:text-[#60A5FA]">
                  {selectedCandidate.overall_score || 0}
                </div>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-[#D9E0E8] dark:border-[#30363D] pb-2">
              <button
                type="button"
                onClick={() => setModalTab('overall')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${modalTab === 'overall'
                    ? 'bg-[#0757B8] text-white'
                    : 'text-[#667085] dark:text-[#94A3B8] hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
              >
                Overall Breakdown
              </button>
              <button
                type="button"
                onClick={() => setModalTab('coding')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${modalTab === 'coding'
                    ? 'bg-[#22B573] text-white'
                    : 'text-[#667085] dark:text-[#94A3B8] hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
              >
                Coding Problems ({selectedCandidate.problem_breakdowns?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setModalTab('anticheat')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${modalTab === 'anticheat'
                    ? 'bg-purple-600 text-white'
                    : 'text-[#667085] dark:text-[#94A3B8] hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
              >
                Anti-Cheat Integrity Logs
              </button>
            </div>

            {/* Tab 1: Overall Breakdown */}
            {modalTab === 'overall' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-center">
                    <div className="text-[10px] font-bold text-[#667085] uppercase">MCQ Marks</div>
                    <div className="text-xl font-extrabold font-mono text-purple-600 mt-1">
                      {selectedCandidate.mcq_score || 0}
                    </div>
                    <div className="text-[10px] text-[#667085] mt-0.5">
                      {selectedCandidate.mcqs_correct || 0} / {selectedCandidate.total_contest_mcqs || 0} Correct
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-center">
                    <div className="text-[10px] font-bold text-[#667085] uppercase">Coding Marks</div>
                    <div className="text-xl font-extrabold font-mono text-[#22B573] mt-1">
                      {selectedCandidate.coding_score || 0}
                    </div>
                    <div className="text-[10px] text-[#667085] mt-0.5">
                      {selectedCandidate.solved_count || 0} Solved
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-center">
                    <div className="text-[10px] font-bold text-[#667085] uppercase">Time Taken</div>
                    <div className="text-xl font-extrabold font-mono text-[#0757B8] dark:text-[#60A5FA] mt-1">
                      {selectedCandidate.time_taken}
                    </div>
                    <div className="text-[10px] text-[#667085] mt-0.5">Total Duration</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Coding Breakdown */}
            {modalTab === 'coding' && (
              <div className="space-y-2">
                {(!selectedCandidate.problem_breakdowns || selectedCandidate.problem_breakdowns.length === 0) ? (
                  <div className="p-6 text-center text-[#667085] text-xs">No coding problems attempted in this contest.</div>
                ) : (
                  selectedCandidate.problem_breakdowns.map((pb, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[#172033] dark:text-[#F8FAFC]">
                          {idx + 1}. {pb.problem_title}
                        </div>
                        <div className="text-[11px] text-[#667085] dark:text-[#94A3B8] font-mono mt-0.5">
                          Language: {pb.language || 'python'} • Runtime: {pb.runtime || 0}ms • Memory: {pb.memory || 0}MB
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${pb.status === 'Accepted'
                            ? 'bg-[#22B573]/15 text-[#22B573]'
                            : 'bg-amber-500/15 text-amber-600'
                          }`}>
                          {pb.status} ({pb.passed_test_cases}/{pb.total_test_cases} TCs)
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Anti-Cheat Audit */}
            {modalTab === 'anticheat' && (
              <div className="space-y-2">
                <div className={`p-3.5 rounded-xl border ${selectedCandidate.anti_cheat?.status === 'AUTO_TERMINATED'
                    ? 'bg-red-500/10 border-red-500/30 text-red-600'
                    : selectedCandidate.anti_cheat?.status === 'FLAGGED'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                  }`}>
                  <div className="font-bold uppercase tracking-wider text-[10px]">Security Verdict: {selectedCandidate.anti_cheat?.status}</div>
                  {selectedCandidate.anti_cheat?.termination_reason && (
                    <div className="text-xs font-semibold mt-1">Reason: {selectedCandidate.anti_cheat.termination_reason}</div>
                  )}
                </div>

                {(!selectedCandidate.anti_cheat?.logs || selectedCandidate.anti_cheat.logs.length === 0) ? (
                  <div className="p-6 text-center text-[#667085] text-xs">Zero security integrity events recorded. Clean submission.</div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {selectedCandidate.anti_cheat.logs.map((log, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-[#0B0F14] border border-[#30363D] text-[11px] font-mono text-slate-300 flex items-center justify-between">
                        <span>{log.event_type || 'SECURITY_EVENT'}: {log.detail}</span>
                        <span className="text-[10px] text-slate-500">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
