'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/Header';
import { MarketSelector } from '@/components/dashboard/MarketSelector';
import { GrowwOptionChain } from '@/components/chain/GrowwOptionChain';
import { ManualEntryCard } from '@/components/chain/ManualEntryCard';
import { OptionSelectionBottomBar } from '@/components/chain/OptionSelectionBottomBar';
import { TradingDisclaimer } from '@/components/dashboard/TradingDisclaimer';
import { RoadmapModal } from '@/components/dashboard/RoadmapModal';
import { useOptionWorkflow } from '@/context/OptionWorkflowContext';
import { Layers, Edit3, ArrowRight, TrendingUp } from 'lucide-react';

export default function OptionChainSelectionPage() {
  const {
    selectedInstrumentId,
    workflowMode,
    canContinue,
    selectMarket,
    setWorkflowMode,
  } = useOptionWorkflow();

  const [isRoadmapOpen, setIsRoadmapOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#090c10] text-[#f0f6fc] flex flex-col">
      {/* Header */}
      <Header onOpenRoadmap={() => setIsRoadmapOpen(true)} />

      {/* Main Page 1 Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 space-y-6">
        {/* Step Progress Banner */}
        <div className="bg-[#10141f] border border-[#20273a] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          {/* Step 1 Indicator */}
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-md shadow-indigo-600/30">
              1
            </span>
            <div>
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <span>Step 1: Market & Option Chain</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  Current
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Choose an Index or MCX Commodity, then select independent Call (CE) & Put (PE) contracts.
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-slate-600 font-mono text-xs">
            <span>───</span>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <span>───</span>
          </div>

          {/* Step 2 Link */}
          <Link
            href={canContinue ? '/calculator' : '#'}
            className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
              canContinue
                ? 'hover:bg-slate-800/80 cursor-pointer group'
                : 'opacity-40 cursor-not-allowed pointer-events-none'
            }`}
          >
            <span className={`w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center border ${
              canContinue ? 'bg-slate-800 text-indigo-300 border-indigo-500/50' : 'bg-[#151a26] text-slate-500 border-slate-700'
            }`}>
              2
            </span>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Step 2: Capital Allocation</span>
                <TrendingUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                {canContinue ? 'Click to configure 50/50 capital split →' : 'Select CE & PE contracts to unlock'}
              </p>
            </div>
          </Link>
        </div>

        {/* Feature 1: Market Selection Buttons */}
        <section id="section-market">
          <MarketSelector
            selectedInstrumentId={selectedInstrumentId}
            onSelectInstrument={selectMarket}
            isProviderConnected={false}
          />
        </section>

        {/* Mode Switcher: Option Chain Selection vs Manual Entry Fallback */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-[#10141f] border border-[#20273a]">
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
              <span>Groww-Style Option Chain (Primary)</span>
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
              <span>Manual Entry Mode</span>
            </button>
          </div>

          <div className="hidden sm:block text-[11px] font-mono text-slate-400 pr-2">
            Mode:{' '}
            <span className="text-slate-200">
              {workflowMode === 'CHAIN' ? 'Groww Option Chain' : 'Custom Strikes'}
            </span>
          </div>
        </div>

        {/* Main Option Chain or Manual Entry View */}
        {workflowMode === 'CHAIN' ? (
          <section id="section-chain">
            <GrowwOptionChain onSwitchToManual={() => setWorkflowMode('MANUAL')} />
          </section>
        ) : (
          <section id="section-manual" className="pb-28">
            <ManualEntryCard />
          </section>
        )}

        {/* Trading Disclaimer */}
        <section id="section-disclaimer" className="pt-4 pb-16">
          <TradingDisclaimer />
        </section>
      </main>

      {/* Floating Sticky Bottom Bar for Selection Confirmation & Continue Navigation */}
      <OptionSelectionBottomBar />

      {/* Phase Architecture Roadmap Modal */}
      <RoadmapModal
        isOpen={isRoadmapOpen}
        onClose={() => setIsRoadmapOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-[#1b2234] bg-[#080b0f] py-6 text-center text-xs text-slate-500 mb-16 sm:mb-14">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            © {new Date().getFullYear()} Options Lot Calculator • Page 1: Market & Option Chain Selection
          </p>
          <p className="text-[11px] text-slate-400">
            Multi-Market NSE / BSE / MCX • Pure Mathematical Engine
          </p>
        </div>
      </footer>
    </div>
  );
}
