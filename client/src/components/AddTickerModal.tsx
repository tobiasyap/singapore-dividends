import { useEffect, useState } from "react";
import { useUiStore } from "../stores/uiStore";
import { useAddHolding } from "../hooks/useHoldings";
import { useStockSearch } from "../hooks/useStocks";

export function AddTickerModal() {
  const { addHoldingOpen: open, addHoldingTicker, closeAddHolding } = useUiStore();
  const [search, setSearch] = useState("");
  const [selectedTicker, setSelectedTicker] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("SGD");
  const [shares, setShares] = useState("");
  const [costPerShare, setCostPerShare] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: results = [] } = useStockSearch(search);
  const addMut = useAddHolding();

  useEffect(() => {
    if (open && addHoldingTicker) {
      setSelectedTicker(addHoldingTicker);
      const match = results.find((s) => s.ticker === addHoldingTicker);
      if (match) setSelectedCurrency(match.currency || "SGD");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, addHoldingTicker]);

  if (!open) return null;

  function reset() {
    setSearch("");
    setSelectedTicker("");
    setSelectedCurrency("SGD");
    setShares("");
    setCostPerShare("");
    setPurchaseDate("");
    setNotes("");
  }

  function handleClose() {
    reset();
    closeAddHolding();
  }

  function handleSubmit() {
    if (!selectedTicker || !shares || !costPerShare || !purchaseDate) return;
    addMut.mutate(
      { ticker: selectedTicker, shares: Number(shares), cost_per_share: Number(costPerShare), purchase_date: purchaseDate, notes: notes || undefined },
      { onSuccess: handleClose },
    );
  }

  const inputStyle = { background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={handleClose}>
      <div className="rounded-[14px] p-7 w-[420px] max-w-[90vw]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-[18px] font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>Add Ticker</h2>

        <div className="mb-3.5">
          <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-2)" }}>Search stock</label>
          <input type="text" placeholder="Type ticker or company name..." value={selectedTicker || search} onChange={(e) => { setSearch(e.target.value); setSelectedTicker(""); }} className="w-full py-2.5 px-3 rounded-lg text-[13.5px] outline-none" style={inputStyle} />
          {search && !selectedTicker && results.length > 0 && (
            <div className="mt-1 rounded-lg overflow-hidden max-h-[160px] overflow-y-auto" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}>
              {results.slice(0, 8).map((s) => (
                <button key={s.id} className="w-full text-left px-3 py-2 text-[13px] hover:bg-[var(--accent-s)] flex justify-between" onClick={() => { setSelectedTicker(s.ticker); setSelectedCurrency(s.currency || "SGD"); setSearch(""); }}>
                  <span><span className="font-bold" style={{ color: "var(--accent)" }}>{s.ticker}</span> {s.name}</span>
                  {s.currency && s.currency !== "SGD" && <span style={{ color: "var(--text-3)" }}>{s.currency}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3.5">
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-2)" }}>Shares</label>
            <input type="number" placeholder="e.g. 1000" value={shares} onChange={(e) => setShares(e.target.value)} className="w-full py-2.5 px-3 rounded-lg text-[13.5px] outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-2)" }}>Cost / share ({selectedCurrency})</label>
            <input type="number" step="0.01" placeholder="e.g. 35.50" value={costPerShare} onChange={(e) => setCostPerShare(e.target.value)} className="w-full py-2.5 px-3 rounded-lg text-[13.5px] outline-none" style={inputStyle} />
          </div>
        </div>

        <div className="mb-3.5">
          <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-2)" }}>Purchase date</label>
          <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="w-full py-2.5 px-3 rounded-lg text-[13.5px] outline-none" style={inputStyle} />
        </div>

        <div className="mb-5">
          <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-2)" }}>Notes (optional)</label>
          <input type="text" placeholder="e.g. Buy target, sell plan..." value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full py-2.5 px-3 rounded-lg text-[13.5px] outline-none" style={inputStyle} />
        </div>

        <div className="flex gap-2.5 justify-end">
          <button onClick={handleClose} className="px-4 py-2 rounded-lg text-[13px] font-semibold" style={{ background: "var(--accent-s)", color: "var(--accent)" }}>Cancel</button>
          <button onClick={handleSubmit} disabled={addMut.isPending || !selectedTicker} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50" style={{ background: "var(--accent)" }}>
            {addMut.isPending ? "Adding..." : "Add to Portfolio"}
          </button>
        </div>
      </div>
    </div>
  );
}
