'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CheckCircle2, CircleDot, Clock, X, Shield, Server, PlugZap } from 'lucide-react';

interface RoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoadmapModal: React.FC<RoadmapModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl">
        <Card className="bg-[#10141f] border-[#222b3e] shadow-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#20273a] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <PlugZap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  3-Phase Project Architecture & Roadmap
                </h3>
                <p className="text-xs text-slate-400">
                  Clean modular structure separating manual calculation from future live feeds
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Phase 1 */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-sm text-emerald-300">
                    Phase 1: Complete Frontend & Calculation Engine
                  </span>
                </div>
                <Badge variant="ce" size="sm">
                  Active & Functional
                </Badge>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pl-6">
                Manual capital allocation, whole-lot CE & PE affordability algorithms, fee toggle,
                zero-safe calculation engine, full input validation, responsive dark fintech UI,
                and copyable executive summaries.
              </p>
            </div>

            {/* Phase 2 */}
            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-sm text-indigo-300">
                    Phase 2: Backend Architecture & Future API Integration Preparation
                  </span>
                </div>
                <Badge variant="default" size="sm">
                  Implemented & Ready
                </Badge>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pl-6">
                Provider-independent adapter interface (`IMarketDataProviderAdapter`), Next.js App Router
                server boundary (`/api/market-data/status` and `/api/market-data/quote`), `.env.example`
                credential isolation, contract and quote validation suite, and staleness detection.
              </p>
            </div>

            {/* Phase 3 */}
            <div className="p-4 rounded-xl border border-slate-700/50 bg-slate-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-sm text-slate-300">
                    Phase 3: Live Market Data API Connectivity
                  </span>
                </div>
                <Badge variant="neutral" size="sm">
                  Future Extension
                </Badge>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pl-6">
                When requested in Phase 3, real broker API credentials (e.g. Zerodha Kite, Upstox,
                Dhan) can be linked server-side to fetch real-time option chain premiums. Manual entry
                remains available at all times.
              </p>
            </div>
          </div>

          <div className="p-3 bg-[#0c1018] rounded-xl border border-[#1b2234] flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Strict compliance: Zero hardcoded secrets, zero fake live tickers</span>
            </div>
            <Button size="sm" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
