'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { QuoteStatusBadge } from './QuoteStatusBadge';
import { LegInputs, LegCalculationResult, CalculatorWorkflowMode } from '@/types/calculator';
import { OptionType } from '@/types/market';
import { formatINRStrict, formatNumber, parseNumberInput } from '@/lib/formatters';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  IndianRupee,
  ReceiptText,
  AlertCircle,
  Hash,
  Calendar,
  X,
  Target,
} from 'lucide-react';

interface OptionLegCalculatorProps {
  type: OptionType;
  inputs: LegInputs;
  onInputChange: (updates: Partial<LegInputs>) => void;
  result: LegCalculationResult;
  lotSizeHelperText?: string;
  isLotSizeManualRequired?: boolean;
  workflowMode?: CalculatorWorkflowMode;
  onSelectStrikePrompt?: () => void;
  validationErrors?: {
    strike?: string;
    premium?: string;
    lotSize?: string;
    charges?: string;
    expiry?: string;
  };
}

export const OptionLegCalculator: React.FC<OptionLegCalculatorProps> = ({
  type,
  inputs,
  onInputChange,
  result,
  lotSizeHelperText,
  isLotSizeManualRequired,
  workflowMode = 'SELECTION',
  onSelectStrikePrompt,
  validationErrors = {},
}) => {
  const isCE = type === 'CE';

  const handleNumericInput = (
    field: keyof LegInputs,
    value: string,
    isInteger: boolean = false
  ) => {
    if (value.trim() === '') {
      onInputChange({ [field]: null });
      return;
    }
    const parsed = parseNumberInput(value);
    if (parsed !== null) {
      onInputChange({ [field]: isInteger ? Math.round(parsed) : parsed });
    }
  };

  return (
    <Card
      variant={isCE ? 'ce' : 'pe'}
      className="flex flex-col justify-between h-full space-y-6"
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#222a3d] pb-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                isCE
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isCE ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {isCE ? 'Call Option (CE)' : 'Put Option (PE)'} Calculator
                </h3>
                <Badge variant={isCE ? 'ce' : 'pe'} size="sm">
                  {isCE ? 'Bullish / Call' : 'Bearish / Put'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Allocated Budget:{' '}
                <span className="font-mono font-semibold text-slate-200">
                  {formatINRStrict(result.budget, 2)}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Input Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Strike Price Control: Primary Workflow (Selectable Control) vs Manual Workflow */}
          {workflowMode === 'SELECTION' ? (
            <div className="w-full">
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Choose {type} Strike</span>
                <span className="text-[10px] text-slate-400 font-mono">Contract Selection</span>
              </label>

              {inputs.strikePrice !== null ? (
                <div
                  className={`flex items-center justify-between rounded-lg border p-2.5 bg-[#0d111a] ${
                    isCE ? 'border-emerald-500/40' : 'border-rose-500/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Target
                      className={`w-4 h-4 ${isCE ? 'text-emerald-400' : 'text-rose-400'}`}
                    />
                    <div>
                      <span className="font-mono font-bold text-white text-sm">
                        {formatNumber(inputs.strikePrice)} {type}
                      </span>
                      {inputs.contractIdentifier && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          ID: {inputs.contractIdentifier}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onInputChange({
                        strikePrice: null,
                        contractIdentifier: undefined,
                      })
                    }
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Clear selected strike"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={onSelectStrikePrompt}
                  className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-dashed border-slate-700 bg-[#0d111a] text-center cursor-pointer hover:border-slate-500 transition-all min-h-[46px]"
                >
                  <span className="text-xs text-slate-400">
                    No strike selected. Choose an available strike above.
                  </span>
                </div>
              )}

              {validationErrors.strike && (
                <p className="mt-1 text-xs text-rose-400 flex items-center gap-1 font-normal">
                  <span className="inline-block w-1 h-1 rounded-full bg-rose-400"></span>
                  {validationErrors.strike}
                </p>
              )}
            </div>
          ) : (
            /* Manual Strike Entry when in Manual Workflow Mode */
            <Input
              label={`Choose ${type} Strike (Manual)`}
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 24500"
              value={inputs.strikePrice !== null ? inputs.strikePrice : ''}
              onChange={(e) => handleNumericInput('strikePrice', e.target.value)}
              errorMessage={validationErrors.strike}
              accent={isCE ? 'ce' : 'pe'}
              prefixElement={<Hash className="w-3.5 h-3.5 text-slate-400" />}
              helperText="Manually entered strike level"
            />
          )}

          {/* Premium per unit with explicit Data Source indicator */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Premium per Unit
              </label>
              <QuoteStatusBadge
                state={inputs.quoteState || 'NOT_CONNECTED'}
                source={inputs.source || 'MANUAL'}
                providerName={inputs.quoteMetadata?.provider}
                timestamp={inputs.quoteMetadata?.quoteTimestamp}
              />
            </div>
            <Input
              type="number"
              min="0"
              step="0.05"
              placeholder="e.g. 40"
              value={inputs.premium !== null ? inputs.premium : ''}
              onChange={(e) => {
                handleNumericInput('premium', e.target.value);
                // When manually edited, ensure source is explicitly set to MANUAL
                onInputChange({ source: 'MANUAL', quoteState: 'NOT_CONNECTED' });
              }}
              errorMessage={validationErrors.premium}
              accent={isCE ? 'ce' : 'pe'}
              prefixElement={<IndianRupee className="w-3.5 h-3.5 text-slate-400" />}
              helperText="Market price per option unit (manually entered/verified)"
            />
          </div>

          {/* Lot Size (Editable) */}
          <div className="sm:col-span-2">
            <Input
              label={`${type} Lot Size (Units per lot)`}
              type="number"
              min="1"
              step="1"
              placeholder={isLotSizeManualRequired ? 'Enter contract lot size' : 'e.g. 65'}
              value={inputs.lotSize !== null ? inputs.lotSize : ''}
              onChange={(e) => handleNumericInput('lotSize', e.target.value, true)}
              errorMessage={validationErrors.lotSize}
              accent={isCE ? 'ce' : 'pe'}
              prefixElement={<Layers className="w-3.5 h-3.5 text-slate-400" />}
              helperText={
                lotSizeHelperText ||
                'Editable: Defaults are reference examples and must be verified with current exchange specs'
              }
            />
          </div>

          {/* Contract Expiry Date (Optional manual/selection tracking) */}
          <div className="sm:col-span-2">
            <Input
              label={`${type} Contract Expiry (Optional)`}
              type="date"
              value={inputs.expiryDate || ''}
              onChange={(e) => onInputChange({ expiryDate: e.target.value })}
              errorMessage={validationErrors.expiry}
              accent={isCE ? 'ce' : 'pe'}
              prefixElement={<Calendar className="w-3.5 h-3.5 text-slate-400" />}
              helperText="Contract expiry date (YYYY-MM-DD)"
            />
          </div>
        </div>

        {/* Optional Estimated Charges per lot */}
        <div className="rounded-xl bg-[#0d121c] border border-[#20283c] p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-slate-400" />
              <label
                htmlFor={`${type}-charges-toggle`}
                className="text-xs font-medium text-slate-300 cursor-pointer"
              >
                Include Estimated Charges / Brokerage
              </label>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id={`${type}-charges-toggle`}
                type="checkbox"
                checked={inputs.chargesEnabled}
                onChange={(e) => onInputChange({ chargesEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {inputs.chargesEnabled && (
            <div className="pt-2 border-t border-[#1a2133]">
              <Input
                label="Estimated Charges per Lot (INR)"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 20 (Brokerage, STT, turnover, GST)"
                value={
                  inputs.estimatedChargePerLot !== null ? inputs.estimatedChargePerLot : ''
                }
                onChange={(e) => handleNumericInput('estimatedChargePerLot', e.target.value)}
                errorMessage={validationErrors.charges}
                accent={isCE ? 'ce' : 'pe'}
                prefixElement={<IndianRupee className="w-3.5 h-3.5 text-slate-400" />}
                helperText="Incorporated into affordability: floor(budget / (cost + charge))"
              />
            </div>
          )}
        </div>

        {/* Validation Error Banner */}
        {result.hasErrors && result.errorMessage && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{result.errorMessage}</span>
          </div>
        )}

        {/* Calculation Results Card */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Affordability Output
            </span>
            <span className="text-[11px] font-mono text-slate-400">Whole Lots Only</span>
          </div>

          {/* Primary Result Banner: Available Lots */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              isCE
                ? 'bg-gradient-to-r from-emerald-950/40 to-[#0e1f1c] border-emerald-500/40'
                : 'bg-gradient-to-r from-rose-950/40 to-[#221015] border-rose-500/40'
            }`}
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Available Lots
              </div>
              <div
                className={`text-3xl font-extrabold font-mono mt-0.5 ${
                  isCE ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {result.affordableLots}{' '}
                <span className="text-base font-normal text-slate-400">Lots</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-medium text-slate-400">Total Units</div>
              <div className="text-xl font-bold font-mono text-white mt-0.5">
                {formatNumber(result.totalUnits)}{' '}
                <span className="text-xs font-normal text-slate-400">qty</span>
              </div>
            </div>
          </div>

          {/* Detailed Metric Line Items */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Premium cost per lot */}
            <div className="bg-[#0e131d] p-3 rounded-lg border border-[#1d2538]">
              <div className="text-slate-400 text-[11px]">Premium Cost / Lot</div>
              <div className="font-mono font-semibold text-slate-100 text-sm mt-0.5">
                {formatINRStrict(result.premiumCostPerLot, 2)}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                (Prem × Lot Size)
              </div>
            </div>

            {/* Total Premium Cost */}
            <div className="bg-[#0e131d] p-3 rounded-lg border border-[#1d2538]">
              <div className="text-slate-400 text-[11px]">Total Premium Cost</div>
              <div className="font-mono font-semibold text-white text-sm mt-0.5">
                {formatINRStrict(result.totalPremiumCost, 2)}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                ({result.affordableLots} lots)
              </div>
            </div>

            {/* Estimated charges if enabled */}
            {inputs.chargesEnabled && (
              <div className="bg-[#0e131d] p-3 rounded-lg border border-[#1d2538]">
                <div className="text-slate-400 text-[11px]">Est. Charges</div>
                <div className="font-mono font-semibold text-amber-300 text-sm mt-0.5">
                  {formatINRStrict(result.totalEstimatedCharges, 2)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  (@ ₹{inputs.estimatedChargePerLot || 0}/lot)
                </div>
              </div>
            )}

            {/* Total Estimated Cost */}
            <div
              className={`bg-[#0e131d] p-3 rounded-lg border border-[#1d2538] ${
                !inputs.chargesEnabled ? 'col-span-1' : 'col-span-1'
              }`}
            >
              <div className="text-slate-400 text-[11px]">Total Estimated Cost</div>
              <div className="font-mono font-semibold text-indigo-300 text-sm mt-0.5">
                {formatINRStrict(result.totalEstimatedCost, 2)}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                {inputs.chargesEnabled ? 'Prem + Charges' : 'Pure Premium'}
              </div>
            </div>

            {/* Unused Budget */}
            <div className="bg-[#0e131d] p-3 rounded-lg border border-[#1d2538] col-span-2 flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-[11px]">Unused {type} Budget</div>
                <div className="text-[10px] text-slate-400">Remaining from allocation</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-slate-200 text-sm">
                  {formatINRStrict(result.unusedBudget, 2)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {result.budget > 0
                    ? `${((result.unusedBudget / result.budget) * 100).toFixed(1)}% cash`
                    : '₹0'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
