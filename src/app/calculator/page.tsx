'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TradingDisclaimer } from '@/components/dashboard/TradingDisclaimer';
import { RoadmapModal } from '@/components/dashboard/RoadmapModal';
import { useOptionWorkflow } from '@/context/OptionWorkflowContext';
import { INSTRUMENTS_DEFINITIONS } from '@/lib/constants';
import { calculateOptionsBudget } from '@/lib/calculations';
import { formatINR, formatINRStrict, formatNumber, parseNumberInput } from '@/lib/formatters';
import { LegInputs } from '@/types/calculator';
import { QuoteStatusBadge } from '@/components/calculator/QuoteStatusBadge';
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  IndianRupee,
  Layers,
  Percent,
  Sliders,
  DollarSign,
  PieChart,
  Calendar,
  CheckCircle2,
  Info,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';

export default function CapitalAllocationCalculatorPage() {
  const router = useRouter();
  const {
    selectedInstrumentId,
    selectedExpiry,
    selectedCeContract,
    selectedPeContract,
    totalCapital,
    ceAllocationPercent,
    peAllocationPercent,
    chargesEnabled,
    estimatedChargePerLot,
    setTotalCapital,
    setCeAllocation,
    setPeAllocation,
    setCharges,
    resetAllocation,
    startAgain,
    loadExampleContracts,
    updateCeManual,
    updatePeManual,
  } = useOptionWorkflow();

  const [isRoadmapOpen, setIsRoadmapOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isRefreshingQuotes, setIsRefreshingQuotes] = useState<boolean>(false);

  const instrument = INSTRUMENTS_DEFINITIONS[selectedInstrumentId];

  // Quick capital chip presets
  const CAPITAL_PRESETS = [50000, 100000, 200000, 500000, 1000000];

  const handleRefreshQuotes = async () => {
    setIsRefreshingQuotes(true);
    try {
      if (selectedCeContract) {
        const resCe = await fetch('/api/market-data/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exchange: selectedCeContract.exchange,
            underlyingSymbol: selectedCeContract.underlyingSymbol,
            expiryDate: selectedCeContract.expiryDate,
            strikePrice: selectedCeContract.strikePrice,
            optionType: 'CE',
          }),
        });
        const jsonCe = await resCe.json();
        if (jsonCe.success && jsonCe.data) {
          updateCeManual({
            premium: jsonCe.data.lastTradedPrice,
            bidPrice: jsonCe.data.bidPrice,
            askPrice: jsonCe.data.askPrice,
            openInterest: jsonCe.data.openInterest,
            timestamp: jsonCe.data.timestamp,
            quoteState: 'LIVE',
            source: 'API',
          });
        }
      }

      if (selectedPeContract) {
        const resPe = await fetch('/api/market-data/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exchange: selectedPeContract.exchange,
            underlyingSymbol: selectedPeContract.underlyingSymbol,
            expiryDate: selectedPeContract.expiryDate,
            strikePrice: selectedPeContract.strikePrice,
            optionType: 'PE',
          }),
        });
        const jsonPe = await resPe.json();
        if (jsonPe.success && jsonPe.data) {
          updatePeManual({
            premium: jsonPe.data.lastTradedPrice,
            bidPrice: jsonPe.data.bidPrice,
            askPrice: jsonPe.data.askPrice,
            openInterest: jsonPe.data.openInterest,
            timestamp: jsonPe.data.timestamp,
            quoteState: 'LIVE',
            source: 'API',
          });
        }
      }
    } catch {
      // Graceful fallback on network glitch
    } finally {
      setIsRefreshingQuotes(false);
    }
  };

  // Guard: Check if contracts are present
  const hasContracts = Boolean(
    selectedCeContract &&
    selectedCeContract.strikePrice > 0 &&
    selectedCeContract.premium !== null &&
    selectedPeContract &&
    selectedPeContract.strikePrice > 0 &&
    selectedPeContract.premium !== null
  );

  // Pure Calculation Engine execution
  const calculationResult = useMemo(() => {
    const ceLegInputs: LegInputs = {
      strikePrice: selectedCeContract?.strikePrice || null,
      premium: selectedCeContract?.premium || null,
      lotSize: selectedCeContract?.lotSize || instrument.defaultLotSize || null,
      chargesEnabled,
      estimatedChargePerLot: chargesEnabled ? estimatedChargePerLot : 0,
      expiryDate: selectedExpiry || undefined,
      underlyingSymbol: instrument.symbol,
      contractIdentifier: selectedCeContract?.contractIdentifier,
      source: selectedCeContract?.source || 'MANUAL',
      quoteState: selectedCeContract?.quoteState || 'NOT_CONNECTED',
    };

    const peLegInputs: LegInputs = {
      strikePrice: selectedPeContract?.strikePrice || null,
      premium: selectedPeContract?.premium || null,
      lotSize: selectedPeContract?.lotSize || instrument.defaultLotSize || null,
      chargesEnabled,
      estimatedChargePerLot: chargesEnabled ? estimatedChargePerLot : 0,
      expiryDate: selectedExpiry || undefined,
      underlyingSymbol: instrument.symbol,
      contractIdentifier: selectedPeContract?.contractIdentifier,
      source: selectedPeContract?.source || 'MANUAL',
      quoteState: selectedPeContract?.quoteState || 'NOT_CONNECTED',
    };

    return calculateOptionsBudget({
      totalCapital,
      ceAllocationPercent,
      marketCategory: 'NIFTY_50',
      instrumentId: selectedInstrumentId,
      selectedExpiry,
      ce: ceLegInputs,
      pe: peLegInputs,
    });
  }, [
    selectedCeContract,
    selectedPeContract,
    selectedInstrumentId,
    selectedExpiry,
    totalCapital,
    ceAllocationPercent,
    chargesEnabled,
    estimatedChargePerLot,
    instrument,
  ]);

  const handleCopySummary = () => {
    const text = `OPTIONS LOT ALLOCATION SUMMARY
Instrument: ${instrument.name} (${instrument.exchange}: ${instrument.symbol})
Expiry: ${selectedExpiry || 'N/A'}
Total Capital: ${formatINR(totalCapital)}

CALL OPTION (CE):
- Strike: ${selectedCeContract?.strikePrice} CE
- Premium: ${formatINR(selectedCeContract?.premium)} | Lot Size: ${selectedCeContract?.lotSize}
- Capital Allocated: ${formatINR(calculationResult.ceBudget)} (${ceAllocationPercent}%)
- Cost Per Lot: ${formatINR(calculationResult.ce.totalCostPerLot)}
- Affordable Whole Lots: ${calculationResult.ce.affordableLots} lots (${calculationResult.ce.totalUnits} units)
- Actual Capital Used: ${formatINR(calculationResult.ce.totalEstimatedCost)}
- Unused CE Allocation: ${formatINR(calculationResult.ce.unusedBudget)}

PUT OPTION (PE):
- Strike: ${selectedPeContract?.strikePrice} PE
- Premium: ${formatINR(selectedPeContract?.premium)} | Lot Size: ${selectedPeContract?.lotSize}
- Capital Allocated: ${formatINR(calculationResult.peBudget)} (${peAllocationPercent}%)
- Cost Per Lot: ${formatINR(calculationResult.pe.totalCostPerLot)}
- Affordable Whole Lots: ${calculationResult.pe.affordableLots} lots (${calculationResult.pe.totalUnits} units)
- Actual Capital Used: ${formatINR(calculationResult.pe.totalEstimatedCost)}
- Unused PE Allocation: ${formatINR(calculationResult.pe.unusedBudget)}

COMBINED SUMMARY:
- Total Capital: ${formatINR(calculationResult.totalCapital)}
- Total Capital Used: ${formatINR(calculationResult.totalEstimatedExpenditure)} (${calculationResult.capitalUtilizationPercent.toFixed(1)}%)
- Remaining Capital (Unused): ${formatINR(calculationResult.remainingCapital)}
- Total Whole Lots Affordable: ${calculationResult.ce.affordableLots + calculationResult.pe.affordableLots} lots
${chargesEnabled ? `- Estimated Brokerage Charges: ${formatINR(calculationResult.combinedEstimatedCharges)}` : ''}`;

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartAgain = () => {
    startAgain();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#090c10] text-[#f0f6fc] flex flex-col">
      {/* Header */}
      <Header onOpenRoadmap={() => setIsRoadmapOpen(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 space-y-6">
        {/* Step Progress Banner */}
        <div className="bg-[#10141f] border border-[#20273a] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          {/* Step 1: Back to contracts */}
          <Link
            href="/"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/80 transition-all group"
          >
            <span className="w-8 h-8 rounded-full bg-emerald-600/30 text-emerald-300 font-bold text-sm flex items-center justify-center border border-emerald-500/50 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <Check className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400" />
                <span>Step 1: Market & Option Chain</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {instrument.name} • {selectedCeContract?.strikePrice || '—'} CE / {selectedPeContract?.strikePrice || '—'} PE selected
              </p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2 text-slate-600 font-mono text-xs">
            <span>───</span>
            <span className="text-indigo-400">►</span>
            <span>───</span>
          </div>

          {/* Step 2 Indicator (Active) */}
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-md shadow-indigo-600/30">
              2
            </span>
            <div>
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <span>Step 2: Capital Allocation & Lot Calculator</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Allocate capital across CE & PE to compute whole lots and unused cash.
              </p>
            </div>
          </div>
        </div>

        {/* Empty State Guard if user visits without selecting contracts */}
        {!hasContracts ? (
          <div className="bg-[#10141f] border border-amber-500/30 rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">No Option Contracts Selected</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                To calculate whole lots and capital allocation, you must first select one Call (CE)
                and one Put (PE) contract from the Option Chain on Step 1.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go to Option Chain (Step 1)</span>
              </Link>

              <button
                type="button"
                onClick={loadExampleContracts}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#151b28] hover:bg-[#1f2638] text-slate-200 hover:text-white border border-[#222a3d] font-semibold text-sm transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Load Verified Example (NIFTY 24500)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Selected Contracts Overview Banner */}
            <div className="bg-[#10141f] border border-[#20273a] rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#20273a] pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white tracking-tight">
                        {instrument.name}
                      </h2>
                      <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                        {instrument.exchange}: {instrument.symbol}
                      </span>
                      {selectedExpiry && (
                        <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Expiry: {selectedExpiry}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Contracts selected from {selectedCeContract?.source === 'MANUAL' ? 'Manual Entry' : 'Groww Option Chain'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRefreshQuotes}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#151b28] text-slate-300 hover:text-white hover:bg-[#1f2638] border border-[#222a3d] transition-all ${
                      isRefreshingQuotes ? 'text-indigo-400' : ''
                    }`}
                    title="Refresh live quotes for selected contracts"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingQuotes ? 'animate-spin' : ''}`} />
                    <span>Refresh Quotes</span>
                  </button>

                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#151b28] text-slate-300 hover:text-white hover:bg-[#1f2638] border border-[#222a3d] transition-all"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Edit Selected Contracts</span>
                  </Link>
                </div>
              </div>

              {/* CE and PE Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CE Card */}
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-[#0e1715] flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-xs uppercase tracking-wider text-emerald-400">
                        CALL OPTION (CE)
                      </span>
                    </div>
                    <QuoteStatusBadge
                      state={selectedCeContract?.quoteState}
                      source={selectedCeContract?.source}
                      timestamp={selectedCeContract?.timestamp}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xl font-mono font-bold text-white">
                        {formatNumber(selectedCeContract?.strikePrice)} CE
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        Premium:{' '}
                        <strong className="text-emerald-300">
                          {formatINR(selectedCeContract?.premium, { decimals: 2 })}
                        </strong>{' '}
                        • Lot: {selectedCeContract?.lotSize}
                      </div>
                      {selectedCeContract?.contractIdentifier && (
                        <div className="text-[10px] font-mono text-slate-500 mt-1">
                          {selectedCeContract.contractIdentifier}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] font-mono text-slate-400">Cost / Lot</div>
                      <div className="text-base font-mono font-bold text-white">
                        {formatINR(calculationResult.ce.totalCostPerLot)}
                      </div>
                      {selectedCeContract?.bidPrice != null && selectedCeContract?.askPrice != null && (
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          Bid: {selectedCeContract.bidPrice} / Ask: {selectedCeContract.askPrice}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* PE Card */}
                <div className="p-4 rounded-xl border border-rose-500/30 bg-[#1c1216] flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-rose-400" />
                      <span className="font-bold text-xs uppercase tracking-wider text-rose-400">
                        PUT OPTION (PE)
                      </span>
                    </div>
                    <QuoteStatusBadge
                      state={selectedPeContract?.quoteState}
                      source={selectedPeContract?.source}
                      timestamp={selectedPeContract?.timestamp}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xl font-mono font-bold text-white">
                        {formatNumber(selectedPeContract?.strikePrice)} PE
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        Premium:{' '}
                        <strong className="text-rose-300">
                          {formatINR(selectedPeContract?.premium, { decimals: 2 })}
                        </strong>{' '}
                        • Lot: {selectedPeContract?.lotSize}
                      </div>
                      {selectedPeContract?.contractIdentifier && (
                        <div className="text-[10px] font-mono text-slate-500 mt-1">
                          {selectedPeContract.contractIdentifier}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] font-mono text-slate-400">Cost / Lot</div>
                      <div className="text-base font-mono font-bold text-white">
                        {formatINR(calculationResult.pe.totalCostPerLot)}
                      </div>
                      {selectedPeContract?.bidPrice != null && selectedPeContract?.askPrice != null && (
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          Bid: {selectedPeContract.bidPrice} / Ask: {selectedPeContract.askPrice}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Capital Management Card */}
            <Card className="bg-[#10141f] border-[#222a3d] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#20273a] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-indigo-400" />
                    <span>Capital & Allocation Controls</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Set your trading capital and adjust the synchronized CE / PE split (must total 100%)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetAllocation}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all border border-slate-700"
                    title="Reset to 50/50 allocation"
                  >
                    <RotateCcw className="w-3 h-3 text-indigo-400" />
                    <span>Reset 50/50</span>
                  </button>
                </div>
              </div>

              {/* Total Capital Input & Quick Chips */}
              <div className="space-y-3">
                <div className="max-w-md">
                  <Input
                    label="Total Available Capital (INR)"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="e.g. 2,00,000"
                    value={totalCapital !== null && totalCapital !== undefined ? totalCapital : ''}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      if (val === '') {
                        setTotalCapital(null);
                      } else {
                        const num = parseNumberInput(val);
                        setTotalCapital(num !== null ? num : null);
                      }
                    }}
                    prefixElement={<IndianRupee className="w-4 h-4 text-slate-400" />}
                    helperText={
                      totalCapital && totalCapital > 0
                        ? `Allocating: ${formatINR(totalCapital)} across Call and Put sides`
                        : 'Enter trading capital in Indian Rupees'
                    }
                    errorMessage={calculationResult.validationErrors.totalCapital}
                  />
                </div>

                {/* Quick Chips */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Quick Select:
                  </span>
                  {CAPITAL_PRESETS.map((preset) => {
                    const isSelected = totalCapital === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTotalCapital(preset)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                            : 'bg-[#151b28] text-slate-300 hover:text-white hover:bg-[#1f2638] border border-[#222a3d]'
                        }`}
                      >
                        {formatINR(preset)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Allocation Sliders & Budgets */}
              <div className="p-4 rounded-xl bg-[#0b0e15] border border-[#1b2234] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>Synchronized Capital Allocation</span>
                  </div>
                  <div className="text-xs font-mono">
                    <span className="text-emerald-400 font-bold">CE: {ceAllocationPercent}%</span>
                    <span className="text-slate-500 mx-2">•</span>
                    <span className="text-rose-400 font-bold">PE: {peAllocationPercent}%</span>
                    <span className="text-slate-400 ml-2">(Total: 100%)</span>
                  </div>
                </div>

                {/* Synchronized Slider */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={ceAllocationPercent}
                    onChange={(e) => setCeAllocation(parseFloat(e.target.value) || 0)}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-slate-500">
                    <span>100% CE / 0% PE</span>
                    <span className="text-slate-400">50% / 50%</span>
                    <span>0% CE / 100% PE</span>
                  </div>
                </div>

                {/* Budget Comparison Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* CE Budget Box */}
                  <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-[#0e1715] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>CE Allocation</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={ceAllocationPercent}
                          onChange={(e) => setCeAllocation(parseFloat(e.target.value) || 0)}
                          className="w-14 px-1.5 py-0.5 bg-[#090d15] border border-emerald-500/40 rounded text-right text-xs font-mono font-bold text-emerald-300 focus:outline-none"
                        />
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                    </div>
                    <div className="text-lg font-mono font-bold text-white">
                      {formatINR(calculationResult.ceBudget)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Affordable: <strong className="text-emerald-300">{calculationResult.ce.affordableLots} lots</strong>
                    </div>
                  </div>

                  {/* PE Budget Box */}
                  <div className="p-3.5 rounded-xl border border-rose-500/30 bg-[#1c1216] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>PE Allocation</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={peAllocationPercent}
                          onChange={(e) => setPeAllocation(parseFloat(e.target.value) || 0)}
                          className="w-14 px-1.5 py-0.5 bg-[#090d15] border border-rose-500/40 rounded text-right text-xs font-mono font-bold text-rose-300 focus:outline-none"
                        />
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                    </div>
                    <div className="text-lg font-mono font-bold text-white">
                      {formatINR(calculationResult.peBudget)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Affordable: <strong className="text-rose-300">{calculationResult.pe.affordableLots} lots</strong>
                    </div>
                  </div>
                </div>

                {/* Optional Charges Toggle */}
                <div className="pt-2 border-t border-[#1b2234] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                    <input
                      type="checkbox"
                      checked={chargesEnabled}
                      onChange={(e) => setCharges(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Include Estimated Charges & Brokerage per lot</span>
                  </label>

                  {chargesEnabled && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Est. Charge / Lot:</span>
                      <div className="relative">
                        <span className="absolute left-2 top-1 text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={estimatedChargePerLot || 0}
                          onChange={(e) => setCharges(true, parseFloat(e.target.value) || 0)}
                          className="pl-5 pr-2 py-0.5 bg-[#141a27] border border-[#222a3d] rounded text-xs font-mono w-20 text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* 3. Comprehensive Results Table comparing CE and PE */}
            <Card className="bg-[#10141f] border-[#222a3d] p-0 overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-[#20273a] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-indigo-400" />
                    <span>Option Affordability & Lot Sizing Results</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Direct side-by-side comparison of Call and Put execution metrics
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#151b28] hover:bg-[#1f2638] text-slate-300 hover:text-white border border-[#222a3d] transition-all"
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

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0c1018] border-b border-[#1b2234] text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Leg</th>
                      <th className="py-3 px-3">Strike</th>
                      <th className="py-3 px-3 text-right">Premium (₹)</th>
                      <th className="py-3 px-3 text-center">Lot Size</th>
                      <th className="py-3 px-4 text-right">Capital Allocation</th>
                      <th className="py-3 px-4 text-right">Cost Per Lot</th>
                      <th className="py-3 px-4 text-center">Affordable Lots</th>
                      <th className="py-3 px-4 text-right">Actual Cost (₹)</th>
                      <th className="py-3 px-4 text-right">Unused Allocation (₹)</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#182030] font-mono">
                    {/* CE ROW */}
                    <tr className="hover:bg-[#121927] transition-colors bg-emerald-950/10">
                      <td className="py-3 px-4 font-bold text-emerald-400 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span>CALL (CE)</span>
                      </td>
                      <td className="py-3 px-3 text-white font-bold">
                        {formatNumber(selectedCeContract?.strikePrice)} CE
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-300 font-bold">
                        {formatINR(selectedCeContract?.premium, { decimals: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-300">
                        {selectedCeContract?.lotSize}
                      </td>
                      <td className="py-3 px-4 text-right text-white">
                        <div>{formatINR(calculationResult.ceBudget)}</div>
                        <div className="text-[10px] text-slate-400">{ceAllocationPercent}%</div>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-200">
                        <div>{formatINR(calculationResult.ce.totalCostPerLot)}</div>
                        {chargesEnabled && (
                          <div className="text-[10px] text-slate-500">
                            incl. ₹{estimatedChargePerLot} chg
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-sm border border-emerald-500/30">
                          {calculationResult.ce.affordableLots} lots
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {formatNumber(calculationResult.ce.totalUnits)} units
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-white">
                        {formatINR(calculationResult.ce.totalEstimatedCost)}
                      </td>
                      <td className="py-3 px-4 text-right text-amber-300 font-semibold">
                        {formatINR(calculationResult.ce.unusedBudget)}
                      </td>
                    </tr>

                    {/* PE ROW */}
                    <tr className="hover:bg-[#121927] transition-colors bg-rose-950/10">
                      <td className="py-3 px-4 font-bold text-rose-400 flex items-center gap-2">
                        <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                        <span>PUT (PE)</span>
                      </td>
                      <td className="py-3 px-3 text-white font-bold">
                        {formatNumber(selectedPeContract?.strikePrice)} PE
                      </td>
                      <td className="py-3 px-3 text-right text-rose-300 font-bold">
                        {formatINR(selectedPeContract?.premium, { decimals: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-300">
                        {selectedPeContract?.lotSize}
                      </td>
                      <td className="py-3 px-4 text-right text-white">
                        <div>{formatINR(calculationResult.peBudget)}</div>
                        <div className="text-[10px] text-slate-400">{peAllocationPercent}%</div>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-200">
                        <div>{formatINR(calculationResult.pe.totalCostPerLot)}</div>
                        {chargesEnabled && (
                          <div className="text-[10px] text-slate-500">
                            incl. ₹{estimatedChargePerLot} chg
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-300 font-bold text-sm border border-rose-500/30">
                          {calculationResult.pe.affordableLots} lots
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {formatNumber(calculationResult.pe.totalUnits)} units
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-white">
                        {formatINR(calculationResult.pe.totalEstimatedCost)}
                      </td>
                      <td className="py-3 px-4 text-right text-amber-300 font-semibold">
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
                        <span className="inline-block px-2.5 py-1 rounded-md bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 text-sm">
                          {calculationResult.ce.affordableLots + calculationResult.pe.affordableLots} lots
                        </span>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                          {formatNumber(calculationResult.ce.totalUnits + calculationResult.pe.totalUnits)} units
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

            {/* 4. Combined Summary & Utilization Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-[#10141f] border-[#20273a] p-4 space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Total Capital
                </span>
                <div className="text-xl font-mono font-bold text-white">
                  {formatINR(calculationResult.totalCapital)}
                </div>
                <div className="text-[11px] text-slate-400">Total portfolio allocation</div>
              </Card>

              <Card className="bg-[#10141f] border-emerald-500/30 p-4 space-y-1 bg-gradient-to-br from-[#10141f] to-emerald-950/20">
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                  Total Capital Used
                </span>
                <div className="text-xl font-mono font-bold text-emerald-300">
                  {formatINR(calculationResult.totalEstimatedExpenditure)}
                </div>
                <div className="text-[11px] text-emerald-400 font-mono">
                  {calculationResult.capitalUtilizationPercent.toFixed(1)}% Capital Utilized
                </div>
              </Card>

              <Card className="bg-[#10141f] border-amber-500/30 p-4 space-y-1 bg-gradient-to-br from-[#10141f] to-amber-950/20">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
                  Remaining Capital (Cash)
                </span>
                <div className="text-xl font-mono font-bold text-amber-300">
                  {formatINR(calculationResult.remainingCapital)}
                </div>
                <div className="text-[11px] text-amber-400 font-mono">
                  {(100 - calculationResult.capitalUtilizationPercent).toFixed(1)}% Unused Cash
                </div>
              </Card>

              <Card className="bg-[#10141f] border-indigo-500/30 p-4 space-y-1 bg-gradient-to-br from-[#10141f] to-indigo-950/20">
                <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400">
                  Total Whole Lots
                </span>
                <div className="text-xl font-mono font-bold text-white">
                  {calculationResult.ce.affordableLots + calculationResult.pe.affordableLots} lots
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {calculationResult.ce.affordableLots} CE + {calculationResult.pe.affordableLots} PE
                </div>
              </Card>
            </div>

            {/* Visual Allocation Bar */}
            <div className="p-4 rounded-xl bg-[#10141f] border border-[#20273a] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-bold">Capital Deployment Breakdown</span>
                <span className="text-slate-400">
                  Used: {formatINR(calculationResult.totalEstimatedExpenditure)} / Remaining: {formatINR(calculationResult.remainingCapital)}
                </span>
              </div>

              <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex">
                {/* CE Share */}
                {calculationResult.totalCapital > 0 && (
                  <div
                    style={{
                      width: `${(calculationResult.ce.totalEstimatedCost / calculationResult.totalCapital) * 100}%`,
                    }}
                    className="bg-emerald-500 transition-all duration-300 relative group"
                    title={`CE Used: ${formatINR(calculationResult.ce.totalEstimatedCost)}`}
                  />
                )}
                {/* PE Share */}
                {calculationResult.totalCapital > 0 && (
                  <div
                    style={{
                      width: `${(calculationResult.pe.totalEstimatedCost / calculationResult.totalCapital) * 100}%`,
                    }}
                    className="bg-rose-500 transition-all duration-300 relative group"
                    title={`PE Used: ${formatINR(calculationResult.pe.totalEstimatedCost)}`}
                  />
                )}
                {/* Remaining */}
                {calculationResult.totalCapital > 0 && (
                  <div
                    style={{
                      width: `${(calculationResult.remainingCapital / calculationResult.totalCapital) * 100}%`,
                    }}
                    className="bg-amber-500/40 transition-all duration-300 relative group"
                    title={`Unused Cash: ${formatINR(calculationResult.remainingCapital)}`}
                  />
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  <span>CE Spent ({formatINR(calculationResult.ce.totalEstimatedCost)})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                  <span>PE Spent ({formatINR(calculationResult.pe.totalEstimatedCost)})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/40" />
                  <span>Unused Cash ({formatINR(calculationResult.remainingCapital)})</span>
                </div>
              </div>
            </div>

            {/* 5. Working Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#10141f] border border-[#20273a]">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#151b28] hover:bg-[#1f2638] text-white border border-[#222a3d] transition-all"
                >
                  <ArrowLeft className="w-4 h-4 text-indigo-400" />
                  <span>Edit Selected Contracts</span>
                </Link>

                <button
                  type="button"
                  onClick={resetAllocation}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Reset Allocation (50/50)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/40 transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied to Clipboard</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Trade Plan</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleStartAgain}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span>Start Again</span>
                </button>
              </div>
            </div>

            {/* Trading Disclaimer */}
            <TradingDisclaimer />
          </div>
        )}
      </main>

      {/* Phase Roadmap Modal */}
      <RoadmapModal
        isOpen={isRoadmapOpen}
        onClose={() => setIsRoadmapOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-[#1b2234] bg-[#080b0f] py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            © {new Date().getFullYear()} Options Lot Calculator • Page 2: Capital Allocation & Lot Sizing
          </p>
          <p className="text-[11px] text-slate-400">
            Whole-Lot Discretization Model • Zero-Safe Mathematical Engine
          </p>
        </div>
      </footer>
    </div>
  );
}
