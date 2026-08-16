import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { usePortfolio, usePortfolioHistory, usePortfolioDividends } from "../hooks/usePortfolio";
import { formatCurrency, formatPercent } from "../lib/utils";

const CHART_COLORS = ["#4AADE5", "#6C7A8D", "#E5A84A", "#34C578", "#E55A5A", "#8B5CF6", "#F59E0B", "#EC4899"];
const PERIODS = ["1m", "3m", "6m", "1y", "all"] as const;

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-[10px] px-4 py-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-3)" }}>{label}</div>
      <div className="text-[24px] font-bold tracking-tight" style={{ fontVariantNumeric: "tabular-nums", color }}>{value}</div>
      {sub && <div className="text-[12px] font-medium mt-1" style={{ fontVariantNumeric: "tabular-nums", color: "var(--text-3)" }}>{sub}</div>}
    </div>
  );
}

export function DashboardPage() {
  const [period, setPeriod] = useState<string>("1y");
  const { data: portfolio, isLoading } = usePortfolio();
  const { data: history = [] } = usePortfolioHistory(period);
  const { data: monthlyDivs = [] } = usePortfolioDividends();

  if (isLoading || !portfolio) {
    return <p style={{ color: "var(--text-3)" }}>Loading...</p>;
  }

  const gainSign = portfolio.unrealised_gain >= 0 ? "+" : "";
  const totalDivsReceived = monthlyDivs.reduce((s, d) => s + d.amount, 0);

  return (
    <div>
      <h1 className="text-[22px] font-bold tracking-tight mb-6">Portfolio Overview</h1>

      <div className="grid gap-3.5 mb-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        <StatCard label="Total Value" value={formatCurrency(portfolio.total_value)} sub={`${gainSign}${formatCurrency(portfolio.unrealised_gain)} (${gainSign}${(portfolio.unrealised_gain_pct * 100).toFixed(1)}%)`} />
        <StatCard label="Total Cost" value={formatCurrency(portfolio.total_cost)} />
        <StatCard label="Forward Yield" value={portfolio.forward_yield ? formatPercent(portfolio.forward_yield) : "—"} color="var(--dvd)" />
        <StatCard label="Projected Annual Income" value={formatCurrency(portfolio.projected_annual_income)} sub={`~${formatCurrency(portfolio.projected_annual_income / 12)}/mo`} color="var(--dvd)" />
        <StatCard label="TTM Dividends Received" value={formatCurrency(totalDivsReceived)} />
      </div>

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "1fr 300px" }}>
        {/* Portfolio value chart */}
        <div className="rounded-[10px] p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="text-[13px] font-semibold mb-1">Portfolio Value</div>
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
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-3)" }} tickFormatter={(v) => new Date(v).toLocaleDateString("en-SG", { month: "short" })} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} domain={["auto", "auto"]} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={45} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => [formatCurrency(Number(v)), "Value"]} />
              <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} fill="url(#valGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sector donut */}
        <div className="rounded-[10px] p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="text-[13px] font-semibold mb-1">Sector Allocation</div>
          <div className="text-[11.5px] mb-4" style={{ color: "var(--text-3)" }}>By market value</div>
          {portfolio.sector_allocations.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={portfolio.sector_allocations} dataKey="value" nameKey="sector" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                    {portfolio.sector_allocations.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => [formatCurrency(Number(v)), "Value"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 mt-2">
                {portfolio.sector_allocations.map((s, i) => (
                  <div key={s.sector} className="flex items-center gap-2 text-[12.5px]">
                    <div className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="flex-1">{s.sector}</span>
                    <span className="font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>{s.percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--text-3)" }}>Add holdings to see sector breakdown</p>
          )}
        </div>
      </div>

      {/* Monthly dividend income */}
      <div className="rounded-[10px] p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="text-[13px] font-semibold mb-1">Monthly Dividend Income</div>
        <div className="text-[11.5px] mb-4" style={{ color: "var(--text-3)" }}>
          Last 12 months · Total received: {formatCurrency(totalDivsReceived)}
        </div>
        {monthlyDivs.length > 0 ? (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={monthlyDivs}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-3)" }} tickFormatter={(v) => new Date(v + "-01").toLocaleDateString("en-SG", { month: "short" })} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} tickFormatter={(v) => `$${v}`} width={40} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => [formatCurrency(Number(v)), "Dividends"]} />
              <Bar dataKey="amount" fill="var(--dvd)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[13px]" style={{ color: "var(--text-3)" }}>No dividend data yet</p>
        )}
      </div>
    </div>
  );
}
