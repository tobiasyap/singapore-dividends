import { create } from "zustand";

interface UiState {
  addHoldingOpen: boolean;
  addHoldingTicker: string | null;
  openAddHolding: (ticker?: string) => void;
  closeAddHolding: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  addHoldingOpen: false,
  addHoldingTicker: null,
  openAddHolding: (ticker) => set({ addHoldingOpen: true, addHoldingTicker: ticker || null }),
  closeAddHolding: () => set({ addHoldingOpen: false, addHoldingTicker: null }),
}));
