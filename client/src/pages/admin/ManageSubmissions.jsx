import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  History, 
  Search, 
  Eye, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
} from 'lucide-react';
import { StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Loader';

export const ManageSubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Code inspection modal
  const [selectedSub, setSelectedSub] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [search, statusFilter, page]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        search: search.trim(),
      };
      const res = await api.get('/admin/submissions', { params });
      if (res.data.success) {
        setSubmissions(res.data.submissions);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInspectCode = async (subId) => {
    try {
      setModalLoading(true);
      setModalOpen(true);
      const res = await api.get(`/admin/submissions/${subId}`);
      if (res.data.success) {
        setSelectedSub(res.data.submission);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 text-[#0757B8] dark:text-[#60A5FA]" />
            Platform Submissions Stream
          </h1>
          <p className="text-sm text-[#667085] dark:text-[#94A3B8] mt-1">
            Real-time audit log of student code evaluations and test case results
          </p>
        </div>
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
            placeholder="Search by student, register number, or problem..."
            className="w-full pl-10 pr-4 py-2 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] placeholder-[#667085] dark:placeholder-[#94A3B8] text-xs font-semibold focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="py-2 px-3 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] text-xs font-bold"
          >
            <option value="All">All Verdicts</option>
            <option value="Accepted">Accepted</option>
            <option value="Wrong Answer">Wrong Answer</option>
            <option value="Compilation Error">Compilation Error</option>
            <option value="Runtime Error">Runtime Error</option>
            <option value="Time Limit Exceeded">Time Limit Exceeded</option>
          </select>
        </div>
      </div>

      {/* Submissions Table with #303442 Dark Header */}
      <div className="rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] overflow-hidden shadow-sm">
        {loading ? (
          <PageLoader text="Streaming submissions..." />
        ) : submissions.length === 0 ? (
          <div className="py-16 text-center text-[#667085] dark:text-[#94A3B8] text-sm">
            No submissions found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#303442] text-white font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-4">Student</th>
                  <th className="py-4 px-4">Problem</th>
                  <th className="py-4 px-4">Language</th>
                  <th className="py-4 px-4">Verdict</th>
                  <th className="py-4 px-4">Test Cases</th>
                  <th className="py-4 px-4">Runtime</th>
                  <th className="py-4 px-4">Timestamp</th>
                  <th className="py-4 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E0E8] dark:divide-[#30363D]/60 font-sans">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F5F7FA] dark:hover:bg-[#151A21]/60 transition">
                    <td className="py-3.5 px-4 font-bold text-[#172033] dark:text-[#F8FAFC]">
                      <div>{s.student_name}</div>
                      <div className="text-[10px] text-[#0757B8] dark:text-[#60A5FA] font-mono">{s.student_id}</div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-[#172033] dark:text-[#F8FAFC]">
                      {s.problem_title}
                    </td>

                    <td className="py-3.5 px-4 font-mono uppercase font-bold text-[11px] text-[#667085] dark:text-[#94A3B8]">
                      {s.language}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={s.status} />
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[#667085] dark:text-[#94A3B8] font-semibold">
                      {s.passed_test_cases} / {s.total_test_cases}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[#667085] dark:text-[#94A3B8]">
                      {s.runtime} ms
                    </td>

                    <td className="py-3.5 px-4 text-[#667085] dark:text-[#94A3B8] font-sans text-[11px]">
                      {new Date(s.created_at).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleInspectCode(s.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#172033] dark:bg-[#142A43] hover:bg-[#0757B8] dark:hover:bg-[#0066CC] text-white dark:text-[#60A5FA] dark:hover:text-white text-xs font-bold transition shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
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

      {/* Code Inspection Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedSub ? `${selectedSub.student_name} (${selectedSub.student_id}) - ${selectedSub.problem_title}` : 'Submission Audit'}
        maxWidth="max-w-4xl"
      >
        {modalLoading || !selectedSub ? (
          <PageLoader text="Inspecting submitted code and runtime metadata..." />
        ) : (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D]">
              <div>
                <div className="text-[#667085] dark:text-[#94A3B8] uppercase font-bold text-[10px]">Student</div>
                <div className="font-bold text-[#172033] dark:text-[#F8FAFC] mt-0.5">{selectedSub.student_name}</div>
              </div>
              <div>
                <div className="text-[#667085] dark:text-[#94A3B8] uppercase font-bold text-[10px]">Language</div>
                <div className="font-mono uppercase font-bold text-[#0757B8] dark:text-[#60A5FA] mt-0.5">{selectedSub.language}</div>
              </div>
              <div>
                <div className="text-[#667085] dark:text-[#94A3B8] uppercase font-bold text-[10px]">Verdict</div>
                <div className="mt-0.5"><StatusBadge status={selectedSub.status} /></div>
              </div>
              <div>
                <div className="text-[#667085] dark:text-[#94A3B8] uppercase font-bold text-[10px]">Test Cases</div>
                <div className="font-mono font-bold text-[#172033] dark:text-[#F8FAFC] mt-0.5">{selectedSub.passed_test_cases}/{selectedSub.total_test_cases} Passed</div>
              </div>
            </div>

            {selectedSub.error_message && (
              <div className="p-3.5 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/25 text-[#EF4444] font-mono whitespace-pre-wrap">
                {selectedSub.error_message}
              </div>
            )}

            <div>
              <div className="font-bold uppercase tracking-wide text-[#667085] dark:text-[#94A3B8] mb-1.5">Submitted Source Code:</div>
              <pre className="p-4 rounded-2xl bg-[#151A21] text-[#F8FAFC] font-mono text-xs overflow-x-auto border border-[#30363D] max-h-[400px]">
                {selectedSub.code}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
