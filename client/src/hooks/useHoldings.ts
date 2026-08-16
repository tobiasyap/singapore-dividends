import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Holding, Stock } from "../types";

export interface GroupedHolding {
  stock: Stock;
  total_shares: number;
  avg_cost: number;
  total_cost: number;
  market_value: number | null;
  dividends_received: number;
  lots: (Holding & { dividends_received: number })[];
}

interface HoldingCreate {
  ticker: string;
  shares: number;
  cost_per_share: number;
  purchase_date: string;
  notes?: string;
}

interface HoldingUpdate {
  shares?: number;
  cost_per_share?: number;
  purchase_date?: string;
  notes?: string;
}

export function useHoldings() {
  return useQuery<GroupedHolding[]>({
    queryKey: ["holdings"],
    queryFn: () => api.get("/api/holdings"),
  });
}

export function useAddHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: HoldingCreate) => api.post<Holding>("/api/holdings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holdings"] });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}

export function useUpdateHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: HoldingUpdate & { id: number }) =>
      api.put<Holding>(`/api/holdings/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holdings"] });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}

export function useDeleteHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/holdings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holdings"] });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}
