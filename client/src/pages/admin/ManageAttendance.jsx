import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  CalendarCheck, 
  Trophy, 
  Code2, 
  Search, 
  Filter, 
  RotateCcw, 
  Download, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Percent, 
  Clock, 
  FileSpreadsheet, 
  ChevronRight,
  Info,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Loader';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const YEARS = [2024, 2025, 2026, 2027];

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
  'Aeronautical Engineering',
  'Computer & Communication Engineering',
  'Artificial Intelligence & Machine Learning'
];

const COLLEGE_YEARS = ['All', '1st Year', '2nd Year', '3rd Year', '4th Year'];

export const ManageAttendance = () => {
  const now = new Date();
  const [activeTab, setActiveTab] = useState('contest'); // 'contest' | 'daily'

  // Filter States
  const [deptFilter, setDeptFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState(now.getMonth() + 1);
  const [calendarYearFilter, setCalendarYearFilter] = useState(now.getFullYear());
  const [search, setSearch] = useState('');

  // Data States
  const [data, setData] = useState({
    students: [],
    summary: { total_students: 0, total_present: 0, total_absent: 0, attendance_rate: 100 },
    num_days: 31,
    contests_by_day: {}
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Cell Detail Modal State
  const [selectedCell, setSelectedCell] = useState(null);

  useEffect(() => {
    fetchAttendance();
  }, [activeTab, monthFilter, calendarYearFilter]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const endpoint = activeTab === 'contest' ? '/admin/attendance/contest' : '/admin/attendance/daily';
      const params = {
        department: deptFilter !== 'All' ? deptFilter : undefined,
        year: yearFilter !== 'All' ? yearFilter : undefined,
        month: monthFilter,
        calendar_year: calendarYearFilter,
        search: search.trim() || undefined
      };

      const res = await api.get(endpoint, { params });
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchAttendance();
  };

  const handleResetFilters = () => {
    setDeptFilter('All');
    setYearFilter('All');
    setMonthFilter(now.getMonth() + 1);
    setCalendarYearFilter(now.getFullYear());
    setSearch('');
    setTimeout(() => {
      fetchAttendance();
    }, 50);
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        type: activeTab,
        department: deptFilter !== 'All' ? deptFilter : '',
        year: yearFilter !== 'All' ? yearFilter : '',
        month: String(monthFilter),
        calendar_year: String(calendarYearFilter),
        search: search.trim()
      });

      const response = await fetch(`/api/admin/attendance/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Export request failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const monthObj = MONTHS.find(m => m.value === Number(monthFilter));
      const monthLabel = monthObj ? monthObj.label : 'Month';
      a.download = `${activeTab}_attendance_${monthLabel}_${calendarYearFilter}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export Excel:', err);
      alert('Failed to export Excel report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const currentMonthLabel = MONTHS.find(m => m.value === Number(monthFilter))?.label || 'Month';
  const numDays = data.num_days || 31;
  const daysArray = Array.from({ length: numDays }, (_, i) => i + 1);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <CalendarCheck className="w-6 h-6 text-[#0757B8] dark:text-[#60A5FA]" />
            Student Attendance Management
          </h1>
          <p className="text-sm text-[#667085] dark:text-[#94A3B8] mt-1">
            Real-time participation tracking for Scheduled Contests and Daily Problem Solving
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex p-1 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('contest')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'contest'
                ? 'bg-[#0757B8] dark:bg-[#0066CC] text-white shadow-md shadow-blue-500/20'
                : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Contest Attendance</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'daily'
                ? 'bg-[#22B573] text-white shadow-md shadow-emerald-600/20'
                : 'text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Daily Solving Attendance</span>
          </button>
        </div>
      </div>

      {/* Filter & Export Toolbar */}
      <div className="p-5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm space-y-4">
        <form onSubmit={handleApplyFilters} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
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

          {/* Month Filter */}
          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wider text-[10px]">
              Month
            </label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(Number(e.target.value))}
              className="w-full py-2.5 px-3 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
            >
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Calendar Year Filter */}
          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wider text-[10px]">
              Calendar Year
            </label>
            <select
              value={calendarYearFilter}
              onChange={(e) => setCalendarYearFilter(Number(e.target.value))}
              className="w-full py-2.5 px-3 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
            >
              {YEARS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wider text-[10px]">
              Search Student
            </label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or Student ID..."
                className="w-full pl-8 pr-3 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold text-xs"
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-[#667085]" />
            </div>
          </div>
        </form>

        {/* Toolbar Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#D9E0E8] dark:border-[#30363D]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAttendance}
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

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || loading}
            className="px-4 py-2 rounded-xl bg-[#22B573] hover:opacity-95 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exporting ? 'Generating Report...' : `Export ${activeTab === 'contest' ? 'Contest' : 'Daily Solving'} Excel`}</span>
          </button>
        </div>
      </div>

      {/* Attendance Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-[#667085] dark:text-[#94A3B8]">Total Students</div>
            <div className="text-xl font-extrabold font-mono text-[#172033] dark:text-[#F8FAFC]">
              {data.summary?.total_students || 0}
            </div>
          </div>
        </div>

        {/* Present Instances */}
        <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#22B573]/15 text-[#22B573] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-[#22B573]">Present Days</div>
            <div className="text-xl font-extrabold font-mono text-[#22B573]">
              {data.summary?.total_present || 0}
            </div>
          </div>
        </div>

        {/* Absent Instances */}
        <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#EF4444]/15 text-[#EF4444] flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-[#EF4444]">Absent Days</div>
            <div className="text-xl font-extrabold font-mono text-[#EF4444]">
              {data.summary?.total_absent || 0}
            </div>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">Attendance Rate</div>
            <div className="text-xl font-extrabold font-mono text-[#172033] dark:text-[#F8FAFC]">
              {data.summary?.attendance_rate || 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Legend & Month Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs">
        <div className="font-bold text-[#172033] dark:text-[#F8FAFC] flex items-center gap-2">
          <span>{currentMonthLabel} {calendarYearFilter} Attendance Sheet</span>
          <span className="text-[11px] font-mono text-[#667085] dark:text-[#94A3B8]">({numDays} Days)</span>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-semibold text-[#667085] dark:text-[#94A3B8]">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-md bg-[#22B573]/20 border border-[#22B573]/40 text-[#22B573] flex items-center justify-center font-bold text-[9px]">P</span>
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-md bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444] flex items-center justify-center font-bold text-[9px]">A</span>
            <span>Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-md bg-slate-200 dark:bg-[#151A21] border border-slate-300 dark:border-slate-700 text-slate-400 flex items-center justify-center font-mono text-[9px]">-</span>
            <span>{activeTab === 'contest' ? 'No Contest / Future' : 'Future Date'}</span>
          </div>
        </div>
      </div>

      {/* Student-wise Monthly Calendar Grid */}
      <div className="rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20">
            <PageLoader text="Calculating student participation & compiling monthly attendance grid..." />
          </div>
        ) : data.students.length === 0 ? (
          <div className="py-20 text-center text-[#667085] dark:text-[#94A3B8] text-xs">
            No students found matching your selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-[#303442] text-white font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 sticky left-0 z-20 bg-[#303442] min-w-[220px] shadow-sm">
                    Student Details
                  </th>
                  {daysArray.map((d) => {
                    const hasContest = activeTab === 'contest' && data.contests_by_day?.[String(d)]?.length > 0;
                    return (
                      <th
                        key={d}
                        className={`py-3.5 px-1.5 text-center min-w-[34px] font-mono ${
                          hasContest ? 'bg-[#0757B8]/40 text-blue-200 font-extrabold' : ''
                        }`}
                        title={hasContest ? `Contest on day ${d}: ${data.contests_by_day[String(d)][0].title}` : `Day ${d}`}
                      >
                        <div>{d}</div>
                        {hasContest && <div className="text-[8px] uppercase tracking-tighter text-[#60A5FA]">🏆</div>}
                      </th>
                    );
                  })}
                  <th className="py-3.5 px-3 text-center min-w-[60px] bg-[#303442]">Present</th>
                  <th className="py-3.5 px-3 text-center min-w-[60px] bg-[#303442]">Absent</th>
                  <th className="py-3.5 px-3 text-center min-w-[70px] bg-[#303442]">Rate %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E0E8] dark:divide-[#30363D]/60 text-xs">
                {data.students.map((st) => (
                  <tr key={st.id} className="hover:bg-[#F5F7FA] dark:hover:bg-[#151A21]/60 transition">
                    {/* Student Info (Sticky Left Column) */}
                    <td className="py-3 px-4 sticky left-0 z-10 bg-[#FFFFFF] dark:bg-[#20252C] group-hover:bg-[#F5F7FA] border-r border-[#D9E0E8] dark:border-[#30363D] shadow-sm">
                      <div className="font-bold text-[#172033] dark:text-[#F8FAFC] truncate max-w-[200px]">
                        {st.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#667085] dark:text-[#94A3B8] mt-0.5">
                        <span className="font-mono font-bold text-[#0757B8] dark:text-[#60A5FA]">{st.student_id}</span>
                        <span>•</span>
                        <span className="truncate max-w-[110px]">{st.department}</span>
                      </div>
                    </td>

                    {/* Day-by-Day Attendance Status Cells */}
                    {daysArray.map((d) => {
                      const dayInfo = st.days?.[String(d)] || { status: 'FUTURE' };
                      const isPresent = dayInfo.status === 'PRESENT';
                      const isAbsent = dayInfo.status === 'ABSENT';

                      return (
                        <td key={d} className="p-1 text-center font-mono">
                          {isPresent ? (
                            <button
                              type="button"
                              onClick={() => setSelectedCell({ student: st, day: d, ...dayInfo })}
                              className="w-7 h-7 rounded-lg bg-[#22B573]/20 hover:bg-[#22B573] hover:text-white border border-[#22B573]/40 text-[#22B573] font-bold text-xs inline-flex items-center justify-center transition shadow-sm"
                              title={`Present on ${d} ${currentMonthLabel} - Click for details`}
                            >
                              ✓
                            </button>
                          ) : isAbsent ? (
                            <button
                              type="button"
                              onClick={() => setSelectedCell({ student: st, day: d, ...dayInfo })}
                              className="w-7 h-7 rounded-lg bg-[#EF4444]/15 hover:bg-[#EF4444] hover:text-white border border-[#EF4444]/30 text-[#EF4444] font-bold text-xs inline-flex items-center justify-center transition"
                              title={`Absent on ${d} ${currentMonthLabel} - Click for details`}
                            >
                              ✕
                            </button>
                          ) : (
                            <span className="w-7 h-7 text-slate-300 dark:text-slate-700 inline-flex items-center justify-center font-bold">
                              ○
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Summary Columns */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-[#22B573]">
                      {st.present_count}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-[#EF4444]">
                      {st.absent_count}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-extrabold text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                        st.attendance_percentage >= 75
                          ? 'bg-[#22B573]/15 text-[#22B573] border border-[#22B573]/30'
                          : st.attendance_percentage >= 50
                            ? 'bg-[#F2B705]/15 text-[#F2B705] border border-[#F2B705]/30'
                            : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                      }`}>
                        {st.attendance_percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CELL DETAIL MODAL POPUP */}
      <Modal
        isOpen={Boolean(selectedCell)}
        onClose={() => setSelectedCell(null)}
        title="Attendance Record Detail"
        maxWidth="max-w-md"
      >
        {selectedCell && (
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3.5 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-[#172033] dark:text-[#F8FAFC]">
                  {selectedCell.student.name}
                </div>
                <div className="text-[11px] text-[#667085] dark:text-[#94A3B8] font-mono mt-0.5">
                  ID: {selectedCell.student.student_id} • {selectedCell.student.department}
                </div>
              </div>

              <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                selectedCell.status === 'PRESENT'
                  ? 'bg-[#22B573]/20 text-[#22B573] border border-[#22B573]/40'
                  : 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
              }`}>
                {selectedCell.status === 'PRESENT' ? 'PRESENT ✅' : 'ABSENT ❌'}
              </span>
            </div>

            <div className="space-y-2 p-3.5 rounded-2xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D]">
              <div className="flex items-center justify-between py-1 border-b border-[#D9E0E8] dark:border-[#30363D]">
                <span className="text-[#667085] dark:text-[#94A3B8] font-semibold">Date</span>
                <span className="font-bold font-mono text-[#172033] dark:text-[#F8FAFC]">
                  {selectedCell.day} {currentMonthLabel} {calendarYearFilter}
                </span>
              </div>

              {activeTab === 'contest' ? (
                <>
                  <div className="flex items-center justify-between py-1 border-b border-[#D9E0E8] dark:border-[#30363D]">
                    <span className="text-[#667085] dark:text-[#94A3B8] font-semibold">Contest Event</span>
                    <span className="font-bold text-[#0757B8] dark:text-[#60A5FA]">
                      {selectedCell.detail?.title || selectedCell.detail?.contests?.[0]?.title || 'Contest'}
                    </span>
                  </div>
                  {selectedCell.status === 'PRESENT' && (
                    <>
                      <div className="flex items-center justify-between py-1 border-b border-[#D9E0E8] dark:border-[#30363D]">
                        <span className="text-[#667085] dark:text-[#94A3B8] font-semibold">Entry Timestamp</span>
                        <span className="font-mono text-[#172033] dark:text-[#F8FAFC]">
                          {selectedCell.detail?.joined_at ? new Date(selectedCell.detail.joined_at).toLocaleTimeString() : 'Recorded'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-[#667085] dark:text-[#94A3B8] font-semibold">Contest Score</span>
                        <span className="font-mono font-bold text-[#22B573]">
                          {selectedCell.detail?.score || 0} pts
                        </span>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between py-1 border-b border-[#D9E0E8] dark:border-[#30363D]">
                    <span className="text-[#667085] dark:text-[#94A3B8] font-semibold">Required Activity</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">Daily Problem Solving</span>
                  </div>
                  {selectedCell.status === 'PRESENT' && selectedCell.solved?.length > 0 && (
                    <>
                      <div className="py-1">
                        <span className="text-[#667085] dark:text-[#94A3B8] font-semibold block mb-1">Solved Challenges:</span>
                        <div className="space-y-1 font-mono">
                          {selectedCell.solved.map((p, pIdx) => (
                            <div key={pIdx} className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] flex items-center justify-between">
                              <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">{p.problem_title}</span>
                              <span className="px-2 py-0.5 rounded bg-[#22B573]/20 text-[#22B573] text-[10px] font-bold uppercase">{p.language}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="px-4 py-2 rounded-xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
