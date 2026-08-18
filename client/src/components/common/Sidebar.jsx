import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Code2, 
  Trophy, 
  History, 
  Award, 
  User, 
  Users, 
  FileCode, 
  CheckSquare,
  CalendarCheck,
  BarChart3,
  X,
  Settings,
  LogOut,
  Bell,
  Terminal
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const studentLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Coding Problems', path: '/problems', icon: Code2 },
    { name: 'Contests', path: '/contests', icon: Trophy },
    { name: 'Leaderboard', path: '/leaderboard', icon: Award },
    { name: 'My Submissions', path: '/submissions', icon: History },
    { name: 'Student Profile', path: '/profile', icon: User },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Playground', path: '/playground', icon: Terminal },
  ];

  const adminLinks = [
    { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Manage Students', path: '/admin/students', icon: Users },
    { name: 'Coding Problems', path: '/admin/problems', icon: FileCode },
    { name: 'Manage Contests', path: '/admin/contests', icon: Trophy },
    { name: 'Attendance', path: '/admin/attendance', icon: CalendarCheck },
    { name: 'Contest Reports', path: '/admin/reports', icon: BarChart3 },
    { name: 'Leaderboard', path: '/admin/leaderboard', icon: Award },
    { name: 'Notifications', path: '/admin/notifications', icon: Bell },
  ];

  const navLinks = isAdmin ? adminLinks : studentLinks;

  const handleLogout = () => {
    logout();
    navigate(isAdmin ? '/loginadmin' : '/');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-[#E2E8F0] dark:border-[#1E293B] bg-[#FFFFFF] dark:bg-[#0F172A] flex flex-col justify-between transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header Logo */}
        <div className="h-16 px-6 border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#1E293B] p-1 border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-center shadow-md overflow-hidden shrink-0">
              <img src="/circa-logo.jpeg" alt="CIRCA Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-sm font-bold tracking-tight text-[#172033] dark:text-[#F8FAFC]">
              NIT_<span className="text-[#0757B8] dark:text-[#60A5FA]">Campus_Coder</span>
            </span>
          </div>
          {/* Close button for mobile */}
          <button 
            onClick={onClose} 
            className="lg:hidden p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="py-5 overflow-y-auto flex-1 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-2.5 mx-3 rounded-xl text-xs font-bold transition-all relative ${
                  isActive
                    ? 'bg-[#EEF6FF] dark:bg-[#0B1E36] text-[#0757B8] dark:text-[#60A5FA]'
                    : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/50'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#0757B8] dark:bg-[#60A5FA] rounded-r-md" />
                )}
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#0757B8] dark:text-[#60A5FA]' : 'text-[#64748B] dark:text-[#94A3B8]'}`} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Red Logout Button at Bottom */}
        <div className="p-4 border-t border-[#E2E8F0] dark:border-[#1E293B] shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-200 dark:border-red-950/30 transition shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
