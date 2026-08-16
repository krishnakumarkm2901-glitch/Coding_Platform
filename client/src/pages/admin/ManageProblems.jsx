import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  FileCode, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  PlusCircle, 
  X,
  Code2
} from 'lucide-react';
import { DifficultyBadge, TopicTag } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Loader';

export const ManageProblems = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Modal create/edit states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    difficulty: 'Easy',
    topic: 'Arrays',
    description: '',
    input_format: '',
    output_format: '',
    constraints: '',
    sample_input: '',
    sample_output: '',
    time_limit: 2.0,
    memory_limit: 256,
    test_cases: [
      { input: '5\n1 2 3 4 5', expected_output: '15', is_sample: true, explanation: '' }
    ],
    starter_code: {
      python: 'def solve():\n    # Write your solution here\n    pass\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n',
      c: '#include <stdio.h>\n\nint main() {\n    return 0;\n}\n',
      java: 'import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}\n',
      javascript: 'function solve() {\n    // Solution\n}\n',
    }
  });

  const availableTopics = [
    'Arrays', 'Strings', 'Linked Lists', 'Trees', 'Graphs',
    'Dynamic Programming', 'Recursion', 'Searching & Sorting', 'Math', 'Stack & Queue'
  ];

  useEffect(() => {
    fetchProblems();
  }, [search, difficultyFilter, page]);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 12,
        search: search.trim(),
        difficulty: difficultyFilter !== 'All' ? difficultyFilter : undefined,
      };
      const res = await api.get('/admin/problems', { params });
      if (res.data.success) {
        setProblems(res.data.problems);
        setPagination(res.data.pagination);
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
      title: '',
      difficulty: 'Easy',
      topic: 'Arrays',
      description: '',
      input_format: '',
      output_format: '',
      constraints: '',
      sample_input: '',
      sample_output: '',
      time_limit: 2.0,
      memory_limit: 256,
      test_cases: [
        { input: '5\n1 2 3 4 5', expected_output: '15', is_sample: true, explanation: '' }
      ],
      starter_code: {
        python: 'def solve():\n    # Write your solution here\n    pass\n',
        cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n',
        c: '#include <stdio.h>\n\nint main() {\n    return 0;\n}\n',
        java: 'import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}\n',
        javascript: 'function solve() {\n    // Solution\n}\n',
      }
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (probId) => {
    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await api.get(`/problems/${probId}`);
      if (res.data.success) {
        const p = res.data.problem;
        setEditingId(probId);
        setFormData({
          title: p.title,
          difficulty: p.difficulty,
          topic: p.topic,
          description: p.description,
          input_format: p.input_format || '',
          output_format: p.output_format || '',
          constraints: p.constraints || '',
          sample_input: p.sample_input || '',
          sample_output: p.sample_output || '',
          time_limit: p.time_limit || 2.0,
          memory_limit: p.memory_limit || 256,
          test_cases: p.test_cases?.length ? p.test_cases : [{ input: '', expected_output: '', is_sample: true }],
          starter_code: p.starter_code || {}
        });
        setIsModalOpen(true);
      }
    } catch (err) {
      alert('Failed to load problem details.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddTestCase = () => {
    setFormData((prev) => ({
      ...prev,
      test_cases: [...prev.test_cases, { input: '', expected_output: '', is_sample: false, explanation: '' }]
    }));
  };

  const handleRemoveTestCase = (index) => {
    setFormData((prev) => ({
      ...prev,
      test_cases: prev.test_cases.filter((_, idx) => idx !== index)
    }));
  };

  const handleTestCaseChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.test_cases];
      updated[index][field] = value;
      return { ...prev, test_cases: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setErrorMsg('');

      if (editingId) {
        const res = await api.put(`/admin/problems/${editingId}`, formData);
        if (res.data.success) {
          setIsModalOpen(false);
          fetchProblems();
        }
      } else {
        const res = await api.post('/admin/problems', formData);
        if (res.data.success) {
          setIsModalOpen(false);
          fetchProblems();
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to save problem.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (probId) => {
    if (!window.confirm('Are you sure you want to delete this problem and all its submissions?')) return;
    try {
      const res = await api.delete(`/admin/problems/${probId}`);
      if (res.data.success) {
        fetchProblems();
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
            <FileCode className="w-6 h-6 text-[#22B573]" />
            Manage Coding Problems
          </h1>
          <p className="text-sm text-[#667085] dark:text-[#94A3B8] mt-1">
            Author and maintain programming challenges, constraints, and test suites
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-2xl bg-[#22B573] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create Coding Problem</span>
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
            placeholder="Search problems..."
            className="w-full pl-10 pr-4 py-2 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] placeholder-[#667085] dark:placeholder-[#94A3B8] text-xs font-semibold focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={difficultyFilter}
            onChange={(e) => {
              setDifficultyFilter(e.target.value);
              setPage(1);
            }}
            className="py-2 px-3 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] text-xs font-bold"
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Problems Table with #303442 Dark Header */}
      <div className="rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] overflow-hidden shadow-sm">
        {loading ? (
          <PageLoader text="Loading problem catalog..." />
        ) : problems.length === 0 ? (
          <div className="py-16 text-center text-[#667085] dark:text-[#94A3B8] text-sm">
            No problems found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#303442] text-white font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-4">Title</th>
                  <th className="py-4 px-4">Topic</th>
                  <th className="py-4 px-4">Difficulty</th>
                  <th className="py-4 px-4 text-center">Submissions</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E0E8] dark:divide-[#30363D]/60 font-sans">
                {problems.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F5F7FA] dark:hover:bg-[#151A21]/60 transition">
                    <td className="py-3.5 px-4 font-bold text-[#172033] dark:text-[#F8FAFC]">
                      {p.title}
                    </td>
                    <td className="py-3.5 px-4">
                      <TopicTag topic={p.topic} />
                    </td>
                    <td className="py-3.5 px-4">
                      <DifficultyBadge difficulty={p.difficulty} />
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-[#172033] dark:text-[#F8FAFC]">
                      {p.total_submissions || 0}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p.id)}
                          title="Edit Problem"
                          className="p-1.5 rounded-lg bg-[#F5F7FA] dark:bg-[#151A21] hover:bg-[#DDF2FF] dark:hover:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] border border-[#D9E0E8] dark:border-[#30363D] transition shadow-sm"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          title="Delete Problem"
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

      {/* CREATE / EDIT PROBLEM MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Coding Problem' : 'Create New Coding Problem'}
        maxWidth="max-w-4xl"
      >
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Problem Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Reverse Linked List"
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC]"
              />
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Topic</label>
              <select
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
              >
                {availableTopics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Time Limit (seconds)</label>
              <input
                type="number"
                step="0.5"
                value={formData.time_limit}
                onChange={(e) => setFormData({ ...formData, time_limit: parseFloat(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
              />
            </div>

            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Memory Limit (MB)</label>
              <input
                type="number"
                value={formData.memory_limit}
                onChange={(e) => setFormData({ ...formData, memory_limit: parseInt(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Problem Description *</label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe problem scenario, requirements..."
              className="w-full p-3.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-sans"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Input Format</label>
              <textarea
                rows={2}
                value={formData.input_format}
                onChange={(e) => setFormData({ ...formData, input_format: e.target.value })}
                placeholder="e.g. First line contains integer N..."
                className="w-full p-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-mono"
              />
            </div>

            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Output Format</label>
              <textarea
                rows={2}
                value={formData.output_format}
                onChange={(e) => setFormData({ ...formData, output_format: e.target.value })}
                placeholder="e.g. Print space-separated integers..."
                className="w-full p-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Constraints</label>
            <textarea
              rows={2}
              value={formData.constraints}
              onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
              placeholder="1 <= N <= 10^5&#10;-10^9 <= nums[i] <= 10^9"
              className="w-full p-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Sample Input</label>
              <textarea
                rows={2}
                value={formData.sample_input}
                onChange={(e) => setFormData({ ...formData, sample_input: e.target.value })}
                className="w-full p-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-mono"
              />
            </div>

            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Sample Output</label>
              <textarea
                rows={2}
                value={formData.sample_output}
                onChange={(e) => setFormData({ ...formData, sample_output: e.target.value })}
                className="w-full p-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-mono"
              />
            </div>
          </div>

          {/* Test Cases Builder */}
          <div className="pt-4 border-t border-[#D9E0E8] dark:border-[#30363D] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[#172033] dark:text-[#F8FAFC]">Evaluation Test Cases ({formData.test_cases.length})</h4>
              <button
                type="button"
                onClick={handleAddTestCase}
                className="px-2.5 py-1 rounded-lg bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] font-bold text-[11px] flex items-center gap-1 border border-[#0757B8]/20 dark:border-[#0066CC]/40"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add Test Case
              </button>
            </div>

            {formData.test_cases.map((tc, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] space-y-2 relative">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#667085] dark:text-[#94A3B8]">
                  <span>Test Case #{idx + 1}</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[#172033] dark:text-[#F8FAFC]">
                      <input
                        type="checkbox"
                        checked={tc.is_sample || false}
                        onChange={(e) => handleTestCaseChange(idx, 'is_sample', e.target.checked)}
                        className="rounded"
                      />
                      <span>Sample Case</span>
                    </label>
                    {formData.test_cases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTestCase(idx)}
                        className="text-[#EF4444] hover:opacity-80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <span className="text-[10px] text-[#667085] dark:text-[#94A3B8] font-sans font-semibold">Input:</span>
                    <textarea
                      rows={2}
                      value={tc.input}
                      onChange={(e) => handleTestCaseChange(idx, 'input', e.target.value)}
                      placeholder="stdin"
                      className="w-full p-2 bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] rounded-lg text-[#172033] dark:text-[#F8FAFC] text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#667085] dark:text-[#94A3B8] font-sans font-semibold">Expected Output:</span>
                    <textarea
                      rows={2}
                      value={tc.expected_output}
                      onChange={(e) => handleTestCaseChange(idx, 'expected_output', e.target.value)}
                      placeholder="expected stdout"
                      className="w-full p-2 bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] rounded-lg text-[#22B573] text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex items-center justify-end gap-2">
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
              className="px-5 py-2.5 rounded-xl bg-[#22B573] hover:opacity-95 text-white font-bold shadow-md shadow-emerald-500/20"
            >
              {actionLoading ? 'Saving...' : editingId ? 'Save Problem' : 'Create Problem'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
