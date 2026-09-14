const COLORS = ["var(--accent)", "var(--dvd)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--text-2)"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function TickerAvatar({ ticker, size = 28 }: { ticker: string; size?: number }) {
  const color = COLORS[hash(ticker) % COLORS.length];
  return (
    <div
      className="rounded-[8px] flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36, fontFamily: "var(--font-display)" }}
    >
      {ticker.slice(0, 2)}
    </div>
  );
}
