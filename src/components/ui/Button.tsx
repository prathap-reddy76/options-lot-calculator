import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'ce' | 'pe';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5',
    md: 'text-sm px-4 py-2.5 rounded-lg gap-2',
    lg: 'text-base px-5 py-3 rounded-xl gap-2.5 font-medium',
  };

  const variantStyles = {
    primary:
      'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98]',
    secondary:
      'bg-[#1f2637] hover:bg-[#2b354c] text-slate-200 border border-[#2e374f] active:scale-[0.98]',
    outline:
      'border border-slate-700 hover:border-slate-500 text-slate-300 hover:bg-slate-800/40 active:scale-[0.98]',
    ghost: 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20',
    ce: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20',
    pe: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20',
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
