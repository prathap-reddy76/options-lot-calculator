import React, { forwardRef } from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  prefixElement?: React.ReactNode;
  suffixElement?: React.ReactNode;
  accent?: 'default' | 'ce' | 'pe';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      prefixElement,
      suffixElement,
      accent = 'default',
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const accentRing = {
      default: 'focus-within:border-indigo-500 focus-within:ring-indigo-500/20',
      ce: 'focus-within:border-emerald-500 focus-within:ring-emerald-500/20',
      pe: 'focus-within:border-rose-500 focus-within:ring-rose-500/20',
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between"
          >
            <span>{label}</span>
          </label>
        )}
        <div
          className={`flex items-center rounded-lg border bg-[#0d111a] px-3 transition-colors duration-150 focus-within:ring-2 ${
            errorMessage
              ? 'border-rose-500/80 focus-within:border-rose-500 focus-within:ring-rose-500/20'
              : `border-[#242b3d] ${accentRing[accent]}`
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-900/50' : ''}`}
        >
          {prefixElement && (
            <div className="mr-2 text-sm text-slate-400 select-none flex items-center">
              {prefixElement}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={`w-full bg-transparent py-2.5 text-sm font-medium text-white placeholder-slate-500 outline-none disabled:cursor-not-allowed ${className}`}
            {...props}
          />
          {suffixElement && (
            <div className="ml-2 text-xs text-slate-400 select-none flex items-center">
              {suffixElement}
            </div>
          )}
        </div>
        {errorMessage ? (
          <p className="mt-1 text-xs text-rose-400 flex items-center gap-1 font-normal">
            <span className="inline-block w-1 h-1 rounded-full bg-rose-400"></span>
            {errorMessage}
          </p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
