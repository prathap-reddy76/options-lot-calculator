'use client';

import React from 'react';
import { CombinedCalculationResult } from '@/types/calculator';
import { formatINRStrict } from '@/lib/formatters';

interface VisualAllocationBarProps {
  result: CombinedCalculationResult;
}

export const VisualAllocationBar: React.FC<VisualAllocationBarProps> = ({ result }) => {
  const { totalCapital, ce, pe, remainingCapital } = result;

  if (totalCapital <= 0) {
    return null;
  }

  const ceCostPct = (ce.totalEstimatedCost / totalCapital) * 100;
  const peCostPct = (pe.totalEstimatedCost / totalCapital) * 100;
  const remainingPct = Math.max(0, 100 - (ceCostPct + peCostPct));

  return (
    <div className="w-full bg-[#0d111a] rounded-xl border border-[#20273a] p-4 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
          Capital Utilization Distribution
        </span>
        <span className="font-mono text-slate-400">
          Deployed:{' '}
          <strong className="text-white">
            {formatINRStrict(result.totalEstimatedExpenditure, 2)}
          </strong>{' '}
          ({((result.totalEstimatedExpenditure / totalCapital) * 100).toFixed(1)}%)
        </span>
      </div>

      {/* Segmented Bar */}
      <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden flex shadow-inner">
        {ceCostPct > 0 && (
          <div
            style={{ width: `${ceCostPct}%` }}
            className="h-full bg-emerald-500 transition-all duration-300 relative group"
            title={`CE Deployed: ${formatINRStrict(ce.totalEstimatedCost)} (${ceCostPct.toFixed(1)}%)`}
          />
        )}
        {peCostPct > 0 && (
          <div
            style={{ width: `${peCostPct}%` }}
            className="h-full bg-rose-500 transition-all duration-300 relative group"
            title={`PE Deployed: ${formatINRStrict(pe.totalEstimatedCost)} (${peCostPct.toFixed(1)}%)`}
          />
        )}
        {remainingPct > 0 && (
          <div
            style={{ width: `${remainingPct}%` }}
            className="h-full bg-slate-700/60 transition-all duration-300 relative group"
            title={`Remaining Cash: ${formatINRStrict(remainingCapital)} (${remainingPct.toFixed(1)}%)`}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>CE Deployed: {ceCostPct.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span>PE Deployed: {peCostPct.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
          <span>Buffer / Unused: {remainingPct.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};
