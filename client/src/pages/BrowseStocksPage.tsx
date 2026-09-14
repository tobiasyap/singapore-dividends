import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Plus } from "lucide-react";
import { useStockSearch } from "../hooks/useStocks";
import { formatCurrency, formatCompact, formatPercent } from "../lib/utils";
import { Sparkline } from "../components/Sparkline";
import { TickerAvatar } from "../components/TickerAvatar";
import { useUiStore } from "../stores/uiStore";

const SECTORS = ["All", "Financial Services", "Real Estate", "Communication Services", "Industrials", "Technology", "Consumer Cyclical", "Consumer Defensive", "Energy", "Utilities"];

export function BrowseStocksPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [sector, setSector] = useState<string>();

  const { data: stocks = [], isLoading } = useStockSearch(query, sector);
  const openAddHolding = useUiStore((s) => s.openAddHolding);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setQuery(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div>
      <h1 className="text-[22px] font-bold tracking-tight mb-6">Browse Stocks</h1>

      <div className="flex gap-3 mb-5 items-center flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
          <input
            type="text"
            placeholder="Search by ticker or company name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full py-2.5 px-3 pl-9 rounded-lg text-[13.5px] outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {SECTORS.map((s) => {
            const isActive = s === "All" ? !sector : sector === s;
            return (
              <button
                key={s}
                onClick={() => setSector(s === "All" ? undefined : s)}
                className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-colors"
                style={{
                  background: isActive ? "var(--accent-s)" : "var(--surface)",
                  color: isActive ? "var(--accent)" : "var(--text-2)",
                  border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[12px] mb-3" style={{ color: "var(--text-3)" }}>{stocks.length} stocks</p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ fontVariantNumeric: "tabular-nums", fontSize: "13px" }}>
          <thead>
            <tr>
              {["Stock", "Sector", "Price", "Trend", "Fwd Yield", "TTM Yield", "Mkt Cap", ""].map((h, i) => (
                <th
                  key={h || i}
                  className={`text-left px-3 py-3 font-semibold uppercase tracking-wide whitespace-nowrap ${i >= 2 && i <= 6 && h !== "Trend" ? "text-right" : ""}`}
                  style={{ fontSize: "10.5px", color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center" style={{ color: "var(--text-3)" }}>Loading...</td></tr>
            ) : stocks.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center" style={{ color: "var(--text-3)" }}>No stocks found</td></tr>
            ) : (
              stocks.map((s) => (
                <tr key={s.id} className="group cursor-pointer transition-colors" style={{ borderBottom: "1px solid var(--border-s)" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-alt)")} onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <TickerAvatar ticker={s.ticker} />
                      <div>
                        <Link to={`/stock/${s.ticker}`} className="font-bold text-[13px]" style={{ color: "var(--accent)" }}>{s.ticker}</Link>
                        <span className="block text-[11.5px]" style={{ color: "var(--text-2)" }}>{s.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {s.sector && (
                      <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap" style={{ border: "1px solid var(--border)", color: "var(--text-2)" }}>
                        {s.sector}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">{formatCurrency(s.last_price, s.currency)}</td>
                  <td className="px-3 py-2.5"><Sparkline values={s.sparkline} /></td>
                  <td className="px-3 py-2.5 text-right">{formatPercent(s.forward_dividend_yield)}</td>
                  <td className="px-3 py-2.5 text-right">{formatPercent(s.ttm_dividend_yield)}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">{formatCompact(s.market_cap, s.currency)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); openAddHolding(s.ticker); }}
                      className="w-7 h-7 rounded-lg border items-center justify-center hidden group-hover:inline-flex"
                      style={{ borderColor: "var(--border)", color: "var(--accent)" }}
                      title="Add to portfolio"
                    >
                      <Plus size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
