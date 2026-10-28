'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CombinedCalculationResult, CalculatorInputs } from '@/types/calculator';
import { formatINRStrict, formatNumber } from '@/lib/formatters';
import { MARKET_PRESETS } from '@/lib/constants';
import {
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Calculator,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Wallet,
} from 'lucide-react';

interface SummaryCardProps {
  result: CombinedCalculationResult;
  inputs: CalculatorInputs;
  onReset: () => void;
  onRestoreExample: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  result,
  inputs,
  onReset,
  onRestoreExample,
}) => {
  const [copied, setCopied] = useState(false);

  const market = MARKET_PRESETS[inputs.marketCategory];

  const handleCopySummary = async () => {
    const summaryText = `=========================================
OPTIONS LOT CALCULATOR SUMMARY
Market: ${market.name} (${market.exchange})
Generated: ${new Date().toLocaleString()}
=========================================
CAPITAL ALLOCATION:
- Total Capital: ${formatINRStrict(result.totalCapital)}
- CE Allocation: ${inputs.ceAllocationPercent}% (Budget: ${formatINRStrict(result.ceBudget)})
- PE Allocation: ${100 - inputs.ceAllocationPercent}% (Budget: ${formatINRStrict(result.peBudget)})

CALL OPTION (CE):
- Strike: ${inputs.ce.strikePrice ? inputs.ce.strikePrice : 'N/A'}${inputs.ce.expiryDate ? ` (Expiry: ${inputs.ce.expiryDate})` : ''}
- Premium: ${formatINRStrict(inputs.ce.premium || 0)} / unit [Source: ${inputs.ce.source || 'MANUAL'}]
- Lot Size: ${inputs.ce.lotSize || 0}
- Affordable Lots: ${result.ce.affordableLots} lots (${formatNumber(result.ce.totalUnits)} units)
- Premium Cost / Lot: ${formatINRStrict(result.ce.premiumCostPerLot)}
- Total Premium Cost: ${formatINRStrict(result.ce.totalPremiumCost)}
${inputs.ce.chargesEnabled ? `- Est. Charges: ${formatINRStrict(result.ce.totalEstimatedCharges)}\n- Total CE Cost: ${formatINRStrict(result.ce.totalEstimatedCost)}` : ''}
- Unused CE Budget: ${formatINRStrict(result.ce.unusedBudget)}

PUT OPTION (PE):
- Strike: ${inputs.pe.strikePrice ? inputs.pe.strikePrice : 'N/A'}${inputs.pe.expiryDate ? ` (Expiry: ${inputs.pe.expiryDate})` : ''}
- Premium: ${formatINRStrict(inputs.pe.premium || 0)} / unit [Source: ${inputs.pe.source || 'MANUAL'}]
- Lot Size: ${inputs.pe.lotSize || 0}
- Affordable Lots: ${result.pe.affordableLots} lots (${formatNumber(result.pe.totalUnits)} units)
- Premium Cost / Lot: ${formatINRStrict(result.pe.premiumCostPerLot)}
- Total Premium Cost: ${formatINRStrict(result.pe.totalPremiumCost)}
${inputs.pe.chargesEnabled ? `- Est. Charges: ${formatINRStrict(result.pe.totalEstimatedCharges)}\n- Total PE Cost: ${formatINRStrict(result.pe.totalEstimatedCost)}` : ''}
- Unused PE Budget: ${formatINRStrict(result.pe.unusedBudget)}

COMBINED TOTALS:
- Combined Premium Cost: ${formatINRStrict(result.combinedPremiumCost)}
- Combined Est. Charges: ${formatINRStrict(result.combinedEstimatedCharges)}
- Total Estimated Outlay: ${formatINRStrict(result.totalEstimatedExpenditure)}
- Remaining Buffer Capital: ${formatINRStrict(result.remainingCapital)}
=========================================
Affordability is calculated based on manual inputs. No guarantee of order execution or profitability.`;

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is restricted
      const textarea = document.createElement('textarea');
      textarea.value = summaryText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Card className="bg-[#10141f] border-[#222a3d] space-y-6">
      {/* Header and Working Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#20273a] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-600/15 text-indigo-400 border border-indigo-500/20">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Executive Calculation Summary
            </h3>
            <p className="text-xs text-slate-400">
              Aggregated portfolio affordability, capital utilization, and remaining liquid cash
            </p>
          </div>
        </div>

        {/* Action Buttons: Reset, Copy, Restore Example */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onRestoreExample}
            icon={<Sparkles className="w-3.5 h-3.5 text-amber-400" />}
          >
            Restore Example
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleCopySummary}
            icon={
              copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )
            }
          >
            {copied ? 'Copied to Clipboard!' : 'Copy Summary'}
          </Button>
        </div>
      </div>

      {/* Primary KPI Highlight Banner: Remaining Capital vs Total Expenditure */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Capital */}
        <div className="bg-[#0b0e15] border border-[#1e2538] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              Available Capital
            </span>
            <Wallet className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {formatINRStrict(result.totalCapital, 2)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-1">
            <span>CE: {formatINRStrict(result.ceBudget)}</span>
            <span>•</span>
            <span>PE: {formatINRStrict(result.peBudget)}</span>
          </div>
        </div>

        {/* Total Estimated Expenditure */}
        <div className="bg-[#0b0e15] border border-indigo-500/30 rounded-xl p-4 shadow-[0_0_15px_-5px_rgba(99,102,241,0.15)]">
          <div className="flex items-center justify-between text-xs text-indigo-300">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              Total Expenditure
            </span>
            <Badge variant="default" size="sm">
              {result.capitalUtilizationPercent.toFixed(1)}% deployed
            </Badge>
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300 mt-1">
            {formatINRStrict(result.totalEstimatedExpenditure, 2)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            Premium: {formatINRStrict(result.combinedPremiumCost)}
            {result.combinedEstimatedCharges > 0 &&
              ` + Charges: ${formatINRStrict(result.combinedEstimatedCharges)}`}
          </div>
        </div>

        {/* Remaining Capital */}
        <div className="bg-[#0b0e15] border border-emerald-500/30 rounded-xl p-4 shadow-[0_0_15px_-5px_rgba(16,185,129,0.15)]">
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              Remaining Capital
            </span>
            <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
              Liquid Cash
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {formatINRStrict(result.remainingCapital, 2)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            Buffer: {result.totalCapital > 0 ? ((result.remainingCapital / result.totalCapital) * 100).toFixed(1) : 0}% unutilized
          </div>
        </div>
      </div>

      {/* Side-by-Side Breakdown Table / Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* CE Summary Box */}
        <div className="bg-[#0e1715] border border-emerald-500/20 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-sm text-emerald-400">
                Call Option (CE) Breakdown
              </span>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-300">
              {result.ce.affordableLots} Lots
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Allocated CE Budget:</span>
              <span className="font-mono text-slate-200">
                {formatINRStrict(result.ceBudget, 2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Affordable Lots & Units:</span>
              <span className="font-mono text-emerald-300 font-semibold">
                {result.ce.affordableLots} lots ({formatNumber(result.ce.totalUnits)} units)
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>CE Premium Cost:</span>
              <span className="font-mono text-slate-200">
                {formatINRStrict(result.ce.totalPremiumCost, 2)}
              </span>
            </div>
            {inputs.ce.chargesEnabled && (
              <div className="flex justify-between text-slate-400">
                <span>CE Estimated Charges:</span>
                <span className="font-mono text-amber-300">
                  {formatINRStrict(result.ce.totalEstimatedCharges, 2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-300 font-medium pt-1 border-t border-emerald-500/15">
              <span>Total CE Cost:</span>
              <span className="font-mono text-white">
                {formatINRStrict(result.ce.totalEstimatedCost, 2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Unused CE Budget:</span>
              <span className="font-mono text-emerald-400">
                {formatINRStrict(result.ce.unusedBudget, 2)}
              </span>
            </div>
          </div>
        </div>

        {/* PE Summary Box */}
        <div className="bg-[#1c1216] border border-rose-500/20 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <span className="font-bold text-sm text-rose-400">
                Put Option (PE) Breakdown
              </span>
            </div>
            <span className="text-xs font-mono font-semibold text-rose-300">
              {result.pe.affordableLots} Lots
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Allocated PE Budget:</span>
              <span className="font-mono text-slate-200">
                {formatINRStrict(result.peBudget, 2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Affordable Lots & Units:</span>
              <span className="font-mono text-rose-300 font-semibold">
                {result.pe.affordableLots} lots ({formatNumber(result.pe.totalUnits)} units)
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>PE Premium Cost:</span>
              <span className="font-mono text-slate-200">
                {formatINRStrict(result.pe.totalPremiumCost, 2)}
              </span>
            </div>
            {inputs.pe.chargesEnabled && (
              <div className="flex justify-between text-slate-400">
                <span>PE Estimated Charges:</span>
                <span className="font-mono text-amber-300">
                  {formatINRStrict(result.pe.totalEstimatedCharges, 2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-300 font-medium pt-1 border-t border-rose-500/15">
              <span>Total PE Cost:</span>
              <span className="font-mono text-white">
                {formatINRStrict(result.pe.totalEstimatedCost, 2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Unused PE Budget:</span>
              <span className="font-mono text-rose-400">
                {formatINRStrict(result.pe.unusedBudget, 2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
