import React from 'react';
import { LiveQuoteState, PremiumSource } from '@/types/api';
import { Radio, AlertCircle, Clock, RefreshCw, Edit3, WifiOff, CheckCircle2 } from 'lucide-react';

interface QuoteStatusBadgeProps {
  state?: LiveQuoteState;
  source?: PremiumSource;
  providerName?: string;
  timestamp?: string;
  className?: string;
}

export const QuoteStatusBadge: React.FC<QuoteStatusBadgeProps> = ({
  state = 'NOT_CONNECTED',
  source = 'MANUAL',
  providerName,
  timestamp,
  className = '',
}) => {
  // If the source is explicit MANUAL, render manual badge
  if (source === 'MANUAL' && state === 'NOT_CONNECTED') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700/60 ${className}`}
        title="Calculated from manually entered premium. Not connected to a live API feed."
      >
        <Edit3 className="w-3 h-3 text-slate-400" />
        <span>Manual Entry</span>
      </span>
    );
  }

  const stateConfigs: Record<
    LiveQuoteState,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    NOT_CONNECTED: {
      label: 'Not Connected',
      bg: 'bg-slate-800/80',
      text: 'text-slate-400',
      border: 'border-slate-700',
      icon: <WifiOff className="w-3 h-3 text-slate-400" />,
    },
    LOADING: {
      label: 'Fetching Quote...',
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-300',
      border: 'border-indigo-500/30',
      icon: <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />,
    },
    LIVE: {
      label: 'Live',
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-300',
      border: 'border-emerald-500/40',
      icon: <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />,
    },
    DELAYED: {
      label: 'Delayed Feed',
      bg: 'bg-amber-500/10',
      text: 'text-amber-300',
      border: 'border-amber-500/30',
      icon: <Clock className="w-3 h-3 text-amber-400" />,
    },
    STALE: {
      label: 'Stale Quote',
      bg: 'bg-amber-500/15',
      text: 'text-amber-300',
      border: 'border-amber-500/40',
      icon: <AlertCircle className="w-3 h-3 text-amber-400" />,
    },
    UNAVAILABLE: {
      label: 'Quote Unavailable',
      bg: 'bg-rose-500/10',
      text: 'text-rose-300',
      border: 'border-rose-500/30',
      icon: <AlertCircle className="w-3 h-3 text-rose-400" />,
    },
    ERROR: {
      label: 'Quote Error',
      bg: 'bg-rose-500/15',
      text: 'text-rose-300',
      border: 'border-rose-500/40',
      icon: <AlertCircle className="w-3 h-3 text-rose-400" />,
    },
  };

  const current = stateConfigs[state] || stateConfigs.NOT_CONNECTED;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono border ${current.bg} ${current.text} ${current.border} ${className}`}
      title={
        providerName && timestamp
          ? `Provider: ${providerName} | Time: ${timestamp}`
          : 'Quote state indicator'
      }
    >
      {current.icon}
      <span>{current.label}</span>
      {providerName && state === 'LIVE' && (
        <span className="text-[10px] text-slate-400">({providerName})</span>
      )}
    </span>
  );
};
