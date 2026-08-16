import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0757B8]/40 hover:scale-105 active:scale-95 ${
        isDark
          ? 'bg-[#151A21] border-2 border-[#0066CC] text-white shadow-blue-900/20'
          : 'bg-[#FFFFFF] border-2 border-[#6BA3E8] text-[#172033] shadow-blue-500/10'
      } ${className}`}
    >
      {isDark ? (
        <Moon className="w-4 h-4 text-white stroke-[2.2]" />
      ) : (
        <Sun className="w-4 h-4 text-[#172033] stroke-[2.2]" />
      )}
    </button>
  );
};
