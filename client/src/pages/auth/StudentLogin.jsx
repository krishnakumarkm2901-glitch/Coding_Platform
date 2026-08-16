import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { Code2, Lock, User, ArrowRight, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';

export const StudentLogin = () => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginStudent } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state?.from?.pathname && location.state.from.pathname !== '/')
    ? location.state.from.pathname 
    : '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginStudent(studentId, password);
      // Navigate to intended page or dashboard with replace: true to prevent back-button login loop
      navigate(from, { replace: true });
    } catch (err) {
      if (!err.response) {
        setError('Unable to connect to the server. Please try again.');
      } else if (err.response.status >= 500) {
        setError('Login service is temporarily unavailable. Please try again.');
      } else {
        setError(err.response.data?.error || 'Invalid Student ID or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (id) => {
    setStudentId(id);
    setPassword('student123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F7FA] dark:bg-[#0B0F14] text-[#172033] dark:text-[#F8FAFC] relative overflow-hidden transition-colors">
      {/* Theme Switcher in top right */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-[#151A21] p-1.5 border border-[#D9E0E8] dark:border-[#30363D] shadow-lg shadow-blue-500/10 mb-4 overflow-hidden">
            <img src="/nit-logo.jpg" alt="NIT Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC] tracking-tight">NIT_Campus_Coder</h1>
          <p className="text-xs text-[#667085] dark:text-[#94A3B8] mt-1.5 font-semibold">Sign in to your Student Portal</p>
        </div>

        {/* Login Card */}
        <div className="p-8 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-xl relative">
          {error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/25 flex items-start gap-3 text-[#EF4444] text-xs font-bold">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#667085] dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
                Student ID / Register Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#667085] dark:text-[#94A3B8]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. STU001"
                  className="w-full pl-10 pr-4 py-3 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] placeholder-[#8491A5] text-xs font-semibold focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#667085] dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#667085] dark:text-[#94A3B8]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] placeholder-[#8491A5] text-xs font-semibold focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 group"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="mt-6 pt-6 border-t border-[#D9E0E8] dark:border-[#30363D]">
            <div className="text-xs text-[#667085] dark:text-[#94A3B8] font-bold mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#0757B8] dark:text-[#60A5FA]" />
              <span>Quick Demo Accounts (Password: student123)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['STU001', 'STU002', 'STU003'].map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleDemoLogin(id)}
                  className="py-2 px-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] text-xs font-mono font-bold text-[#172033] dark:text-[#F8FAFC] border border-[#D9E0E8] dark:border-[#30363D] hover:border-[#0757B8] dark:hover:border-[#0066CC] transition text-center"
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
