import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { usePortfolio, usePortfolioHistory, usePortfolioDividends } from "../hooks/usePortfolio";
import { useHoldings } from "../hooks/useHoldings";
import { formatCurrency, formatCurrencyWhole, formatPercent, formatChartDate, getTickInterval } from "../lib/utils";
import { TickerAvatar } from "../components/TickerAvatar";
import { Sparkline } from "../components/Sparkline";

const CAT_COLORS = ["var(--accent)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--cat-other)"];
const PERIODS = ["1m", "3m", "6m", "1y", "all"] as const;
const HOLDINGS_PREVIEW_COUNT = 6;

function dailyDelta(spark: number[] | null | undefined): number | null {
  if (!spark || spark.length < 2) return null;
  const prev = spark[spark.length - 2];
  if (!prev) return null;
  return (spark[spark.length - 1]! - prev) / prev;
}

export function DashboardPage() {
  const [period, setPeriod] = useState<string>("1y");
  const [breakdownTab, setBreakdownTab] = useState<"sector" | "currency">("sector");
  const { data: portfolio, isLoading } = usePortfolio();
  const { data: history = [] } = usePortfolioHistory(period);
  const { data: monthlyDivs = [] } = usePortfolioDividends();
  const { data: holdings = [] } = useHoldings();

  if (isLoading || !portfolio) {
    return <p style={{ color: "var(--text-3)" }}>Loading...</p>;
  }

  const totalDivsReceived = monthlyDivs.reduce((s, d) => s + d.amount, 0);

  const currencyTotals = new Map<string, number>();
  for (const h of holdings) {
    const ccy = h.stock.currency || "SGD";
    currencyTotals.set(ccy, (currencyTotals.get(ccy) || 0) + (h.market_value ?? 0));
  }
  const currencyTotal = Array.from(currencyTotals.values()).reduce((s, v) => s + v, 0);
  const currencyAllocations = Array.from(currencyTotals.entries())
    .map(([currency, value]) => ({ currency, value, percentage: currencyTotal > 0 ? (value / currencyTotal) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);

  const allocations = breakdownTab === "sector"
    ? portfolio.sector_allocations.map((s) => ({ label: s.sector, value: s.value, percentage: s.percentage }))
    : currencyAllocations.map((c) => ({ label: c.currency, value: c.value, percentage: c.percentage }));

  return (
    <div>
      <h1 className="text-[22px] font-bold tracking-tight mb-1.5">Portfolio Overview</h1>
      <p className="text-[11.5px] mb-6" style={{ color: "var(--text-3)" }}>
        All values in SGD. Foreign-currency holdings are converted at today's rate.
      </p>

      <div className="flex items-center flex-wrap gap-x-8 gap-y-3 pb-6 border-b" style={{ borderColor: "var(--grid)" }}>
        <div className="flex items-baseline gap-3 pr-8" style={{ borderRight: "1px solid var(--grid)" }}>
          <div className="text-[28px] font-bold tabular-nums" style={{ fontFamily: "var(--font-display)" }}>{formatCurrencyWhole(portfolio.total_value)}</div>
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-bold whitespace-nowrap"
            style={{ background: portfolio.unrealised_gain >= 0 ? "var(--pos-s)" : "var(--neg-s)", color: portfolio.unrealised_gain >= 0 ? "var(--pos)" : "var(--neg)" }}
          >
            {portfolio.unrealised_gain >= 0 ? "▲" : "▼"} {formatCurrencyWhole(Math.abs(portfolio.unrealised_gain))} ({(portfolio.unrealised_gain_pct * 100).toFixed(1)}%)
          </span>
        </div>
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-3)" }}>Total Cost</div>
          <div className="text-[15px] font-bold tabular-nums" style={{ fontFamily: "var(--font-display)" }}>{formatCurrencyWhole(portfolio.total_cost)}</div>
        </div>
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-3)" }}>Forward Yield</div>
          <div className="text-[15px] font-bold tabular-nums" style={{ fontFamily: "var(--font-display)" }}>{portfolio.forward_yield ? formatPercent(portfolio.forward_yield) : "—"}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-5 py-6 border-b" style={{ borderColor: "var(--grid)" }}>
        {/* Portfolio value chart */}
        <div>
          <div className="text-[14.5px] font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>Portfolio Value</div>
          <div className="flex gap-0.5 mb-4">
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className="px-2.5 py-1 rounded-md text-[11.5px] font-semibold" style={{ background: p === period ? "var(--accent-s)" : "transparent", color: p === period ? "var(--accent)" : "var(--text-3)" }}>
                {p.toUpperCase()}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-3)" }} tickFormatter={(v) => formatChartDate(v, period)} interval={getTickInterval(period, history.length)} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} domain={["auto", "auto"]} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={45} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => [formatCurrency(Number(v)), "Value"]} />
              <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} fill="url(#valGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly dividend income */}
        <div className="pt-6 border-t md:pt-0 md:pl-6 md:border-t-0 md:border-l" style={{ borderColor: "var(--grid)" }}>
          <div className="text-[14.5px] font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>Dividend Income</div>
          <div className="text-[11.5px] mb-4" style={{ color: "var(--text-3)" }}>
            Last 12 months
          </div>
          {monthlyDivs.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyDivs}>
                <XAxis dataKey="month" tick={{ fontSize: 9.5, fill: "var(--text-3)" }} tickFormatter={(v) => new Date(v + "-01").toLocaleDateString("en-SG", { month: "short" })} interval={0} />
                <YAxis tick={{ fontSize: 9.5, fill: "var(--text-3)" }} tickFormatter={(v) => `$${v}`} width={36} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => [formatCurrencyWhole(Number(v)), "Dividends"]} />
                <Bar dataKey="amount" fill="var(--dvd)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--text-3)" }}>No dividend data yet</p>
          )}
          <div className="text-[11.5px] mt-2" style={{ color: "var(--text-2)" }}>
            Total received <b style={{ color: "var(--dvd)" }}>{formatCurrencyWhole(totalDivsReceived)}</b>
          </div>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-x-8 gap-y-3 pt-6 pb-8 border-b" style={{ borderColor: "var(--grid)" }}>
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-3)" }}>Next 12M Income (estimated)</div>
          <div className="text-[22px] font-bold tabular-nums" style={{ color: "var(--dvd)", fontFamily: "var(--font-display)" }}>{formatCurrencyWhole(portfolio.projected_annual_income)}</div>
          <div className="text-[11.5px] mt-0.5" style={{ color: "var(--text-3)" }}>~{formatCurrencyWhole(portfolio.projected_annual_income / 12)}/mo</div>
        </div>
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-3)" }}>TTM Dividends Received</div>
          <div className="text-[15px] font-bold tabular-nums" style={{ color: "var(--dvd)", fontFamily: "var(--font-display)" }}>{formatCurrencyWhole(totalDivsReceived)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-8 pt-8">
        {/* Portfolio diversity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[14.5px] font-bold" style={{ fontFamily: "var(--font-display)" }}>Portfolio Diversity</div>
            <div className="flex gap-1">
              {(["sector", "currency"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setBreakdownTab(tab)}
                  className="px-3 py-1 rounded-md text-[11.5px] font-semibold capitalize"
                  style={{ background: breakdownTab === tab ? "var(--accent-s)" : "transparent", color: breakdownTab === tab ? "var(--accent)" : "var(--text-3)" }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          {allocations.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={allocations} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2}>
                    {allocations.map((_, i) => (
                      <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v, name) => [formatCurrencyWhole(Number(v)), name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 mt-3">
                {allocations.map((a, i) => (
                  <div key={a.label} className="flex items-center gap-2 text-[12.5px]">
                    <div className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                    <span className="flex-1">{a.label}</span>
                    <span className="font-semibold tabular-nums">{a.percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--text-3)" }}>Add holdings to see a breakdown</p>
          )}
        </div>

        {/* Holdings preview */}
        <div className="pt-6 border-t md:pt-0 md:pl-8 md:border-t-0 md:border-l" style={{ borderColor: "var(--grid)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[14.5px] font-bold" style={{ fontFamily: "var(--font-display)" }}>Holdings</div>
            {holdings.length > HOLDINGS_PREVIEW_COUNT && (
              <Link to="/holdings" className="text-[11.5px] font-semibold" style={{ color: "var(--accent)" }}>
                View all {holdings.length} →
              </Link>
            )}
          </div>
          {holdings.length > 0 ? (
            <div className="flex flex-col">
              {holdings.slice(0, HOLDINGS_PREVIEW_COUNT).map((h) => {
                const delta = dailyDelta(h.sparkline);
                const pos = (delta ?? 0) >= 0;
                return (
                  <Link
                    key={h.stock.id}
                    to={`/stock/${h.stock.ticker}`}
                    className="flex items-center gap-3 py-2.5"
                    style={{ borderBottom: "1px solid var(--border-s)" }}
                  >
                    <TickerAvatar ticker={h.stock.ticker} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[12.5px]" style={{ color: "var(--accent)" }}>{h.stock.ticker}</span>
                        {h.stock.currency !== "SGD" && (
                          <span className="text-[9px] font-bold px-1 rounded" style={{ border: "1px solid var(--border)", color: "var(--text-3)" }}>{h.stock.currency}</span>
                        )}
                      </div>
                      <div className="text-[11px] truncate" style={{ color: "var(--text-3)" }}>{h.stock.name}</div>
                    </div>
                    <Sparkline values={h.sparkline} width={56} height={22} />
                    <div className="text-[12.5px] font-semibold tabular-nums w-[70px] text-right">{formatCurrency(h.stock.last_price, h.stock.currency)}</div>
                    <div
                      className="text-[11.5px] font-bold tabular-nums w-[56px] text-right"
                      style={{ color: delta == null ? "var(--text-3)" : pos ? "var(--pos)" : "var(--neg)" }}
                    >
                      {delta == null ? "—" : `${pos ? "▲" : "▼"} ${Math.abs(delta * 100).toFixed(1)}%`}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--text-3)" }}>No holdings yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
