'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { useOptionWorkflow } from '@/context/OptionWorkflowContext';
import { INSTRUMENTS_DEFINITIONS } from '@/lib/constants';
import { TrendingUp, TrendingDown, Layers, IndianRupee, Hash, Calendar, Sparkles } from 'lucide-react';
import { parseNumberInput } from '@/lib/formatters';

export const ManualEntryCard: React.FC = () => {
  const {
    selectedInstrumentId,
    selectedExpiry,
    selectedCeContract,
    selectedPeContract,
    updateCeManual,
    updatePeManual,
    selectExpiry,
    loadExampleContracts,
  } = useOptionWorkflow();

  const instrument = INSTRUMENTS_DEFINITIONS[selectedInstrumentId];

  const handleNumeric = (
    val: string,
    callback: (n: number | null) => void,
    isInteger: boolean = false
  ) => {
    if (val.trim() === '') {
      callback(null);
      return;
    }
    const num = parseNumberInput(val);
    callback(num !== null ? (isInteger ? Math.round(num) : num) : null);
  };

  return (
    <Card className="bg-[#10141f] border-[#222a3d] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#20273a] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">
              Manual Contract Entry Fallback
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Manual Input Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Define custom contract strikes, premiums, and lot sizes for {instrument.name} ({instrument.exchange})
          </p>
        </div>

        <button
          type="button"
          onClick={loadExampleContracts}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/40 transition-all self-start"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Load Example NIFTY 24500 (40/60)</span>
        </button>
      </div>

      {/* Expiry Date */}
      <div className="max-w-xs">
        <Input
          label="Contract Expiry Date (YYYY-MM-DD)"
          type="date"
          value={selectedExpiry || ''}
          onChange={(e) => selectExpiry(e.target.value)}
          prefixElement={<Calendar className="w-3.5 h-3.5 text-slate-400" />}
          helperText="Selected contract expiry cycle"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CALL OPTION (CE) INPUTS */}
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-[#0e1715] space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>Call Option (CE) Contract</span>
            </div>
            <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
              Bullish Leg
            </span>
          </div>

          <div className="space-y-3">
            <Input
              label="CE Strike Price"
              type="number"
              min="1"
              placeholder="e.g. 24500"
              value={selectedCeContract?.strikePrice ? selectedCeContract.strikePrice : ''}
              onChange={(e) =>
                handleNumeric(e.target.value, (n) => updateCeManual({ strikePrice: n || 0 }), true)
              }
              accent="ce"
              prefixElement={<Hash className="w-3.5 h-3.5 text-slate-400" />}
              helperText="Target strike price for CE contract"
            />

            <Input
              label="CE Premium per Unit (INR)"
              type="number"
              min="0.05"
              step="0.05"
              placeholder="e.g. 40"
              value={selectedCeContract?.premium !== null && selectedCeContract?.premium !== undefined ? selectedCeContract.premium : ''}
              onChange={(e) =>
                handleNumeric(e.target.value, (n) => updateCeManual({ premium: n }))
              }
              accent="ce"
              prefixElement={<IndianRupee className="w-3.5 h-3.5 text-slate-400" />}
              helperText="Market price per option unit"
            />

            <Input
              label="CE Lot Size (Units per lot)"
              type="number"
              min="1"
              placeholder={instrument.isLotSizeManualRequired ? 'Enter lot size' : 'e.g. 65'}
              value={selectedCeContract?.lotSize !== null && selectedCeContract?.lotSize !== undefined ? selectedCeContract.lotSize : (instrument.defaultLotSize || '')}
              onChange={(e) =>
                handleNumeric(e.target.value, (n) => updateCeManual({ lotSize: n }), true)
              }
              accent="ce"
              prefixElement={<Layers className="w-3.5 h-3.5 text-slate-400" />}
              helperText={instrument.lotSizeHelperText}
            />
          </div>
        </div>

        {/* PUT OPTION (PE) INPUTS */}
        <div className="p-4 rounded-xl border border-rose-500/30 bg-[#1c1216] space-y-4">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <TrendingDown className="w-4 h-4" />
              <span>Put Option (PE) Contract</span>
            </div>
            <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">
              Bearish Leg
            </span>
          </div>

          <div className="space-y-3">
            <Input
              label="PE Strike Price"
              type="number"
              min="1"
              placeholder="e.g. 24500"
              value={selectedPeContract?.strikePrice ? selectedPeContract.strikePrice : ''}
              onChange={(e) =>
                handleNumeric(e.target.value, (n) => updatePeManual({ strikePrice: n || 0 }), true)
              }
              accent="pe"
              prefixElement={<Hash className="w-3.5 h-3.5 text-slate-400" />}
              helperText="Target strike price for PE contract"
            />

            <Input
              label="PE Premium per Unit (INR)"
              type="number"
              min="0.05"
              step="0.05"
              placeholder="e.g. 60"
              value={selectedPeContract?.premium !== null && selectedPeContract?.premium !== undefined ? selectedPeContract.premium : ''}
              onChange={(e) =>
                handleNumeric(e.target.value, (n) => updatePeManual({ premium: n }))
              }
              accent="pe"
              prefixElement={<IndianRupee className="w-3.5 h-3.5 text-slate-400" />}
              helperText="Market price per option unit"
            />

            <Input
              label="PE Lot Size (Units per lot)"
              type="number"
              min="1"
              placeholder={instrument.isLotSizeManualRequired ? 'Enter lot size' : 'e.g. 65'}
              value={selectedPeContract?.lotSize !== null && selectedPeContract?.lotSize !== undefined ? selectedPeContract.lotSize : (instrument.defaultLotSize || '')}
              onChange={(e) =>
                handleNumeric(e.target.value, (n) => updatePeManual({ lotSize: n }), true)
              }
              accent="pe"
              prefixElement={<Layers className="w-3.5 h-3.5 text-slate-400" />}
              helperText={instrument.lotSizeHelperText}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};
