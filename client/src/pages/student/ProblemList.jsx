import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  Search, 
  CheckCircle2, 
  Code2, 
  ChevronLeft, 
  ChevronRight, 
} from 'lucide-react';
import { DifficultyBadge, TopicTag } from '../../components/common/Badge';
import { PageLoader } from '../../components/common/Loader';

export const ProblemList = () => {
  const [problems, setProblems] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('All');
  const [topic, setTopic] = useState('All');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  useEffect(() => {
    fetchTopics();
  }, []);

  useEffect(() => {
    fetchProblems();
  }, [search, difficulty, topic, page]);

  const fetchTopics = async () => {
    try {
      const res = await api.get('/problems/topics');
      if (res.data.success) {
        setTopics(res.data.topics);
      }
    } catch {
      // Fallback topics
    }
  };

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        search: search.trim(),
        difficulty: difficulty !== 'All' ? difficulty : undefined,
        topic: topic !== 'All' ? topic : undefined,
      };
      const res = await api.get('/problems', { params });
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC] tracking-tight">
            Problem Catalogue
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] dark:text-[#94A3B8] mt-1">
            Master Algorithms, Data Structures & Placement Coding Challenges
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#0757B8] dark:text-[#60A5FA] bg-[#DDF2FF] dark:bg-[#142A43] px-3 py-1.5 rounded-2xl border border-[#0757B8]/20 dark:border-[#0066CC]/40 font-bold shadow-sm">
            {pagination.total} Problems
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] flex flex-col md:flex-row items-center gap-3 shadow-sm">
        {/* Search */}
        <div className="relative w-full md:flex-1">
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
            placeholder="Search problems by title, topic..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] placeholder-[#667085] dark:placeholder-[#94A3B8] text-xs font-semibold focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition"
          />
        </div>

        {/* Difficulty Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-40 py-2.5 px-3 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] text-xs font-bold focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition"
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          {/* Topic Filter */}
          <select
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-48 py-2.5 px-3 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] text-xs font-bold focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition"
          >
            <option value="All">All Topics</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Problems Table */}
      <div className="rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] overflow-hidden shadow-sm">
        {loading ? (
          <PageLoader text="Loading problem directory..." />
        ) : problems.length === 0 ? (
          <div className="py-16 text-center text-[#667085] dark:text-[#94A3B8] text-xs">
            No problems match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F7FA] dark:bg-[#151A21] border-b border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">Status</th>
                  <th className="py-3.5 px-4">Title</th>
                  <th className="py-3.5 px-4">Topic</th>
                  <th className="py-3.5 px-4">Difficulty</th>
                  <th className="py-3.5 px-4 text-center">Acceptance</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E0E8] dark:divide-[#30363D]/60 font-sans">
                {problems.map((p, idx) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[#F5F7FA] dark:hover:bg-[#151A21]/50 transition group"
                  >
                    <td className="py-4 px-4 text-center">
                      {p.is_solved ? (
                        <CheckCircle2 className="w-5 h-5 text-[#22B573] mx-auto" />
                      ) : (
                        <span className="text-[#667085] dark:text-[#94A3B8] font-mono text-[11px]">
                          {(page - 1) * 15 + idx + 1}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 font-bold text-[#172033] dark:text-[#F8FAFC]">
                      <Link
                        to={`/problems/${p.id}`}
                        className="hover:text-[#0757B8] dark:hover:text-[#60A5FA] transition"
                      >
                        {p.title}
                      </Link>
                    </td>

                    <td className="py-4 px-4">
                      <TopicTag topic={p.topic} />
                    </td>

                    <td className="py-4 px-4">
                      <DifficultyBadge difficulty={p.difficulty} />
                    </td>

                    <td className="py-4 px-4 text-center font-mono text-[#667085] dark:text-[#94A3B8]">
                      {p.acceptance_rate}%
                    </td>

                    <td className="py-4 px-4 text-right">
                      <Link
                        to={`/problems/${p.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#DDF2FF] dark:bg-[#142A43] hover:bg-[#0757B8] dark:hover:bg-[#0066CC] text-[#0757B8] dark:text-[#60A5FA] hover:text-white border border-[#0757B8]/20 dark:border-[#0066CC]/40 font-bold transition"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Solve</span>
                      </Link>
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
                className="p-2 rounded-xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] hover:bg-[#F5F7FA] dark:hover:bg-[#151A21] text-[#172033] dark:text-[#F8FAFC] disabled:opacity-40 shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage(page + 1)}
                className="p-2 rounded-xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] hover:bg-[#F5F7FA] dark:hover:bg-[#151A21] text-[#172033] dark:text-[#F8FAFC] disabled:opacity-40 shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
