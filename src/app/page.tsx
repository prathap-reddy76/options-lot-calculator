'use client';

import React, { useState, useMemo } from 'react';
import { Header } from '@/components/dashboard/Header';
import { MarketSelector } from '@/components/dashboard/MarketSelector';
import { GrowwOptionChain } from '@/components/chain/GrowwOptionChain';
import { OptionInputsCard } from '@/components/calculator/OptionInputsCard';
import { CapitalManager } from '@/components/calculator/CapitalManager';
import { SinglePageResultsSection } from '@/components/calculator/SinglePageResultsSection';
import { TradingDisclaimer } from '@/components/dashboard/TradingDisclaimer';
import { RoadmapModal } from '@/components/dashboard/RoadmapModal';
import { useOptionWorkflow } from '@/context/OptionWorkflowContext';
import { INSTRUMENTS_DEFINITIONS } from '@/lib/constants';
import { calculateOptionsBudget } from '@/lib/calculations';
import { LegInputs } from '@/types/calculator';
import {
  Layers,
  Edit3,
  Sparkles,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

export default function SinglePageOptionsLotCalculator() {
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
    workflowMode,
    selectMarket,
    setTotalCapital,
    setCeAllocation,
    setWorkflowMode,
    resetAllocation,
    startAgain,
    loadExampleContracts,
    updateCeManual,
    updatePeManual,
  } = useOptionWorkflow();

  const [isRoadmapOpen, setIsRoadmapOpen] = useState<boolean>(false);
  const [isRefreshingQuotes, setIsRefreshingQuotes] = useState<boolean>(false);

  const instrument = INSTRUMENTS_DEFINITIONS[selectedInstrumentId];

  // Refresh live market quotes from API endpoint
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

  // Pure Calculation Engine execution — strictly reactive, zero Calculate button!
  const calculationResult = useMemo(() => {
    const ceLegInputs: LegInputs = {
      strikePrice: selectedCeContract?.strikePrice || null,
      premium: selectedCeContract?.premium ?? null,
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
      premium: selectedPeContract?.premium ?? null,
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

  return (
    <div className="min-h-screen bg-[#090c10] text-[#f0f6fc] flex flex-col">
      {/* Header */}
      <Header onOpenRoadmap={() => setIsRoadmapOpen(true)} />

      {/* Main Single-Page Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 space-y-6">
        {/* Single-Page Real-Time Guidance Banner */}
        <div className="bg-[#10141f] border border-[#20273a] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 p-[1px] shrink-0 shadow-lg shadow-indigo-600/20">
              <div className="w-full h-full bg-[#0b0f19] rounded-[11px] flex items-center justify-center font-bold text-emerald-400 font-mono text-sm">
                ₹
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Single-Page Options Lot Calculator
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Automatic Real-Time Calculation</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Select your market instrument, adjust CE/PE premiums, set your investment capital, and view whole affordable lots instantly without clicking any submit button.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={loadExampleContracts}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#151b28] hover:bg-[#1f2638] text-slate-200 hover:text-white border border-[#222a3d] transition-all"
              title="Reset to verified NIFTY 24500 example"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load Example</span>
            </button>

            <button
              type="button"
              onClick={startAgain}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
              title="Reset all inputs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: Instrument Selector */}
        <section id="section-market" className="space-y-2">
          <MarketSelector
            selectedInstrumentId={selectedInstrumentId}
            onSelectInstrument={selectMarket}
            isProviderConnected={false}
          />
        </section>

        {/* SECTION 2: CE and PE Option Selection and Premium Fields */}
        <section id="section-option-inputs" className="space-y-4">
          <OptionInputsCard
            instrument={instrument}
            selectedCeContract={selectedCeContract}
            selectedPeContract={selectedPeContract}
            calculationResult={calculationResult}
            onUpdateCe={updateCeManual}
            onUpdatePe={updatePeManual}
            ceAllocationPercent={ceAllocationPercent}
            peAllocationPercent={peAllocationPercent}
            onRefreshQuotes={handleRefreshQuotes}
            isRefreshingQuotes={isRefreshingQuotes}
          />
        </section>

        {/* Mode Switcher: Quick Manual Input vs Groww Option Chain */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-xl bg-[#10141f] border border-[#20273a] gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setWorkflowMode('CHAIN')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                workflowMode === 'CHAIN'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Groww-Style Option Chain Table</span>
            </button>

            <button
              type="button"
              onClick={() => setWorkflowMode('MANUAL')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                workflowMode === 'MANUAL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Quick Direct Mode</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400 px-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            <span>
              {workflowMode === 'CHAIN'
                ? 'Click any strike below to select contract & populate live price'
                : 'Direct manual entry active'}
            </span>
          </div>
        </div>

        {/* Groww Option Chain Viewer when CHAIN mode is active */}
        {workflowMode === 'CHAIN' && (
          <section id="section-chain" className="transition-all">
            <GrowwOptionChain onSwitchToManual={() => setWorkflowMode('MANUAL')} />
          </section>
        )}

        {/* SECTION 3: Total Investment & Capital Allocation Controls */}
        <section id="section-capital">
          <CapitalManager
            totalCapital={totalCapital}
            onTotalCapitalChange={setTotalCapital}
            ceAllocationPercent={ceAllocationPercent}
            onCeAllocationChange={setCeAllocation}
            ceBudget={calculationResult.ceBudget}
            peBudget={calculationResult.peBudget}
            errorMessage={calculationResult.validationErrors.totalCapital}
          />
        </section>

        {/* SECTION 4: Automatic Results for CE Lots, PE Lots, Costs & Balance */}
        <section id="section-results">
          <SinglePageResultsSection
            instrument={instrument}
            calculationResult={calculationResult}
            selectedCeContract={selectedCeContract}
            selectedPeContract={selectedPeContract}
            ceAllocationPercent={ceAllocationPercent}
            peAllocationPercent={peAllocationPercent}
            chargesEnabled={chargesEnabled}
            estimatedChargePerLot={estimatedChargePerLot}
            onResetAllocation={resetAllocation}
            onLoadExample={loadExampleContracts}
          />
        </section>

        {/* SECTION 5: Trading Disclaimer */}
        <section id="section-disclaimer" className="pt-2">
          <TradingDisclaimer />
        </section>
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
            © {new Date().getFullYear()} Options Lot Calculator • Single-Page Automatic Calculator
          </p>
          <p className="text-[11px] text-slate-400">
            Multi-Market NSE / BSE / MCX • Pure Mathematical Engine • Real-Time Reactivity
          </p>
        </div>
      </footer>
    </div>
  );
}
