import {
  CalculatorInputs,
  CombinedCalculationResult,
  LegCalculationResult,
  LegInputs,
} from '@/types/calculator';

/**
 * Calculates affordability and unit metrics for a single option leg (CE or PE).
 */
export function calculateOptionLeg(
  legInputs: LegInputs,
  allocatedBudget: number
): LegCalculationResult {
  const { premium, lotSize, chargesEnabled, estimatedChargePerLot } = legInputs;

  // Initial zero-safe defaults
  const result: LegCalculationResult = {
    budget: Math.max(0, allocatedBudget || 0),
    premiumCostPerLot: 0,
    chargePerLot: 0,
    totalCostPerLot: 0,
    affordableLots: 0,
    totalUnits: 0,
    totalPremiumCost: 0,
    totalEstimatedCharges: 0,
    totalEstimatedCost: 0,
    unusedBudget: Math.max(0, allocatedBudget || 0),
    hasErrors: false,
    errorMessage: undefined,
    source: legInputs.source || 'MANUAL',
    quoteMetadata: legInputs.quoteMetadata,
  };

  // Validate inputs
  if (allocatedBudget <= 0) {
    result.hasErrors = true;
    result.errorMessage = 'Allocated budget is ₹0. Increase allocation or total capital.';
    return result;
  }

  if (premium === null || premium === undefined || isNaN(premium) || premium <= 0) {
    result.hasErrors = true;
    result.errorMessage = 'Enter a valid premium greater than ₹0.';
    return result;
  }

  if (lotSize === null || lotSize === undefined || isNaN(lotSize) || lotSize <= 0) {
    result.hasErrors = true;
    result.errorMessage = 'Enter a valid lot size (minimum 1).';
    return result;
  }

  const effectiveChargePerLot =
    chargesEnabled && estimatedChargePerLot !== null && !isNaN(estimatedChargePerLot) && estimatedChargePerLot > 0
      ? estimatedChargePerLot
      : 0;

  // Premium cost per lot = CE/PE premium × lot size
  const premiumCostPerLot = premium * lotSize;
  const totalCostPerLot = premiumCostPerLot + effectiveChargePerLot;

  // Prevent division by zero or negative costs
  if (totalCostPerLot <= 0) {
    result.hasErrors = true;
    result.errorMessage = 'Total cost per lot must be greater than zero.';
    return result;
  }

  // Affordable whole lots = floor(Budget / Total Cost Per Lot)
  const affordableLots = Math.floor(result.budget / totalCostPerLot);

  // Totals
  const totalUnits = affordableLots * lotSize;
  const totalPremiumCost = affordableLots * premiumCostPerLot;
  const totalEstimatedCharges = affordableLots * effectiveChargePerLot;
  const totalEstimatedCost = totalPremiumCost + totalEstimatedCharges;
  const unusedBudget = Math.max(0, result.budget - totalEstimatedCost);

  return {
    budget: result.budget,
    premiumCostPerLot,
    chargePerLot: effectiveChargePerLot,
    totalCostPerLot,
    affordableLots,
    totalUnits,
    totalPremiumCost,
    totalEstimatedCharges,
    totalEstimatedCost,
    unusedBudget,
    hasErrors: false,
    source: legInputs.source || 'MANUAL',
    quoteMetadata: legInputs.quoteMetadata,
  };
}

/**
 * Calculates complete combined options portfolio affordability.
 */
export function calculateOptionsBudget(inputs: CalculatorInputs): CombinedCalculationResult {
  const { totalCapital, ceAllocationPercent, ce, pe, marketCategory } = inputs;

  const validationErrors: CombinedCalculationResult['validationErrors'] = {};

  // Validate Capital
  const validCapital = totalCapital !== null && !isNaN(totalCapital) && totalCapital > 0 ? totalCapital : 0;
  if (totalCapital === null || totalCapital === undefined) {
    validationErrors.totalCapital = 'Total capital is required.';
  } else if (isNaN(totalCapital) || totalCapital <= 0) {
    validationErrors.totalCapital = 'Total capital must be greater than ₹0.';
  }

  // Validate Allocation
  const clampedCePercent = Math.min(100, Math.max(0, isNaN(ceAllocationPercent) ? 50 : ceAllocationPercent));
  const pePercent = 100 - clampedCePercent;

  // Budgets
  const ceBudget = validCapital * (clampedCePercent / 100);
  const peBudget = validCapital * (pePercent / 100);

  // Validate CE Leg
  const ceErrors: NonNullable<CombinedCalculationResult['validationErrors']['ce']> = {};
  if (ce.premium === null || ce.premium === undefined) {
    ceErrors.premium = 'Enter CE premium.';
  } else if (ce.premium <= 0) {
    ceErrors.premium = 'CE premium must be > ₹0.';
  }

  if (ce.lotSize === null || ce.lotSize === undefined) {
    ceErrors.lotSize = 'Enter CE lot size.';
  } else if (ce.lotSize <= 0 || !Number.isInteger(ce.lotSize)) {
    ceErrors.lotSize = 'Lot size must be a positive whole number.';
  }

  if (ce.chargesEnabled && (ce.estimatedChargePerLot === null || ce.estimatedChargePerLot < 0)) {
    ceErrors.charges = 'Charge per lot cannot be negative.';
  }

  if (Object.keys(ceErrors).length > 0) {
    validationErrors.ce = ceErrors;
  }

  // Validate PE Leg
  const peErrors: NonNullable<CombinedCalculationResult['validationErrors']['pe']> = {};
  if (pe.premium === null || pe.premium === undefined) {
    peErrors.premium = 'Enter PE premium.';
  } else if (pe.premium <= 0) {
    peErrors.premium = 'PE premium must be > ₹0.';
  }

  if (pe.lotSize === null || pe.lotSize === undefined) {
    peErrors.lotSize = 'Enter PE lot size.';
  } else if (pe.lotSize <= 0 || !Number.isInteger(pe.lotSize)) {
    peErrors.lotSize = 'Lot size must be a positive whole number.';
  }

  if (pe.chargesEnabled && (pe.estimatedChargePerLot === null || pe.estimatedChargePerLot < 0)) {
    peErrors.charges = 'Charge per lot cannot be negative.';
  }

  if (Object.keys(peErrors).length > 0) {
    validationErrors.pe = peErrors;
  }

  // Calculate legs
  const ceResult = calculateOptionLeg(ce, ceBudget);
  const peResult = calculateOptionLeg(pe, peBudget);

  // Combined metrics
  const combinedPremiumCost = ceResult.totalPremiumCost + peResult.totalPremiumCost;
  const combinedEstimatedCharges = ceResult.totalEstimatedCharges + peResult.totalEstimatedCharges;
  const totalEstimatedExpenditure = ceResult.totalEstimatedCost + peResult.totalEstimatedCost;
  const remainingCapital = Math.max(0, validCapital - totalEstimatedExpenditure);

  const capitalUtilizationPercent =
    validCapital > 0 ? (totalEstimatedExpenditure / validCapital) * 100 : 0;

  const isFullyCalculated =
    validCapital > 0 &&
    !ceResult.hasErrors &&
    !peResult.hasErrors &&
    Object.keys(validationErrors).length === 0;

  return {
    totalCapital: validCapital,
    ceBudget,
    peBudget,
    ce: ceResult,
    pe: peResult,
    combinedPremiumCost,
    combinedEstimatedCharges,
    totalEstimatedExpenditure,
    remainingCapital,
    capitalUtilizationPercent,
    isFullyCalculated,
    validationErrors,
  };
}
