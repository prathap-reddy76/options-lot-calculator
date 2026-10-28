import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'ce' | 'pe' | 'neutral' | 'warning' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const variantStyles = {
    default: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    ce: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium',
    pe: 'bg-rose-500/10 text-rose-400 border border-rose-500/30 font-medium',
    neutral: 'bg-slate-800 text-slate-300 border border-slate-700',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    info: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-mono tracking-tight ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
