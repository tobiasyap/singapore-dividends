export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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
export function formatDividendAmount(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value === 0) return "$0.00";
  const abs = Math.abs(value);
  const dp = abs >= 1 ? 2 : abs >= 0.1 ? 3 : abs >= 0.01 ? 4 : abs >= 0.001 ? 5 : 6;
  const s = value.toFixed(dp).replace(/(\.\d\d\d*?)0+$/, "$1");
  return `$${s}`;
}

export function formatCompact(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return formatCurrency(value);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
