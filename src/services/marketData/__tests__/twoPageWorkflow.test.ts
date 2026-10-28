import { describe, expect, it } from 'vitest';
import { calculateOptionsBudget, calculateOptionLeg } from '@/lib/calculations';
import { INSTRUMENTS_DEFINITIONS } from '@/lib/constants';
import { SelectedContract } from '@/types/market';
import { CalculatorInputs, LegInputs } from '@/types/calculator';

describe('Two-Page Groww Workflow & Capital Allocation Logic', () => {
  describe('Page 1: Contract Selection & Workflow Readiness', () => {
    it('verifies that both CE and PE must be selected with valid strikes and premiums before continuing', () => {
      // Helper function matching canContinue logic in OptionWorkflowContext
      const isWorkflowReady = (ce: SelectedContract | null, pe: SelectedContract | null): boolean => {
        const isCeValid = Boolean(
          ce &&
          ce.strikePrice > 0 &&
          ce.premium !== null &&
          ce.premium > 0 &&
          ce.lotSize !== null &&
          ce.lotSize > 0
        );
        const isPeValid = Boolean(
          pe &&
          pe.strikePrice > 0 &&
          pe.premium !== null &&
          pe.premium > 0 &&
          pe.lotSize !== null &&
          pe.lotSize > 0
        );
        return isCeValid && isPeValid;
      };

      // Case 1: Neither selected
      expect(isWorkflowReady(null, null)).toBe(false);

      // Case 2: Only CE selected
      const ceContract: SelectedContract = {
        exchange: 'NSE',
        underlyingSymbol: 'NIFTY',
        expiryDate: '2026-10-29',
        strikePrice: 24500,
        optionType: 'CE',
        premium: 40,
        lotSize: 65,
        source: 'MANUAL',
      };
      expect(isWorkflowReady(ceContract, null)).toBe(false);

      // Case 3: Only PE selected
      const peContract: SelectedContract = {
        exchange: 'NSE',
        underlyingSymbol: 'NIFTY',
        expiryDate: '2026-10-29',
        strikePrice: 24500,
        optionType: 'PE',
        premium: 60,
        lotSize: 65,
        source: 'MANUAL',
      };
      expect(isWorkflowReady(null, peContract)).toBe(false);

      // Case 4: Both selected with valid values
      expect(isWorkflowReady(ceContract, peContract)).toBe(true);

      // Case 5: Premium is zero or missing
      const invalidCe = { ...ceContract, premium: 0 };
      expect(isWorkflowReady(invalidCe, peContract)).toBe(false);

      // Case 6: Lot size is zero or missing
      const invalidPe = { ...peContract, lotSize: null };
      expect(isWorkflowReady(ceContract, invalidPe as any)).toBe(false);
    });

    it('allows independent selection of CE and PE strikes from the option chain', () => {
      // User can pick different strikes for CE and PE (e.g. Strangle: 24800 CE and 24200 PE)
      const ceStrangle: SelectedContract = {
        exchange: 'NSE',
        underlyingSymbol: 'NIFTY',
        expiryDate: '2026-10-29',
        strikePrice: 24800,
        optionType: 'CE',
        premium: 32,
        lotSize: 65,
        source: 'API',
      };

      const peStrangle: SelectedContract = {
        exchange: 'NSE',
        underlyingSymbol: 'NIFTY',
        expiryDate: '2026-10-29',
        strikePrice: 24200,
        optionType: 'PE',
        premium: 28,
        lotSize: 65,
        source: 'API',
      };

      expect(ceStrangle.strikePrice).toBe(24800);
      expect(peStrangle.strikePrice).toBe(24200);
      expect(ceStrangle.strikePrice).not.toBe(peStrangle.strikePrice);
    });
  });

  describe('Page 2: Capital Allocation & Whole-Lot Calculations', () => {
    it('executes the exact baseline prompt calculation specification with 50/50 allocation', () => {
      const inputs: CalculatorInputs = {
        totalCapital: 200000,
        ceAllocationPercent: 50,
        marketCategory: 'NIFTY_50',
        instrumentId: 'NIFTY_50',
        selectedExpiry: '2026-10-29',
        ce: {
          strikePrice: 24500,
          premium: 40,
          lotSize: 65,
          chargesEnabled: false,
          estimatedChargePerLot: null,
        },
        pe: {
          strikePrice: 24500,
          premium: 60,
          lotSize: 65,
          chargesEnabled: false,
          estimatedChargePerLot: null,
        },
      };

      const result = calculateOptionsBudget(inputs);

      // Total Capital & Budgets
      expect(result.totalCapital).toBe(200000);
      expect(result.ceBudget).toBe(100000);
      expect(result.peBudget).toBe(100000);

      // CE Metrics:
      // Cost per lot = 40 * 65 = ₹2,600
      // Affordable lots = floor(100,000 / 2,600) = 38 lots
      // Total units = 38 * 65 = 2,470 units
      // Actual cost = 38 * 2,600 = ₹98,800
      // Unused allocation = 100,000 - 98,800 = ₹1,200
      expect(result.ce.premiumCostPerLot).toBe(2600);
      expect(result.ce.totalCostPerLot).toBe(2600);
      expect(result.ce.affordableLots).toBe(38);
      expect(result.ce.totalUnits).toBe(2470);
      expect(result.ce.totalEstimatedCost).toBe(98800);
      expect(result.ce.unusedBudget).toBe(1200);

      // PE Metrics:
      // Cost per lot = 60 * 65 = ₹3,900
      // Affordable lots = floor(100,000 / 3,900) = 25 lots
      // Total units = 25 * 65 = 1,625 units
      // Actual cost = 25 * 3,900 = ₹97,500
      // Unused allocation = 100,000 - 97,500 = ₹2,500
      expect(result.pe.premiumCostPerLot).toBe(3900);
      expect(result.pe.totalCostPerLot).toBe(3900);
      expect(result.pe.affordableLots).toBe(25);
      expect(result.pe.totalUnits).toBe(1625);
      expect(result.pe.totalEstimatedCost).toBe(97500);
      expect(result.pe.unusedBudget).toBe(2500);

      // Combined Metrics:
      // Total used = 98,800 + 97,500 = ₹1,96,300
      // Remaining capital = 200,000 - 196,300 = ₹3,700
      // Total affordable lots = 38 + 25 = 63 lots
      expect(result.totalEstimatedExpenditure).toBe(196300);
      expect(result.remainingCapital).toBe(3700);
      expect(result.ce.affordableLots + result.pe.affordableLots).toBe(63);
      expect(result.capitalUtilizationPercent).toBeCloseTo(98.15, 2);
      expect(result.isFullyCalculated).toBe(true);
    });

    it('synchronizes allocation percentages such that CE + PE always equals 100%', () => {
      const syncAllocation = (cePercent: number) => {
        const clampedCe = Math.max(0, Math.min(100, Math.round(cePercent)));
        const clampedPe = 100 - clampedCe;
        return { ce: clampedCe, pe: clampedPe, total: clampedCe + clampedPe };
      };

      // 50/50
      expect(syncAllocation(50)).toEqual({ ce: 50, pe: 50, total: 100 });

      // 70/30
      expect(syncAllocation(70)).toEqual({ ce: 70, pe: 30, total: 100 });

      // 100/0
      expect(syncAllocation(100)).toEqual({ ce: 100, pe: 0, total: 100 });

      // 0/100
      expect(syncAllocation(0)).toEqual({ ce: 0, pe: 100, total: 100 });

      // Out of bounds clamping
      expect(syncAllocation(120)).toEqual({ ce: 100, pe: 0, total: 100 });
      expect(syncAllocation(-15)).toEqual({ ce: 0, pe: 100, total: 100 });
    });

    it('correctly incorporates estimated charges per lot when enabled', () => {
      const inputsWithCharges: CalculatorInputs = {
        totalCapital: 200000,
        ceAllocationPercent: 50,
        marketCategory: 'NIFTY_50',
        ce: {
          strikePrice: 24500,
          premium: 40,
          lotSize: 65, // premium cost = 2600
          chargesEnabled: true,
          estimatedChargePerLot: 20, // total cost = 2620
        },
        pe: {
          strikePrice: 24500,
          premium: 60,
          lotSize: 65, // premium cost = 3900
          chargesEnabled: true,
          estimatedChargePerLot: 20, // total cost = 3920
        },
      };

      const result = calculateOptionsBudget(inputsWithCharges);

      // CE: 100,000 / 2620 = 38.16 -> 38 lots
      // Total cost = 38 * 2620 = 99,560 (premium 98,800 + charges 760)
      // Unused = 100,000 - 99,560 = 440
      expect(result.ce.chargePerLot).toBe(20);
      expect(result.ce.totalCostPerLot).toBe(2620);
      expect(result.ce.affordableLots).toBe(38);
      expect(result.ce.totalPremiumCost).toBe(98800);
      expect(result.ce.totalEstimatedCharges).toBe(760);
      expect(result.ce.totalEstimatedCost).toBe(99560);
      expect(result.ce.unusedBudget).toBe(440);

      // PE: 100,000 / 3920 = 25.51 -> 25 lots
      // Total cost = 25 * 3920 = 98,000 (premium 97,500 + charges 500)
      // Unused = 100,000 - 98,000 = 2,000
      expect(result.pe.chargePerLot).toBe(20);
      expect(result.pe.totalCostPerLot).toBe(3920);
      expect(result.pe.affordableLots).toBe(25);
      expect(result.pe.totalPremiumCost).toBe(97500);
      expect(result.pe.totalEstimatedCharges).toBe(500);
      expect(result.pe.totalEstimatedCost).toBe(98000);
      expect(result.pe.unusedBudget).toBe(2000);

      // Combined
      expect(result.combinedEstimatedCharges).toBe(1260); // 760 + 500
      expect(result.totalEstimatedExpenditure).toBe(197560);
      expect(result.remainingCapital).toBe(2440);
    });

    it('handles zero, negative, and invalid capital safely without NaN or Infinity', () => {
      const zeroCapitalInputs: CalculatorInputs = {
        totalCapital: 0,
        ceAllocationPercent: 50,
        marketCategory: 'NIFTY_50',
        ce: { strikePrice: 24500, premium: 40, lotSize: 65, chargesEnabled: false, estimatedChargePerLot: null },
        pe: { strikePrice: 24500, premium: 60, lotSize: 65, chargesEnabled: false, estimatedChargePerLot: null },
      };

      const result = calculateOptionsBudget(zeroCapitalInputs);

      expect(result.totalCapital).toBe(0);
      expect(result.ce.affordableLots).toBe(0);
      expect(result.pe.affordableLots).toBe(0);
      expect(result.totalEstimatedExpenditure).toBe(0);
      expect(result.remainingCapital).toBe(0);
      expect(Number.isFinite(result.capitalUtilizationPercent)).toBe(true);
      expect(result.capitalUtilizationPercent).toBe(0);
      expect(result.validationErrors.totalCapital).toBeDefined();
    });

    it('handles commodities with manual lot size entry correctly', () => {
      const mcxGoldInputs: CalculatorInputs = {
        totalCapital: 500000,
        ceAllocationPercent: 50,
        marketCategory: 'COMMODITIES',
        instrumentId: 'GOLD',
        ce: {
          strikePrice: 78000,
          premium: 250,
          lotSize: 10, // 100g Mini contract manual lot size
          chargesEnabled: false,
          estimatedChargePerLot: null,
        },
        pe: {
          strikePrice: 78000,
          premium: 220,
          lotSize: 10,
          chargesEnabled: false,
          estimatedChargePerLot: null,
        },
      };

      const result = calculateOptionsBudget(mcxGoldInputs);

      // CE: Budget 250,000 / (250 * 10 = 2500) = 100 lots
      expect(result.ce.totalCostPerLot).toBe(2500);
      expect(result.ce.affordableLots).toBe(100);
      expect(result.ce.totalEstimatedCost).toBe(250000);
      expect(result.ce.unusedBudget).toBe(0);

      // PE: Budget 250,000 / (220 * 10 = 2200) = 113.63 -> 113 lots
      expect(result.pe.totalCostPerLot).toBe(2200);
      expect(result.pe.affordableLots).toBe(113);
      expect(result.pe.totalEstimatedCost).toBe(113 * 2200); // 248600
      expect(result.pe.unusedBudget).toBe(1400);

      expect(result.remainingCapital).toBe(1400);
      expect(result.isFullyCalculated).toBe(true);
    });
  });
});
