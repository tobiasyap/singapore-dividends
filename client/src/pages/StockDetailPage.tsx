import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, ComposedChart, Bar, Line } from "recharts";
import { useStock, useStockDividends, useStockPrices } from "../hooks/useStocks";
import { formatCurrency, formatPercent, formatCompact, formatDate, formatDividendAmount } from "../lib/utils";

const PERIODS = ["1m", "3m", "1y", "5y", "10y", "max"] as const;

function formatChartDate(dateStr: string, period: string): string {
  const d = new Date(dateStr);
  if (period === "1m") {
    return d.toLocaleDateString("en-SG", { day: "numeric", month: "short" });
  }
  if (period === "3m" || period === "6m" || period === "1y") {
    return d.toLocaleDateString("en-SG", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("en-SG", { month: "short", year: "numeric" });
}

function getTickInterval(period: string, dataLength: number): number {
  if (period === "1m") return Math.max(1, Math.floor(dataLength / 10));
  if (period === "3m") return Math.max(1, Math.floor(dataLength / 6));
  if (period === "1y") return Math.max(1, Math.floor(dataLength / 8));
  if (period === "5y") return Math.max(1, Math.floor(dataLength / 10));
  return Math.max(1, Math.floor(dataLength / 10));
}

export function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const [period, setPeriod] = useState<string>("1y");

  const { data: stock, isLoading } = useStock(ticker || "");
  const { data: dividends = [] } = useStockDividends(ticker || "");
  const { data: prices = [] } = useStockPrices(ticker || "", period);
  const { data: allPrices = [] } = useStockPrices(ticker || "", "10y");

  if (isLoading || !stock) {
    return <p style={{ color: "var(--text-3)" }}>Loading...</p>;
  }

  const metrics = [
    { label: "Forward Yield", value: formatPercent(stock.forward_dividend_yield), color: "var(--dvd)" },
    { label: "TTM Yield", value: formatPercent(stock.ttm_dividend_yield), color: "var(--dvd)" },
    { label: "5Y Avg Yield", value: formatPercent(stock.five_year_avg_yield), color: "var(--dvd)" },
    { label: "Dividend/Share", value: stock.annual_dividend_rate ? formatDividendAmount(stock.annual_dividend_rate) : "—" },
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
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-3)" }} tickFormatter={(v) => formatChartDate(v, period)} interval={getTickInterval(period, prices.length)} />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} domain={["auto", "auto"]} tickFormatter={(v) => `$${v}`} width={50} />
            <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => [formatCurrency(Number(v)), "Price"]} labelFormatter={(l) => formatDate(String(l))} />
            <Area type="monotone" dataKey="close_price" stroke="var(--accent)" strokeWidth={2} fill="url(#priceGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Annual Dividend Per Share + Yield combo chart */}
      {dividends.length > 0 && (() => {
        const byYear: Record<string, number> = {};
        for (const d of dividends) {
          const year = new Date(d.ex_date).getFullYear().toString();
          byYear[year] = (byYear[year] || 0) + d.amount_per_share;
        }

        const yearEndPrices: Record<string, number> = {};
        for (const p of allPrices) {
          const year = new Date(p.date).getFullYear().toString();
          yearEndPrices[year] = p.close_price;
        }

        const currentYear = new Date().getFullYear().toString();
        const chartData = Object.entries(byYear)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-8)
          .map(([year, total]) => {
            const endPrice = yearEndPrices[year];
            const yieldPct = endPrice && endPrice > 0 ? (total / endPrice) * 100 : null;
            return { year, dps: total, yieldPct };
          });

        return (
          <div className="rounded-[10px] p-5 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-start gap-1.5">
                <div>
                  <div className="text-[13px] font-semibold mb-1">Dividends Per Share</div>
                  <div className="text-[11.5px]" style={{ color: "var(--text-3)" }}>
                    Annual · {currentYear} is year-to-date
                  </div>
                </div>
                <div className="relative group">
                  <Info size={14} className="mt-0.5 cursor-help" style={{ color: "var(--text-3)" }} />
                  <div className="absolute left-1/2 -translate-x-1/2 top-6 z-10 w-[280px] p-3 rounded-lg text-[11.5px] leading-relaxed hidden group-hover:block shadow-lg" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
                    <div className="font-semibold mb-1.5" style={{ color: "var(--text)" }}>How these are calculated</div>
                    <p className="mb-1.5"><strong style={{ color: "var(--dvd)" }}>Div/Share</strong> = Sum of all dividends paid in that calendar year (by ex-date)</p>
                    <p><strong style={{ color: "var(--accent)" }}>Dividend Yield</strong> = Dividends Per Share ÷ Closing Price on Last Trading Day of Year × 100</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 text-[10.5px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--dvd)" }} />
                  <span style={{ color: "var(--text-3)" }}>Div/Share (SGD)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 rounded" style={{ background: "var(--accent)" }} />
                  <span style={{ color: "var(--text-3)" }}>Dividend Yield</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={chartData} barSize={28}>
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: "var(--text-3)" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "var(--text-3)" }} tickFormatter={(v) => `$${v}`} width={40} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "var(--text-3)" }} tickFormatter={(v) => `${v}%`} width={40} />
                <Tooltip
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v, name) => {
                    if (name === "dps") return [formatDividendAmount(Number(v)), "Div/Share"];
                    return [`${Number(v).toFixed(2)}%`, "Yield"];
                  }}
                />
                <Bar yAxisId="left" dataKey="dps" radius={[4, 4, 0, 0]} fill="var(--dvd)" />
                <Line yAxisId="right" dataKey="yieldPct" type="monotone" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3, fill: "var(--accent)" }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

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
                <td className="px-4 py-2.5 text-right font-semibold" style={{ color: "var(--dvd)" }}>{formatDividendAmount(d.amount_per_share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
