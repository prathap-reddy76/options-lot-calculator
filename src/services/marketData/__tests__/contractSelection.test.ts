import { describe, expect, it } from 'vitest';
import { calculateOptionsBudget } from '@/lib/calculations';
import { INSTRUMENTS_DEFINITIONS, MARKET_PRESETS } from '@/lib/constants';
import { CalculatorInputs } from '@/types/calculator';
import { InstrumentId } from '@/types/market';

describe('Market & Option Chain Contract Selection Logic', () => {
  it('changing selected market clears incompatible contract selections and strikes', () => {
    // Initial state with NIFTY 50 selected contract
    const initialInputs: CalculatorInputs = {
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
        contractIdentifier: 'NSE:NIFTY26OCT24500CE',
      },
      pe: {
        strikePrice: 24500,
        premium: 60,
        lotSize: 65,
        chargesEnabled: false,
        estimatedChargePerLot: null,
        contractIdentifier: 'NSE:NIFTY26OCT24500PE',
      },
    };

    // Simulate changing instrument to BANK_NIFTY
    const newInstrument: InstrumentId = 'BANK_NIFTY';
    const instDef = INSTRUMENTS_DEFINITIONS[newInstrument];

    const updatedInputs: CalculatorInputs = {
      ...initialInputs,
      instrumentId: newInstrument,
      selectedExpiry: null, // Expiry must be cleared
      ce: {
        ...initialInputs.ce,
        strikePrice: null, // Incompatible NIFTY strike cleared
        premium: null, // Incompatible NIFTY premium cleared
        contractIdentifier: undefined,
        lotSize: instDef.defaultLotSize, // Updated to BANK_NIFTY lot size (15)
        underlyingSymbol: instDef.symbol,
      },
      pe: {
        ...initialInputs.pe,
        strikePrice: null, // Incompatible NIFTY strike cleared
        premium: null, // Incompatible NIFTY premium cleared
        contractIdentifier: undefined,
        lotSize: instDef.defaultLotSize, // Updated to BANK_NIFTY lot size (15)
        underlyingSymbol: instDef.symbol,
      },
    };

    expect(updatedInputs.instrumentId).toBe('BANK_NIFTY');
    expect(updatedInputs.selectedExpiry).toBeNull();
    expect(updatedInputs.ce.strikePrice).toBeNull();
    expect(updatedInputs.ce.premium).toBeNull();
    expect(updatedInputs.ce.lotSize).toBe(15);
    expect(updatedInputs.pe.strikePrice).toBeNull();
    expect(updatedInputs.pe.premium).toBeNull();
    expect(updatedInputs.pe.lotSize).toBe(15);
  });

  it('switching to commodity requires manual lot size and clears index contracts', () => {
    const initialInputs: CalculatorInputs = {
      totalCapital: 200000,
      ceAllocationPercent: 50,
      marketCategory: 'NIFTY_50',
      instrumentId: 'NIFTY_50',
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

    const commodityDef = INSTRUMENTS_DEFINITIONS['CRUDE_OIL'];
    const updatedInputs: CalculatorInputs = {
      ...initialInputs,
      marketCategory: 'COMMODITIES',
      instrumentId: 'CRUDE_OIL',
      commoditySymbol: commodityDef.symbol,
      ce: {
        ...initialInputs.ce,
        strikePrice: null,
        premium: null,
        lotSize: commodityDef.defaultLotSize, // null for commodities (manual required)
      },
      pe: {
        ...initialInputs.pe,
        strikePrice: null,
        premium: null,
        lotSize: commodityDef.defaultLotSize, // null for commodities (manual required)
      },
    };

    expect(updatedInputs.ce.lotSize).toBeNull();
    expect(updatedInputs.pe.lotSize).toBeNull();
    expect(commodityDef.isLotSizeManualRequired).toBe(true);
  });

  it('changing expiry clears strikes that do not belong to that expiry', () => {
    const inputsWithExpiry: CalculatorInputs = {
      totalCapital: 100000,
      ceAllocationPercent: 50,
      marketCategory: 'NIFTY_50',
      selectedExpiry: '2026-10-29',
      ce: {
        strikePrice: 24500,
        premium: 50,
        lotSize: 65,
        chargesEnabled: false,
        estimatedChargePerLot: null,
        contractIdentifier: 'NSE:NIFTY26OCT24500CE',
      },
      pe: {
        strikePrice: 24000,
        premium: 45,
        lotSize: 65,
        chargesEnabled: false,
        estimatedChargePerLot: null,
        contractIdentifier: 'NSE:NIFTY26OCT24000PE',
      },
    };

    // Simulate selecting a new expiry date
    const newExpiry = '2026-11-05';
    const inputsAfterExpiryChange: CalculatorInputs = {
      ...inputsWithExpiry,
      selectedExpiry: newExpiry,
      ce: {
        ...inputsWithExpiry.ce,
        expiryDate: newExpiry,
        strikePrice: null, // Cleared because strike was selected for prior expiry
        premium: null,
        contractIdentifier: undefined,
      },
      pe: {
        ...inputsWithExpiry.pe,
        expiryDate: newExpiry,
        strikePrice: null, // Cleared because strike was selected for prior expiry
        premium: null,
        contractIdentifier: undefined,
      },
    };

    expect(inputsAfterExpiryChange.selectedExpiry).toBe('2026-11-05');
    expect(inputsAfterExpiryChange.ce.strikePrice).toBeNull();
    expect(inputsAfterExpiryChange.ce.premium).toBeNull();
    expect(inputsAfterExpiryChange.pe.strikePrice).toBeNull();
    expect(inputsAfterExpiryChange.pe.premium).toBeNull();
  });

  it('CE and PE selections are completely independent', () => {
    let state: CalculatorInputs = {
      totalCapital: 200000,
      ceAllocationPercent: 50,
      marketCategory: 'NIFTY_50',
      ce: {
        strikePrice: null,
        premium: null,
        lotSize: 65,
        chargesEnabled: false,
        estimatedChargePerLot: null,
      },
      pe: {
        strikePrice: null,
        premium: null,
        lotSize: 65,
        chargesEnabled: false,
        estimatedChargePerLot: null,
      },
    };

    // 1. User picks CE Strike only
    state = {
      ...state,
      ce: {
        ...state.ce,
        strikePrice: 24800,
        premium: 35.5,
      },
    };

    expect(state.ce.strikePrice).toBe(24800);
    expect(state.ce.premium).toBe(35.5);
    expect(state.pe.strikePrice).toBeNull(); // PE remains unselected
    expect(state.pe.premium).toBeNull();

    // 2. User picks PE Strike only
    state = {
      ...state,
      pe: {
        ...state.pe,
        strikePrice: 24200,
        premium: 42.0,
      },
    };

    expect(state.ce.strikePrice).toBe(24800); // CE unchanged
    expect(state.ce.premium).toBe(35.5);
    expect(state.pe.strikePrice).toBe(24200); // PE updated independently
    expect(state.pe.premium).toBe(42.0);
  });

  it('missing quotes do not become zero-priced contracts', () => {
    const inputsWithMissingQuote: CalculatorInputs = {
      totalCapital: 100000,
      ceAllocationPercent: 50,
      marketCategory: 'NIFTY_50',
      ce: {
        strikePrice: 24500,
        premium: null, // Quote is missing/unavailable
        lotSize: 65,
        chargesEnabled: false,
        estimatedChargePerLot: null,
      },
      pe: {
        strikePrice: 24500,
        premium: 0, // Zero price should never be treated as valid purchase price
        lotSize: 65,
        chargesEnabled: false,
        estimatedChargePerLot: null,
      },
    };

    const result = calculateOptionsBudget(inputsWithMissingQuote);

    // CE must NOT have lots or NaN/Infinity
    expect(result.ce.affordableLots).toBe(0);
    expect(result.ce.totalPremiumCost).toBe(0);
    expect(result.ce.hasErrors).toBe(true);
    expect(result.ce.errorMessage).toBeDefined();

    // PE with 0 price must NOT divide by zero or yield Infinity
    expect(result.pe.affordableLots).toBe(0);
    expect(result.pe.totalPremiumCost).toBe(0);
    expect(result.pe.hasErrors).toBe(true);
    expect(Number.isFinite(result.pe.affordableLots)).toBe(true);
    expect(result.isFullyCalculated).toBe(false);
  });

  it('manual calculations work seamlessly without an API', () => {
    const manualInputs: CalculatorInputs = {
      totalCapital: 150000,
      ceAllocationPercent: 60, // CE: 90,000, PE: 60,000
      marketCategory: 'SENSEX',
      ce: {
        strikePrice: 81000,
        premium: 75,
        lotSize: 20, // cost = 1500
        chargesEnabled: true,
        estimatedChargePerLot: 25, // total cost = 1525
      },
      pe: {
        strikePrice: 79500,
        premium: 80,
        lotSize: 20, // cost = 1600
        chargesEnabled: false,
        estimatedChargePerLot: null,
      },
    };

    const result = calculateOptionsBudget(manualInputs);

    expect(result.ceBudget).toBe(90000);
    expect(result.ce.premiumCostPerLot).toBe(1500);
    expect(result.ce.chargePerLot).toBe(25);
    expect(result.ce.totalCostPerLot).toBe(1525);
    // floor(90000 / 1525) = 59 lots
    expect(result.ce.affordableLots).toBe(59);
    expect(result.ce.totalPremiumCost).toBe(59 * 1500); // 88500
    expect(result.ce.totalEstimatedCharges).toBe(59 * 25); // 1475
    expect(result.ce.totalEstimatedCost).toBe(89975);
    expect(result.ce.unusedBudget).toBe(25); // 90000 - 89975

    expect(result.peBudget).toBe(60000);
    expect(result.pe.premiumCostPerLot).toBe(1600);
    // floor(60000 / 1600) = 37 lots
    expect(result.pe.affordableLots).toBe(37);
    expect(result.pe.totalPremiumCost).toBe(37 * 1600); // 59200
    expect(result.pe.unusedBudget).toBe(800); // 60000 - 59200

    expect(result.remainingCapital).toBe(825); // 25 + 800
    expect(result.isFullyCalculated).toBe(true);
  });
});
