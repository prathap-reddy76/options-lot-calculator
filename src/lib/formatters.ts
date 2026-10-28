/**
 * High-precision Indian Rupee (INR) and financial formatters.
 */

export function formatINR(
  val: number | null | undefined,
  options: { hideSymbol?: boolean; decimals?: number } = {}
): string {
  if (val === null || val === undefined || isNaN(val)) {
    return options.hideSymbol ? '0' : '₹0';
  }

  const { hideSymbol = false, decimals = 2 } = options;
  const isNegative = val < 0;
  const absVal = Math.abs(val);

  // Use en-IN locale for Indian Lakh/Crore grouping (e.g. 2,00,000)
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: Number.isInteger(absVal) && decimals === 0 ? 0 : (decimals > 0 ? (absVal % 1 === 0 ? 0 : 2) : 0),
    maximumFractionDigits: decimals,
  }).format(absVal);

  const prefix = isNegative ? '-' : '';
  const currencySign = hideSymbol ? '' : '₹';

  return `${prefix}${currencySign}${formatted}`;
}

export function formatINRStrict(
  val: number | null | undefined,
  decimals: number = 0
): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '₹0';
  }
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);

  return `₹${formatted}`;
}

export function formatNumber(
  val: number | null | undefined,
  decimals: number = 0
): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '0';
  }
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '0%';
  }
  return `${Math.round(val)}%`;
}

export function sanitizeNumberInput(input: string): string {
  // Allow only digits and a single decimal point
  return input.replace(/[^0-9.]/g, '');
}

export function parseNumberInput(input: string): number | null {
  if (!input || input.trim() === '') return null;
  const clean = input.replace(/,/g, '').trim();
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? null : parsed;
}
