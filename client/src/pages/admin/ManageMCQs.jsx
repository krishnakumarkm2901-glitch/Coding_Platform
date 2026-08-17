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
  HelpCircle
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
        topic: topicFilter !== 'All' ? topicFilter : undefined,
      };
      const res = await api.get('/mcqs', { params });
      if (res.data.success) {
        setMcqs(res.data.mcqs);
        setPagination({
          total: res.data.total,
          pages: Math.ceil(res.data.total / 15) || 1,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleDelete = async (mcqId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await api.delete(`/admin/mcqs/${mcqId}`);
      if (res.data.success) {
        setGlobalSuccessMsg('MCQ deleted successfully.');
        setTimeout(() => setGlobalSuccessMsg(''), 4000);
        fetchMCQs();
      }
    } catch (err) {
      console.error(err);
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Manage Technical MCQs
          </h1>
          <p className="text-sm text-[#667085] dark:text-[#94A3B8] mt-1">
            Question bank across Computer Science domains and engineering subjects
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
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
            <span>Import MCQs from Excel</span>
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

      {/* Filter Bar */}
      <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative flex-1 w-full sm:max-w-md">
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
            placeholder="Search questions..."
            className="w-full pl-10 pr-4 py-2 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] placeholder-[#667085] dark:placeholder-[#94A3B8] text-xs font-semibold focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
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
        </div>
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
          mcqs.map((m, idx) => (
            <div
              key={m.id}
              className="p-5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] hover:border-purple-500/40 transition space-y-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
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
                    className="p-1.5 rounded-lg bg-[#F5F7FA] dark:bg-[#151A21] hover:bg-[#DDF2FF] dark:hover:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] border border-[#D9E0E8] dark:border-[#30363D] transition shadow-sm"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-1.5 rounded-lg bg-[#F5F7FA] dark:bg-[#151A21] hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#D9E0E8] dark:border-[#30363D] transition shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Options pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
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
                <div className="text-[11px] text-[#667085] dark:text-[#94A3B8] bg-[#F5F7FA] dark:bg-[#151A21] p-3 rounded-2xl border border-[#D9E0E8] dark:border-[#30363D]">
                  <strong className="text-[#172033] dark:text-[#F8FAFC]">Explanation:</strong> {m.explanation}
                </div>
              )}
            </div>
          ))
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
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Question Text *</label>
            <textarea
              required
              rows={3}
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="e.g. Which normal form eliminates transitive functional dependencies?"
              className="w-full p-3.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Topic</label>
              <select
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
              >
                {mcqTopics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          {/* 4 Options Input */}
          <div className="space-y-2.5">
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold uppercase tracking-wide">4 Options *</label>
            {formData.options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] flex items-center justify-center font-bold text-[#0757B8] dark:text-[#60A5FA] shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <input
                  type="text"
                  required
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  className="flex-1 px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Select Correct Answer *</label>
            <select
              value={formData.correct_answer}
              onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#22B573] font-bold"
            >
              <option value="">-- Select Correct Option --</option>
              {formData.options.map((opt, idx) => (
                <option key={idx} value={opt}>
                  {String.fromCharCode(65 + idx)}: {opt || `(Empty Option ${String.fromCharCode(65 + idx)})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Answer Explanation</label>
            <textarea
              rows={2}
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              placeholder="Why is this answer correct?"
              className="w-full p-3 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC]"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:opacity-95 text-white font-bold shadow-md shadow-purple-600/20"
            >
              {actionLoading ? 'Saving...' : editingId ? 'Save MCQ' : 'Create MCQ'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EXCEL IMPORT MCQ MODAL */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import MCQs from Excel"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-5 text-xs">
          {/* Instructions Box */}
          <div className="p-4 rounded-2xl bg-[#0757B8]/10 border border-[#0757B8]/20 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-[#0757B8] dark:text-[#60A5FA] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-[#0757B8] dark:text-[#60A5FA]">Required Excel Format (.xlsx)</div>
              <p className="text-[#667085] dark:text-[#94A3B8] leading-relaxed">
                Your spreadsheet must include columns: <code className="font-mono px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-purple-600 dark:text-purple-400 font-bold">Question</code>, <code className="font-mono px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">Option 1</code>, <code className="font-mono px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">Option 2</code>, <code className="font-mono px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">Option 3</code>, <code className="font-mono px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">Option 4</code>, and <code className="font-mono px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-emerald-600 dark:text-emerald-400 font-bold">Correct Option</code> (must be 1, 2, 3, or 4).
              </p>
            </div>
          </div>

          {/* File Upload / Selection Area */}
          <div className="p-6 rounded-2xl border-2 border-dashed border-[#D9E0E8] dark:border-[#30363D] bg-[#F5F7FA] dark:bg-[#151A21] flex flex-col items-center justify-center text-center space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="mcq-excel-file-input"
            />
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <label
                htmlFor="mcq-excel-file-input"
                className="cursor-pointer px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{importFile ? 'Choose Different File' : 'Select Excel File (.xlsx)'}</span>
              </label>
              {importFile && (
                <div className="mt-2 text-xs font-bold text-[#172033] dark:text-[#F8FAFC]">
                  Selected: <span className="text-[#0757B8] dark:text-[#60A5FA] font-mono">{importFile.name}</span> ({(importFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
          </div>

          {importErrorMsg && (
            <div className="p-3.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{importErrorMsg}</span>
            </div>
          )}

          {importLoading && (
            <div className="p-8 text-center space-y-2">
              <PageLoader text="Reading and validating Excel rows..." />
            </div>
          )}

          {/* PREVIEW & VALIDATION SUMMARY */}
          {importPreviewData && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] text-center">
                  <div className="text-[10px] uppercase font-bold text-[#667085] dark:text-[#94A3B8]">Total Rows</div>
                  <div className="text-xl font-extrabold text-[#172033] dark:text-[#F8FAFC] font-mono mt-0.5">
                    {importPreviewData.total_rows}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-center">
                  <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Valid</div>
                  <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    {importPreviewData.valid_count}
                  </div>
                </div>
                <div className={`p-3.5 rounded-2xl border text-center ${importPreviewData.invalid_count > 0 ? 'border-red-500/30 bg-red-500/10' : 'border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C]'}`}>
                  <div className={`text-[10px] uppercase font-bold ${importPreviewData.invalid_count > 0 ? 'text-[#EF4444]' : 'text-[#667085] dark:text-[#94A3B8]'}`}>
                    Invalid
                  </div>
                  <div className={`text-xl font-extrabold font-mono mt-0.5 ${importPreviewData.invalid_count > 0 ? 'text-[#EF4444]' : 'text-[#172033] dark:text-[#F8FAFC]'}`}>
                    {importPreviewData.invalid_count}
                  </div>
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
