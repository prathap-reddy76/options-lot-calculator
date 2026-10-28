'use client';

import React from 'react';
import { InstrumentId, MarketGroup } from '@/types/market';
import { INSTRUMENTS_DEFINITIONS } from '@/lib/constants';
import { TrendingUp, Flame, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface MarketSelectorProps {
  selectedInstrumentId: InstrumentId;
  onSelectInstrument: (instrumentId: InstrumentId) => void;
  isProviderConnected?: boolean;
}

export const MarketSelector: React.FC<MarketSelectorProps> = ({
  selectedInstrumentId,
  onSelectInstrument,
  isProviderConnected = false,
}) => {
  const currentInstrument = INSTRUMENTS_DEFINITIONS[selectedInstrumentId];

  const indexInstruments = Object.values(INSTRUMENTS_DEFINITIONS).filter(
    (inst) => inst.group === 'INDEX_OPTIONS'
  );

  const commodityInstruments = Object.values(INSTRUMENTS_DEFINITIONS).filter(
    (inst) => inst.group === 'COMMODITIES'
  );

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#20273a] pb-3">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Choose Market Instrument</span>
            <span className="text-[11px] text-slate-400 font-normal lowercase">
              (select benchmark index or commodity)
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Selected: <span className="font-semibold text-white">{currentInstrument.name}</span> ({currentInstrument.exchange}: {currentInstrument.symbol})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="neutral" size="sm">
            Exchange: {currentInstrument.exchange}
          </Badge>
          {!isProviderConnected && (
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
              Provider: Not Connected (Manual Mode)
            </span>
          )}
        </div>
      </div>

      {/* GROUP 1: INDEX OPTIONS */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-400">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Index Options (NSE / BSE)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {indexInstruments.map((instrument) => {
            const isSelected = selectedInstrumentId === instrument.id;

            return (
              <button
                key={instrument.id}
                type="button"
                onClick={() => onSelectInstrument(instrument.id)}
                className={`flex flex-col text-left p-3 rounded-xl border transition-all duration-150 relative ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500 shadow-[0_0_15px_-4px_rgba(99,102,241,0.3)] ring-1 ring-indigo-500/50'
                    : 'bg-[#10141f] border-[#222a3d] hover:border-slate-600 hover:bg-[#151b2a]'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span
                    className={`font-bold text-xs ${
                      isSelected ? 'text-white' : 'text-slate-200'
                    }`}
                  >
                    {instrument.name}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1 rounded ${
                      isSelected
                        ? 'bg-indigo-500/30 text-indigo-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {instrument.exchange}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>{instrument.symbol}</span>
                  {isSelected && (
                    <CheckCircle2 className="w-3 h-3 text-indigo-400 shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* GROUP 2: COMMODITIES */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
          <Flame className="w-3.5 h-3.5" />
          <span>Commodities (MCX)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {commodityInstruments.map((instrument) => {
            const isSelected = selectedInstrumentId === instrument.id;
            const isRestricted = !instrument.supportsOptions;

            return (
              <button
                key={instrument.id}
                type="button"
                onClick={() => onSelectInstrument(instrument.id)}
                className={`flex flex-col text-left p-3 rounded-xl border transition-all duration-150 relative ${
                  isSelected
                    ? 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_15px_-4px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/40'
                    : 'bg-[#10141f] border-[#222a3d] hover:border-slate-600 hover:bg-[#151b2a]'
                } ${isRestricted ? 'opacity-70' : ''}`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span
                    className={`font-bold text-xs ${
                      isSelected ? 'text-white' : 'text-slate-200'
                    }`}
                  >
                    {instrument.name}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1 rounded ${
                      isSelected
                        ? 'bg-amber-500/30 text-amber-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {instrument.exchange}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>{instrument.symbol}</span>
                  {isRestricted ? (
                    <span className="text-[9px] text-amber-400 font-sans">No CE/PE</span>
                  ) : isSelected ? (
                    <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0" />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Instrument Notice & Restrictions Banner */}
      {!currentInstrument.supportsOptions ? (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">Options Trading Notice:</span>{' '}
            {currentInstrument.unsupportedMessage ||
              'Exchange options are not available for this instrument. Manual lot calculations can still be performed.'}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#0d121c] border border-[#1e2638] text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>
            <strong className="text-slate-300">{currentInstrument.name} Contract Specification:</strong>{' '}
            {currentInstrument.lotSizeHelperText}
          </span>
        </div>
      )}
    </div>
  );
};
