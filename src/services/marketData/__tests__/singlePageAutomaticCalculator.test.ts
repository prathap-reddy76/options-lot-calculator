import { describe, expect, it } from 'vitest';
import { calculateOptionsBudget, calculateOptionLeg } from '@/lib/calculations';
import { INSTRUMENTS_DEFINITIONS } from '@/lib/constants';
import { CalculatorInputs, LegInputs } from '@/types/calculator';

describe('Single-Page Automatic Options Lot Calculator Tests', () => {
  const BASE_INPUTS: CalculatorInputs = {
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

  describe('1. Automatic Reactivity on CE Premium Changes', () => {
    it('automatically recalculates affordable lots and costs when CE premium changes', () => {
      // Base: CE Premium 40, Lot 65 -> Cost per lot 2,600. Budget 100,000 -> 38 lots, 98,800 cost, 1,200 unused
      const resBase = calculateOptionsBudget(BASE_INPUTS);
      expect(resBase.ce.premiumCostPerLot).toBe(2600);
      expect(resBase.ce.affordableLots).toBe(38);
      expect(resBase.ce.totalEstimatedCost).toBe(98800);
      expect(resBase.ce.unusedBudget).toBe(1200);

      // User edits CE premium to 50
      const res50 = calculateOptionsBudget({
        ...BASE_INPUTS,
        ce: { ...BASE_INPUTS.ce, premium: 50 },
      });
      // Cost per lot = 50 * 65 = 3,250
      // 100,000 / 3,250 = 30.76 -> 30 lots
      // Total cost = 30 * 3,250 = 97,500; Unused = 2,500
      expect(res50.ce.premiumCostPerLot).toBe(3250);
      expect(res50.ce.affordableLots).toBe(30);
      expect(res50.ce.totalEstimatedCost).toBe(97500);
      expect(res50.ce.unusedBudget).toBe(2500);

      // User edits CE premium to 20
      const res20 = calculateOptionsBudget({
        ...BASE_INPUTS,
        ce: { ...BASE_INPUTS.ce, premium: 20 },
      });
      // Cost per lot = 20 * 65 = 1,300
      // 100,000 / 1,300 = 76.92 -> 76 lots
      // Total cost = 76 * 1,300 = 98,800; Unused = 1,200
      expect(res20.ce.premiumCostPerLot).toBe(1300);
      expect(res20.ce.affordableLots).toBe(76);
      expect(res20.ce.totalEstimatedCost).toBe(98800);
      expect(res20.ce.unusedBudget).toBe(1200);

      // Invariant: PE results must remain completely unaffected when CE changes
      expect(res50.pe.affordableLots).toBe(resBase.pe.affordableLots);
      expect(res20.pe.affordableLots).toBe(resBase.pe.affordableLots);
    });
  });

  describe('2. Automatic Reactivity on PE Premium Changes', () => {
    it('automatically recalculates affordable lots and costs when PE premium changes', () => {
      // Base: PE Premium 60, Lot 65 -> Cost per lot 3,900. Budget 100,000 -> 25 lots, 97,500 cost, 2,500 unused
      const resBase = calculateOptionsBudget(BASE_INPUTS);
      expect(resBase.pe.premiumCostPerLot).toBe(3900);
      expect(resBase.pe.affordableLots).toBe(25);
      expect(resBase.pe.totalEstimatedCost).toBe(97500);

      // User edits PE premium to 80
      const res80 = calculateOptionsBudget({
        ...BASE_INPUTS,
        pe: { ...BASE_INPUTS.pe, premium: 80 },
      });
      // Cost per lot = 80 * 65 = 5,200
      // 100,000 / 5,200 = 19.23 -> 19 lots
      // Total cost = 19 * 5,200 = 98,800; Unused = 1,200
      expect(res80.pe.premiumCostPerLot).toBe(5200);
      expect(res80.pe.affordableLots).toBe(19);
      expect(res80.pe.totalEstimatedCost).toBe(98800);
      expect(res80.pe.unusedBudget).toBe(1200);

      // User edits PE premium to 25
      const res25 = calculateOptionsBudget({
        ...BASE_INPUTS,
        pe: { ...BASE_INPUTS.pe, premium: 25 },
      });
      // Cost per lot = 25 * 65 = 1,625
      // 100,000 / 1,625 = 61.53 -> 61 lots
      // Total cost = 61 * 1,625 = 99,125; Unused = 875
      expect(res25.pe.premiumCostPerLot).toBe(1625);
      expect(res25.pe.affordableLots).toBe(61);
      expect(res25.pe.totalEstimatedCost).toBe(99125);
      expect(res25.pe.unusedBudget).toBe(875);
    });
  });

  describe('3. Automatic Reactivity on Investment Capital Changes', () => {
    it('scales budgets, affordable lots, and remaining balance when investment capital changes', () => {
      // Capital = 100,000 (CE Budget 50,000 / PE Budget 50,000)
      const res100k = calculateOptionsBudget({
        ...BASE_INPUTS,
        totalCapital: 100000,
      });

      expect(res100k.totalCapital).toBe(100000);
      expect(res100k.ceBudget).toBe(50000);
      expect(res100k.peBudget).toBe(50000);

      // CE: 50,000 / 2,600 = 19.23 -> 19 lots (cost 49,400, unused 600)
      expect(res100k.ce.affordableLots).toBe(19);
      expect(res100k.ce.totalEstimatedCost).toBe(49400);
      expect(res100k.ce.unusedBudget).toBe(600);

      // PE: 50,000 / 3,900 = 12.82 -> 12 lots (cost 46,800, unused 3,200)
      expect(res100k.pe.affordableLots).toBe(12);
      expect(res100k.pe.totalEstimatedCost).toBe(46800);
      expect(res100k.pe.unusedBudget).toBe(3200);

      // Total used = 49,400 + 46,800 = 96,200. Remaining = 3,800
      expect(res100k.totalEstimatedExpenditure).toBe(96200);
      expect(res100k.remainingCapital).toBe(3800);
      expect(res100k.totalCapital).toBe(res100k.totalEstimatedExpenditure + res100k.remainingCapital);

      // Capital = 500,000 (CE Budget 250,000 / PE Budget 250,000)
      const res500k = calculateOptionsBudget({
        ...BASE_INPUTS,
        totalCapital: 500000,
      });

      // CE: 250,000 / 2,600 = 96.15 -> 96 lots (cost 249,600, unused 400)
      expect(res500k.ce.affordableLots).toBe(96);
      expect(res500k.ce.totalEstimatedCost).toBe(249600);
      expect(res500k.ce.unusedBudget).toBe(400);

      // PE: 250,000 / 3,900 = 64.10 -> 64 lots (cost 249,600, unused 400)
      expect(res500k.pe.affordableLots).toBe(64);
      expect(res500k.pe.totalEstimatedCost).toBe(249600);
      expect(res500k.pe.unusedBudget).toBe(400);

      expect(res500k.totalEstimatedExpenditure).toBe(499200);
      expect(res500k.remainingCapital).toBe(800);
      expect(res500k.totalCapital).toBe(res500k.totalEstimatedExpenditure + res500k.remainingCapital);
    });
  });

  describe('4. Instrument-Specific Lot Sizes & Multi-Market Calculations', () => {
    it('uses correct lot size for BANK NIFTY (15) and recalculates lots accordingly', () => {
      const bankNiftyLot = INSTRUMENTS_DEFINITIONS['BANK_NIFTY'].defaultLotSize;
      expect(bankNiftyLot).toBe(15);

      const resBankNifty = calculateOptionsBudget({
        ...BASE_INPUTS,
        instrumentId: 'BANK_NIFTY',
        ce: { ...BASE_INPUTS.ce, lotSize: bankNiftyLot },
        pe: { ...BASE_INPUTS.pe, lotSize: bankNiftyLot },
      });

      // CE: 40 * 15 = 600 per lot. Budget 100,000 -> 166 lots (cost 99,600, unused 400)
      expect(resBankNifty.ce.totalCostPerLot).toBe(600);
      expect(resBankNifty.ce.affordableLots).toBe(166);
      expect(resBankNifty.ce.totalEstimatedCost).toBe(99600);
      expect(resBankNifty.ce.unusedBudget).toBe(400);

      // PE: 60 * 15 = 900 per lot. Budget 100,000 -> 111 lots (cost 99,900, unused 100)
      expect(resBankNifty.pe.totalCostPerLot).toBe(900);
      expect(resBankNifty.pe.affordableLots).toBe(111);
      expect(resBankNifty.pe.totalEstimatedCost).toBe(99900);
      expect(resBankNifty.pe.unusedBudget).toBe(100);

      expect(resBankNifty.totalEstimatedExpenditure).toBe(199500);
      expect(resBankNifty.remainingCapital).toBe(500);
    });

    it('uses correct lot size for FINNIFTY (25) and recalculates lots accordingly', () => {
      const finNiftyLot = INSTRUMENTS_DEFINITIONS['FINNIFTY'].defaultLotSize;
      expect(finNiftyLot).toBe(25);

      const resFin = calculateOptionsBudget({
        ...BASE_INPUTS,
        instrumentId: 'FINNIFTY',
        ce: { ...BASE_INPUTS.ce, lotSize: finNiftyLot },
        pe: { ...BASE_INPUTS.pe, lotSize: finNiftyLot },
      });

      // CE: 40 * 25 = 1,000 per lot. Budget 100,000 -> 100 lots exactly!
      expect(resFin.ce.totalCostPerLot).toBe(1000);
      expect(resFin.ce.affordableLots).toBe(100);
      expect(resFin.ce.totalEstimatedCost).toBe(100000);
      expect(resFin.ce.unusedBudget).toBe(0);

      // PE: 60 * 25 = 1,500 per lot. Budget 100,000 -> 66 lots (cost 99,000, unused 1,000)
      expect(resFin.pe.totalCostPerLot).toBe(1500);
      expect(resFin.pe.affordableLots).toBe(66);
      expect(resFin.pe.totalEstimatedCost).toBe(99000);
      expect(resFin.pe.unusedBudget).toBe(1000);
    });

    it('uses correct lot size for BSE SENSEX (20) and recalculates lots accordingly', () => {
      const sensexLot = INSTRUMENTS_DEFINITIONS['SENSEX'].defaultLotSize;
      expect(sensexLot).toBe(20);

      const resSensex = calculateOptionsBudget({
        ...BASE_INPUTS,
        instrumentId: 'SENSEX',
        ce: { ...BASE_INPUTS.ce, lotSize: sensexLot },
        pe: { ...BASE_INPUTS.pe, lotSize: sensexLot },
      });

      // CE: 40 * 20 = 800 per lot. Budget 100,000 -> 125 lots exactly!
      expect(resSensex.ce.totalCostPerLot).toBe(800);
      expect(resSensex.ce.affordableLots).toBe(125);
      expect(resSensex.ce.totalEstimatedCost).toBe(100000);
      expect(resSensex.ce.unusedBudget).toBe(0);

      // PE: 60 * 20 = 1,200 per lot. Budget 100,000 -> 83 lots (cost 99,600, unused 400)
      expect(resSensex.pe.totalCostPerLot).toBe(1200);
      expect(resSensex.pe.affordableLots).toBe(83);
      expect(resSensex.pe.totalEstimatedCost).toBe(99600);
      expect(resSensex.pe.unusedBudget).toBe(400);
    });
  });

  describe('5. Insufficient Investment, Edge Cases & Safe Numerical Handling', () => {
    it('safely handles insufficient investment when capital is less than 1 whole lot cost', () => {
      // Total capital = 2,000. 50/50 split -> CE budget = 1,000, PE budget = 1,000.
      // CE cost per lot = 2,600 (> 1,000)
      // PE cost per lot = 3,900 (> 1,000)
      const resInsufficient = calculateOptionsBudget({
        ...BASE_INPUTS,
        totalCapital: 2000,
      });

      expect(resInsufficient.ce.affordableLots).toBe(0);
      expect(resInsufficient.ce.totalEstimatedCost).toBe(0);
      expect(resInsufficient.ce.unusedBudget).toBe(1000);

      expect(resInsufficient.pe.affordableLots).toBe(0);
      expect(resInsufficient.pe.totalEstimatedCost).toBe(0);
      expect(resInsufficient.pe.unusedBudget).toBe(1000);

      expect(resInsufficient.totalEstimatedExpenditure).toBe(0);
      expect(resInsufficient.remainingCapital).toBe(2000);
      expect(resInsufficient.capitalUtilizationPercent).toBe(0);
      // Invariant: expenditure NEVER exceeds capital
      expect(resInsufficient.totalEstimatedExpenditure).toBeLessThanOrEqual(resInsufficient.totalCapital);
    });

    it('safely handles empty / null / zero investment without NaN or Infinity', () => {
      const resZero = calculateOptionsBudget({
        ...BASE_INPUTS,
        totalCapital: 0,
      });

      expect(resZero.totalCapital).toBe(0);
      expect(resZero.ce.affordableLots).toBe(0);
      expect(resZero.pe.affordableLots).toBe(0);
      expect(resZero.totalEstimatedExpenditure).toBe(0);
      expect(resZero.remainingCapital).toBe(0);
      expect(Number.isFinite(resZero.capitalUtilizationPercent)).toBe(true);
      expect(Number.isNaN(resZero.capitalUtilizationPercent)).toBe(false);
      expect(resZero.capitalUtilizationPercent).toBe(0);

      const resNull = calculateOptionsBudget({
        ...BASE_INPUTS,
        totalCapital: null as any,
      });
      expect(resNull.totalCapital).toBe(0);
      expect(Number.isFinite(resNull.capitalUtilizationPercent)).toBe(true);
      expect(resNull.validationErrors.totalCapital).toBeDefined();
    });

    it('safely handles empty or zero premium on either leg without division by zero', () => {
      // CE premium = null
      const resNullCe = calculateOptionsBudget({
        ...BASE_INPUTS,
        ce: { ...BASE_INPUTS.ce, premium: null },
      });
      expect(resNullCe.ce.affordableLots).toBe(0);
      expect(resNullCe.ce.totalEstimatedCost).toBe(0);
      expect(resNullCe.ce.hasErrors).toBe(true);
      // PE calculates normally
      expect(resNullCe.pe.affordableLots).toBe(25);
      expect(resNullCe.totalEstimatedExpenditure).toBe(97500);
      expect(resNullCe.remainingCapital).toBe(102500);

      // CE premium = 0
      const resZeroCe = calculateOptionsBudget({
        ...BASE_INPUTS,
        ce: { ...BASE_INPUTS.ce, premium: 0 },
      });
      expect(resZeroCe.ce.affordableLots).toBe(0);
      expect(resZeroCe.ce.hasErrors).toBe(true);
      expect(resZeroCe.pe.affordableLots).toBe(25);
    });

    it('preserves mathematical budget invariants across arbitrary random allocations', () => {
      const testCases = [
        { capital: 75000, cePct: 70, cePrem: 34.5, pePrem: 52.8, lot: 65 },
        { capital: 1500000, cePct: 20, cePrem: 110, pePrem: 145, lot: 15 },
        { capital: 333333, cePct: 45, cePrem: 18.25, pePrem: 22.75, lot: 50 },
      ];

      for (const tc of testCases) {
        const res = calculateOptionsBudget({
          totalCapital: tc.capital,
          ceAllocationPercent: tc.cePct,
          marketCategory: 'NIFTY_50',
          ce: { strikePrice: 24000, premium: tc.cePrem, lotSize: tc.lot, chargesEnabled: false, estimatedChargePerLot: null },
          pe: { strikePrice: 24000, premium: tc.pePrem, lotSize: tc.lot, chargesEnabled: false, estimatedChargePerLot: null },
        });

        // 1. Total capital split
        expect(res.ceBudget + res.peBudget).toBeCloseTo(tc.capital, 1);
        // 2. CE expenditure + unused = CE budget
        expect(res.ce.totalEstimatedCost + res.ce.unusedBudget).toBeCloseTo(res.ceBudget, 1);
        // 3. PE expenditure + unused = PE budget
        expect(res.pe.totalEstimatedCost + res.pe.unusedBudget).toBeCloseTo(res.peBudget, 1);
        // 4. Total expenditure + remaining = Total capital
        expect(res.totalEstimatedExpenditure + res.remainingCapital).toBeCloseTo(tc.capital, 1);
        // 5. Total expenditure NEVER exceeds total capital
        expect(res.totalEstimatedExpenditure).toBeLessThanOrEqual(tc.capital);
        // 6. No NaNs anywhere
        expect(Number.isNaN(res.totalEstimatedExpenditure)).toBe(false);
        expect(Number.isNaN(res.remainingCapital)).toBe(false);
        expect(Number.isNaN(res.capitalUtilizationPercent)).toBe(false);
      }
    });
  });
});
