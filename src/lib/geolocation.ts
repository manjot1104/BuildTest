/**
 * Geolocation Utilities
 * Detect user's country and provide appropriate currency
 */

import {
  getCurrencyByCountry,
  DEFAULT_CURRENCY,
  type SupportedCurrency,
  type CurrencyConfig,
} from "@/config/currency.config";

// Cache key for localStorage
const CURRENCY_CACHE_KEY = "user_currency";
const COUNTRY_CACHE_KEY = "user_country";
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedLocation {
  country: string;
  currency: SupportedCurrency;
  timestamp: number;
}

/**
 * Get cached location data from localStorage
 */
function getCachedLocation(): CachedLocation | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(CURRENCY_CACHE_KEY);
    if (!cached) return null;

    const data: CachedLocation = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - data.timestamp < CACHE_DURATION_MS) {
      return data;
    }

    // Cache expired, remove it
    localStorage.removeItem(CURRENCY_CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

/**
 * Save location data to localStorage
 */
function cacheLocation(country: string, currency: SupportedCurrency): void {
  if (typeof window === "undefined") return;

  try {
    const data: CachedLocation = {
      country,
      currency,
      timestamp: Date.now(),
    };
    localStorage.setItem(CURRENCY_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Detect user's country using IP geolocation API
 * Uses a free, privacy-respecting API
 */
export async function detectUserCountry(): Promise<string> {
  // Check cache first
  const cached = getCachedLocation();
  if (cached) {
    return cached.country;
  }

  try {
    // Using ip-api.com (free tier, no API key required)
    // Alternative: ipinfo.io, ipdata.co, etc.
    const response = await fetch("https://ip-api.com/json/?fields=countryCode", {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      throw new Error("Failed to fetch geolocation");
    }

    const data = (await response.json()) as { countryCode?: string };
    const countryCode = data.countryCode ?? "";

    if (countryCode) {
      const currencyConfig = getCurrencyByCountry(countryCode);
      cacheLocation(countryCode, currencyConfig.code);
      return countryCode;
    }
  } catch (error) {
    console.warn("Geolocation detection failed:", error);
  }

  // Fallback: try browser language/timezone hints
  return detectCountryFromBrowser();
}

/**
 * Detect country from browser settings (fallback method)
 */
function detectCountryFromBrowser(): string {
  if (typeof window === "undefined") return "";

  try {
    // Try to get country from navigator.language
    const language = navigator.language || "";
    const parts = language.split("-");

    if (parts.length >= 2 && parts[1]) {
      const region = parts[1].toUpperCase();
      // Common language-region mappings
      const regionMapping: Record<string, string> = {
        US: "US",
        CA: "CA",
        AU: "AU",
        NZ: "NZ",
        IN: "IN",
        AE: "AE",
        GB: "US", // UK uses USD for display (closest match)
      };

      if (regionMapping[region]) {
        return regionMapping[region];
      }
    }

    // Try timezone-based detection
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const tzCountryMapping: Record<string, string> = {
      "America/New_York": "US",
      "America/Los_Angeles": "US",
      "America/Chicago": "US",
      "America/Denver": "US",
      "America/Toronto": "CA",
      "America/Vancouver": "CA",
      "Australia/Sydney": "AU",
      "Australia/Melbourne": "AU",
      "Pacific/Auckland": "NZ",
      "Asia/Kolkata": "IN",
      "Asia/Dubai": "AE",
    };

    for (const [tz, country] of Object.entries(tzCountryMapping)) {
      const tzPart = tz.split("/")[1];
      if (tzPart && timezone.includes(tzPart)) {
        return country;
      }
    }
  } catch {
    // Ignore errors
  }

  return "";
}

/**
 * Get user's currency based on their location
 */
export async function getUserCurrency(): Promise<CurrencyConfig> {
  // Check cache first
  const cached = getCachedLocation();
  if (cached) {
    return getCurrencyByCountry(cached.country);
  }

  const country = await detectUserCountry();

  if (country) {
    return getCurrencyByCountry(country);
  }

  return getCurrencyByCountry(DEFAULT_CURRENCY);
}

/**
 * Get user's currency synchronously (uses cache only)
 * Useful for initial render before async detection completes
 */
export function getUserCurrencySync(): CurrencyConfig {
  const cached = getCachedLocation();
  if (cached) {
    return getCurrencyByCountry(cached.country);
  }

  // Try browser-based detection synchronously
  const country = detectCountryFromBrowser();
  if (country) {
    return getCurrencyByCountry(country);
  }

  return getCurrencyByCountry(DEFAULT_CURRENCY);
}

/**
 * Manually set user's preferred currency
 */
export function setUserCurrency(currency: SupportedCurrency): void {
  if (typeof window === "undefined") return;

  try {
    // Find a country that uses this currency
    const currencyConfig = getCurrencyByCountry(currency);
    const country = currencyConfig.countries[0] || "";

    cacheLocation(country, currency);
  } catch {
    // Ignore errors
  }
}

/**
 * Clear cached currency preference
 */
export function clearCurrencyCache(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(CURRENCY_CACHE_KEY);
    localStorage.removeItem(COUNTRY_CACHE_KEY);
  } catch {
    // Ignore errors
  }
}
