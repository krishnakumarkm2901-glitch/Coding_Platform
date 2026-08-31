import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, User, Eye, EyeOff } from 'lucide-react';

export const AdminLogin = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();
  const from = (location.state?.from?.pathname && location.state.from.pathname !== '/' && !location.state.from.pathname.startsWith('/login'))
    ? location.state.from.pathname 
    : '/admin/dashboard';

  const formatErrorMessage = (err) => {
    if (!err) return 'Admin login failed. Please try again.';
    
    // Check for Axios / network timeout
    const isTimeout = err.code === 'ECONNABORTED' || (err.message && err.message.toLowerCase().includes('timeout'));
    if (isTimeout) {
      return 'Server is taking too long to respond. Please try again.';
    }

    // Check for network disconnect / CORS / unreachable server
    if (!err.response) {
      return 'Unable to connect to the server. Please verify your connection.';
    }

    const status = err.response.status;
    const serverError = err.response.data?.error;

    if (status === 401) {
      return 'Invalid username or password.';
    }
    if (status === 403) {
      return 'You are not authorized to access the admin portal.';
    }
    if (status === 429) {
      return 'Too many login attempts. Please wait a moment before trying again.';
    }
    if (status >= 500) {
      return 'Server error. Please try again shortly.';
    }

    return serverError || 'Admin login failed. Please try again.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Prevent double submission

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();

    if (!cleanIdentifier || !cleanPassword) {
      setError('Please enter both username and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await loginAdmin(cleanIdentifier, cleanPassword);
      // Navigate to intended admin page or admin dashboard with replace: true
      navigate(from, { replace: true });
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F7FA] dark:bg-[#0B0F14] text-[#172033] dark:text-[#F8FAFC] relative overflow-hidden transition-colors">
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md relative z-10 px-2 sm:px-0">
        {/* Logo & Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-[#151A21] p-1.5 border border-[#D9E0E8] dark:border-[#30363D] shadow-lg shadow-blue-500/10 mb-4 overflow-hidden">
            <img src="/circa-logo.jpeg" alt="CIRCA Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC] tracking-tight">NIT_Campus_Coder</h1>
          <p className="text-xs text-[#667085] dark:text-[#94A3B8] mt-1 font-semibold">Administrator & Faculty Portal</p>
        </div>

        {/* Login Card */}
        <div className="p-5 sm:p-8 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-xl relative">
          {error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/25 flex items-start gap-3 text-[#EF4444] text-xs font-bold">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#667085] dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#667085] dark:text-[#94A3B8]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="nitplacements@nehrucolleges.com"
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
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl text-[#172033] dark:text-[#F8FAFC] placeholder-[#8491A5] text-xs font-semibold focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 group"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <>
                  <span>Sign In as Admin</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>


        </div>

        {/* Student Portal Link */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#667085] dark:text-[#94A3B8] hover:text-[#0757B8] dark:hover:text-[#60A5FA] transition font-bold"
          >
            <User className="w-3.5 h-3.5" />
            <span>Are you a student? Go to Student Login &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
