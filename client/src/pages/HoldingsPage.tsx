import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Pencil, Check, Trash2 } from "lucide-react";
import { useHoldings, useAddHolding, useUpdateHolding, useDeleteHolding, type GroupedHolding } from "../hooks/useHoldings";
import { formatCurrency, formatCurrencyWhole, formatPercent, cn } from "../lib/utils";
import { Sparkline } from "../components/Sparkline";
import { TickerAvatar } from "../components/TickerAvatar";

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
      <td className="px-3 py-2"></td>
      <td className="px-3 py-2 text-right">{formatCurrency(lotVal)}</td>
      <td className="px-3 py-2 text-right">{lotFwdYield ? formatPercent(lotFwdYield) : "—"}</td>
      <td className="px-3 py-2 text-right">{lotYOC ? formatPercent(lotYOC) : "—"}</td>
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
          <div className="flex items-center gap-2.5">
            <TickerAvatar ticker={stock.ticker} />
            <Link to={`/stock/${stock.ticker}`} onClick={(e) => e.stopPropagation()} className="font-bold text-[13px]" style={{ color: "var(--accent)" }}>
              {stock.ticker}
            </Link>
          </div>
        </td>
        <td className="px-3 py-2.5">{stock.name}</td>
        <td className="px-3 py-2.5 text-right">{total_shares.toLocaleString()}</td>
        <td className="px-3 py-2.5 text-right">{formatCurrency(avg_cost)}</td>
        <td className="px-3 py-2.5 text-right">{formatCurrency(stock.last_price)}</td>
        <td className="px-3 py-2.5"><Sparkline values={group.sparkline} /></td>
        <td className="px-3 py-2.5 text-right">{formatCurrency(mktVal)}</td>
        <td className="px-3 py-2.5 text-right">{fwdYield ? formatPercent(fwdYield) : "—"}</td>
        <td className="px-3 py-2.5 text-right">{yieldOnCost ? formatPercent(yieldOnCost) : "—"}</td>
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
      <td colSpan={8} className="px-3 py-2">
        <button onClick={onClose} className="text-[11px]" style={{ color: "var(--text-3)" }}>Cancel</button>
      </td>
    </tr>
  );
}

const HEADERS = ["", "Symbol", "Name", "Shares", "Avg Cost", "Price", "Trend", "Mkt Value", "Fwd Yield", "Yield on Cost", "Fwd Div/Yr", "Unrealised Gain", "Divs Earned"];

export function HoldingsPage() {
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
      <h1 className="text-[22px] font-bold tracking-tight mb-1.5">Holdings</h1>
      <p className="text-[11.5px] mb-6" style={{ color: "var(--text-3)" }}>
        All values in SGD. Foreign-currency holdings are converted at today's rate.
      </p>

      {holdings.length > 0 && (
        <div className="flex items-center flex-wrap gap-x-8 gap-y-3 mb-8">
          <div className="flex items-baseline gap-3 pr-8" style={{ borderRight: "1px solid var(--border-s)" }}>
            <div className="text-[28px] font-bold tabular-nums" style={{ fontFamily: "var(--font-display)" }}>{formatCurrencyWhole(totals.value)}</div>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-bold whitespace-nowrap"
              style={{ background: totalGain >= 0 ? "var(--pos-s)" : "var(--neg-s)", color: totalGain >= 0 ? "var(--pos)" : "var(--neg)" }}
            >
              {totalGain >= 0 ? "▲" : "▼"} {formatCurrencyWhole(Math.abs(totalGain))} ({(totalGainPct * 100).toFixed(1)}%)
            </span>
          </div>
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-3)" }}>Total Cost</div>
            <div className="text-[15px] font-bold tabular-nums" style={{ fontFamily: "var(--font-display)" }}>{formatCurrencyWhole(totals.cost)}</div>
          </div>
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-3)" }}>Fwd Yield</div>
            <div className="text-[15px] font-bold tabular-nums" style={{ fontFamily: "var(--font-display)" }}>{formatPercent(totalFwdYield)}</div>
          </div>
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-3)" }}>Yield on Cost</div>
            <div className="text-[15px] font-bold tabular-nums" style={{ fontFamily: "var(--font-display)" }}>{formatPercent(totalYieldOnCost)}</div>
          </div>
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-3)" }}>Next 12M Income</div>
            <div className="text-[15px] font-bold tabular-nums" style={{ color: "var(--dvd)", fontFamily: "var(--font-display)" }}>{formatCurrencyWhole(totals.annDiv)}</div>
          </div>
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-3)" }}>Divs Received</div>
            <div className="text-[15px] font-bold tabular-nums" style={{ color: "var(--dvd)", fontFamily: "var(--font-display)" }}>{formatCurrencyWhole(totals.divsReceived)}</div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ fontVariantNumeric: "tabular-nums", fontSize: "13px" }}>
          <thead>
            <tr>
              {HEADERS.map((h, i) => (
                <th key={i} className={`text-left px-3 py-3 font-semibold uppercase tracking-wide whitespace-nowrap ${i >= 3 && h !== "Trend" ? "text-right" : ""} ${i === 0 ? "w-7" : ""}`} style={{ fontSize: "10.5px", color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={HEADERS.length} className="px-3 py-8 text-center" style={{ color: "var(--text-3)" }}>Loading...</td></tr>
            ) : holdings.length === 0 ? (
              <tr><td colSpan={HEADERS.length} className="px-3 py-8 text-center" style={{ color: "var(--text-3)" }}>No holdings yet. Click "Add Holding" up top to get started.</td></tr>
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
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3 text-right">{formatCurrency(totals.value)}</td>
                <td className="px-3 py-3 text-right">{formatPercent(totalFwdYield)}</td>
                <td className="px-3 py-3 text-right">{formatPercent(totalYieldOnCost)}</td>
                <td className="px-3 py-3 text-right" style={{ color: "var(--dvd)" }}>{formatCurrency(totals.annDiv)}</td>
                <GainCell gain={totalGain} pct={totalGainPct} />
                <DivEarnedCell amount={totals.divsReceived} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
