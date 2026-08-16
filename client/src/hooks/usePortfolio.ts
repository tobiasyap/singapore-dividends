import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

interface SectorAllocation {
  sector: string;
  value: number;
  percentage: number;
}

export interface PortfolioOverview {
  total_value: number;
  total_cost: number;
  unrealised_gain: number;
  unrealised_gain_pct: number;
  forward_yield: number | null;
  projected_annual_income: number;
  sector_allocations: SectorAllocation[];
}

interface PortfolioHistoryPoint {
  date: string;
  value: number;
}

interface MonthlyDividend {
  month: string;
  amount: number;
}

export function usePortfolio() {
  return useQuery<PortfolioOverview>({
    queryKey: ["portfolio"],
    queryFn: () => api.get("/api/portfolio"),
  });
}

export function usePortfolioHistory(period = "1y") {
  return useQuery<PortfolioHistoryPoint[]>({
    queryKey: ["portfolio", "history", period],
    queryFn: () => api.get(`/api/portfolio/history?period=${period}`),
  });
}

export function usePortfolioDividends() {
  return useQuery<MonthlyDividend[]>({
    queryKey: ["portfolio", "dividends"],
    queryFn: () => api.get("/api/portfolio/dividends"),
  });
}
