import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  X,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { DifficultyBadge, TopicTag } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Loader';

export const ManageMCQs = () => {
  const [mcqs, setMcqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Selection & Bulk Delete states
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteModalType, setDeleteModalType] = useState('selected'); // 'selected' | 'all' | 'single'
  const [targetSingleId, setTargetSingleId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Modal create/edit states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [globalSuccessMsg, setGlobalSuccessMsg] = useState('');

  // Excel Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importCommitLoading, setImportCommitLoading] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState(null);
  const [importErrorMsg, setImportErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    question: '',
    topic: 'C Programming',
    difficulty: 'Easy',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
  });

  const mcqTopics = [
    'C Programming', 'C++ & OOP', 'Java', 'Python', 'Data Structures',
    'Database Management Systems', 'Operating Systems', 'Computer Networks',
    'Software Engineering', 'Aptitude & Logical Reasoning'
  ];

  useEffect(() => {
    fetchMCQs();
  }, [search, topicFilter, page]);

  const fetchMCQs = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        search: search.trim() || undefined,
        topic: topicFilter !== 'All' ? topicFilter : undefined,
      };
      const res = await api.get('/admin/mcqs', { params });
      if (res.data.success) {
        setMcqs(res.data.mcqs);
        setPagination({
          total: res.data.pagination?.total || res.data.total || 0,
          pages: res.data.pagination?.pages || Math.ceil(res.data.total / 15) || 1,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ----------------- SELECTION HANDLERS -----------------

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const visibleIds = mcqs.map((m) => m.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    } else {
      const visibleIds = mcqs.map((m) => m.id);
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // ----------------- DELETE MODAL HANDLERS -----------------

  const handleOpenDeleteSingle = (mcqId) => {
    setTargetSingleId(mcqId);
    setDeleteModalType('single');
    setIsDeleteModalOpen(true);
  };

  const handleOpenDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setDeleteModalType('selected');
    setIsDeleteModalOpen(true);
  };

  const handleOpenDeleteAll = () => {
    setDeleteModalType('all');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleteLoading(true);

      if (deleteModalType === 'single') {
        const res = await api.delete(`/admin/mcqs/${targetSingleId}`);
        if (res.data.success) {
          setSelectedIds((prev) => prev.filter((id) => id !== targetSingleId));
          setGlobalSuccessMsg('MCQ deleted successfully.');
        }
      } else if (deleteModalType === 'selected') {
        const count = selectedIds.length;
        const res = await api.post('/admin/mcqs/bulk-delete', { ids: selectedIds });
        if (res.data.success) {
          setGlobalSuccessMsg(`${count} question${count > 1 ? 's' : ''} deleted successfully.`);
          setSelectedIds([]);
        }
      } else if (deleteModalType === 'all') {
        const res = await api.post('/admin/mcqs/delete-all', {
          topic: topicFilter !== 'All' ? topicFilter : undefined,
        });
        if (res.data.success) {
          setGlobalSuccessMsg('All questions deleted successfully.');
          setSelectedIds([]);
        }
      }

      setIsDeleteModalOpen(false);
      setTimeout(() => setGlobalSuccessMsg(''), 4000);
      fetchMCQs();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete MCQs.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ----------------- CREATE / EDIT HANDLERS -----------------

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      question: '',
      topic: 'C Programming',
      difficulty: 'Easy',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (mcq) => {
    setEditingId(mcq.id);
    setFormData({
      question: mcq.question,
      topic: mcq.topic || 'C Programming',
      difficulty: mcq.difficulty || 'Easy',
      options: mcq.options?.length === 4 ? mcq.options : ['', '', '', ''],
      correct_answer: mcq.correct_answer || '',
      explanation: mcq.explanation || '',
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOptionChange = (index, value) => {
    setFormData((prev) => {
      const updated = [...prev.options];
      updated[index] = value;
      return { ...prev, options: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.correct_answer) {
      setErrorMsg('Please select a valid correct answer option.');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg('');

      if (editingId) {
        const res = await api.put(`/admin/mcqs/${editingId}`, formData);
        if (res.data.success) {
          setIsModalOpen(false);
          setGlobalSuccessMsg('MCQ updated successfully!');
          setTimeout(() => setGlobalSuccessMsg(''), 4000);
          fetchMCQs();
        }
      } else {
        const res = await api.post('/admin/mcqs', formData);
        if (res.data.success) {
          setIsModalOpen(false);
          setGlobalSuccessMsg('MCQ created successfully!');
          setTimeout(() => setGlobalSuccessMsg(''), 4000);
          fetchMCQs();
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to save MCQ.');
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------- EXCEL IMPORT HANDLERS -----------------

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/admin/mcqs/import/template', {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'MCQ_Import_Template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download template:', err);
      alert('Failed to download template. Please try again.');
    }
  };

  const handleOpenImportModal = () => {
    setImportFile(null);
    setImportPreviewData(null);
    setImportErrorMsg('');
    setIsImportModalOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportErrorMsg('');
    setImportPreviewData(null);

    const formDataPayload = new FormData();
    formDataPayload.append('file', file);

    try {
      setImportLoading(true);
      const res = await api.post('/admin/mcqs/import/preview', formDataPayload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setImportPreviewData(res.data);
      }
    } catch (err) {
      setImportErrorMsg(err.response?.data?.error || 'Failed to parse Excel file. Please verify format.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importPreviewData || !importPreviewData.valid_rows?.length) return;

    try {
      setImportCommitLoading(true);
      setImportErrorMsg('');

      const res = await api.post('/admin/mcqs/import/commit', {
        mcqs: importPreviewData.valid_rows
      });

      if (res.data.success) {
        setIsImportModalOpen(false);
        setGlobalSuccessMsg(`Successfully imported ${res.data.imported_count} MCQs!`);
        setTimeout(() => setGlobalSuccessMsg(''), 5000);
        fetchMCQs();
      }
    } catch (err) {
      setImportErrorMsg(err.response?.data?.error || 'Failed to save MCQs to database.');
    } finally {
      setImportCommitLoading(false);
    }
  };

  const allVisibleSelected = mcqs.length > 0 && mcqs.every((m) => selectedIds.includes(m.id));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Manage Technical MCQs / Quiz Bank
          </h1>
          <p className="text-sm text-[#667085] dark:text-[#94A3B8] mt-1">
            Question bank across Computer Science domains and engineering subjects ({pagination.total} total)
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Delete All Button */}
          <button
            onClick={handleOpenDeleteAll}
            disabled={pagination.total === 0}
            className="px-3.5 py-2.5 rounded-2xl bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/30 text-[#EF4444] font-bold text-xs shadow-sm flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
            title="Delete All MCQs in database"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete All</span>
          </button>

          <button
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2.5 rounded-2xl bg-[#FFFFFF] dark:bg-[#20252C] hover:bg-[#F5F7FA] dark:hover:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] font-bold text-xs shadow-sm flex items-center gap-1.5 transition"
            title="Download Sample Excel Template with exact format"
          >
            <Download className="w-3.5 h-3.5 text-[#0757B8] dark:text-[#60A5FA]" />
            <span>Sample Template</span>
          </button>

          <button
            onClick={handleOpenImportModal}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import MCQs</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create MCQ</span>
          </button>
        </div>
      </div>

      {globalSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-[#22B573]/15 border border-[#22B573]/30 text-[#22B573] text-xs flex items-center gap-2 font-bold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{globalSuccessMsg}</span>
        </div>
      )}

      {/* Bulk Delete Bar (When items checked) */}
      {selectedIds.length > 0 && (
        <div className="p-4 rounded-3xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center font-mono font-bold text-xs shadow-sm">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC]">
              {selectedIds.length} question{selectedIds.length > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDeselectAll}
              className="px-3 py-1.5 rounded-xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC] text-xs font-semibold transition"
            >
              Deselect All
            </button>

            <button
              onClick={handleOpenDeleteSelected}
              className="px-4 py-1.5 rounded-xl bg-[#EF4444] hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/20 flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-3.5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] flex items-center justify-between gap-3 shadow-sm flex-wrap">
        {/* Select All Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer select-none px-2 py-1 rounded-xl hover:bg-[#F5F7FA] dark:hover:bg-[#151A21] transition">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={handleSelectAll}
            className="w-4 h-4 rounded text-purple-600 border-[#D9E0E8] dark:border-[#30363D] focus:ring-purple-500 cursor-pointer"
          />
          <span className="text-xs font-bold text-[#667085] dark:text-[#94A3B8]">
            Select All
          </span>
        </label>

        {/* Filter search input */}
        <div className="relative flex-1 min-w-[200px]">
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
            placeholder="Filter questions by question or topic..."
            className="w-full pl-10 pr-4 py-2 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] placeholder-[#667085] dark:placeholder-[#94A3B8] text-xs font-semibold focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC]"
          />
        </div>

        {/* Delete Selected Button */}
        <button
          type="button"
          disabled={selectedIds.length === 0}
          onClick={handleOpenDeleteSelected}
          className="px-3.5 py-2 rounded-2xl bg-[#EF4444] hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>
            {selectedIds.length > 0 ? `Delete Selected (${selectedIds.length})` : 'Delete Selected'}
          </span>
        </button>

        {/* Topic Filter */}
        <select
          value={topicFilter}
          onChange={(e) => {
            setTopicFilter(e.target.value);
            setPage(1);
          }}
          className="py-2 px-3 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] text-xs font-bold"
        >
          <option value="All">All Topics</option>
          {mcqTopics.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Available Count */}
        <span className="text-xs font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap px-1">
          {pagination.total} available
        </span>
      </div>

      {/* MCQs List */}
      <div className="space-y-4">
        {loading ? (
          <PageLoader text="Loading questions database..." />
        ) : mcqs.length === 0 ? (
          <div className="p-16 text-center text-[#667085] dark:text-[#94A3B8] rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C]">
            No questions found.
          </div>
        ) : (
          mcqs.map((m, idx) => {
            const isChecked = selectedIds.includes(m.id);
            return (
              <div
                key={m.id}
                className={`p-5 rounded-3xl border transition space-y-3 shadow-sm ${
                  isChecked
                    ? 'border-purple-500/60 bg-purple-500/5 dark:bg-purple-500/10'
                    : 'border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] hover:border-purple-500/40'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {/* Item Checkbox */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleSelect(m.id)}
                      className="w-4 h-4 mt-1 rounded text-purple-600 border-[#D9E0E8] dark:border-[#30363D] focus:ring-purple-500 cursor-pointer shrink-0"
                    />

                    <span className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs shrink-0 font-mono mt-0.5 border border-purple-500/30">
                      {(page - 1) * 15 + idx + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC]">{m.question}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <TopicTag topic={m.topic} />
                        <DifficultyBadge difficulty={m.difficulty} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(m)}
                      title="Edit MCQ"
                      className="p-1.5 rounded-lg bg-[#F5F7FA] dark:bg-[#151A21] hover:bg-[#DDF2FF] dark:hover:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] border border-[#D9E0E8] dark:border-[#30363D] transition shadow-sm"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteSingle(m.id)}
                      title="Delete MCQ"
                      className="p-1.5 rounded-lg bg-[#F5F7FA] dark:bg-[#151A21] hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#D9E0E8] dark:border-[#30363D] transition shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Options pills */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pl-7">
                  {m.options?.map((opt, optIdx) => {
                    const isCorrect = opt === m.correct_answer;
                    return (
                      <div
                        key={optIdx}
                        className={`p-3 rounded-2xl border flex items-center gap-2 font-semibold ${
                          isCorrect
                            ? 'bg-[#22B573]/15 border-[#22B573] text-[#22B573]'
                            : 'bg-[#F5F7FA] dark:bg-[#151A21] border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC]'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full border border-[#D9E0E8] dark:border-[#30363D] flex items-center justify-center text-[10px] shrink-0 font-bold">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>

                {m.explanation && (
                  <div className="text-[11px] text-[#667085] dark:text-[#94A3B8] bg-[#F5F7FA] dark:bg-[#151A21] p-3 rounded-2xl border border-[#D9E0E8] dark:border-[#30363D] ml-7">
                    <strong className="text-[#172033] dark:text-[#F8FAFC]">Explanation:</strong> {m.explanation}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] text-xs text-[#667085] dark:text-[#94A3B8] shadow-sm">
            <div>
              Page <span className="font-mono text-[#172033] dark:text-[#F8FAFC] font-bold">{page}</span> of{' '}
              <span className="font-mono text-[#172033] dark:text-[#F8FAFC] font-bold">{pagination.pages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage(page + 1)}
                className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MCQ MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit MCQ' : 'Create New Technical MCQ'}
        maxWidth="max-w-2xl"
      >
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#172033] dark:text-[#F8FAFC] mb-1.5">Question Statement *</label>
            <textarea
              required
              rows={3}
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="e.g. Which data structure follows the LIFO (Last In First Out) principle?"
              className="w-full p-3 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] font-semibold focus:outline-none focus:border-[#0757B8]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#172033] dark:text-[#F8FAFC] mb-1.5">Topic Domain *</label>
              <select
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="w-full p-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] font-bold"
              >
                {mcqTopics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#172033] dark:text-[#F8FAFC] mb-1.5">Difficulty Level *</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full p-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] font-bold"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-[#172033] dark:text-[#F8FAFC]">
              Options & Correct Answer (Select the radio of the correct choice) *
            </label>
            {formData.options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct_answer"
                  checked={formData.correct_answer === opt && opt !== ''}
                  onChange={() => setFormData({ ...formData, correct_answer: opt })}
                  disabled={!opt}
                  className="w-4 h-4 text-purple-600 border-[#D9E0E8] dark:border-[#30363D] focus:ring-purple-500 cursor-pointer"
                  title="Mark as correct answer"
                />
                <span className="w-6 h-6 rounded-lg bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] flex items-center justify-center font-mono font-bold text-xs shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <input
                  type="text"
                  required
                  value={opt}
                  onChange={(e) => {
                    handleOptionChange(idx, e.target.value);
                    if (formData.correct_answer === opt) {
                      setFormData((prev) => ({ ...prev, correct_answer: e.target.value }));
                    }
                  }}
                  placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                  className="flex-1 p-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] font-semibold focus:outline-none focus:border-[#0757B8]"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block font-bold text-[#172033] dark:text-[#F8FAFC] mb-1.5">Explanation (Optional)</label>
            <textarea
              rows={2}
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              placeholder="Explain why the selected option is correct..."
              className="w-full p-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] font-semibold focus:outline-none focus:border-[#0757B8]"
            />
          </div>

          <div className="pt-3 border-t border-[#D9E0E8] dark:border-[#30363D] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC] font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/20 disabled:opacity-50 transition"
            >
              {actionLoading ? 'Saving...' : editingId ? 'Update MCQ' : 'Create MCQ'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !deleteLoading && setIsDeleteModalOpen(false)}
        title="Confirm Delete"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-[#EF4444]">
                {deleteModalType === 'all'
                  ? 'Delete Entire MCQ Bank?'
                  : deleteModalType === 'selected'
                  ? `Are you sure you want to delete ${selectedIds.length} selected question${selectedIds.length > 1 ? 's' : ''}?`
                  : 'Are you sure you want to delete this question?'}
              </p>
              <p className="text-[#667085] dark:text-[#94A3B8]">
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={deleteLoading}
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8] font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={handleConfirmDelete}
              className="px-5 py-2 rounded-xl bg-[#EF4444] hover:bg-red-700 text-white font-bold shadow-md shadow-red-500/20 disabled:opacity-50 flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deleteLoading ? 'Deleting...' : 'Yes, Delete'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* EXCEL IMPORT MODAL */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import MCQs from Excel Spreadsheet"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 text-xs">
          {importErrorMsg && (
            <div className="p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{importErrorMsg}</span>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-[#172033] dark:text-[#F8FAFC]">Excel File Formatting Guide</p>
              <p className="text-[#667085] dark:text-[#94A3B8]">
                Columns required: <strong>Question, Option 1, Option 2, Option 3, Option 4, Correct Option (1-4 or A-D), Topic, Difficulty</strong>.
              </p>
            </div>
          </div>

          {/* File Upload Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#D9E0E8] dark:border-[#30363D] hover:border-purple-500 dark:hover:border-purple-400 rounded-3xl p-8 text-center cursor-pointer transition bg-[#F5F7FA] dark:bg-[#151A21]"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
            <p className="font-bold text-sm text-[#172033] dark:text-[#F8FAFC]">
              Click to select Excel (.xlsx, .xls) file
            </p>
            <p className="text-[#667085] dark:text-[#94A3B8] mt-1 text-xs">
              Supports bulk upload of multiple choice questions
            </p>
          </div>

          {importFile && (
            <div className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">{importFile.name}</span>
                <span className="text-[#667085] dark:text-[#94A3B8]">({(importFile.size / 1024).toFixed(1)} KB)</span>
              </div>
              {importLoading && <span className="text-purple-600 font-bold">Parsing...</span>}
            </div>
          )}

          {/* Preview Results */}
          {importPreviewData && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-center">
                  <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] font-bold uppercase">Total Rows</div>
                  <div className="text-lg font-mono font-extrabold text-[#172033] dark:text-[#F8FAFC]">{importPreviewData.total_rows}</div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <div className="text-[10px] text-emerald-600 font-bold uppercase">Valid Questions</div>
                  <div className="text-lg font-mono font-extrabold text-emerald-600">{importPreviewData.valid_count}</div>
                </div>
                <div className="p-3 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-center">
                  <div className="text-[10px] text-[#EF4444] font-bold uppercase">Errors</div>
                  <div className="text-lg font-mono font-extrabold text-[#EF4444]">{importPreviewData.invalid_count}</div>
                </div>
              </div>

              {/* Invalid Rows Warning Table */}
              {importPreviewData.errors?.length > 0 && (
                <div className="p-4 rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/10 space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-[#EF4444]">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{importPreviewData.errors.length} Invalid Row(s) Detected (Will NOT be imported):</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {importPreviewData.errors.map((err, eIdx) => (
                      <div key={eIdx} className="p-2 rounded-xl bg-[#FFFFFF] dark:bg-[#151A21] border border-[#EF4444]/30 text-xs flex items-start gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] font-mono font-bold shrink-0">
                          Row {err.row}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-[#EF4444]">{err.reason}</span>
                          {err.question && (
                            <span className="text-[#667085] dark:text-[#94A3B8] ml-1 truncate block text-[11px]">
                              "{err.question}"
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Valid Rows Preview Table */}
              {importPreviewData.valid_rows?.length > 0 && (
                <div className="space-y-2">
                  <div className="font-bold text-[#172033] dark:text-[#F8FAFC] flex items-center justify-between">
                    <span>Valid MCQs Preview ({importPreviewData.valid_rows.length})</span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Ready to Import</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl divide-y divide-[#D9E0E8] dark:divide-[#30363D]">
                    {importPreviewData.valid_rows.map((row, rIdx) => (
                      <div key={rIdx} className="p-3.5 bg-[#FFFFFF] dark:bg-[#20252C] hover:bg-[#F5F7FA] dark:hover:bg-[#151A21] transition space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="w-5 h-5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                              {rIdx + 1}
                            </span>
                            <span className="font-bold text-[#172033] dark:text-[#F8FAFC] leading-snug">{row.question}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold shrink-0">
                            Correct: Option {row.correctOption}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pl-7">
                          {row.options.map((opt, oIdx) => {
                            const isCorrect = row.correctOption === (oIdx + 1);
                            return (
                              <div
                                key={oIdx}
                                className={`p-2 rounded-xl border flex items-center gap-1.5 ${
                                  isCorrect
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold'
                                    : 'bg-[#F5F7FA] dark:bg-[#151A21] border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8]'
                                }`}
                              >
                                <span className="font-mono text-[10px] opacity-75">{oIdx + 1}.</span>
                                <span className="truncate">{opt}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="pt-3 border-t border-[#D9E0E8] dark:border-[#30363D] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC] font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCommitImport}
              disabled={importCommitLoading || !importPreviewData || importPreviewData.valid_count === 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {importCommitLoading
                  ? 'Importing MCQs...'
                  : importPreviewData
                  ? `Import MCQs (${importPreviewData.valid_count})`
                  : 'Import MCQs'}
              </span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
