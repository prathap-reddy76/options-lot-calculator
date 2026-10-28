'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { AllocationSlider } from '../ui/Slider';
import { formatINRStrict, parseNumberInput } from '@/lib/formatters';
import { Wallet, PieChart, ArrowRight, IndianRupee } from 'lucide-react';

interface CapitalManagerProps {
  totalCapital: number | null;
  onTotalCapitalChange: (capital: number | null) => void;
  ceAllocationPercent: number;
  onCeAllocationChange: (percent: number) => void;
  ceBudget: number;
  peBudget: number;
  errorMessage?: string;
}

export const CapitalManager: React.FC<CapitalManagerProps> = ({
  totalCapital,
  onTotalCapitalChange,
  ceAllocationPercent,
  onCeAllocationChange,
  ceBudget,
  peBudget,
  errorMessage,
}) => {
  const peAllocationPercent = 100 - ceAllocationPercent;

  const quickCapitalAmounts = [
    { label: '₹50K', value: 50000 },
    { label: '₹1 Lakh', value: 100000 },
    { label: '₹2 Lakhs (Example)', value: 200000 },
    { label: '₹5 Lakhs', value: 500000 },
    { label: '₹10 Lakhs', value: 1000000 },
  ];

  const handleCapitalInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.trim() === '') {
      onTotalCapitalChange(null);
    } else {
      const parsed = parseNumberInput(raw);
      onTotalCapitalChange(parsed);
    }
  };

  const handleCePercentInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onCeAllocationChange(50);
      return;
    }
    const val = parseFloat(raw);
    if (!isNaN(val)) {
      onCeAllocationChange(Math.max(0, Math.min(100, Math.round(val))));
    }
  };

  const handlePePercentInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onCeAllocationChange(50);
      return;
    }
    const val = parseFloat(raw);
    if (!isNaN(val)) {
      const pe = Math.max(0, Math.min(100, Math.round(val)));
      onCeAllocationChange(100 - pe);
    }
  };

  return (
    <Card className="space-y-6 bg-gradient-to-br from-[#121724] to-[#0f1420] border-[#222a3d]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#20273a] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-600/15 text-indigo-400 border border-indigo-500/20">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Capital & Allocation Management
            </h2>
            <p className="text-xs text-slate-400">
              Define total trading capital and split ratio across Call (CE) and Put (PE) legs
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <PieChart className="w-4 h-4 text-indigo-400" />
          <span>CE: {ceAllocationPercent}% | PE: {peAllocationPercent}%</span>
        </div>
      </div>

      {/* Capital Input and Quick Amounts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-6 space-y-2">
          <Input
            label="Total Available Capital (INR)"
            type="number"
            min="0"
            step="1000"
            placeholder="e.g. 200000"
            value={totalCapital !== null ? totalCapital : ''}
            onChange={handleCapitalInput}
            errorMessage={errorMessage}
            prefixElement={<IndianRupee className="w-4 h-4 text-emerald-400" />}
            suffixElement={<span className="text-slate-400 font-mono text-xs">INR</span>}
            helperText="Enter your unencumbered option buying capital"
          />

          {/* Quick Capital Selector Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Quick:</span>
            {quickCapitalAmounts.map((q) => {
              const isSelected = totalCapital === q.value;
              return (
                <button
                  key={q.value}
                  type="button"
                  onClick={() => onTotalCapitalChange(q.value)}
                  className={`text-xs px-2.5 py-1 rounded-md font-mono transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'bg-[#182030] text-slate-300 hover:text-white hover:bg-[#222c42] border border-[#242f47]'
                  }`}
                >
                  {q.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Allocation Slider and Dual Percentage Inputs */}
        <div className="lg:col-span-6 space-y-3 bg-[#0d121c] p-4 rounded-xl border border-[#20273a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Leg Allocation Ratio
            </span>
            <span className="text-xs text-slate-400 font-mono">Total: 100%</span>
          </div>

          <AllocationSlider
            value={ceAllocationPercent}
            onChange={onCeAllocationChange}
          />

          {/* Dual Manual Percentage Fields */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-[11px] font-medium text-emerald-400 mb-1 block">
                CE Allocation %
              </label>
              <div className="flex items-center bg-[#101918] border border-emerald-500/30 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={ceAllocationPercent}
                  onChange={handleCePercentInput}
                  className="w-full bg-transparent text-xs font-mono font-bold text-emerald-300 outline-none"
                />
                <span className="text-xs text-emerald-500 font-mono">%</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-rose-400 mb-1 block">
                PE Allocation %
              </label>
              <div className="flex items-center bg-[#1c1316] border border-rose-500/30 rounded-lg px-2.5 py-1.5 focus-within:border-rose-500">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={peAllocationPercent}
                  onChange={handlePePercentInput}
                  className="w-full bg-transparent text-xs font-mono font-bold text-rose-300 outline-none"
                />
                <span className="text-xs text-rose-500 font-mono">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calculated CE & PE Budgets Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {/* CE Budget Card */}
        <div className="rounded-xl border border-emerald-500/30 bg-[#0e1b18]/80 p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              CE Allocated Budget ({ceAllocationPercent}%)
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-300 mt-1">
              {formatINRStrict(ceBudget, 2)}
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-400 font-mono">
            <span>Call Side Target</span>
            <div className="text-emerald-400/80 font-medium">Buying Power</div>
          </div>
        </div>

        {/* PE Budget Card */}
        <div className="rounded-xl border border-rose-500/30 bg-[#1c1215]/80 p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
              PE Allocated Budget ({peAllocationPercent}%)
            </div>
            <div className="text-2xl font-bold font-mono text-rose-300 mt-1">
              {formatINRStrict(peBudget, 2)}
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-400 font-mono">
            <span>Put Side Target</span>
            <div className="text-rose-400/80 font-medium">Buying Power</div>
          </div>
        </div>
      </div>
    </Card>
  );
};
