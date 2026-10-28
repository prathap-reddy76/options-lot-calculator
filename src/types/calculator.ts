import { InstrumentId, MarketCategory } from './market';
import { LiveQuoteState, PremiumSource, QuoteMetadata } from './api';

export interface LegInputs {
  strikePrice: number | null;
  premium: number | null;
  lotSize: number | null;
  chargesEnabled: boolean;
  estimatedChargePerLot: number | null;
  // Contract parameters & source tracking
  expiryDate?: string;
  underlyingSymbol?: string;
  contractIdentifier?: string;
  source?: PremiumSource; // Defaults to 'MANUAL'
  quoteMetadata?: QuoteMetadata;
  quoteState?: LiveQuoteState;
}

export type CalculatorWorkflowMode = 'SELECTION' | 'MANUAL';

export interface CalculatorInputs {
  totalCapital: number | null;
  ceAllocationPercent: number; // 0 to 100
  marketCategory: MarketCategory;
  instrumentId?: InstrumentId;
  workflowMode?: CalculatorWorkflowMode;
  selectedExpiry?: string | null;
  commoditySymbol?: string;
  ce: LegInputs;
  pe: LegInputs;
}

export interface LegCalculationResult {
  budget: number;
  premiumCostPerLot: number;
  chargePerLot: number;
  totalCostPerLot: number;
  affordableLots: number;
  totalUnits: number;
  totalPremiumCost: number;
  totalEstimatedCharges: number;
  totalEstimatedCost: number;
  unusedBudget: number;
  hasErrors: boolean;
  errorMessage?: string;
  source?: PremiumSource;
  quoteMetadata?: QuoteMetadata;
}

export interface CombinedCalculationResult {
  totalCapital: number;
  ceBudget: number;
  peBudget: number;
  ce: LegCalculationResult;
  pe: LegCalculationResult;
  combinedPremiumCost: number;
  combinedEstimatedCharges: number;
  totalEstimatedExpenditure: number;
  remainingCapital: number;
  capitalUtilizationPercent: number;
  isFullyCalculated: boolean;
  validationErrors: {
    totalCapital?: string;
    ceAllocation?: string;
    ce?: {
      strike?: string;
      premium?: string;
      lotSize?: string;
      charges?: string;
      expiry?: string;
    };
    pe?: {
      strike?: string;
      premium?: string;
      lotSize?: string;
      charges?: string;
      expiry?: string;
    };
    general?: string;
  };
}
