/**
 * Unified Currency Formatting Utilities
 * Source of truth for currency display across Payroll, Payslips, Settings, and Profile.
 */

export const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED',
  SAR: 'SAR',
  QAR: 'QAR',
  KWD: 'KWD',
  OMR: 'OMR',
  BHD: 'BHD',
  SGD: 'S$',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥',
};

/**
 * Returns the appropriate symbol or textual code for a given currency code.
 * Defaults to '₹' if currency is INR or empty.
 */
export const getCurrencySymbol = (currency = 'INR') => {
  if (!currency) return '₹';
  const code = String(currency).trim().toUpperCase();
  return CURRENCY_SYMBOLS[code] || code;
};

/**
 * Formats a monetary amount into a clean, uniform currency string.
 * Examples:
 *   formatCurrency(0, 'INR') => "₹0.00"
 *   formatCurrency(4500, 'INR') => "₹4,500.00"
 *   formatCurrency(-500, 'INR') => "-₹500.00"
 *   formatCurrency(1000, 'INR', { showPlus: true }) => "+₹1,000.00"
 *   formatCurrency(5000, 'USD') => "$5,000.00"
 *   formatCurrency(-250, 'USD') => "-$250.00"
 *   formatCurrency(5000, 'AED') => "AED 5,000.00"
 *   formatCurrency(-500, 'AED') => "-AED 5,000.00"
 */
export const formatCurrency = (val, currency = 'INR', options = {}) => {
  const { showPlus = false, space = false } = options;
  const num = typeof val === 'number' ? val : parseFloat(val);
  const isNeg = !isNaN(num) && num < 0;
  const absNum = isNaN(num) ? 0 : Math.abs(num);

  const code = (currency || 'INR').toString().trim().toUpperCase();
  const symbol = getCurrencySymbol(code);
  const isSymbolAlpha = /^[A-Z]+$/.test(symbol); // e.g. AED, SAR

  // Format decimal numbers with 2 fixed decimal places
  const formattedNumber = absNum.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const separator = isSymbolAlpha || space ? ' ' : '';
  const formattedAbs = `${symbol}${separator}${formattedNumber}`;

  if (isNeg) {
    return `-${formattedAbs}`;
  }
  if (showPlus && num > 0) {
    return `+${formattedAbs}`;
  }
  return formattedAbs;
};

export default formatCurrency;
