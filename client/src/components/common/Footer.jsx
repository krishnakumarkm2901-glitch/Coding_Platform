import React from 'react';

export const Footer = () => {
  return (
    <footer className="border-t border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#151A21] py-6 px-4 sm:px-6 lg:px-8 text-xs text-[#667085] dark:text-[#94A3B8] transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <img src="/nit-logo.jpg" alt="NIT Logo" className="w-5 h-5 object-contain rounded-md" />
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
            <span className="font-semibold text-[#172033] dark:text-[#F8FAFC]">Developed by Krishna Kumar KM, Abhishek Praveen G</span>
            <span>Batch: 2023–2027 | CSE</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[#667085] dark:text-[#94A3B8]">
          <span className="font-semibold tracking-wide">CIRCA</span>
        </div>
      </div>
    </footer>
  );
};
