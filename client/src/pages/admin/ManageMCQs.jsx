import React, { useState, useEffect } from 'react';
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
          fetchMCQs();
        }
      } else {
        const res = await api.post('/admin/mcqs', formData);
        if (res.data.success) {
          setIsModalOpen(false);
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
        fetchMCQs();
      }
    } catch (err) {
      console.error(err);
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

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create MCQ</span>
        </button>
      </div>

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
    </div>
  );
};
