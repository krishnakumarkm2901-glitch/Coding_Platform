import React from 'react';

export const Badge = ({ children, variant = 'default', size = 'sm', className = '' }) => {
  const sizeClasses = {
    xs: 'px-2.5 py-0.5 text-[11px] font-bold rounded-full',
    sm: 'px-3 py-1 text-xs font-bold rounded-full',
    md: 'px-3.5 py-1.5 text-sm font-bold rounded-full',
  };

  const variantClasses = {
    default: 'bg-[#F8FAFC] dark:bg-[#151A21] text-[#172033] dark:text-[#F8FAFC] border border-[#D9E0E8] dark:border-[#30363D]',
    primary: 'bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] border border-[#0757B8]/30 dark:border-[#0066CC]/40',
    success: 'bg-[#E8F8F1] text-[#168653] border border-[#A7E3C7] dark:bg-[#22B573]/20 dark:text-[#22B573] dark:border-[#22B573]/40',
    warning: 'bg-[#FEF6E7] text-[#B54708] border border-[#F9DBAF] dark:bg-[#F2B705]/20 dark:text-[#F2B705] dark:border-[#F2B705]/40',
    danger: 'bg-[#FDECEC] text-[#D92D20] border border-[#F5B5B0] dark:bg-[#EF4444]/20 dark:text-[#EF4444] dark:border-[#EF4444]/40',
    easy: 'bg-[#E8F8F1] text-[#168653] border border-[#A7E3C7] dark:bg-[#22B573]/20 dark:text-[#22B573] dark:border-[#22B573]/40',
    medium: 'bg-[#FEF6E7] text-[#B54708] border border-[#F9DBAF] dark:bg-[#F2B705]/20 dark:text-[#F2B705] dark:border-[#F2B705]/40',
    hard: 'bg-[#FDECEC] text-[#D92D20] border border-[#F5B5B0] dark:bg-[#EF4444]/20 dark:text-[#EF4444] dark:border-[#EF4444]/40',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${sizeClasses[size] || sizeClasses.sm} ${
        variantClasses[variant] || variantClasses.default
      } ${className}`}
    >
      {children}
    </span>
  );
};

export const DifficultyBadge = ({ difficulty, size = 'xs' }) => {
  const diff = (difficulty || 'Easy').toLowerCase();
  const variant = diff === 'hard' ? 'hard' : diff === 'medium' ? 'medium' : 'easy';
  return (
    <Badge variant={variant} size={size}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{difficulty || 'Easy'}</span>
    </Badge>
  );
};

export const StatusBadge = ({ status, size = 'xs' }) => {
  let variant = 'default';
  const st = (status || '').toLowerCase();
  if (st.includes('accepted') || st.includes('active') || st.includes('passed') || st.includes('completed')) {
    variant = 'success';
  } else if (st.includes('wrong') || st.includes('error') || st.includes('failed') || st.includes('tle')) {
    variant = 'danger';
  } else if (st.includes('upcoming') || st.includes('pending') || st.includes('running')) {
    variant = 'warning';
  } else {
    variant = 'primary';
  }

  return (
    <Badge variant={variant} size={size}>
      {status || 'Unknown'}
    </Badge>
  );
};

export const TopicTag = ({ topic, size = 'xs' }) => {
  return (
    <Badge variant="default" size={size} className="font-mono font-bold">
      {topic || 'General'}
    </Badge>
  );
};
