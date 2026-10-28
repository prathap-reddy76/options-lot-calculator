import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'ce' | 'pe' | 'highlight';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-[#12161f] border-[#222838] hover:border-[#2d374d]',
    ce: 'bg-[#101918] border-[#10b981]/30 hover:border-[#10b981]/50 shadow-[0_0_20px_-8px_rgba(16,185,129,0.15)]',
    pe: 'bg-[#1c1316] border-[#ef4444]/30 hover:border-[#ef4444]/50 shadow-[0_0_20px_-8px_rgba(239,68,68,0.15)]',
    highlight: 'bg-[#151b28] border-indigo-500/30 hover:border-indigo-500/50',
  };

  return (
    <div
      className={`rounded-xl border p-5 transition-all duration-200 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
