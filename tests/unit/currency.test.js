import { formatCurrency, getCurrencySymbol, CURRENCY_SYMBOLS } from '../../lib/currency';

describe('Currency Utility Tests', () => {
  test('1. getCurrencySymbol returns correct symbols and defaults to ₹', () => {
    expect(getCurrencySymbol('INR')).toBe('₹');
    expect(getCurrencySymbol('USD')).toBe('$');
    expect(getCurrencySymbol('EUR')).toBe('€');
    expect(getCurrencySymbol('GBP')).toBe('£');
    expect(getCurrencySymbol('AED')).toBe('AED');
    expect(getCurrencySymbol('SAR')).toBe('SAR');
    expect(getCurrencySymbol('')).toBe('₹');
    expect(getCurrencySymbol(null)).toBe('₹');
    expect(getCurrencySymbol('XYZ')).toBe('XYZ');
  });

  test('2. formatCurrency formats INR (₹) amounts correctly', () => {
    expect(formatCurrency(0, 'INR')).toBe('₹0.00');
    expect(formatCurrency(4500, 'INR')).toBe('₹4,500.00');
    expect(formatCurrency(1234567.89, 'INR')).toBe('₹1,234,567.89');
    expect(formatCurrency('5000', 'INR')).toBe('₹5,000.00');
    expect(formatCurrency(null, 'INR')).toBe('₹0.00');
    expect(formatCurrency(undefined, 'INR')).toBe('₹0.00');
  });

  test('3. formatCurrency handles negative and positive signed amounts', () => {
    expect(formatCurrency(-500, 'INR')).toBe('-₹500.00');
    expect(formatCurrency(-0, 'INR')).toBe('₹0.00');
    expect(formatCurrency(1000, 'INR', { showPlus: true })).toBe('+₹1,000.00');
    expect(formatCurrency(-1000, 'INR', { showPlus: true })).toBe('-₹1,000.00');
    expect(formatCurrency(0, 'INR', { showPlus: true })).toBe('₹0.00');
  });

  test('4. formatCurrency formats world currencies with appropriate spacing and symbols', () => {
    expect(formatCurrency(5000, 'USD')).toBe('$5,000.00');
    expect(formatCurrency(-250, 'USD')).toBe('-$250.00');
    expect(formatCurrency(5000, 'AED')).toBe('AED 5,000.00');
    expect(formatCurrency(-500, 'AED')).toBe('-AED 500.00');
    expect(formatCurrency(1500, 'SAR')).toBe('SAR 1,500.00');
    expect(formatCurrency(2500, 'EUR')).toBe('€2,500.00');
    expect(formatCurrency(3500, 'GBP')).toBe('£3,500.00');
  });

  test('5. Historical snapshot currency retention', () => {
    const historicalSnapshotUSD = { net_payable: '3500.00', currency: 'USD' };
    const historicalSnapshotINR = { net_payable: '3500.00', currency: 'INR' };
    const historicalSnapshotAED = { net_payable: '3500.00', currency: 'AED' };

    expect(formatCurrency(historicalSnapshotUSD.net_payable, historicalSnapshotUSD.currency)).toBe('$3,500.00');
    expect(formatCurrency(historicalSnapshotINR.net_payable, historicalSnapshotINR.currency)).toBe('₹3,500.00');
    expect(formatCurrency(historicalSnapshotAED.net_payable, historicalSnapshotAED.currency)).toBe('AED 3,500.00');
  });
});
