'use client';

import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { DISCLAIMER_TEXT } from '@/lib/constants';

export const TradingDisclaimer: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-200/90 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-amber-300 uppercase tracking-wider text-[11px]">
                Statutory Financial Disclaimer
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                Manual Affordability Utility
              </span>
            </div>
            <p className="mt-1 leading-relaxed text-amber-100/80">
              Affordability calculations are purely mathematical estimations based on manually entered
              premiums and user-defined lot sizes.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-amber-400 hover:text-amber-300 p-1 rounded hover:bg-amber-500/10 transition-colors shrink-0 flex items-center gap-1 font-mono text-[11px]"
        >
          <span>{isExpanded ? 'Hide' : 'Details'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-amber-500/15 space-y-2 text-amber-200/80 font-normal leading-relaxed">
          <p>{DISCLAIMER_TEXT}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero Broker Credentials or Auth Required</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>No Automated Order Placement or Financial Advice</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
