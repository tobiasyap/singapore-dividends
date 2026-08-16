import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Stock, Dividend } from "../types";

interface StockSearchResult {
  id: number;
  ticker: string;
  name: string;
  sector: string | null;
  last_price: number | null;
  forward_dividend_yield: number | null;
  ttm_dividend_yield: number | null;
  market_cap: number | null;
}

interface PricePoint {
  date: string;
  close_price: number;
}

export function useStockSearch(query: string, sector?: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (sector) params.set("sector", sector);

  return useQuery<StockSearchResult[]>({
    queryKey: ["stocks", "search", query, sector],
    queryFn: () => api.get(`/api/stocks/search?${params}`),
  });
}

export function useStock(ticker: string) {
  return useQuery<Stock>({
    queryKey: ["stocks", ticker],
    queryFn: () => api.get(`/api/stocks/${ticker}`),
    enabled: !!ticker,
  });
}

export function useStockDividends(ticker: string) {
  return useQuery<Dividend[]>({
    queryKey: ["stocks", ticker, "dividends"],
    queryFn: () => api.get(`/api/stocks/${ticker}/dividends`),
    enabled: !!ticker,
  });
}

export function useStockPrices(ticker: string, period = "1y") {
  return useQuery<PricePoint[]>({
    queryKey: ["stocks", ticker, "prices", period],
    queryFn: () => api.get(`/api/stocks/${ticker}/prices?period=${period}`),
    enabled: !!ticker,
  });
}
