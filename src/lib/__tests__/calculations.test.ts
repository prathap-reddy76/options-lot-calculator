import { describe, expect, it } from 'vitest';
import { calculateOptionLeg, calculateOptionsBudget } from '../calculations';
import { CalculatorInputs } from '@/types/calculator';

describe('Option Calculations Engine', () => {
  it('accurately verifies the required specification example', () => {
    // Total capital: ₹2,00,000
    // CE allocation: 50%
    // PE allocation: 50%
    // CE premium: ₹40
    // PE premium: ₹60
    // CE lot size: 65
    // PE lot size: 65
    // Charges: disabled
    const inputs: CalculatorInputs = {
      totalCapital: 200000,
      ceAllocationPercent: 50,
      marketCategory: 'NIFTY_50',
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

    // CE Checks
    expect(result.ceBudget).toBe(100000);
    expect(result.ce.premiumCostPerLot).toBe(2600); // 40 * 65
    expect(result.ce.affordableLots).toBe(38); // floor(100000 / 2600) = 38
    expect(result.ce.totalUnits).toBe(38 * 65); // 2470
    expect(result.ce.totalPremiumCost).toBe(98800); // 38 * 2600
    expect(result.ce.unusedBudget).toBe(1200); // 100000 - 98800

    // PE Checks
    expect(result.peBudget).toBe(100000);
    expect(result.pe.premiumCostPerLot).toBe(3900); // 60 * 65
    expect(result.pe.affordableLots).toBe(25); // floor(100000 / 3900) = 25
    expect(result.pe.totalUnits).toBe(25 * 65); // 1625
    expect(result.pe.totalPremiumCost).toBe(97500); // 25 * 3900
    expect(result.pe.unusedBudget).toBe(2500); // 100000 - 97500

    // Combined Checks
    expect(result.combinedPremiumCost).toBe(196300); // 98800 + 97500
    expect(result.combinedEstimatedCharges).toBe(0);
    expect(result.totalEstimatedExpenditure).toBe(196300);
    expect(result.remainingCapital).toBe(3700); // 200000 - 196300
    expect(result.remainingCapital).toBe(result.ce.unusedBudget + result.pe.unusedBudget);
    expect(result.isFullyCalculated).toBe(true);
  });

  it('correctly incorporates estimated charges per lot when enabled', () => {
    // Budget: 10,000, Premium: 50, Lot size: 10, Charge: 15 per lot
    // Cost per lot = (50 * 10) + 15 = 515
    // Lots = floor(10000 / 515) = 19
    // Premium cost = 19 * 500 = 9500
    // Charges = 19 * 15 = 285
    // Total estimated cost = 9785
    // Unused budget = 10000 - 9785 = 215
    const result = calculateOptionLeg(
      {
        strikePrice: 24000,
        premium: 50,
        lotSize: 10,
        chargesEnabled: true,
        estimatedChargePerLot: 15,
      },
      10000
    );

    expect(result.premiumCostPerLot).toBe(500);
    expect(result.chargePerLot).toBe(15);
    expect(result.totalCostPerLot).toBe(515);
    expect(result.affordableLots).toBe(19);
    expect(result.totalPremiumCost).toBe(9500);
    expect(result.totalEstimatedCharges).toBe(285);
    expect(result.totalEstimatedCost).toBe(9785);
    expect(result.unusedBudget).toBe(215);
  });

  it('handles asymmetric capital allocation correctly', () => {
    const inputs: CalculatorInputs = {
      totalCapital: 100000,
      ceAllocationPercent: 70, // PE is 30%
      marketCategory: 'SENSEX',
      ce: {
        strikePrice: 80000,
        premium: 100,
        lotSize: 20, // cost = 2000
        chargesEnabled: false,
        estimatedChargePerLot: null,
      },
      pe: {
        strikePrice: 80000,
        premium: 150,
        lotSize: 20, // cost = 3000
        chargesEnabled: false,
        estimatedChargePerLot: null,
      },
    };

    const result = calculateOptionsBudget(inputs);
    expect(result.ceBudget).toBe(70000);
    expect(result.peBudget).toBe(30000);
    expect(result.ce.affordableLots).toBe(35); // 70000 / 2000 = 35
    expect(result.ce.totalPremiumCost).toBe(70000);
    expect(result.ce.unusedBudget).toBe(0);

    expect(result.pe.affordableLots).toBe(10); // 30000 / 3000 = 10
    expect(result.pe.totalPremiumCost).toBe(30000);
    expect(result.pe.unusedBudget).toBe(0);

    expect(result.remainingCapital).toBe(0);
    expect(result.capitalUtilizationPercent).toBe(100);
  });

  it('safely handles zero capital, missing values, and division by zero', () => {
    const zeroCapitalInputs: CalculatorInputs = {
      totalCapital: 0,
      ceAllocationPercent: 50,
      marketCategory: 'NIFTY_50',
      ce: {
        strikePrice: null,
        premium: 0,
        lotSize: 0,
        chargesEnabled: false,
        estimatedChargePerLot: null,
      },
      pe: {
        strikePrice: null,
        premium: null,
        lotSize: null,
        chargesEnabled: false,
        estimatedChargePerLot: null,
      },
    };

    const result = calculateOptionsBudget(zeroCapitalInputs);
    expect(result.ce.affordableLots).toBe(0);
    expect(result.pe.affordableLots).toBe(0);
    expect(result.remainingCapital).toBe(0);
    expect(result.totalEstimatedExpenditure).toBe(0);
    expect(result.isFullyCalculated).toBe(false);
    expect(Number.isFinite(result.ce.affordableLots)).toBe(true);
    expect(Number.isNaN(result.ce.affordableLots)).toBe(false);
  });

  it('handles budget insufficient for even 1 lot', () => {
    // Budget 1000, but lot cost is 2000
    const leg = calculateOptionLeg(
      {
        strikePrice: 25000,
        premium: 100,
        lotSize: 20,
        chargesEnabled: false,
        estimatedChargePerLot: null,
      },
      1000
    );

    expect(leg.affordableLots).toBe(0);
    expect(leg.totalUnits).toBe(0);
    expect(leg.totalPremiumCost).toBe(0);
    expect(leg.unusedBudget).toBe(1000);
  });
});
