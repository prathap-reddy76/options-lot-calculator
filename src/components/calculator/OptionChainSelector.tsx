'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { QuoteStatusBadge } from './QuoteStatusBadge';
import { InstrumentDefinition } from '@/types/market';
import { OptionChainRow } from '@/types/api';
import { formatINRStrict, formatNumber } from '@/lib/formatters';
import {
  Calendar,
  Layers,
  ArrowRight,
  WifiOff,
  Check,
  TrendingUp,
  TrendingDown,
  Edit3,
  Hash,
} from 'lucide-react';

interface OptionChainSelectorProps {
  instrument: InstrumentDefinition;
  availableExpiries: string[];
  selectedExpiry: string | null;
  onSelectExpiry: (expiry: string) => void;
  selectedCeStrike: number | null;
  selectedPeStrike: number | null;
  onSelectCeStrike: (
    strike: number,
    contractIdentifier?: string,
    premium?: number | null,
    lotSize?: number | null
  ) => void;
  onSelectPeStrike: (
    strike: number,
    contractIdentifier?: string,
    premium?: number | null,
    lotSize?: number | null
  ) => void;
  optionChainRows?: OptionChainRow[];
  isProviderConnected?: boolean;
  onSwitchToManualMode?: () => void;
}

export const OptionChainSelector: React.FC<OptionChainSelectorProps> = ({
  instrument,
  availableExpiries = [],
  selectedExpiry,
  onSelectExpiry,
  selectedCeStrike,
  selectedPeStrike,
  onSelectCeStrike,
  onSelectPeStrike,
  optionChainRows = [],
  isProviderConnected = false,
  onSwitchToManualMode,
}) => {
  const hasExpiries = availableExpiries.length > 0;
  const hasRows = optionChainRows.length > 0;

  return (
    <Card className="bg-[#10141f] border-[#222a3d] space-y-6">
      {/* Header and Step Indicators */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#20273a] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">
              Option Chain Contract Selection
            </h3>
            <Badge variant="default" size="sm">
              Primary Workflow
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Select contract expiry and pick independent strikes for CE (Call) and PE (Put)
          </p>
        </div>

        {/* Workflow Steps Tracker */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="text-emerald-400 font-medium">1. {instrument.symbol}</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
          <span className={selectedExpiry ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
            2. {selectedExpiry || 'Expiry'}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
          <span
            className={
              selectedCeStrike || selectedPeStrike
                ? 'text-emerald-400 font-medium'
                : 'text-slate-400'
            }
          >
            3. Strikes
          </span>
        </div>
      </div>

      {/* STEP 2: EXPIRY SELECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>Choose Expiry Date</span>
          </label>
          <span className="text-[11px] font-mono text-slate-400">
            {hasExpiries ? `${availableExpiries.length} Expiries Available` : 'No Live Feed'}
          </span>
        </div>

        {hasExpiries ? (
          <div className="flex flex-wrap gap-2">
            {availableExpiries.map((expiry) => {
              const isSelected = selectedExpiry === expiry;
              return (
                <button
                  key={expiry}
                  type="button"
                  onClick={() => onSelectExpiry(expiry)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                      : 'bg-[#151b28] text-slate-300 border-[#222a3d] hover:border-slate-600 hover:bg-[#1a2233]'
                  }`}
                >
                  {expiry}
                </button>
              );
            })}
          </div>
        ) : (
          /* Empty State when no provider is connected */
          <div className="rounded-xl border border-dashed border-slate-700/60 bg-[#0d111a] p-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                Connect a market-data provider to load available expiries and strikes.
              </h4>
              <p className="text-xs text-slate-400 max-w-lg mx-auto mt-1 leading-relaxed">
                Live contract lists and strike steps require an active broker API connection. In Phase 2,
                the application operates safely in manual mode without external dependencies.
              </p>
            </div>
            {onSwitchToManualMode && (
              <div className="pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onSwitchToManualMode}
                  icon={<Edit3 className="w-3.5 h-3.5 text-indigo-400" />}
                >
                  Use Manual Calculator Mode
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* STEP 3: OPTION CHAIN STRIKE SELECTION TABLE */}
      {hasRows && selectedExpiry && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 uppercase tracking-wider">
              Select CE & PE Strikes Independently
            </span>
            <span className="font-mono text-slate-400">Expiry: {selectedExpiry}</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#20273a] bg-[#0c1018]">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#121724] border-b border-[#20273a] text-slate-400 font-mono text-[11px]">
                  <th className="py-2.5 px-3 text-center text-emerald-400 w-24">Select CE</th>
                  <th className="py-2.5 px-3 text-right text-emerald-400">CE Premium</th>
                  <th className="py-2.5 px-3 text-center text-slate-400">CE Status</th>
                  <th className="py-2.5 px-4 text-center text-white font-bold bg-[#151c2c] w-28">
                    STRIKE
                  </th>
                  <th className="py-2.5 px-3 text-center text-slate-400">PE Status</th>
                  <th className="py-2.5 px-3 text-left text-rose-400">PE Premium</th>
                  <th className="py-2.5 px-3 text-center text-rose-400 w-24">Select PE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182030] font-mono">
                {optionChainRows.map((row) => {
                  const isCeSelected = selectedCeStrike === row.strikePrice;
                  const isPeSelected = selectedPeStrike === row.strikePrice;

                  return (
                    <tr
                      key={row.strikePrice}
                      className="hover:bg-[#131926] transition-colors"
                    >
                      {/* CE Action */}
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            onSelectCeStrike(
                              row.strikePrice,
                              row.ce?.contractIdentifier,
                              row.ce?.premium,
                              row.ce?.lotSize
                            )
                          }
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                            isCeSelected
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                          }`}
                        >
                          {isCeSelected ? 'Selected' : 'Choose CE'}
                        </button>
                      </td>

                      {/* CE Premium */}
                      <td className="py-2 px-3 text-right text-emerald-300 font-bold">
                        {row.ce?.premium !== null && row.ce?.premium !== undefined
                          ? formatINRStrict(row.ce.premium, 2)
                          : '—'}
                      </td>

                      {/* CE Status */}
                      <td className="py-2 px-3 text-center">
                        <QuoteStatusBadge
                          state={row.ce?.quoteState || 'NOT_CONNECTED'}
                          timestamp={row.ce?.timestamp}
                        />
                      </td>

                      {/* Strike Level */}
                      <td
                        className={`py-2 px-4 text-center font-bold text-sm bg-[#111723] ${
                          isCeSelected || isPeSelected
                            ? 'text-indigo-300 ring-1 ring-indigo-500/40 bg-indigo-950/20'
                            : 'text-white'
                        }`}
                      >
                        {formatNumber(row.strikePrice)}
                      </td>

                      {/* PE Status */}
                      <td className="py-2 px-3 text-center">
                        <QuoteStatusBadge
                          state={row.pe?.quoteState || 'NOT_CONNECTED'}
                          timestamp={row.pe?.timestamp}
                        />
                      </td>

                      {/* PE Premium */}
                      <td className="py-2 px-3 text-left text-rose-300 font-bold">
                        {row.pe?.premium !== null && row.pe?.premium !== undefined
                          ? formatINRStrict(row.pe.premium, 2)
                          : '—'}
                      </td>

                      {/* PE Action */}
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            onSelectPeStrike(
                              row.strikePrice,
                              row.pe?.contractIdentifier,
                              row.pe?.premium,
                              row.pe?.lotSize
                            )
                          }
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                            isPeSelected
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30'
                          }`}
                        >
                          {isPeSelected ? 'Selected' : 'Choose PE'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Contract Summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* CE Contract Card */}
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-[#0e1916] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Selected CE Contract
            </span>
            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">
              Call Option
            </span>
          </div>
          <div className="text-xs text-slate-300 space-y-1 font-mono">
            <div>
              Strike:{' '}
              <strong className="text-white">
                {selectedCeStrike ? `${formatNumber(selectedCeStrike)} CE` : 'Not Selected'}
              </strong>
            </div>
            <div className="text-[11px] text-slate-400">
              Contract:{' '}
              <span>
                {instrument.exchange}:{instrument.symbol}{' '}
                {selectedExpiry ? `• ${selectedExpiry}` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* PE Contract Card */}
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-[#1c1216] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              Selected PE Contract
            </span>
            <span className="text-[10px] font-mono text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded">
              Put Option
            </span>
          </div>
          <div className="text-xs text-slate-300 space-y-1 font-mono">
            <div>
              Strike:{' '}
              <strong className="text-white">
                {selectedPeStrike ? `${formatNumber(selectedPeStrike)} PE` : 'Not Selected'}
              </strong>
            </div>
            <div className="text-[11px] text-slate-400">
              Contract:{' '}
              <span>
                {instrument.exchange}:{instrument.symbol}{' '}
                {selectedExpiry ? `• ${selectedExpiry}` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
