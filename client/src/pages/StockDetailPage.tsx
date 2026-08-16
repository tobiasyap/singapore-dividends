import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useStock, useStockDividends, useStockPrices } from "../hooks/useStocks";
import { formatCurrency, formatPercent, formatCompact, formatDate } from "../lib/utils";

const PERIODS = ["1m", "3m", "1y", "5y", "10y", "max"] as const;

export function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const [period, setPeriod] = useState<string>("1y");

  const { data: stock, isLoading } = useStock(ticker || "");
  const { data: dividends = [] } = useStockDividends(ticker || "");
  const { data: prices = [] } = useStockPrices(ticker || "", period);

  if (isLoading || !stock) {
    return <p style={{ color: "var(--text-3)" }}>Loading...</p>;
  }

  const metrics = [
    { label: "Forward Yield", value: formatPercent(stock.forward_dividend_yield), color: "var(--dvd)" },
    { label: "TTM Yield", value: formatPercent(stock.ttm_dividend_yield), color: "var(--dvd)" },
    { label: "5Y Avg Yield", value: formatPercent(stock.five_year_avg_yield) },
    { label: "Annual Dividend", value: stock.annual_dividend_rate ? formatCurrency(stock.annual_dividend_rate) : "—" },
    { label: "Payout Ratio", value: stock.payout_ratio ? `${(stock.payout_ratio * 100).toFixed(1)}%` : "—" },
    { label: "Frequency", value: stock.dividend_frequency || "—", small: true },
    { label: "Market Cap", value: formatCompact(stock.market_cap), small: true },
    { label: "P/E Ratio", value: stock.pe_ratio ? stock.pe_ratio.toFixed(1) : "—" },
  ];

  return (
    <div>
      <Link to="/stocks" className="inline-flex items-center gap-1 text-[12px] font-semibold mb-2 px-2.5 py-1 rounded-lg" style={{ background: "var(--accent-s)", color: "var(--accent)" }}>
        <ArrowLeft size={14} /> Back to Browse
      </Link>

      <div className="flex items-start justify-between gap-5 mb-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight flex items-center gap-2.5">
            {stock.name} <span className="text-[14px] font-medium" style={{ color: "var(--text-2)" }}>{stock.ticker}</span>
          </h1>
          <div className="mt-1">
            <span className="text-[30px] font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>{formatCurrency(stock.last_price)}</span>
          </div>
          <p className="text-[12px] mt-1" style={{ color: "var(--text-3)" }}>
            {stock.sector} · {stock.industry} · SGX
          </p>
        </div>
        <button className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white" style={{ background: "var(--accent)" }}>
          + Add to Portfolio
        </button>
      </div>

      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
        {metrics.map((m) => (
          <div key={m.label} className="rounded-[10px] px-4 py-3.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-3)" }}>{m.label}</div>
            <div className={`font-bold ${m.small ? "text-[15px]" : "text-[18px]"}`} style={{ fontVariantNumeric: "tabular-nums", color: m.color }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[10px] p-5 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="text-[13px] font-semibold mb-1">Price History</div>
        <div className="flex gap-0.5 mb-4">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-2.5 py-1 rounded-md text-[11.5px] font-semibold"
              style={{ background: p === period ? "var(--accent-s)" : "transparent", color: p === period ? "var(--accent)" : "var(--text-3)" }}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={prices}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-3)" }} tickFormatter={(v) => new Date(v).toLocaleDateString("en-SG", { month: "short" })} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} domain={["auto", "auto"]} tickFormatter={(v) => `$${v}`} width={50} />
            <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => [formatCurrency(Number(v)), "Price"]} labelFormatter={(l) => formatDate(String(l))} />
            <Area type="monotone" dataKey="close_price" stroke="var(--accent)" strokeWidth={2} fill="url(#priceGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {stock.description && (
        <div className="rounded-[10px] p-5 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="text-[13px] font-semibold mb-2">About {stock.name}</div>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>{stock.description}</p>
          {(stock.website || stock.address) && (
            <p className="text-[12px] mt-2" style={{ color: "var(--text-3)" }}>
              {stock.website && <a href={stock.website} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>{stock.website}</a>}
              {stock.website && stock.address && " · "}
              {stock.address}
            </p>
          )}
        </div>
      )}

      <div className="rounded-[10px] overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="text-[13px] font-semibold">Dividend History</div>
          <div className="text-[11.5px]" style={{ color: "var(--text-3)" }}>{dividends.length} payouts</div>
        </div>
        <table className="w-full border-collapse" style={{ fontVariantNumeric: "tabular-nums", fontSize: "12.5px" }}>
          <thead>
            <tr>
              {["Ex-Date", "Pay Date", "Amount/Share"].map((h, i) => (
                <th key={h} className={`text-left px-4 py-2.5 font-semibold uppercase tracking-wide ${i === 2 ? "text-right" : ""}`} style={{ fontSize: "10.5px", color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dividends.slice(0, 20).map((d) => (
              <tr key={d.id} style={{ borderBottom: "1px solid var(--border-s)" }}>
                <td className="px-4 py-2.5">{formatDate(d.ex_date)}</td>
                <td className="px-4 py-2.5">{d.pay_date ? formatDate(d.pay_date) : "—"}</td>
                <td className="px-4 py-2.5 text-right font-semibold" style={{ color: "var(--dvd)" }}>{formatCurrency(d.amount_per_share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
