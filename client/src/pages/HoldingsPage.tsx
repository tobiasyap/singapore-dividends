import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Plus, Pencil, Check, Trash2 } from "lucide-react";
import { useHoldings, useAddHolding, useUpdateHolding, useDeleteHolding, type GroupedHolding } from "../hooks/useHoldings";
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

function DivEarnedCell({ amount }: { amount: number }) {
  return (
    <td className="px-3 py-2.5 text-right whitespace-nowrap" style={{ color: amount > 0 ? "var(--dvd)" : "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
      {amount > 0 ? formatCurrency(amount) : "—"}
    </td>
  );
}

function LotRow({ lot, stock }: {
  lot: { id: number; shares: number; cost_per_share: number; purchase_date: string; notes: string | null; dividends_received: number };
  stock: { last_price: number | null; ticker: string; annual_dividend_rate: number | null; forward_dividend_yield: number | null };
}) {
  const [editing, setEditing] = useState(false);
  const [shares, setShares] = useState(String(lot.shares));
  const [cost, setCost] = useState(String(lot.cost_per_share));
  const [date, setDate] = useState(lot.purchase_date);
  const [notes, setNotes] = useState(lot.notes || "");
  const updateMut = useUpdateHolding();
  const deleteMut = useDeleteHolding();

  const lotCost = lot.shares * lot.cost_per_share;
  const lotVal = stock.last_price ? stock.last_price * lot.shares : 0;
  const lotGain = lotVal - lotCost;
  const lotPct = lotCost > 0 ? lotGain / lotCost : 0;
  const lotFwdDiv = stock.annual_dividend_rate ? stock.annual_dividend_rate * lot.shares : 0;
  const lotFwdYield = stock.forward_dividend_yield;
  const lotYOC = lotCost > 0 && lotFwdDiv > 0 ? lotFwdDiv / lotCost : null;

  function handleConfirm() {
    updateMut.mutate(
      { id: lot.id, shares: Number(shares), cost_per_share: Number(cost), purchase_date: date, notes: notes || undefined },
      { onSuccess: () => setEditing(false), onError: () => setEditing(false) },
    );
  }

  function handleDelete() {
    deleteMut.mutate(lot.id);
  }

  const inputCls = "py-1 px-1.5 rounded text-[12px] outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const inputStyle = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" };

  return (
    <tr style={{ background: "var(--surface-alt)", fontSize: "12.5px", color: "var(--text-2)" }}>
      <td className="pl-9 pr-3 py-2"></td>
      <td className="px-3 py-2" colSpan={2}>
        <div className="flex items-start gap-2">
          {!editing ? (
            <>
              <button onClick={() => setEditing(true)} className="p-0.5 rounded hover:bg-[var(--accent-s)] shrink-0 mt-0.5" style={{ color: "var(--accent)" }}>
                <Pencil size={11} />
              </button>
              <div>
                {new Date(lot.purchase_date).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })}
                {lot.notes && <span className="block text-[10.5px] italic" style={{ color: "var(--text-3)" }}>{lot.notes}</span>}
              </div>
            </>
          ) : (
            <>
              <button onClick={handleConfirm} disabled={updateMut.isPending} className="p-0.5 rounded hover:bg-[var(--pos-s)] shrink-0 mt-0.5" style={{ color: "var(--pos)" }}>
                <Check size={12} />
              </button>
              <button onClick={handleDelete} className="p-0.5 rounded hover:bg-[var(--neg-s)] shrink-0 mt-0.5" style={{ color: "var(--neg)" }}>
                <Trash2 size={12} />
              </button>
              <div className="flex flex-col gap-1 flex-1">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} style={inputStyle} />
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." className={inputCls} style={inputStyle} />
              </div>
            </>
          )}
        </div>
      </td>
      {!editing ? (
        <>
          <td className="px-3 py-2 text-right">{lot.shares.toLocaleString()}</td>
          <td className="px-3 py-2 text-right">{formatCurrency(lot.cost_per_share)}</td>
        </>
      ) : (
        <>
          <td className="px-3 py-2 text-right"><input type="text" inputMode="numeric" value={shares} onChange={(e) => setShares(e.target.value)} className={`${inputCls} text-right`} style={{ ...inputStyle, width: 70 }} /></td>
          <td className="px-3 py-2 text-right"><input type="text" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} className={`${inputCls} text-right`} style={{ ...inputStyle, width: 80 }} /></td>
        </>
      )}
      <td className="px-3 py-2 text-right">{formatCurrency(stock.last_price)}</td>
      <td className="px-3 py-2 text-right">{formatCurrency(lotVal)}</td>
      <td className="px-3 py-2 text-right" style={{ color: "var(--dvd)" }}>{lotFwdYield ? formatPercent(lotFwdYield) : "—"}</td>
      <td className="px-3 py-2 text-right" style={{ color: "var(--dvd)" }}>{lotYOC ? formatPercent(lotYOC) : "—"}</td>
      <td className="px-3 py-2 text-right" style={{ color: "var(--dvd)" }}>{formatCurrency(lotFwdDiv)}</td>
      <GainCell gain={lotGain} pct={lotPct} />
      <DivEarnedCell amount={lot.dividends_received} />
    </tr>
  );
}

function HoldingRow({ group }: { group: GroupedHolding }) {
  const [open, setOpen] = useState(false);
  const [addLotOpen, setAddLotOpen] = useState(false);

  const { stock, total_shares, avg_cost, total_cost, market_value, dividends_received, lots } = group;
  const mktVal = market_value ?? 0;
  const unrealised = mktVal - total_cost;
  const unrealisedPct = total_cost > 0 ? unrealised / total_cost : 0;
  const annDiv = stock.annual_dividend_rate ? stock.annual_dividend_rate * total_shares : 0;
  const yieldOnCost = total_cost > 0 && annDiv > 0 ? annDiv / total_cost : null;
  const fwdYield = stock.forward_dividend_yield;

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
        <td className="px-3 py-2.5 text-right" style={{ color: "var(--dvd)" }}>{fwdYield ? formatPercent(fwdYield) : "—"}</td>
        <td className="px-3 py-2.5 text-right" style={{ color: "var(--dvd)" }}>{yieldOnCost ? formatPercent(yieldOnCost) : "—"}</td>
        <td className="px-3 py-2.5 text-right" style={{ color: "var(--dvd)" }}>{formatCurrency(annDiv)}</td>
        <GainCell gain={unrealised} pct={unrealisedPct} />
        <DivEarnedCell amount={dividends_received} />
      </tr>
      {open && (
        <>
          {lots.map((lot) => (
            <LotRow key={lot.id} lot={lot} stock={stock} />
          ))}
          <tr style={{ background: "var(--surface-alt)" }}>
            <td></td>
            <td colSpan={11} className="px-3 py-2">
              <button onClick={() => setAddLotOpen(true)} className="text-[11.5px] font-semibold hover:underline" style={{ color: "var(--accent)" }}>
                + Add lot for {stock.ticker}
              </button>
            </td>
          </tr>
          {addLotOpen && <AddLotInline ticker={stock.ticker} onClose={() => setAddLotOpen(false)} />}
        </>
      )}
    </>
  );
}

function AddLotInline({ ticker, onClose }: { ticker: string; onClose: () => void }) {
  const [shares, setShares] = useState("");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const addMut = useAddHolding();

  function handleSubmit() {
    if (!shares || !cost || !date) return;
    addMut.mutate(
      { ticker, shares: Number(shares), cost_per_share: Number(cost), purchase_date: date, notes: notes || undefined },
      { onSuccess: () => onClose() },
    );
  }

  const inputCls = "py-1.5 px-2 rounded text-[12px] outline-none";
  const inputStyle = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" };

  return (
    <tr style={{ background: "var(--surface-alt)", fontSize: "12.5px" }}>
      <td className="pl-9 pr-3 py-2"></td>
      <td className="px-3 py-2" colSpan={2}>
        <div className="flex items-center gap-2">
          <button onClick={handleSubmit} disabled={addMut.isPending || !shares || !cost || !date} className="p-0.5 rounded hover:bg-[var(--pos-s)] shrink-0 disabled:opacity-30" style={{ color: "var(--pos)" }}>
            <Check size={12} />
          </button>
          <div className="flex flex-col gap-1 flex-1">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} style={inputStyle} />
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." className={inputCls} style={inputStyle} />
          </div>
        </div>
      </td>
      <td className="px-3 py-2 text-right"><input type="number" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="Qty" className={`${inputCls} text-right w-16`} style={inputStyle} /></td>
      <td className="px-3 py-2 text-right"><input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Cost" className={`${inputCls} text-right w-20`} style={inputStyle} /></td>
      <td colSpan={7} className="px-3 py-2">
        <button onClick={onClose} className="text-[11px]" style={{ color: "var(--text-3)" }}>Cancel</button>
      </td>
    </tr>
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

const HEADERS = ["", "Symbol", "Name", "Shares", "Avg Cost", "Price", "Mkt Value", "Fwd Yield", "Yield on Cost", "Fwd Div/Yr", "Unrealised Gain", "Divs Earned"];

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
  const totalFwdYield = totals.value > 0 ? totals.annDiv / totals.value : 0;
  const totalYieldOnCost = totals.cost > 0 ? totals.annDiv / totals.cost : 0;

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
              {HEADERS.map((h, i) => (
                <th key={i} className={`text-left px-3 py-3 font-semibold uppercase tracking-wide whitespace-nowrap ${i >= 3 ? "text-right" : ""} ${i === 0 ? "w-7" : ""}`} style={{ fontSize: "10.5px", color: "var(--text-3)", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={HEADERS.length} className="px-3 py-8 text-center" style={{ color: "var(--text-3)" }}>Loading...</td></tr>
            ) : holdings.length === 0 ? (
              <tr><td colSpan={HEADERS.length} className="px-3 py-8 text-center" style={{ color: "var(--text-3)" }}>No holdings yet. Click "Add Ticker" to get started.</td></tr>
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
                <td className="px-3 py-3 text-right" style={{ color: "var(--dvd)" }}>{formatPercent(totalFwdYield)}</td>
                <td className="px-3 py-3 text-right" style={{ color: "var(--dvd)" }}>{formatPercent(totalYieldOnCost)}</td>
                <td className="px-3 py-3 text-right" style={{ color: "var(--dvd)" }}>{formatCurrency(totals.annDiv)}</td>
                <GainCell gain={totalGain} pct={totalGainPct} />
                <DivEarnedCell amount={totals.divsReceived} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <AddTickerModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
