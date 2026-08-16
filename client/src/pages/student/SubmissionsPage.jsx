import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  History, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Filter,
  ChevronDown 
} from 'lucide-react';
import { StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Loader';

export const SubmissionsPage = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Modal code view state
  const [selectedSub, setSelectedSub] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter, page]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        status: statusFilter !== 'All' ? statusFilter : undefined,
      };
      const res = await api.get('/submissions', { params });
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

  const handleViewCode = async (subId) => {
    try {
      setModalLoading(true);
      setModalOpen(true);
      const res = await api.get(`/submissions/${subId}`);
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
            Submission History
          </h1>
          <p className="text-sm text-[#667085] dark:text-[#94A3B8] mt-1">
            Review past solution submissions and verdicts
          </p>
        </div>

        {/* Interactive Filter Control */}
        <div className="relative inline-flex items-center">
          <label htmlFor="status-filter-select" className="relative flex items-center cursor-pointer">
            <Filter className="w-4 h-4 text-[#0757B8] dark:text-[#60A5FA] absolute left-3.5 pointer-events-none z-10" />
            <select
              id="status-filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-9 py-2.5 bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] hover:border-[#0757B8]/50 dark:hover:border-[#60A5FA]/50 rounded-2xl text-[#172033] dark:text-[#F8FAFC] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0757B8]/20 transition shadow-sm cursor-pointer appearance-none"
            >
              <option value="All">All Statuses</option>
              <option value="Accepted">Accepted</option>
              <option value="Wrong Answer">Wrong Answer</option>
              <option value="Compilation Error">Compilation Error</option>
              <option value="Runtime Error">Runtime Error</option>
              <option value="Time Limit Exceeded">Time Limit Exceeded</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#667085] dark:text-[#94A3B8] absolute right-3 pointer-events-none" />
          </label>
        </div>
      </div>

      {/* Submissions Table with #303442 Dark Header */}
      <div className="rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] overflow-hidden shadow-sm">
        {loading ? (
          <PageLoader text="Loading your submissions..." />
        ) : submissions.length === 0 ? (
          <div className="py-16 text-center text-[#667085] dark:text-[#94A3B8] text-sm">
            No submissions recorded. Solve some problems to build your history!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#303442] text-white text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-4">Problem</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Language</th>
                  <th className="py-4 px-4">Test Cases</th>
                  <th className="py-4 px-4">Runtime</th>
                  <th className="py-4 px-4">Submitted At</th>
                  <th className="py-4 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E0E8] dark:divide-[#30363D]/60 font-sans">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F5F7FA] dark:hover:bg-[#151A21]/60 transition">
                    <td className="py-4 px-4 font-bold text-[#172033] dark:text-[#F8FAFC]">
                      <Link
                        to={`/problems/${s.problem_id}`}
                        className="hover:text-[#0757B8] dark:hover:text-[#60A5FA] transition"
                      >
                        {s.problem_title}
                      </Link>
                    </td>

                    <td className="py-4 px-4">
                      <StatusBadge status={s.status} />
                    </td>

                    <td className="py-4 px-4 text-xs uppercase font-mono font-bold text-[#667085] dark:text-[#94A3B8]">
                      {s.language}
                    </td>

                    <td className="py-4 px-4 text-xs font-mono font-semibold text-[#667085] dark:text-[#94A3B8]">
                      {s.passed_test_cases} / {s.total_test_cases} passed
                    </td>

                    <td className="py-4 px-4 text-xs font-mono text-[#667085] dark:text-[#94A3B8]">
                      {s.runtime} ms
                    </td>

                    <td className="py-4 px-4 text-xs text-[#667085] dark:text-[#94A3B8] font-sans">
                      {new Date(s.created_at).toLocaleString()}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleViewCode(s.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#172033] dark:bg-[#142A43] hover:bg-[#0757B8] dark:hover:bg-[#0066CC] text-white dark:text-[#60A5FA] dark:hover:text-white text-xs font-bold transition shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Code</span>
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
                className="p-2 rounded-xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] hover:bg-[#F5F7FA] text-[#172033] dark:text-[#F8FAFC] disabled:opacity-40 shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage(page + 1)}
                className="p-2 rounded-xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] hover:bg-[#F5F7FA] text-[#172033] dark:text-[#F8FAFC] disabled:opacity-40 shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Code Viewer Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedSub ? `${selectedSub.problem_title} (${selectedSub.language.toUpperCase()})` : 'Submitted Solution'}
        maxWidth="max-w-4xl"
      >
        {modalLoading || !selectedSub ? (
          <PageLoader text="Loading code details..." />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D]">
              <div className="flex items-center gap-3">
                <StatusBadge status={selectedSub.status} />
                <span className="text-xs text-[#667085] dark:text-[#94A3B8]">
                  Passed {selectedSub.passed_test_cases}/{selectedSub.total_test_cases} test cases
                </span>
              </div>
              <div className="text-xs text-[#667085] dark:text-[#94A3B8] font-mono">
                Runtime: {selectedSub.runtime} ms
              </div>
            </div>

            {selectedSub.error_message && (
              <div className="p-3.5 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/25 text-[#EF4444] text-xs font-mono whitespace-pre-wrap">
                {selectedSub.error_message}
              </div>
            )}

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#94A3B8] mb-1.5">
                Submitted Code ({selectedSub.language}):
              </div>
              <pre className="p-4 rounded-2xl bg-[#151A21] text-[#F8FAFC] font-mono text-xs overflow-x-auto border border-[#30363D] max-h-[420px]">
                {selectedSub.code}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
