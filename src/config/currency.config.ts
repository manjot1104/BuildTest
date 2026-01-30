/**
 * Currency Configuration
 * Centralized configuration for multi-currency support
 */

export type SupportedCurrency = "INR" | "USD" | "CAD" | "AUD" | "NZD" | "AED";

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  // Exchange rate from INR (base currency)
  // e.g., if 1 USD = 83 INR, then rate = 1/83 = 0.012
  exchangeRateFromINR: number;
  // Countries that use this currency (ISO 3166-1 alpha-2 codes)
  countries: string[];
  // Razorpay supported - note: Razorpay primarily supports INR
  // For international currencies, we display the converted price but charge in INR
  razorpaySupported: boolean;
  // Decimal places for display
  decimalPlaces: number;
}

export const CURRENCIES: Record<SupportedCurrency, CurrencyConfig> = {
  INR: {
    code: "INR",
    symbol: "₹",
    name: "Indian Rupee",
    exchangeRateFromINR: 1,
    countries: ["IN"],
    razorpaySupported: true,
    decimalPlaces: 0,
  },
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    exchangeRateFromINR: 0.012, // 1 INR ≈ 0.012 USD (1 USD ≈ 83 INR)
    countries: ["US"],
    razorpaySupported: true,
    decimalPlaces: 2,
  },
  CAD: {
    code: "CAD",
    symbol: "C$",
    name: "Canadian Dollar",
    exchangeRateFromINR: 0.016, // 1 INR ≈ 0.016 CAD (1 CAD ≈ 62 INR)
    countries: ["CA"],
    razorpaySupported: true,
    decimalPlaces: 2,
  },
  AUD: {
    code: "AUD",
    symbol: "A$",
    name: "Australian Dollar",
    exchangeRateFromINR: 0.018, // 1 INR ≈ 0.018 AUD (1 AUD ≈ 55 INR)
    countries: ["AU"],
    razorpaySupported: true,
    decimalPlaces: 2,
  },
  NZD: {
    code: "NZD",
    symbol: "NZ$",
    name: "New Zealand Dollar",
    exchangeRateFromINR: 0.020, // 1 INR ≈ 0.020 NZD (1 NZD ≈ 50 INR)
    countries: ["NZ"],
    razorpaySupported: true,
    decimalPlaces: 2,
  },
  AED: {
    code: "AED",
    symbol: "د.إ",
    name: "UAE Dirham",
    exchangeRateFromINR: 0.044, // 1 INR ≈ 0.044 AED (1 AED ≈ 22.6 INR)
    countries: ["AE"],
    razorpaySupported: true,
    decimalPlaces: 2,
  },
};

// Default currency for unknown locations
export const DEFAULT_CURRENCY: SupportedCurrency = "USD";

// Base currency (prices are defined in this currency)
export const BASE_CURRENCY: SupportedCurrency = "INR";

/**
 * Get currency config by currency code
 */
export function getCurrencyConfig(code: SupportedCurrency): CurrencyConfig {
  return CURRENCIES[code] ?? CURRENCIES[DEFAULT_CURRENCY];
}

/**
 * Get currency by country code (ISO 3166-1 alpha-2)
 */
export function getCurrencyByCountry(countryCode: string): CurrencyConfig {
  const upperCountry = countryCode.toUpperCase();

  for (const currency of Object.values(CURRENCIES)) {
    if (currency.countries.includes(upperCountry)) {
      return currency;
    }
  }

  return CURRENCIES[DEFAULT_CURRENCY];
}

/**
 * Convert amount from INR to target currency
 */
export function convertFromINR(
  amountInINR: number,
  targetCurrency: SupportedCurrency
): number {
  const config = getCurrencyConfig(targetCurrency);
  const converted = amountInINR * config.exchangeRateFromINR;

  // Round to appropriate decimal places
  const multiplier = Math.pow(10, config.decimalPlaces);
  return Math.round(converted * multiplier) / multiplier;
}

/**
 * Convert amount from target currency to INR
 */
export function convertToINR(
  amount: number,
  fromCurrency: SupportedCurrency
): number {
  const config = getCurrencyConfig(fromCurrency);
  return Math.round(amount / config.exchangeRateFromINR);
}

/**
 * Format price with currency symbol
 */
export function formatPrice(
  amount: number,
  currency: SupportedCurrency
): string {
  const config = getCurrencyConfig(currency);
  const formatted = amount.toFixed(config.decimalPlaces);

  // Handle special cases for symbol placement
  if (currency === "AED") {
    return `${formatted} ${config.symbol}`;
  }

  return `${config.symbol}${formatted}`;
}

/**
 * Get all supported currencies
 */
export function getAllCurrencies(): CurrencyConfig[] {
  return Object.values(CURRENCIES);
}

/**
 * Check if a currency code is supported
 */
export function isSupportedCurrency(code: string): code is SupportedCurrency {
  return code in CURRENCIES;
}
