import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { ThemeToggle } from './ThemeToggle';
import { 
  Code2, 
  LogOut, 
  User, 
  Menu, 
  History,
  ShieldCheck,
  Calculator,
  Bell
} from 'lucide-react';
import { ScientificCalculator } from './ScientificCalculator';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchUnread = async () => {
        try {
          const res = await api.get('/notifications');
          if (res.data.success) {
            setUnreadCount(res.data.unread_count);
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchUnread();
      const interval = setInterval(fetchUnread, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    if (isAdmin) {
      navigate('/loginadmin');
    } else {
      navigate('/');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full lg:pl-64 border-b border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#151A21] transition-colors shadow-sm">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Left: Brand Logo & Mobile Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC] hover:bg-[#F5F7FA] dark:hover:bg-[#20252C] transition"
              aria-label="Toggle navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to={isAdmin ? "/admin/dashboard" : "/dashboard"} className="flex lg:hidden items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#20252C] p-1 border border-[#D9E0E8] dark:border-[#30363D] flex items-center justify-center shadow-md shadow-blue-500/10 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                <img src="/nit-logo.jpg" alt="NIT Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-[#172033] dark:text-[#F8FAFC]">
                  NIT_<span className="text-[#0757B8] dark:text-[#60A5FA]">Campus_Coder</span>
                </span>
                {isAdmin && (
                  <span className="ml-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] border border-[#0757B8]/30 dark:border-[#0066CC]/40">
                    Admin
                  </span>
                )}
              </div>
            </Link>
          </div>

          {/* Right: Calculator, Theme Switcher & User Profile */}
          <div className="flex items-center gap-2.5">
            
            {/* Calculator Button for Quick Access */}
            {isAuthenticated && !isAdmin && (
              <button
                type="button"
                onClick={() => setCalculatorOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] hover:border-[#0757B8]/40 text-[#172033] dark:text-[#F8FAFC] hover:text-[#0757B8] dark:hover:text-[#60A5FA] font-bold text-xs shadow-sm transition"
                title="Open Scientific Calculator"
              >
                <Calculator className="w-4 h-4 text-[#0757B8] dark:text-[#60A5FA]" />
                <span className="hidden sm:inline">Calculator</span>
              </button>
            )}

            {/* Notifications Bell Icon */}
            {isAuthenticated && (
              <Link
                to={isAdmin ? "/admin/notifications" : "/notifications"}
                className="relative p-2 text-[#667085] dark:text-[#94A3B8] hover:text-[#0757B8] dark:hover:text-[#60A5FA] rounded-xl hover:bg-[#F5F7FA] dark:hover:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] transition shadow-sm bg-white dark:bg-[#151A21]"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-[9px] font-extrabold text-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}

            {/* Light / Dark Mode Toggle Button */}
            <ThemeToggle />

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-3 p-1.5 pl-2.5 rounded-2xl bg-[#F5F7FA] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] hover:border-[#0757B8]/40 transition shadow-sm"
                >
                  {user?.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-xl object-cover shadow-sm shrink-0" 
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-[#0757B8] dark:bg-[#0066CC] text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                      {user?.name ? user.name[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="hidden sm:block text-left pr-2">
                    <div className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC] truncate max-w-[120px]">{user?.name}</div>
                    <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] font-mono font-semibold">{user?.student_id || (isAdmin ? 'Admin' : 'Student')}</div>
                  </div>
                </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setProfileDropdownOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#151A21] shadow-2xl z-40 py-2 divide-y divide-[#D9E0E8] dark:divide-[#30363D]">
                    <div className="px-4 py-2.5">
                      <p className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC]">{user?.name}</p>
                      <p className="text-xs text-[#667085] dark:text-[#94A3B8] truncate">{user?.email}</p>
                    </div>

                    <div className="py-1">
                      {!isAdmin ? (
                        <>
                          <Link
                            to="/profile"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#172033] dark:text-[#F8FAFC] hover:bg-[#F5F7FA] dark:hover:bg-[#20252C] hover:text-[#0757B8] dark:hover:text-[#60A5FA] transition"
                          >
                            <User className="w-4 h-4 text-[#667085] dark:text-[#94A3B8]" />
                            My Profile
                          </Link>
                          <Link
                            to="/submissions"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#172033] dark:text-[#F8FAFC] hover:bg-[#F5F7FA] dark:hover:bg-[#20252C] hover:text-[#0757B8] dark:hover:text-[#60A5FA] transition"
                          >
                            <History className="w-4 h-4 text-[#667085] dark:text-[#94A3B8]" />
                            Submission History
                          </Link>
                        </>
                      ) : (
                        <Link
                          to="/admin/dashboard"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#172033] dark:text-[#F8FAFC] hover:bg-[#F5F7FA] dark:hover:bg-[#20252C] hover:text-[#0757B8] dark:hover:text-[#60A5FA] transition"
                        >
                          <ShieldCheck className="w-4 h-4 text-[#667085] dark:text-[#94A3B8]" />
                          Admin Console
                        </Link>
                      )}
                    </div>

                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 transition text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] hover:text-[#0757B8] dark:hover:text-[#60A5FA] hover:bg-[#F5F7FA] dark:hover:bg-[#20252C] transition"
              >
                Student Login
              </Link>
              <Link
                to="/admin/login"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white shadow-md shadow-blue-500/20 transition"
              >
                Admin Login
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>

    {/* Scientific Calculator Modal */}
    {isAuthenticated && !isAdmin && (
      <ScientificCalculator
        isOpen={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
      />
    )}
  </>
  );
};
