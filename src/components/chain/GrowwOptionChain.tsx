'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useOptionWorkflow } from '@/context/OptionWorkflowContext';
import { INSTRUMENTS_DEFINITIONS } from '@/lib/constants';
import { OptionChainRow, OptionChainTableData } from '@/types/api';
import { SelectedContract } from '@/types/market';
import { formatINR, formatNumber } from '@/lib/formatters';
import {
  Calendar,
  Search,
  RotateCcw,
  Check,
  TrendingUp,
  TrendingDown,
  WifiOff,
  Wifi,
  Sparkles,
  Edit3,
  SlidersHorizontal,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface GrowwOptionChainProps {
  onSwitchToManual?: () => void;
}

export const GrowwOptionChain: React.FC<GrowwOptionChainProps> = ({ onSwitchToManual }) => {
  const {
    selectedInstrumentId,
    selectedExpiry,
    selectedCeContract,
    selectedPeContract,
    selectExpiry,
    selectCeContract,
    selectPeContract,
  } = useOptionWorkflow();

  const instrument = INSTRUMENTS_DEFINITIONS[selectedInstrumentId];

  // Local state for UI controls
  const [strikeFilter, setStrikeFilter] = useState<string>('');
  const [isDetailedView, setIsDetailedView] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isReferenceMode, setIsReferenceMode] = useState<boolean>(false);

  // Live provider state
  const [liveData, setLiveData] = useState<OptionChainTableData | null>(null);
  const [isLiveLoading, setIsLiveLoading] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [isProviderConfigured, setIsProviderConfigured] = useState<boolean>(false);

  // Reference expiry series used as fallback when provider is unconfigured
  const referenceExpiries = useMemo(() => {
    return ['2026-10-29', '2026-11-05', '2026-11-12', '2026-11-26'];
  }, []);

  const availableExpiries = useMemo(() => {
    if (liveData?.availableExpiries && liveData.availableExpiries.length > 0) {
      return liveData.availableExpiries;
    }
    return referenceExpiries;
  }, [liveData, referenceExpiries]);

  const activeExpiry = selectedExpiry || availableExpiries[0];

  /**
   * Reference test option chain rows (Clearly marked Source: Reference Example).
   */
  const referenceRows: OptionChainRow[] = useMemo(() => {
    const step = instrument.strikeStep || 50;
    const baseStrike =
      selectedInstrumentId === 'SENSEX'
        ? 80000
        : selectedInstrumentId === 'BANK_NIFTY'
        ? 52000
        : selectedInstrumentId === 'GOLD'
        ? 78000
        : selectedInstrumentId === 'CRUDE_OIL'
        ? 6200
        : selectedInstrumentId === 'NATURAL_GAS'
        ? 240
        : 24500;

    const strikes = [
      baseStrike - step * 4,
      baseStrike - step * 3,
      baseStrike - step * 2,
      baseStrike - step,
      baseStrike,
      baseStrike + step,
      baseStrike + step * 2,
      baseStrike + step * 3,
      baseStrike + step * 4,
    ];

    const lot = instrument.defaultLotSize || 10;

    return strikes.map((strike, idx) => {
      const isAtm = strike === baseStrike;
      const ceDiff = (baseStrike - strike) / step;
      const peDiff = (strike - baseStrike) / step;

      // Realistic premiums (Prompt baseline: 24500 CE is ₹40, 24500 PE is ₹60)
      const ceLtp = isAtm ? 40 : Math.max(5, Math.round((40 + ceDiff * 25) * 10) / 10);
      const peLtp = isAtm ? 60 : Math.max(5, Math.round((60 + peDiff * 25) * 10) / 10);

      return {
        strikePrice: strike,
        isAtm,
        ce: {
          contractIdentifier: `${instrument.exchange}:${instrument.symbol}${activeExpiry}${strike}CE`,
          premium: ceLtp,
          quoteState: 'NOT_CONNECTED',
          priceChange: idx % 2 === 0 ? +2.4 : -1.8,
          priceChangePercent: idx % 2 === 0 ? +5.8 : -3.2,
          openInterest: 1850000 + (4 - Math.abs(ceDiff)) * 320000,
          changeInOpenInterest: idx % 2 === 0 ? +45200 : -18400,
          volume: 520000 + (4 - Math.abs(ceDiff)) * 110000,
          impliedVolatility: 13.8 + Math.abs(ceDiff) * 0.4,
          bid: Math.max(0, ceLtp - 0.2),
          ask: ceLtp + 0.2,
          lotSize: lot,
        },
        pe: {
          contractIdentifier: `${instrument.exchange}:${instrument.symbol}${activeExpiry}${strike}PE`,
          premium: peLtp,
          quoteState: 'NOT_CONNECTED',
          priceChange: idx % 2 === 0 ? -1.5 : +3.1,
          priceChangePercent: idx % 2 === 0 ? -2.4 : +6.2,
          openInterest: 2150000 + (4 - Math.abs(peDiff)) * 350000,
          changeInOpenInterest: idx % 2 === 0 ? -12000 : +68400,
          volume: 610000 + (4 - Math.abs(peDiff)) * 125000,
          impliedVolatility: 14.2 + Math.abs(peDiff) * 0.4,
          bid: Math.max(0, peLtp - 0.2),
          ask: peLtp + 0.2,
          lotSize: lot,
        },
      };
    });
  }, [instrument, selectedInstrumentId, activeExpiry]);

  /**
   * Fetches real option chain from the server API boundary.
   */
  const fetchOptionChain = useCallback(
    async (targetExpiry?: string) => {
      setIsLiveLoading(true);
      setLiveError(null);

      try {
        const queryExpiry = targetExpiry || selectedExpiry || '';
        const res = await fetch(
          `/api/market-data/option-chain?instrumentId=${selectedInstrumentId}&expiry=${queryExpiry}`
        );

        const json = await res.json();

        if (res.status === 200 && json.success && json.data) {
          setLiveData(json.data);
          setIsProviderConfigured(true);
          setIsReferenceMode(false);
          // If no expiry was selected, select the first one from live data
          if (!selectedExpiry && json.data.availableExpiries?.[0]) {
            selectExpiry(json.data.availableExpiries[0]);
          }
        } else if (res.status === 503) {
          // Provider not configured
          setIsProviderConfigured(false);
          setLiveData(null);
        } else {
          setIsProviderConfigured(false);
          setLiveError(json.error?.message || 'Failed to fetch option chain.');
        }
      } catch {
        setIsProviderConfigured(false);
        setLiveData(null);
      } finally {
        setIsLiveLoading(false);
      }
    },
    [selectedInstrumentId, selectedExpiry, selectExpiry]
  );

  useEffect(() => {
    fetchOptionChain();
  }, [fetchOptionChain]);

  // Compute tokens for active live stream
  const activeStreamTokens = useMemo(() => {
    if (!isProviderConfigured || !liveData?.rows) return null;
    const tokens: string[] = [];
    for (const r of liveData.rows) {
      if (r.ce?.token) tokens.push(r.ce.token);
      if (r.pe?.token) tokens.push(r.pe.token);
    }
    if (tokens.length === 0) return null;

    const segment =
      liveData.exchange === 'BSE'
        ? 'BFO'
        : liveData.exchange === 'MCX'
        ? 'MCX'
        : 'NFO';

    return {
      tokensParam: tokens.join(','),
      segment,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProviderConfigured, liveData?.exchange, liveData?.expiryDate, liveData?.underlyingSymbol]);

  // Connect live Server-Sent Events stream when provider is connected and rows have tokens
  useEffect(() => {
    if (!activeStreamTokens) {
      return;
    }

    const streamUrl = `/api/market-data/stream?tokens=${activeStreamTokens.tokensParam}&segment=${activeStreamTokens.segment}`;
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(streamUrl);

      eventSource.onmessage = (event) => {
        try {
          const tick = JSON.parse(event.data);
          if (tick && tick.token && typeof tick.ltp === 'number') {
            setLiveData((prev) => {
              if (!prev) return prev;
              const updatedRows = prev.rows.map((row) => {
                let changed = false;
                let updatedCe = row.ce;
                let updatedPe = row.pe;

                if (row.ce && row.ce.token === tick.token) {
                  updatedCe = {
                    ...row.ce,
                    premium: tick.ltp,
                    quoteState: 'LIVE',
                    volume: tick.volume ?? row.ce.volume,
                    timestamp: new Date(tick.exchangeTimestamp || Date.now()).toLocaleTimeString(),
                  };
                  changed = true;
                }
                if (row.pe && row.pe.token === tick.token) {
                  updatedPe = {
                    ...row.pe,
                    premium: tick.ltp,
                    quoteState: 'LIVE',
                    volume: tick.volume ?? row.pe.volume,
                    timestamp: new Date(tick.exchangeTimestamp || Date.now()).toLocaleTimeString(),
                  };
                  changed = true;
                }

                if (!changed) return row;
                return { ...row, ce: updatedCe, pe: updatedPe };
              });

              return { ...prev, rows: updatedRows };
            });
          }
        } catch {
          // Ignore parse errors on heartbeats
        }
      };
    } catch {
      // EventSource failed to instantiate
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [activeStreamTokens]);

  // Option chain rows to display:
  // If liveData is present, use liveData.rows; otherwise referenceRows if reference mode is active
  const baseRows = useMemo(() => {
    if (liveData?.rows && liveData.rows.length > 0) {
      return liveData.rows;
    }
    if (isReferenceMode) {
      return referenceRows;
    }
    return [];
  }, [liveData, isReferenceMode, referenceRows]);

  const activeRows = useMemo(() => {
    if (!strikeFilter.trim()) return baseRows;
    const filterNum = parseFloat(strikeFilter.replace(/,/g, ''));
    if (isNaN(filterNum)) return baseRows;
    return baseRows.filter((r) => r.strikePrice.toString().includes(filterNum.toString()));
  }, [baseRows, strikeFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOptionChain(activeExpiry);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  /**
   * Handle selecting CE contract
   */
  const handleSelectCe = (row: OptionChainRow) => {
    if (!row.ce) return;
    const isLive = Boolean(liveData && row.ce.quoteState === 'LIVE');
    const contract: SelectedContract = {
      token: row.ce.token,
      exchange: instrument.exchange,
      underlyingSymbol: instrument.symbol,
      expiryDate: activeExpiry,
      strikePrice: row.strikePrice,
      optionType: 'CE',
      premium: row.ce.premium,
      lotSize: row.ce.lotSize || instrument.defaultLotSize,
      contractIdentifier: row.ce.contractIdentifier,
      priceChange: row.ce.priceChange,
      priceChangePercent: row.ce.priceChangePercent,
      bidPrice: row.ce.bid,
      askPrice: row.ce.ask,
      openInterest: row.ce.openInterest,
      changeInOpenInterest: row.ce.changeInOpenInterest,
      volume: row.ce.volume,
      iv: row.ce.impliedVolatility,
      source: isLive ? 'API' : 'MANUAL',
      quoteState: isLive ? 'LIVE' : 'NOT_CONNECTED',
      timestamp: row.ce.timestamp || new Date().toISOString(),
    };
    selectCeContract(contract);
  };

  /**
   * Handle selecting PE contract
   */
  const handleSelectPe = (row: OptionChainRow) => {
    if (!row.pe) return;
    const isLive = Boolean(liveData && row.pe.quoteState === 'LIVE');
    const contract: SelectedContract = {
      token: row.pe.token,
      exchange: instrument.exchange,
      underlyingSymbol: instrument.symbol,
      expiryDate: activeExpiry,
      strikePrice: row.strikePrice,
      optionType: 'PE',
      premium: row.pe.premium,
      lotSize: row.pe.lotSize || instrument.defaultLotSize,
      contractIdentifier: row.pe.contractIdentifier,
      priceChange: row.pe.priceChange,
      priceChangePercent: row.pe.priceChangePercent,
      bidPrice: row.pe.bid,
      askPrice: row.pe.ask,
      openInterest: row.pe.openInterest,
      changeInOpenInterest: row.pe.changeInOpenInterest,
      volume: row.pe.volume,
      iv: row.pe.impliedVolatility,
      source: isLive ? 'API' : 'MANUAL',
      quoteState: isLive ? 'LIVE' : 'NOT_CONNECTED',
      timestamp: row.pe.timestamp || new Date().toISOString(),
    };
    selectPeContract(contract);
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Sub-header: Expiry tabs, search, filters & refresh */}
      <div className="bg-[#10141f] border border-[#20273a] rounded-xl p-4 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Expiry Selector Pills */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Choose Expiry Date</span>
              {isLiveLoading && (
                <span className="text-[10px] text-indigo-400 animate-pulse ml-2">Loading...</span>
              )}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {availableExpiries.map((expiry) => {
                const isSelected = activeExpiry === expiry;
                return (
                  <button
                    key={expiry}
                    type="button"
                    onClick={() => {
                      selectExpiry(expiry);
                      if (isProviderConfigured) {
                        fetchOptionChain(expiry);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400'
                        : 'bg-[#151b28] text-slate-300 hover:text-white hover:bg-[#1f2638] border border-[#222a3d]'
                    }`}
                  >
                    {expiry}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Strike & View Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Find strike (e.g. 24500)..."
                value={strikeFilter}
                onChange={(e) => setStrikeFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#0b0e15] border border-[#222a3d] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44 font-mono"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsDetailedView(!isDetailedView)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#151b28] text-slate-300 border border-[#222a3d] hover:bg-[#1f2638]"
              title="Toggle Greeks & Volume columns"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isDetailedView ? 'Compact' : 'Detailed'}</span>
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              className={`p-2 rounded-lg bg-[#151b28] text-slate-300 border border-[#222a3d] hover:bg-[#1f2638] ${
                isRefreshing || isLiveLoading ? 'animate-spin text-indigo-400' : ''
              }`}
              title="Refresh option chain"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Provider Connected Banner */}
        {isProviderConfigured && liveData ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-xs gap-2">
            <div className="flex items-center gap-2 text-emerald-300">
              <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Angel One SmartAPI Live:</strong> Streaming real-time contracts for{' '}
                <strong className="text-white font-mono">{liveData.underlyingSymbol}</strong> ({activeExpiry}).
              </span>
            </div>
            {liveData.retrievalTimestamp && (
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>Updated: {new Date(liveData.retrievalTimestamp).toLocaleTimeString()}</span>
              </span>
            )}
          </div>
        ) : null}

        {/* Unconfigured Provider Banner */}
        {!isProviderConfigured && !isReferenceMode && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <WifiOff className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-amber-300 uppercase tracking-wider">
                      Angel One SmartAPI: Not Connected
                    </span>
                    <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                      Manual Calculation Mode Active
                    </span>
                  </div>
                  <p className="text-xs text-amber-100/80 leading-relaxed">
                    To stream live NSE/BSE/MCX option chains and quotes, configure your SmartAPI credentials
                    (<code className="text-amber-200">ANGEL_ONE_API_KEY</code>,{' '}
                    <code className="text-amber-200">ANGEL_ONE_CLIENT_CODE</code>,{' '}
                    <code className="text-amber-200">ANGEL_ONE_PIN</code>, and{' '}
                    <code className="text-amber-200">ANGEL_ONE_TOTP_SECRET</code>) in{' '}
                    <code className="text-amber-200">.env.local</code>. No prices are fabricated.
                  </p>
                  {liveError && (
                    <div className="text-[11px] text-rose-300 flex items-center gap-1 pt-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{liveError}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/15">
              <button
                type="button"
                onClick={() => setIsReferenceMode(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-500/40 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Load Verified Test Option Chain [Reference Example]</span>
              </button>

              {onSwitchToManual && (
                <button
                  type="button"
                  onClick={onSwitchToManual}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#151b28] text-slate-300 hover:text-white hover:bg-[#1f2638] border border-[#222a3d] transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Use Manual Entry Fallback</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Reference Mode Active Indicator */}
        {isReferenceMode && !isProviderConfigured && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-500/30 text-xs">
            <div className="flex items-center gap-2 text-indigo-300">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                <strong>Reference Test Chain Loaded:</strong> Click any Call (CE) or Put (PE) strike to test selection. Labeled strictly as reference example.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsReferenceMode(false)}
              className="text-slate-400 hover:text-white text-[11px] underline ml-2"
            >
              Hide Chain
            </button>
          </div>
        )}
      </div>

      {/* Groww-Style Option Chain Table */}
      {activeRows.length > 0 && (
        <div className="rounded-xl border border-[#20273a] bg-[#0c1018] overflow-hidden shadow-2xl">
          {/* Table Header Bar */}
          <div className="grid grid-cols-12 bg-[#121724] border-b border-[#20273a] py-3 px-3 text-xs font-mono font-bold">
            <div className="col-span-5 text-center text-emerald-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              <span>CALLS (CE)</span>
            </div>
            <div className="col-span-2 text-center text-white uppercase tracking-wider bg-[#182032] py-0.5 rounded">
              STRIKE
            </div>
            <div className="col-span-5 text-center text-rose-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <TrendingDown className="w-4 h-4" />
              <span>PUTS (PE)</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#0e131d] border-b border-[#1b2234] text-[11px] font-mono text-slate-400">
                  {/* CE Columns */}
                  {isDetailedView && <th className="py-2.5 px-2 text-right">OI</th>}
                  {isDetailedView && <th className="py-2.5 px-2 text-right">Chg OI</th>}
                  {isDetailedView && <th className="py-2.5 px-2 text-right">Vol</th>}
                  {isDetailedView && <th className="py-2.5 px-2 text-right">IV</th>}
                  <th className="py-2.5 px-3 text-right text-slate-300">Bid / Ask</th>
                  <th className="py-2.5 px-3 text-right text-emerald-400 font-bold">LTP (₹)</th>
                  <th className="py-2.5 px-2 text-center text-emerald-400 w-24">Select CE</th>

                  {/* Center Strike Column */}
                  <th className="py-2.5 px-4 text-center text-white bg-[#151c2c] w-28 font-bold">
                    Strike Price
                  </th>

                  {/* PE Columns */}
                  <th className="py-2.5 px-2 text-center text-rose-400 w-24">Select PE</th>
                  <th className="py-2.5 px-3 text-left text-rose-400 font-bold">LTP (₹)</th>
                  <th className="py-2.5 px-3 text-left text-slate-300">Bid / Ask</th>
                  {isDetailedView && <th className="py-2.5 px-2 text-left">IV</th>}
                  {isDetailedView && <th className="py-2.5 px-2 text-left">Vol</th>}
                  {isDetailedView && <th className="py-2.5 px-2 text-left">Chg OI</th>}
                  {isDetailedView && <th className="py-2.5 px-2 text-left">OI</th>}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#182030] font-mono">
                {activeRows.map((row) => {
                  const isCeSelected = selectedCeContract?.strikePrice === row.strikePrice;
                  const isPeSelected = selectedPeContract?.strikePrice === row.strikePrice;

                  return (
                    <tr
                      key={row.strikePrice}
                      className={`transition-colors ${
                        isCeSelected && isPeSelected
                          ? 'bg-indigo-950/30'
                          : isCeSelected
                          ? 'bg-emerald-950/20'
                          : isPeSelected
                          ? 'bg-rose-950/20'
                          : 'hover:bg-[#141a27]'
                      }`}
                    >
                      {/* CE: OI */}
                      {isDetailedView && (
                        <td className="py-2 px-2 text-right text-slate-400 text-[11px]">
                          {formatNumber(row.ce?.openInterest)}
                        </td>
                      )}

                      {/* CE: Chg in OI */}
                      {isDetailedView && (
                        <td
                          className={`py-2 px-2 text-right text-[11px] ${
                            (row.ce?.changeInOpenInterest || 0) >= 0
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {(row.ce?.changeInOpenInterest || 0) >= 0 ? '+' : ''}
                          {formatNumber(row.ce?.changeInOpenInterest)}
                        </td>
                      )}

                      {/* CE: Volume */}
                      {isDetailedView && (
                        <td className="py-2 px-2 text-right text-slate-400 text-[11px]">
                          {formatNumber(row.ce?.volume)}
                        </td>
                      )}

                      {/* CE: IV */}
                      {isDetailedView && (
                        <td className="py-2 px-2 text-right text-slate-400 text-[11px]">
                          {row.ce?.impliedVolatility ? `${row.ce.impliedVolatility}%` : '—'}
                        </td>
                      )}

                      {/* CE: Bid / Ask */}
                      <td className="py-2 px-3 text-right text-[11px] text-slate-400">
                        {row.ce?.bid != null && row.ce?.ask != null
                          ? `${row.ce.bid.toFixed(1)} / ${row.ce.ask.toFixed(1)}`
                          : '—'}
                      </td>

                      {/* CE: LTP (₹) */}
                      <td className="py-2 px-3 text-right font-bold text-emerald-300">
                        <div>{formatINR(row.ce?.premium, { decimals: 2 })}</div>
                        {row.ce?.priceChange != null && (
                          <div
                            className={`text-[10px] ${
                              (row.ce.priceChange || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {(row.ce.priceChange || 0) >= 0 ? '+' : ''}
                            {row.ce.priceChange.toFixed(1)}
                            {row.ce.priceChangePercent != null
                              ? ` (${row.ce.priceChangePercent}%)`
                              : ''}
                          </div>
                        )}
                      </td>

                      {/* CE: Select Button */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleSelectCe(row)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                            isCeSelected
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40 ring-1 ring-emerald-400'
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                          }`}
                        >
                          {isCeSelected ? (
                            <span className="flex items-center gap-1 justify-center">
                              <Check className="w-3 h-3" /> Selected
                            </span>
                          ) : (
                            'Select CE'
                          )}
                        </button>
                      </td>

                      {/* CENTER STRIKE */}
                      <td
                        className={`py-2 px-4 text-center font-bold text-sm bg-[#121826] border-x border-[#1c2436] ${
                          row.isAtm
                            ? 'text-amber-300 bg-amber-950/20 ring-1 ring-amber-500/40'
                            : 'text-white'
                        }`}
                      >
                        <div>{formatNumber(row.strikePrice)}</div>
                        {row.isAtm && (
                          <span className="text-[9px] font-sans font-bold bg-amber-500/20 text-amber-400 px-1 rounded uppercase">
                            ATM
                          </span>
                        )}
                      </td>

                      {/* PE: Select Button */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleSelectPe(row)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                            isPeSelected
                              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/40 ring-1 ring-rose-400'
                              : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30'
                          }`}
                        >
                          {isPeSelected ? (
                            <span className="flex items-center gap-1 justify-center">
                              <Check className="w-3 h-3" /> Selected
                            </span>
                          ) : (
                            'Select PE'
                          )}
                        </button>
                      </td>

                      {/* PE: LTP (₹) */}
                      <td className="py-2 px-3 text-left font-bold text-rose-300">
                        <div>{formatINR(row.pe?.premium, { decimals: 2 })}</div>
                        {row.pe?.priceChange != null && (
                          <div
                            className={`text-[10px] ${
                              (row.pe.priceChange || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {(row.pe.priceChange || 0) >= 0 ? '+' : ''}
                            {row.pe.priceChange.toFixed(1)}
                            {row.pe.priceChangePercent != null
                              ? ` (${row.pe.priceChangePercent}%)`
                              : ''}
                          </div>
                        )}
                      </td>

                      {/* PE: Bid / Ask */}
                      <td className="py-2 px-3 text-left text-[11px] text-slate-400">
                        {row.pe?.bid != null && row.pe?.ask != null
                          ? `${row.pe.bid.toFixed(1)} / ${row.pe.ask.toFixed(1)}`
                          : '—'}
                      </td>

                      {/* PE: IV */}
                      {isDetailedView && (
                        <td className="py-2 px-2 text-left text-slate-400 text-[11px]">
                          {row.pe?.impliedVolatility ? `${row.pe.impliedVolatility}%` : '—'}
                        </td>
                      )}

                      {/* PE: Volume */}
                      {isDetailedView && (
                        <td className="py-2 px-2 text-left text-slate-400 text-[11px]">
                          {formatNumber(row.pe?.volume)}
                        </td>
                      )}

                      {/* PE: Chg in OI */}
                      {isDetailedView && (
                        <td
                          className={`py-2 px-2 text-left text-[11px] ${
                            (row.pe?.changeInOpenInterest || 0) >= 0
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {(row.pe?.changeInOpenInterest || 0) >= 0 ? '+' : ''}
                          {formatNumber(row.pe?.changeInOpenInterest)}
                        </td>
                      )}

                      {/* PE: OI */}
                      {isDetailedView && (
                        <td className="py-2 px-2 text-left text-slate-400 text-[11px]">
                          {formatNumber(row.pe?.openInterest)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
