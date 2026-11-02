'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { CombinedCalculationResult } from '@/types/calculator';
import { SelectedContract, InstrumentDefinition } from '@/types/market';
import { VisualAllocationBar } from './VisualAllocationBar';
import { formatINR, formatNumber } from '@/lib/formatters';
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface SinglePageResultsSectionProps {
  instrument: InstrumentDefinition;
  calculationResult: CombinedCalculationResult;
  selectedCeContract: SelectedContract | null;
  selectedPeContract: SelectedContract | null;
  ceAllocationPercent: number;
  peAllocationPercent: number;
  chargesEnabled: boolean;
  estimatedChargePerLot: number | null;
  onResetAllocation: () => void;
  onLoadExample: () => void;
}

export const SinglePageResultsSection: React.FC<SinglePageResultsSectionProps> = ({
  instrument,
  calculationResult,
  selectedCeContract,
  selectedPeContract,
  ceAllocationPercent,
  peAllocationPercent,
  chargesEnabled,
  estimatedChargePerLot,
  onResetAllocation,
  onLoadExample,
}) => {
  const [copied, setCopied] = useState(false);

  const totalLots = calculationResult.ce.affordableLots + calculationResult.pe.affordableLots;
  const totalUnits = calculationResult.ce.totalUnits + calculationResult.pe.totalUnits;

  const handleCopySummary = async () => {
    const text = `OPTIONS LOT ALLOCATION SUMMARY
Instrument: ${instrument.name} (${instrument.exchange}: ${instrument.symbol})
Total Investment Capital: ${formatINR(calculationResult.totalCapital)}

CALL OPTION (CE):
- Strike: ${selectedCeContract?.strikePrice || 'Custom'} CE
- Premium: ${formatINR(selectedCeContract?.premium)} | Lot Size: ${selectedCeContract?.lotSize || instrument.defaultLotSize}
- Capital Allocated: ${formatINR(calculationResult.ceBudget)} (${ceAllocationPercent}%)
- Cost Per Lot: ${formatINR(calculationResult.ce.totalCostPerLot)}
- Affordable Whole Lots: ${calculationResult.ce.affordableLots} lots (${formatNumber(calculationResult.ce.totalUnits)} units)
- Actual Cost: ${formatINR(calculationResult.ce.totalEstimatedCost)}
- Unused Allocation: ${formatINR(calculationResult.ce.unusedBudget)}

PUT OPTION (PE):
- Strike: ${selectedPeContract?.strikePrice || 'Custom'} PE
- Premium: ${formatINR(selectedPeContract?.premium)} | Lot Size: ${selectedPeContract?.lotSize || instrument.defaultLotSize}
- Capital Allocated: ${formatINR(calculationResult.peBudget)} (${peAllocationPercent}%)
- Cost Per Lot: ${formatINR(calculationResult.pe.totalCostPerLot)}
- Affordable Whole Lots: ${calculationResult.pe.affordableLots} lots (${formatNumber(calculationResult.pe.totalUnits)} units)
- Actual Cost: ${formatINR(calculationResult.pe.totalEstimatedCost)}
- Unused Allocation: ${formatINR(calculationResult.pe.unusedBudget)}

COMBINED TOTALS:
- Total Capital: ${formatINR(calculationResult.totalCapital)}
- Total Capital Used: ${formatINR(calculationResult.totalEstimatedExpenditure)} (${calculationResult.capitalUtilizationPercent.toFixed(1)}%)
- Remaining Capital (Unused Buffer): ${formatINR(calculationResult.remainingCapital)}
- Total Whole Lots Affordable: ${totalLots} lots (${formatNumber(totalUnits)} units)
${chargesEnabled ? `- Est. Charges/Brokerage: ${formatINR(calculationResult.combinedEstimatedCharges)}` : ''}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Bar with Copy Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#10141f] border border-[#20273a] rounded-xl px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Automatic Whole-Lot Calculation Results</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live Derived
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Affordability, exact cost, and remaining cash buffer calculated automatically without any submit button.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 transition-all"
            title="Copy plan to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-indigo-400" />
                <span>Copy Summary</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Four Key Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CE Affordable Lots */}
        <Card className="bg-[#10141f] border-emerald-500/30 p-4 space-y-1.5 bg-gradient-to-br from-[#10141f] to-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
              CE Affordable Lots
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {calculationResult.ce.affordableLots}{' '}
            <span className="text-sm font-normal text-emerald-300">lots</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {formatNumber(calculationResult.ce.totalUnits)} units • Cost: {formatINR(calculationResult.ce.totalEstimatedCost)}
          </div>
        </Card>

        {/* PE Affordable Lots */}
        <Card className="bg-[#10141f] border-rose-500/30 p-4 space-y-1.5 bg-gradient-to-br from-[#10141f] to-rose-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-bold">
              PE Affordable Lots
            </span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {calculationResult.pe.affordableLots}{' '}
            <span className="text-sm font-normal text-rose-300">lots</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {formatNumber(calculationResult.pe.totalUnits)} units • Cost: {formatINR(calculationResult.pe.totalEstimatedCost)}
          </div>
        </Card>

        {/* Total Investment Used */}
        <Card className="bg-[#10141f] border-indigo-500/30 p-4 space-y-1.5 bg-gradient-to-br from-[#10141f] to-indigo-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
              Total Capital Used
            </span>
            <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded">
              {calculationResult.capitalUtilizationPercent.toFixed(1)}%
            </span>
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {formatINR(calculationResult.totalEstimatedExpenditure)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Out of {formatINR(calculationResult.totalCapital)} allocated
          </div>
        </Card>

        {/* Remaining Investment Balance (Cash) */}
        <Card className="bg-[#10141f] border-amber-500/30 p-4 space-y-1.5 bg-gradient-to-br from-[#10141f] to-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
              Remaining Balance (Cash)
            </span>
            <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">
              {calculationResult.totalCapital > 0
                ? (100 - calculationResult.capitalUtilizationPercent).toFixed(1)
                : '0.0'}%
            </span>
          </div>
          <div className="text-2xl font-mono font-bold text-amber-300">
            {formatINR(calculationResult.remainingCapital)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Unused purchasing buffer (safe cash)
          </div>
        </Card>
      </div>

      {/* 3. Combined Total Whole Lots Callout Banner */}
      <div className="bg-[#10141f] border border-[#20273a] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center font-bold font-mono text-indigo-300 text-base">
            {totalLots}
          </span>
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Combined Affordable Whole Lots</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {formatNumber(totalUnits)} Total Units
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {calculationResult.ce.affordableLots} Call (CE) lots + {calculationResult.pe.affordableLots} Put (PE) lots within budget
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onResetAllocation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
            title="Reset to 50/50 allocation"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Reset 50/50</span>
          </button>
          <button
            type="button"
            onClick={onLoadExample}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#151b28] hover:bg-[#1f2638] text-slate-300 hover:text-white border border-[#222a3d] transition-all"
            title="Load verified prompt example (NIFTY 24500)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Load Example</span>
          </button>
        </div>
      </div>

      {/* 4. Visual Allocation Bar */}
      <VisualAllocationBar result={calculationResult} />

      {/* 5. Comprehensive Execution Table */}
      <Card className="bg-[#10141f] border-[#222a3d] p-0 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-[#20273a] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Execution Breakdown Table
            </h3>
            <p className="text-xs text-slate-400">
              Direct comparison of Call and Put execution metrics based on current inputs
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#0c1018] border-b border-[#1b2234] text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Leg</th>
                <th className="py-3 px-3">Strike</th>
                <th className="py-3 px-3 text-right">Premium (₹)</th>
                <th className="py-3 px-3 text-center">Lot Size</th>
                <th className="py-3 px-4 text-right">Allocated Budget</th>
                <th className="py-3 px-4 text-right">Cost Per Lot</th>
                <th className="py-3 px-4 text-center">Affordable Lots</th>
                <th className="py-3 px-4 text-right">Actual Cost (₹)</th>
                <th className="py-3 px-4 text-right">Unused Allocation (₹)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#182030] font-mono">
              {/* CE ROW */}
              <tr className="hover:bg-[#121927] transition-colors bg-emerald-950/10">
                <td className="py-3.5 px-4 font-bold text-emerald-400 flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CALL (CE)</span>
                </td>
                <td className="py-3.5 px-3 text-white font-bold">
                  {selectedCeContract?.strikePrice ? `${formatNumber(selectedCeContract.strikePrice)} CE` : '—'}
                </td>
                <td className="py-3.5 px-3 text-right text-emerald-300 font-bold">
                  {formatINR(selectedCeContract?.premium, { decimals: 2 })}
                </td>
                <td className="py-3.5 px-3 text-center text-slate-300">
                  {selectedCeContract?.lotSize || instrument.defaultLotSize || '—'}
                </td>
                <td className="py-3.5 px-4 text-right text-white">
                  <div>{formatINR(calculationResult.ceBudget)}</div>
                  <div className="text-[10px] text-slate-400">{ceAllocationPercent}%</div>
                </td>
                <td className="py-3.5 px-4 text-right text-slate-200">
                  <div>{formatINR(calculationResult.ce.totalCostPerLot)}</div>
                  {chargesEnabled && (
                    <div className="text-[10px] text-slate-500">
                      incl. ₹{estimatedChargePerLot} chg
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-block px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                    {calculationResult.ce.affordableLots} lots
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {formatNumber(calculationResult.ce.totalUnits)} units
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right font-bold text-white">
                  {formatINR(calculationResult.ce.totalEstimatedCost)}
                </td>
                <td className="py-3.5 px-4 text-right text-amber-300 font-semibold">
                  {formatINR(calculationResult.ce.unusedBudget)}
                </td>
              </tr>

              {/* PE ROW */}
              <tr className="hover:bg-[#121927] transition-colors bg-rose-950/10">
                <td className="py-3.5 px-4 font-bold text-rose-400 flex items-center gap-2">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  <span>PUT (PE)</span>
                </td>
                <td className="py-3.5 px-3 text-white font-bold">
                  {selectedPeContract?.strikePrice ? `${formatNumber(selectedPeContract.strikePrice)} PE` : '—'}
                </td>
                <td className="py-3.5 px-3 text-right text-rose-300 font-bold">
                  {formatINR(selectedPeContract?.premium, { decimals: 2 })}
                </td>
                <td className="py-3.5 px-3 text-center text-slate-300">
                  {selectedPeContract?.lotSize || instrument.defaultLotSize || '—'}
                </td>
                <td className="py-3.5 px-4 text-right text-white">
                  <div>{formatINR(calculationResult.peBudget)}</div>
                  <div className="text-[10px] text-slate-400">{peAllocationPercent}%</div>
                </td>
                <td className="py-3.5 px-4 text-right text-slate-200">
                  <div>{formatINR(calculationResult.pe.totalCostPerLot)}</div>
                  {chargesEnabled && (
                    <div className="text-[10px] text-slate-500">
                      incl. ₹{estimatedChargePerLot} chg
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-block px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-300 font-bold text-xs border border-rose-500/30">
                    {calculationResult.pe.affordableLots} lots
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {formatNumber(calculationResult.pe.totalUnits)} units
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right font-bold text-white">
                  {formatINR(calculationResult.pe.totalEstimatedCost)}
                </td>
                <td className="py-3.5 px-4 text-right text-amber-300 font-semibold">
                  {formatINR(calculationResult.pe.unusedBudget)}
                </td>
              </tr>
            </tbody>

            {/* COMBINED TOTAL FOOTER */}
            <tfoot>
              <tr className="bg-[#0e131d] font-bold text-white border-t-2 border-[#20273a] font-mono">
                <td className="py-3.5 px-4 text-indigo-400" colSpan={4}>
                  COMBINED PORTFOLIO TOTAL
                </td>
                <td className="py-3.5 px-4 text-right text-indigo-300">
                  {formatINR(calculationResult.totalCapital)} (100%)
                </td>
                <td className="py-3.5 px-4 text-right text-slate-400">—</td>
                <td className="py-3.5 px-4 text-center text-white">
                  <span className="inline-block px-2.5 py-1 rounded-md bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 text-xs">
                    {totalLots} lots
                  </span>
                  <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                    {formatNumber(totalUnits)} units
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right text-emerald-400 text-sm">
                  {formatINR(calculationResult.totalEstimatedExpenditure)}
                </td>
                <td className="py-3.5 px-4 text-right text-amber-400 text-sm">
                  {formatINR(calculationResult.remainingCapital)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
};
