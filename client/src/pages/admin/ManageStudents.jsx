import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  KeyRound, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  FileSpreadsheet,
  UploadCloud,
  FileText,
  X,
  Check,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Info
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Loader';

export const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Bulk selection and deletion states
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPwdModalOpen, setIsResetPwdModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Bulk Excel Import states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState('upload'); // 'upload' | 'preview' | 'success'
  const [importFile, setImportFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // Form states for manual Add / Edit
  const [formData, setFormData] = useState({
    student_id: '',
    name: '',
    email: '',
    department: 'Computer Science & Engineering',
    year: '3rd Year',
    password: '',
    status: 'active',
  });
  const [newPassword, setNewPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const departmentsList = [
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

  const yearsList = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

  useEffect(() => {
    setSelectedIds([]);
    fetchStudents();
  }, [search, deptFilter, yearFilter, page]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 12,
        search: search.trim(),
        department: deptFilter !== 'All' ? deptFilter : undefined,
        year: yearFilter !== 'All' ? yearFilter : undefined,
      };
      const res = await api.get('/admin/students', { params });
      if (res.data.success) {
        setStudents(res.data.students);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      student_id: '',
      name: '',
      email: '',
      department: 'Computer Science & Engineering',
      year: '3rd Year',
      password: '',
      status: 'active',
    });
    setErrorMsg('');
    setIsAddModalOpen(true);
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await api.post('/admin/students', formData);
      if (res.data.success) {
        setIsAddModalOpen(false);
        fetchStudents();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to create student.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (student) => {
    setSelectedStudent(student);
    setFormData({
      student_id: student.student_id,
      name: student.name,
      email: student.email || '',
      department: student.department || 'Computer Science & Engineering',
      year: student.year || '3rd Year',
      status: student.status || 'active',
    });
    setErrorMsg('');
    setIsEditModalOpen(true);
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await api.put(`/admin/students/${selectedStudent.id}`, formData);
      if (res.data.success) {
        setIsEditModalOpen(false);
        fetchStudents();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to update student.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenResetPwd = (student) => {
    setSelectedStudent(student);
    setNewPassword('student123');
    setErrorMsg('');
    setIsResetPwdModalOpen(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await api.post(`/admin/students/${selectedStudent.id}/reset-password`, {
        new_password: newPassword,
      });
      if (res.data.success) {
        setIsResetPwdModalOpen(false);
        alert(`Password for ${selectedStudent.name} (${selectedStudent.student_id}) reset to: ${newPassword}`);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (student) => {
    const newStatus = student.status === 'active' ? 'disabled' : 'active';
    try {
      const res = await api.put(`/admin/students/${student.id}`, { status: newStatus });
      if (res.data.success) {
        fetchStudents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this student and their submission records?')) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.delete(`/admin/students/${id}`);
      if (res.data.success) {
        fetchStudents();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete student.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const visibleIds = students.map(s => s.id);
      setSelectedIds(prev => {
        const newSelection = new Set([...prev, ...visibleIds]);
        return Array.from(newSelection);
      });
    } else {
      const visibleIds = students.map(s => s.id);
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleBulkDelete = async () => {
    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await api.post('/admin/students/bulk-delete', { ids: selectedIds });
      if (res.data.success) {
        setIsDeleteConfirmOpen(false);
        setSelectedIds([]);
        setSuccessMsg(res.data.message || `Successfully deleted ${selectedIds.length} students.`);
        // Auto clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMsg('');
        }, 5000);
        fetchStudents();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to bulk delete students.');
    } finally {
      setActionLoading(false);
    }
  };

  // ------------------ BULK EXCEL IMPORT HANDLERS ------------------

  const handleOpenImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelectDirectly = async (file) => {
    if (!file) return;
    setImportError('');

    const validExtensions = ['.xlsx', '.xls'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      alert('Invalid file format. Please select a valid Excel file (.xlsx or .xls).');
      return;
    }

    setImportFile(file);
    setPreviewData(null);
    setImportResult(null);
    setImportStep('preview');
    setIsImportModalOpen(true);
    setImportLoading(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const res = await api.post('/admin/students/import-preview', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setPreviewData(res.data);
      } else {
        setImportError(res.data.error || 'Failed to analyze Excel file.');
      }
    } catch (err) {
      setImportError(err.response?.data?.error || 'Failed to analyze Excel file.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!previewData || !previewData.rows) return;

    const validStudents = previewData.rows.filter(r => r.status === 'Valid');
    if (validStudents.length === 0) {
      setImportError('There are no valid student rows to import.');
      return;
    }

    try {
      setImportLoading(true);
      setImportError('');
      const res = await api.post('/admin/students/import-commit', {
        students: validStudents
      });

      if (res.data.success) {
        setImportResult(res.data);
        setImportStep('success');
      }
    } catch (err) {
      setImportError(err.response?.data?.error || 'Failed to import students.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
    if (importStep === 'success') {
      fetchStudents();
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hidden File Input for Direct Native File Explorer Selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.[0] && handleFileSelectDirectly(e.target.files[0])}
        accept=".xlsx, .xls"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#0757B8] dark:text-[#60A5FA]" />
            Manage Students
          </h1>
          <p className="text-sm text-[#667085] dark:text-[#94A3B8] mt-1">
            Directory of enrolled students, bulk Excel onboarding, and credential management
          </p>
        </div>

        {/* Action Buttons: Bulk Delete, Add Student & Import Students */}
        <div className="flex items-center gap-3">
          <button
            disabled={selectedIds.length === 0}
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#EF4444] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-red-500/20 flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Selected ({selectedIds.length})</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-2xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
          <button
            onClick={handleOpenImport}
            className="px-4 py-2.5 rounded-2xl bg-[#22B573] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Students</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-[#22B573]/10 border border-[#22B573]/25 text-[#22B573] font-bold flex items-center justify-between gap-2.5 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-[#22B573] hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative flex-1 w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#667085] dark:text-[#94A3B8]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search students by ID, name, email..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] placeholder-[#667085] dark:placeholder-[#94A3B8] text-xs font-semibold focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition shadow-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            className="py-2 px-3 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] text-xs font-bold"
          >
            <option value="All">All Departments</option>
            {departmentsList.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setPage(1);
            }}
            className="py-2 px-3 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] text-xs font-bold"
          >
            <option value="All">All Years</option>
            {yearsList.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <span className="text-xs font-mono font-bold text-[#0757B8] dark:text-[#60A5FA] bg-[#DDF2FF] dark:bg-[#142A43] px-3 py-1.5 rounded-2xl border border-[#0757B8]/20 dark:border-[#0066CC]/40">
            Total: {pagination.total} Students
          </span>
        </div>
      </div>

      {/* Students Table with #303442 Dark Header */}
      <div className="rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] overflow-hidden shadow-sm">
        {loading ? (
          <PageLoader text="Loading students directory..." />
        ) : students.length === 0 ? (
          <div className="py-16 text-center text-[#667085] dark:text-[#94A3B8] text-sm">
            No students found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#303442] text-white font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={students.length > 0 && students.every(s => selectedIds.includes(s.id))}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-4 px-4">Student ID</th>
                  <th className="py-4 px-4">Full Name</th>
                  <th className="py-4 px-4">Email</th>
                  <th className="py-4 px-4">Department / Year</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E0E8] dark:divide-[#30363D]/60 font-sans">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F5F7FA] dark:hover:bg-[#151A21]/60 transition">
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(s.id)}
                        onChange={() => handleSelectRow(s.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-mono font-extrabold text-[#0757B8] dark:text-[#60A5FA]">
                      {s.student_id}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#172033] dark:text-[#F8FAFC]">
                      {s.name}
                    </td>
                    <td className="py-3.5 px-4 text-[#667085] dark:text-[#94A3B8]">
                      {s.email || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[#172033] dark:text-[#F8FAFC] font-semibold">{s.department}</div>
                      <div className="text-[11px] text-[#667085] dark:text-[#94A3B8]">{s.year}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(s)}
                        title="Click to toggle active/disabled status"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition ${
                          s.status === 'active'
                            ? 'bg-[#22B573]/15 text-[#22B573] border border-[#22B573]/30'
                            : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                        }`}
                      >
                        {s.status === 'active' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            <span>Disabled</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenResetPwd(s)}
                          title="Reset Password"
                          className="p-1.5 rounded-lg bg-[#F5F7FA] dark:bg-[#151A21] hover:bg-[#F2B705]/20 text-[#F2B705] border border-[#D9E0E8] dark:border-[#30363D] transition shadow-sm"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(s)}
                          title="Edit Student"
                          className="p-1.5 rounded-lg bg-[#F5F7FA] dark:bg-[#151A21] hover:bg-[#DDF2FF] dark:hover:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] border border-[#D9E0E8] dark:border-[#30363D] transition shadow-sm"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s.id)}
                          title="Delete Student"
                          className="p-1.5 rounded-lg bg-[#F5F7FA] dark:bg-[#151A21] hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#D9E0E8] dark:border-[#30363D] transition shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#D9E0E8] dark:border-[#30363D] bg-[#F5F7FA] dark:bg-[#151A21] text-xs text-[#667085] dark:text-[#94A3B8]">
            <div>
              Page <span className="font-mono text-[#172033] dark:text-[#F8FAFC] font-bold">{page}</span> of{' '}
              <span className="font-mono text-[#172033] dark:text-[#F8FAFC] font-bold">{pagination.pages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-2 rounded-xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] hover:bg-[#F5F7FA] text-[#172033] dark:text-[#F8FAFC] disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage(page + 1)}
                className="p-2 rounded-xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] hover:bg-[#F5F7FA] text-[#172033] dark:text-[#F8FAFC] disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 🚀 BULK EXCEL STUDENT IMPORT MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={handleCloseImportModal}
        title="Import Students"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4 text-xs font-sans">
          
          {/* Subtitle */}
          <p className="text-xs text-[#667085] dark:text-[#94A3B8] -mt-2">
            Upload an Excel file to add multiple students at once.
          </p>

          {importError && (
            <div className="p-4 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/25 text-[#EF4444] font-bold flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
              <button
                type="button"
                onClick={handleOpenImport}
                className="px-3 py-1 bg-[#EF4444] text-white rounded-xl font-bold text-[11px] hover:opacity-90 transition shrink-0"
              >
                Browse Excel File
              </button>
            </div>
          )}

          {/* LOADING STATE */}
          {importLoading && !previewData && (
            <div className="py-12">
              <PageLoader text="Analyzing & validating Excel records..." />
            </div>
          )}

          {/* STEP 2: PREVIEW TABLE & STATS */}
          {importStep === 'preview' && previewData && (
            <div className="space-y-4">
              
              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-center">
                  <div className="text-[10px] uppercase font-bold text-[#667085] dark:text-[#94A3B8]">Total Rows</div>
                  <div className="text-xl font-extrabold font-mono text-[#172033] dark:text-[#F8FAFC] mt-0.5">
                    {previewData.total_rows}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-[#22B573]/10 border border-[#22B573]/25 text-center">
                  <div className="text-[10px] uppercase font-bold text-[#22B573]">Valid Students</div>
                  <div className="text-xl font-extrabold font-mono text-[#22B573] mt-0.5">
                    {previewData.valid_count}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/25 text-center">
                  <div className="text-[10px] uppercase font-bold text-[#EF4444]">Invalid / Errors</div>
                  <div className="text-xl font-extrabold font-mono text-[#EF4444] mt-0.5">
                    {previewData.invalid_count}
                  </div>
                </div>
              </div>

              {/* Preview Table */}
              <div className="rounded-2xl border border-[#D9E0E8] dark:border-[#30363D] overflow-hidden bg-[#FFFFFF] dark:bg-[#20252C]">
                <div className="max-h-[320px] overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#303442] text-white font-bold uppercase sticky top-0 z-10">
                      <tr>
                        <th className="py-3 px-3">#</th>
                        <th className="py-3 px-3">Register Number</th>
                        <th className="py-3 px-3">Name</th>
                        <th className="py-3 px-3">Email</th>
                        <th className="py-3 px-3">Department</th>
                        <th className="py-3 px-3">Year</th>
                        <th className="py-3 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9E0E8] dark:divide-[#30363D]/60 font-sans">
                      {previewData.rows.map((row, idx) => (
                        <tr key={idx} className={row.status === 'Valid' ? 'hover:bg-[#F5F7FA] dark:hover:bg-[#151A21]/50' : 'bg-[#EF4444]/5'}>
                          <td className="py-2.5 px-3 font-mono text-[#667085] dark:text-[#94A3B8]">
                            {row.row_number}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#0757B8] dark:text-[#60A5FA]">
                            {row.register_number || row.student_id || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#172033] dark:text-[#F8FAFC]">
                            {row.name || row.full_name || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-[#667085] dark:text-[#94A3B8]">
                            {row.email || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-[#172033] dark:text-[#F8FAFC]">
                            {row.department || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-[#667085] dark:text-[#94A3B8]">
                            {row.year || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {row.status === 'Valid' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#22B573]/15 text-[#22B573] border border-[#22B573]/30 font-bold text-[11px]">
                                <Check className="w-3 h-3" />
                                <span>Valid</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 font-bold text-[11px]" title={row.error_message}>
                                <X className="w-3 h-3" />
                                <span>{row.error_message}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {previewData.valid_count === 0 && (
                <div className="p-3 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/25 text-[#EF4444] font-bold text-center">
                  No valid student records found in this file to import. Please resolve the errors and re-upload.
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleOpenImport}
                  className="px-4 py-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] font-semibold"
                >
                  &larr; Choose Different File
                </button>

                <button
                  type="button"
                  disabled={previewData.valid_count === 0 || importLoading}
                  onClick={handleCommitImport}
                  className="px-6 py-2.5 rounded-xl bg-[#22B573] hover:opacity-95 text-white font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-40"
                >
                  {importLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Importing students... Please wait.</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Import {previewData.valid_count} Valid Students</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* STEP 3: SUCCESS SUMMARY */}
          {importStep === 'success' && importResult && (
            <div className="space-y-4">
              
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-[#22B573]/15 text-[#22B573] flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-extrabold text-[#172033] dark:text-[#F8FAFC]">
                  Bulk Import Completed
                </h3>
                <p className="text-xs text-[#667085] dark:text-[#94A3B8]">
                  Student credentials have been safely created with hashed passwords.
                </p>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#22B573]/10 border border-[#22B573]/25 text-center">
                  <div className="text-[10px] uppercase font-bold text-[#22B573]">Successfully Imported</div>
                  <div className="text-2xl font-extrabold font-mono text-[#22B573] mt-0.5">
                    {importResult.summary?.imported_count || 0}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F2B705]/10 border border-[#F2B705]/25 text-center">
                  <div className="text-[10px] uppercase font-bold text-[#F2B705]">Skipped (Duplicate)</div>
                  <div className="text-2xl font-extrabold font-mono text-[#F2B705] mt-0.5">
                    {importResult.summary?.skipped_count || 0}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/25 text-center">
                  <div className="text-[10px] uppercase font-bold text-[#EF4444]">Failed</div>
                  <div className="text-2xl font-extrabold font-mono text-[#EF4444] mt-0.5">
                    {importResult.summary?.failed_count || 0}
                  </div>
                </div>
              </div>

              {/* Detailed results list if there are skipped or failed items */}
              {importResult.details && importResult.details.filter(d => d.status !== 'Success').length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-[#667085] dark:text-[#94A3B8] text-[11px] uppercase">
                    Skipped / Failed Details:
                  </div>
                  <div className="max-h-36 overflow-y-auto rounded-2xl border border-[#D9E0E8] dark:border-[#30363D] p-2 bg-[#F5F7FA] dark:bg-[#151A21] space-y-1 font-mono text-[11px]">
                    {importResult.details.filter(d => d.status !== 'Success').map((d, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D]">
                        <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">{d.register_number || d.student_id} ({d.name})</span>
                        <span className="text-[#EF4444] font-semibold">{d.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close / Refresh Button */}
              <div className="pt-3 flex justify-center">
                <button
                  type="button"
                  onClick={handleCloseImportModal}
                  className="px-8 py-2.5 rounded-2xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition"
                >
                  Close & View Students List
                </button>
              </div>

            </div>
          )}

        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* ➕ MANUAL ADD STUDENT MODAL (PRESERVED) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Student"
        maxWidth="max-w-lg"
      >
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        <form onSubmit={handleCreateStudent} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Student ID / Register No *</label>
            <input
              type="text"
              required
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value.toUpperCase() })}
              placeholder="e.g. STU010 or 2023CS101"
              className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
            />
          </div>

          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Student Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Rohan Varma"
              className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
            />
          </div>

          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="rohan@college.edu"
              className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
              >
                {departmentsList.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Year</label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
              >
                {yearsList.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Initial Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Defaults to student123"
              className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold shadow-md shadow-blue-500/20"
            >
              {actionLoading ? 'Creating...' : 'Create Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* ✏️ EDIT STUDENT MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Student: ${selectedStudent?.student_id}`}
        maxWidth="max-w-lg"
      >
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        <form onSubmit={handleUpdateStudent} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Student Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
            />
          </div>

          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
              >
                {departmentsList.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Year</label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
              >
                {yearsList.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold shadow-md shadow-blue-500/20"
            >
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 🔑 RESET PASSWORD MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isResetPwdModalOpen}
        onClose={() => setIsResetPwdModalOpen(false)}
        title={`Reset Password: ${selectedStudent?.name}`}
        maxWidth="max-w-md"
      >
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
          <p className="text-[#667085] dark:text-[#94A3B8]">
            Set a new temporary password for student <strong className="text-[#172033] dark:text-[#F8FAFC]">{selectedStudent?.student_id}</strong>.
          </p>

          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">New Password *</label>
            <input
              type="text"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="e.g. student123"
              className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold font-mono"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsResetPwdModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-xl bg-[#F2B705] hover:opacity-95 text-white font-bold shadow-md shadow-amber-500/20"
            >
              {actionLoading ? 'Resetting...' : 'Confirm Reset Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* ⚠️ BULK DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Confirm Bulk Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs font-sans text-left">
          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-700 dark:text-red-400">Warning</h4>
              <p className="text-red-600 dark:text-red-300 mt-1">
                You are about to permanently delete <strong>{selectedIds.length}</strong> selected students and all of their associated records. This action cannot be undone.
              </p>
            </div>
          </div>

          <p className="text-[#667085] dark:text-[#94A3B8] leading-relaxed">
            Are you sure you want to proceed with the deletion?
          </p>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleBulkDelete}
              className="px-5 py-2.5 rounded-xl bg-[#EF4444] hover:opacity-95 text-white font-bold shadow-md shadow-red-500/20 flex items-center gap-2"
            >
              {actionLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Yes, Delete {selectedIds.length} Students</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
