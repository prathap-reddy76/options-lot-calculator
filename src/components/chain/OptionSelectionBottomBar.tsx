'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useOptionWorkflow } from '@/context/OptionWorkflowContext';
import { INSTRUMENTS_DEFINITIONS } from '@/lib/constants';
import { formatINRStrict, formatNumber } from '@/lib/formatters';
import { TrendingUp, TrendingDown, ArrowRight, Info, CheckCircle2 } from 'lucide-react';

export const OptionSelectionBottomBar: React.FC = () => {
  const router = useRouter();
  const {
    selectedInstrumentId,
    selectedCeContract,
    selectedPeContract,
    canContinue,
  } = useOptionWorkflow();

  const instrument = INSTRUMENTS_DEFINITIONS[selectedInstrumentId];

  const handleContinue = () => {
    if (canContinue) {
      router.push('/calculator');
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#090d15]/95 backdrop-blur-md border-t border-[#20273a] px-4 py-3 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Side: Summary of Selected CE and PE */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* CE Pill */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
              selectedCeContract && selectedCeContract.strikePrice > 0 && selectedCeContract.premium
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-[#121622] border-[#222a3d] text-slate-400'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              CE:{' '}
              {selectedCeContract && selectedCeContract.strikePrice > 0 && selectedCeContract.premium ? (
                <strong className="text-white font-mono">
                  {formatNumber(selectedCeContract.strikePrice)} CE @ {formatINRStrict(selectedCeContract.premium)}
                </strong>
              ) : (
                <span className="italic">Select CE Contract</span>
              )}
            </span>
          </div>

          {/* PE Pill */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
              selectedPeContract && selectedPeContract.strikePrice > 0 && selectedPeContract.premium
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                : 'bg-[#121622] border-[#222a3d] text-slate-400'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span>
              PE:{' '}
              {selectedPeContract && selectedPeContract.strikePrice > 0 && selectedPeContract.premium ? (
                <strong className="text-white font-mono">
                  {formatNumber(selectedPeContract.strikePrice)} PE @ {formatINRStrict(selectedPeContract.premium)}
                </strong>
              ) : (
                <span className="italic">Select PE Contract</span>
              )}
            </span>
          </div>

          {/* Lot size pill */}
          <div className="hidden md:flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
            <span>Lot Size:</span>
            <strong className="text-slate-200">
              {selectedCeContract?.lotSize || instrument.defaultLotSize || 'Manual'}
            </strong>
          </div>
        </div>

        {/* Right Side: Prominent OK / Continue Button */}
        <div className="flex items-center gap-3">
          {!canContinue ? (
            <span className="text-[11px] text-amber-300 font-medium hidden sm:inline-flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              Select both valid CE and PE contracts to proceed
            </span>
          ) : (
            <span className="text-[11px] text-emerald-400 font-medium hidden sm:inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Contracts ready
            </span>
          )}

          <button
            type="button"
            disabled={!canContinue}
            onClick={handleContinue}
            className={`inline-flex items-center justify-center font-bold px-6 py-2.5 rounded-xl transition-all duration-150 text-sm gap-2 ${
              canContinue
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 active:scale-[0.98] cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
            }`}
          >
            <span>Continue to Lot Calculator</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
