"use client";

import { useEffect, useState } from "react";
import {
  type SupportedCurrency,
  type CurrencyConfig,
  getAllCurrencies,
  getCurrencyConfig,
} from "@/config/currency.config";
import {
  getUserCurrency,
  getUserCurrencySync,
  setUserCurrency as setCachedUserCurrency,
} from "@/lib/geolocation";
import { useLocalizedPlans } from "@/client-api/query-hooks/use-payment-queries";

/**
 * Hook to get localized pricing based on user's location
 * Uses Eden client via useLocalizedPlans for type-safe API calls
 */
export function useLocalizedPricing() {
  const [currency, setCurrency] = useState<SupportedCurrency>(() => {
    // Get initial currency synchronously from cache
    const cachedCurrency = getUserCurrencySync();
    return cachedCurrency.code;
  });

  // Detect user's currency on mount
  useEffect(() => {
    void getUserCurrency()
      .then((detectedCurrency) => {
        setCurrency(detectedCurrency.code);
      })
      .catch(() => {
        // Fall back to default currency (already set from sync cache)
      });
  }, []);

  // Use the Eden-based query hook
  const query = useLocalizedPlans(currency);

  const changeCurrency = (newCurrency: SupportedCurrency) => {
    setCurrency(newCurrency);
    setCachedUserCurrency(newCurrency);
  };

  return {
    ...query,
    currency,
    currencyConfig: getCurrencyConfig(currency),
    changeCurrency,
    availableCurrencies: getAllCurrencies(),
  };
}

/**
 * Simple hook to just get detected currency without pricing data
 */
export function useDetectedCurrency() {
  const [currency, setCurrencyState] = useState<CurrencyConfig>(() =>
    getUserCurrencySync()
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void getUserCurrency()
      .then((detected) => {
        setCurrencyState(detected);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const setCurrency = (code: SupportedCurrency) => {
    setCachedUserCurrency(code);
    setCurrencyState(getCurrencyConfig(code));
  };

  return {
    currency,
    isLoading,
    setCurrency,
    availableCurrencies: getAllCurrencies(),
  };
}
