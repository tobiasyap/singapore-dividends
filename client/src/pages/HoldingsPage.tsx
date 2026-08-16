import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { useHoldings, useAddHolding, useDeleteHolding, type GroupedHolding } from "../hooks/useHoldings";
import { useStockSearch } from "../hooks/useStocks";
import { formatCurrency, formatPercent, cn } from "../lib/utils";

function GainCell({ gain, pct }: { gain: number; pct: number }) {
  const color = gain >= 0 ? "var(--pos)" : "var(--neg)";
  const sign = gain >= 0 ? "+" : "";
  return (
    <td className="px-3 py-2.5 text-right whitespace-nowrap" style={{ color, fontVariantNumeric: "tabular-nums" }}>
      {sign}{formatCurrency(gain)} ({sign}{(pct * 100).toFixed(1)}%)
    </td>
  );
}

function HoldingRow({ group }: { group: GroupedHolding }) {
  const [open, setOpen] = useState(false);
  const deleteMut = useDeleteHolding();

  const { stock, total_shares, avg_cost, total_cost, market_value, dividends_received, lots } = group;
  const mktVal = market_value ?? 0;
  const unrealised = mktVal - total_cost;
  const unrealisedPct = total_cost > 0 ? unrealised / total_cost : 0;
  const annDiv = stock.annual_dividend_rate ? stock.annual_dividend_rate * total_shares : 0;
  const yieldOnCost = total_cost > 0 && annDiv > 0 ? annDiv / total_cost : null;
  const realisedPct = total_cost > 0 ? dividends_received / total_cost : 0;

  return (
    <>
      <tr className="cursor-pointer transition-colors" onClick={() => setOpen(!open)} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-alt)")} onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
        <td className="px-3 py-2.5 w-7">
          <ChevronRight size={14} className={cn("transition-transform", open && "rotate-90")} style={{ color: "var(--text-3)" }} />
        </td>
        <td className="px-3 py-2.5">
          <Link to={`/stock/${stock.ticker}`} onClick={(e) => e.stopPropagation()} className="font-bold text-[13px]" style={{ color: "var(--accent)" }}>
            {stock.ticker}
          </Link>
        </td>
        <td className="px-3 py-2.5">{stock.name}</td>
        <td className="px-3 py-2.5 text-right">{total_shares.toLocaleString()}</td>
        <td className="px-3 py-2.5 text-right">{formatCurrency(avg_cost)}</td>
        <td className="px-3 py-2.5 text-right">{formatCurrency(stock.last_price)}</td>
        <td className="px-3 py-2.5 text-right">{formatCurrency(mktVal)}</td>
        <td className="px-3 py-2.5 text-right" style={{ color: "var(--dvd)" }}>{yieldOnCost ? formatPercent(yieldOnCost) : "—"}</td>
        <td className="px-3 py-2.5 text-right" style={{ color: "var(--dvd)" }}>{formatCurrency(annDiv)}</td>
        <td className="px-3 py-2.5 text-right" style={{ color: "var(--text-3)" }}>—</td>
        <GainCell gain={unrealised} pct={unrealisedPct} />
        <GainCell gain={dividends_received} pct={realisedPct} />
      </tr>
      {open && lots.map((lot) => {
        const lotCost = lot.shares * lot.cost_per_share;
        const lotVal = stock.last_price ? stock.last_price * lot.shares : 0;
        const lotGain = lotVal - lotCost;
        const lotPct = lotCost > 0 ? lotGain / lotCost : 0;
        const lotRealisedPct = lotCost > 0 ? lot.dividends_received / lotCost : 0;
        return (
          <tr key={lot.id} style={{ background: "var(--surface-alt)", fontSize: "12.5px", color: "var(--text-2)" }}>
            <td className="pl-9 pr-3 py-2"></td>
            <td className="px-3 py-2" colSpan={2}>
              <div className="flex items-center gap-2">
                <span>
                  {new Date(lot.purchase_date).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })}
                  {lot.notes && <span className="block text-[10.5px] italic" style={{ color: "var(--text-3)" }}>{lot.notes}</span>}
                </span>
                <button onClick={() => deleteMut.mutate(lot.id)} className="p-1 rounded hover:bg-[var(--neg-s)] ml-auto shrink-0" style={{ color: "var(--neg)" }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </td>
            <td className="px-3 py-2 text-right">{lot.shares.toLocaleString()}</td>
            <td className="px-3 py-2 text-right">{formatCurrency(lot.cost_per_share)}</td>
            <td className="px-3 py-2 text-right">{formatCurrency(stock.last_price)}</td>
            <td className="px-3 py-2 text-right">{formatCurrency(lotVal)}</td>
            <td className="px-3 py-2 text-right">—</td>
            <td className="px-3 py-2 text-right">—</td>
            <td className="px-3 py-2 text-right" style={{ color: "var(--text-3)" }}>—</td>
            <GainCell gain={lotGain} pct={lotPct} />
            <GainCell gain={lot.dividends_received} pct={lotRealisedPct} />
          </tr>
        );
      })}
    </>
  );
}

function AddTickerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [selectedTicker, setSelectedTicker] = useState("");
  const [shares, setShares] = useState("");
  const [costPerShare, setCostPerShare] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: results = [] } = useStockSearch(search);
  const addMut = useAddHolding();

  if (!open) return null;

  function handleSubmit() {
    if (!selectedTicker || !shares || !costPerShare || !purchaseDate) return;
    addMut.mutate(
      { ticker: selectedTicker, shares: Number(shares), cost_per_share: Number(costPerShare), purchase_date: purchaseDate, notes: notes || undefined },
      { onSuccess: () => { onClose(); setSearch(""); setSelectedTicker(""); setShares(""); setCostPerShare(""); setPurchaseDate(""); setNotes(""); } },
    );
  }

  const inputStyle = { background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="rounded-[14px] p-7 w-[420px] max-w-[90vw]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-[18px] font-bold mb-4">Add Ticker</h2>

        <div className="mb-3.5">
          <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-2)" }}>Search stock</label>
          <input type="text" placeholder="Type ticker or company name..." value={selectedTicker || search} onChange={(e) => { setSearch(e.target.value); setSelectedTicker(""); }} className="w-full py-2.5 px-3 rounded-lg text-[13.5px] outline-none" style={inputStyle} />
          {search && !selectedTicker && results.length > 0 && (
            <div className="mt-1 rounded-lg overflow-hidden max-h-[160px] overflow-y-auto" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}>
              {results.slice(0, 8).map((s) => (
                <button key={s.id} className="w-full text-left px-3 py-2 text-[13px] hover:bg-[var(--accent-s)] flex justify-between" onClick={() => { setSelectedTicker(s.ticker); setSearch(""); }}>
                  <span><span className="font-bold" style={{ color: "var(--accent)" }}>{s.ticker}</span> {s.name}</span>
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
            <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-2)" }}>Cost / share (SGD)</label>
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
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] font-semibold" style={{ background: "var(--accent-s)", color: "var(--accent)" }}>Cancel</button>
          <button onClick={handleSubmit} disabled={addMut.isPending || !selectedTicker} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50" style={{ background: "var(--accent)" }}>
            {addMut.isPending ? "Adding..." : "Add to Portfolio"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function HoldingsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: holdings = [], isLoading } = useHoldings();

  const totals = holdings.reduce(
    (acc, g) => {
      acc.value += g.market_value ?? 0;
      acc.cost += g.total_cost;
      acc.annDiv += g.stock.annual_dividend_rate ? g.stock.annual_dividend_rate * g.total_shares : 0;
      acc.divsReceived += g.dividends_received;
      return acc;
    },
    { value: 0, cost: 0, annDiv: 0, divsReceived: 0 },
  );
  const totalGain = totals.value - totals.cost;
  const totalGainPct = totals.cost > 0 ? totalGain / totals.cost : 0;
  const totalYield = totals.value > 0 ? totals.annDiv / totals.value : 0;
  const totalRealisedPct = totals.cost > 0 ? totals.divsReceived / totals.cost : 0;

  const headers = ["", "Symbol", "Name", "Shares", "Avg Cost", "Price", "Mkt Value", "Yield", "Fwd Ann. Div", "Day Gain", "Unrealised", "Realised"];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-[22px] font-bold tracking-tight">Holdings</h1>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white" style={{ background: "var(--accent)" }}>
          <Plus size={16} /> Add Ticker
        </button>
      </div>

      <div className="rounded-[10px] overflow-x-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <table className="w-full border-collapse" style={{ fontVariantNumeric: "tabular-nums", fontSize: "13px" }}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className={`text-left px-3 py-3 font-semibold uppercase tracking-wide whitespace-nowrap ${i >= 3 ? "text-right" : ""} ${i === 0 ? "w-7" : ""}`} style={{ fontSize: "10.5px", color: "var(--text-3)", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={12} className="px-3 py-8 text-center" style={{ color: "var(--text-3)" }}>Loading...</td></tr>
            ) : holdings.length === 0 ? (
              <tr><td colSpan={12} className="px-3 py-8 text-center" style={{ color: "var(--text-3)" }}>No holdings yet. Click "Add Ticker" to get started.</td></tr>
            ) : (
              holdings.map((g) => <HoldingRow key={g.stock.id} group={g} />)
            )}
          </tbody>
          {holdings.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--border)", fontWeight: 700 }}>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3" colSpan={2}>Total ({holdings.length} stocks)</td>
                <td className="px-3 py-3 text-right"></td>
                <td className="px-3 py-3 text-right"></td>
                <td className="px-3 py-3 text-right"></td>
                <td className="px-3 py-3 text-right">{formatCurrency(totals.value)}</td>
                <td className="px-3 py-3 text-right" style={{ color: "var(--dvd)" }}>{formatPercent(totalYield)}</td>
                <td className="px-3 py-3 text-right" style={{ color: "var(--dvd)" }}>{formatCurrency(totals.annDiv)}</td>
                <td className="px-3 py-3 text-right" style={{ color: "var(--text-3)" }}>—</td>
                <GainCell gain={totalGain} pct={totalGainPct} />
                <GainCell gain={totals.divsReceived} pct={totalRealisedPct} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <AddTickerModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
