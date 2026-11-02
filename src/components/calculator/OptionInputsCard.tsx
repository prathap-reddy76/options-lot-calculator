'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { QuoteStatusBadge } from './QuoteStatusBadge';
import { SelectedContract, InstrumentDefinition } from '@/types/market';
import { CombinedCalculationResult } from '@/types/calculator';
import { formatINR, formatNumber, parseNumberInput } from '@/lib/formatters';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  IndianRupee,
  Hash,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface OptionInputsCardProps {
  instrument: InstrumentDefinition;
  selectedCeContract: SelectedContract | null;
  selectedPeContract: SelectedContract | null;
  calculationResult: CombinedCalculationResult;
  onUpdateCe: (updates: Partial<SelectedContract>) => void;
  onUpdatePe: (updates: Partial<SelectedContract>) => void;
  ceAllocationPercent: number;
  peAllocationPercent: number;
  onRefreshQuotes?: () => void;
  isRefreshingQuotes?: boolean;
}

export const OptionInputsCard: React.FC<OptionInputsCardProps> = ({
  instrument,
  selectedCeContract,
  selectedPeContract,
  calculationResult,
  onUpdateCe,
  onUpdatePe,
  ceAllocationPercent,
  peAllocationPercent,
  onRefreshQuotes,
  isRefreshingQuotes = false,
}) => {
  const handleNumericInput = (
    val: string,
    callback: (n: number | null) => void,
    isInteger = false
  ) => {
    if (val.trim() === '') {
      callback(null);
      return;
    }
    const num = parseNumberInput(val);
    callback(num !== null ? (isInteger ? Math.round(num) : num) : null);
  };

  const ceLotSize =
    selectedCeContract?.lotSize !== null && selectedCeContract?.lotSize !== undefined
      ? selectedCeContract.lotSize
      : instrument.defaultLotSize;

  const peLotSize =
    selectedPeContract?.lotSize !== null && selectedPeContract?.lotSize !== undefined
      ? selectedPeContract.lotSize
      : instrument.defaultLotSize;

  return (
    <div className="space-y-4">
      {/* Header Bar with Live Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#10141f] border border-[#20273a] rounded-xl px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">
                CE & PE Option Contracts
              </h2>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                {instrument.name} ({instrument.exchange})
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Type or edit premiums directly below. Results recalculate instantly.
            </p>
          </div>
        </div>

        {onRefreshQuotes && (
          <button
            type="button"
            onClick={onRefreshQuotes}
            disabled={isRefreshingQuotes}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#151b28] hover:bg-[#1f2638] text-slate-300 hover:text-white border border-[#222a3d] transition-all self-start sm:self-auto"
            title="Fetch latest market quotes"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshingQuotes ? 'animate-spin' : ''}`} />
            <span>{isRefreshingQuotes ? 'Refreshing...' : 'Refresh Quotes'}</span>
          </button>
        )}
      </div>

      {/* Grid of CE and PE Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CALL OPTION (CE) CARD */}
        <Card className="bg-[#0e1715] border-emerald-500/30 p-4 sm:p-5 space-y-4 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            {/* Leg Header */}
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-500/20 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs uppercase tracking-wider text-emerald-400">
                    CALL OPTION (CE)
                  </span>
                  <div className="text-[11px] font-mono text-emerald-300/80">
                    Budget: {formatINR(calculationResult.ceBudget)} ({ceAllocationPercent}%)
                  </div>
                </div>
              </div>

              <QuoteStatusBadge
                state={selectedCeContract?.quoteState}
                source={selectedCeContract?.source}
                timestamp={selectedCeContract?.timestamp}
              />
            </div>

            {/* Inputs Grid */}
            <div className="space-y-3">
              {/* CE Premium Field */}
              <Input
                label="CE Premium per Unit (INR) *"
                type="number"
                min="0.01"
                step="0.05"
                placeholder="e.g. 40"
                value={
                  selectedCeContract?.premium !== null && selectedCeContract?.premium !== undefined
                    ? selectedCeContract.premium
                    : ''
                }
                onChange={(e) =>
                  handleNumericInput(e.target.value, (n) => onUpdateCe({ premium: n }))
                }
                accent="ce"
                prefixElement={<IndianRupee className="w-4 h-4 text-emerald-400" />}
                helperText="Enter target or market price per unit"
                errorMessage={
                  selectedCeContract?.premium !== null &&
                  selectedCeContract?.premium !== undefined &&
                  selectedCeContract.premium <= 0
                    ? 'Premium must be greater than ₹0'
                    : undefined
                }
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* CE Lot Size Field */}
                <Input
                  label="CE Lot Size *"
                  type="number"
                  min="1"
                  step="1"
                  placeholder={instrument.isLotSizeManualRequired ? 'Enter lot size' : 'e.g. 65'}
                  value={ceLotSize !== null && ceLotSize !== undefined ? ceLotSize : ''}
                  onChange={(e) =>
                    handleNumericInput(e.target.value, (n) => onUpdateCe({ lotSize: n }), true)
                  }
                  accent="ce"
                  prefixElement={<Layers className="w-3.5 h-3.5 text-slate-400" />}
                  helperText={instrument.lotSizeHelperText}
                />

                {/* CE Strike Price Field */}
                <Input
                  label="CE Strike Price (Optional)"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 24500"
                  value={selectedCeContract?.strikePrice ? selectedCeContract.strikePrice : ''}
                  onChange={(e) =>
                    handleNumericInput(e.target.value, (n) => onUpdateCe({ strikePrice: n || 0 }), true)
                  }
                  accent="ce"
                  prefixElement={<Hash className="w-3.5 h-3.5 text-slate-400" />}
                  helperText="Contract strike level"
                />
              </div>
            </div>
          </div>

          {/* CE Real-Time Stat Callout Box */}
          <div className="p-3 rounded-xl bg-[#09110f] border border-emerald-500/20 space-y-2 mt-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Cost per Lot:</span>
              <strong className="text-white text-sm">
                {formatINR(calculationResult.ce.totalCostPerLot)}
              </strong>
            </div>

            <div className="flex items-center justify-between text-xs font-mono border-t border-emerald-500/10 pt-1.5">
              <span className="text-slate-400">Affordable Lots:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                {calculationResult.ce.affordableLots} lots ({formatNumber(calculationResult.ce.totalUnits)} units)
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Actual Cost: <strong className="text-white">{formatINR(calculationResult.ce.totalEstimatedCost)}</strong></span>
              <span>Unused: <strong className="text-amber-300">{formatINR(calculationResult.ce.unusedBudget)}</strong></span>
            </div>

            {calculationResult.ce.affordableLots === 0 && calculationResult.ceBudget > 0 && calculationResult.ce.totalCostPerLot > 0 && (
              <div className="text-[11px] text-amber-300 flex items-center gap-1 pt-1">
                <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Budget insufficient for 1 lot (needs {formatINR(calculationResult.ce.totalCostPerLot)})</span>
              </div>
            )}
          </div>
        </Card>

        {/* PUT OPTION (PE) CARD */}
        <Card className="bg-[#1c1216] border-rose-500/30 p-4 sm:p-5 space-y-4 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            {/* Leg Header */}
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-rose-500/20 text-rose-400">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs uppercase tracking-wider text-rose-400">
                    PUT OPTION (PE)
                  </span>
                  <div className="text-[11px] font-mono text-rose-300/80">
                    Budget: {formatINR(calculationResult.peBudget)} ({peAllocationPercent}%)
                  </div>
                </div>
              </div>

              <QuoteStatusBadge
                state={selectedPeContract?.quoteState}
                source={selectedPeContract?.source}
                timestamp={selectedPeContract?.timestamp}
              />
            </div>

            {/* Inputs Grid */}
            <div className="space-y-3">
              {/* PE Premium Field */}
              <Input
                label="PE Premium per Unit (INR) *"
                type="number"
                min="0.01"
                step="0.05"
                placeholder="e.g. 60"
                value={
                  selectedPeContract?.premium !== null && selectedPeContract?.premium !== undefined
                    ? selectedPeContract.premium
                    : ''
                }
                onChange={(e) =>
                  handleNumericInput(e.target.value, (n) => onUpdatePe({ premium: n }))
                }
                accent="pe"
                prefixElement={<IndianRupee className="w-4 h-4 text-rose-400" />}
                helperText="Enter target or market price per unit"
                errorMessage={
                  selectedPeContract?.premium !== null &&
                  selectedPeContract?.premium !== undefined &&
                  selectedPeContract.premium <= 0
                    ? 'Premium must be greater than ₹0'
                    : undefined
                }
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* PE Lot Size Field */}
                <Input
                  label="PE Lot Size *"
                  type="number"
                  min="1"
                  step="1"
                  placeholder={instrument.isLotSizeManualRequired ? 'Enter lot size' : 'e.g. 65'}
                  value={peLotSize !== null && peLotSize !== undefined ? peLotSize : ''}
                  onChange={(e) =>
                    handleNumericInput(e.target.value, (n) => onUpdatePe({ lotSize: n }), true)
                  }
                  accent="pe"
                  prefixElement={<Layers className="w-3.5 h-3.5 text-slate-400" />}
                  helperText={instrument.lotSizeHelperText}
                />

                {/* PE Strike Price Field */}
                <Input
                  label="PE Strike Price (Optional)"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 24500"
                  value={selectedPeContract?.strikePrice ? selectedPeContract.strikePrice : ''}
                  onChange={(e) =>
                    handleNumericInput(e.target.value, (n) => onUpdatePe({ strikePrice: n || 0 }), true)
                  }
                  accent="pe"
                  prefixElement={<Hash className="w-3.5 h-3.5 text-slate-400" />}
                  helperText="Contract strike level"
                />
              </div>
            </div>
          </div>

          {/* PE Real-Time Stat Callout Box */}
          <div className="p-3 rounded-xl bg-[#120b0e] border border-rose-500/20 space-y-2 mt-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Cost per Lot:</span>
              <strong className="text-white text-sm">
                {formatINR(calculationResult.pe.totalCostPerLot)}
              </strong>
            </div>

            <div className="flex items-center justify-between text-xs font-mono border-t border-rose-500/10 pt-1.5">
              <span className="text-slate-400">Affordable Lots:</span>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-xs border border-rose-500/30">
                {calculationResult.pe.affordableLots} lots ({formatNumber(calculationResult.pe.totalUnits)} units)
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Actual Cost: <strong className="text-white">{formatINR(calculationResult.pe.totalEstimatedCost)}</strong></span>
              <span>Unused: <strong className="text-amber-300">{formatINR(calculationResult.pe.unusedBudget)}</strong></span>
            </div>

            {calculationResult.pe.affordableLots === 0 && calculationResult.peBudget > 0 && calculationResult.pe.totalCostPerLot > 0 && (
              <div className="text-[11px] text-amber-300 flex items-center gap-1 pt-1">
                <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Budget insufficient for 1 lot (needs {formatINR(calculationResult.pe.totalCostPerLot)})</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
