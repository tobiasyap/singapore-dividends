const CURRENCY_SYMBOL: Record<string, string> = {
  SGD: "S$",
  USD: "US$",
  GBP: "£",
  EUR: "€",
};

function sym(currency: string): string {
  return CURRENCY_SYMBOL[currency] ?? `${currency} `;
}

export function formatCurrency(
  value: number | null | undefined,
  currency = "SGD",
  decimals = 2,
): string {
  if (value == null) return "—";
  return `${sym(currency)}${value.toLocaleString("en-SG", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Whole-dollar variant for portfolio-level aggregate figures (total value, total cost, etc.) -- industry convention is to drop cents at that scale and keep them only for per-unit prices. */
export function formatCurrencyWhole(
  value: number | null | undefined,
  currency = "SGD",
): string {
  return formatCurrency(value, currency, 0);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Per-share dividend amounts span a wide range — blue chips pay ~$0.80, some
 * REITs pay under $0.01 — so a fixed 2 dp would hide the small ones. Show more
 * decimals as the value gets smaller, trimming trailing zeros past 2 dp.
 */
export function formatDividendAmount(
  value: number | null | undefined,
  currency = "SGD",
): string {
  if (value == null) return "—";
  if (value === 0) return `${sym(currency)}0.00`;
  const abs = Math.abs(value);
  const dp = abs >= 1 ? 2 : abs >= 0.1 ? 3 : abs >= 0.01 ? 4 : abs >= 0.001 ? 5 : 6;
  const s = value.toFixed(dp).replace(/(\.\d\d\d*?)0+$/, "$1");
  return `${sym(currency)}${s}`;
}

export function formatCompact(
  value: number | null | undefined,
  currency = "SGD",
): string {
  if (value == null) return "—";
  const s = sym(currency);
  if (value >= 1e12) return `${s}${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `${s}${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${s}${(value / 1e6).toFixed(1)}M`;
  return formatCurrency(value, currency);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Chart axis label for a date, scaled to how wide a range `period` covers --
 * short ranges don't need a year, long ones do, or two Januaries a few ticks
 * apart are indistinguishable.
 */
export function formatChartDate(dateStr: string, period: string): string {
  const d = new Date(dateStr);
  if (period === "1m") {
    return d.toLocaleDateString("en-SG", { day: "numeric", month: "short" });
  }
  if (period === "3m" || period === "6m" || period === "1y") {
    return d.toLocaleDateString("en-SG", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("en-SG", { month: "short", year: "numeric" });
}

/** Recharts tick spacing that thins out to roughly one label per N points, so a long range doesn't cram in an unreadable label per data point. */
export function getTickInterval(period: string, dataLength: number): number {
  if (period === "1m") return Math.max(1, Math.floor(dataLength / 10));
  if (period === "3m") return Math.max(1, Math.floor(dataLength / 6));
  if (period === "1y") return Math.max(1, Math.floor(dataLength / 8));
  if (period === "5y") return Math.max(1, Math.floor(dataLength / 10));
  return Math.max(1, Math.floor(dataLength / 10));
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
