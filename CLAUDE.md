# Singapore Dividends

SG dividend stock portfolio tracker. React + FastAPI + Neon PostgreSQL.

## Run locally

```powershell
.\dev.ps1          # starts backend :8000 + frontend :5173, each in its own window
.\dev.ps1 -Stop    # stops both
```

Or manually:

```powershell
# Backend (from server/)
.\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
# Frontend (from client/)
npx vite --port 5173
```

Python 3.12 venv at `server/.venv/`. Vite proxies `/api/*` to localhost:8000.
If `python`/`node` aren't found, restart the terminal (winget installs need a fresh PATH).

## Tech stack

- Frontend: React 19 + Vite + TypeScript + Tailwind v4 + Recharts + Zustand + TanStack Query
- Backend: FastAPI + async SQLAlchemy + Alembic
- DB: Neon PostgreSQL (ap-southeast-1)
- Auth: Google OAuth implicit flow (`useGoogleLogin` → `POST /api/auth/google-token`)

## Data sources

One pipeline: `app/services/ingest.py`, entry point `ingest_stock()`. Used by the
seed scripts *and* the API add-ticker path. See DEVLOG.md for the full design.

- **Yahoo Chart API** (`query1.finance.yahoo.com/v8/finance/chart/`): prices AND
  dividends (`events=div`, `range=max`) AND `last_price` (latest close). Send
  `Accept: application/json` or you get 406.
- **BeanSprout** (growbeansprout.com): company profile only (name, sector, industry,
  description, website, market cap, PE, frequency). SvelteKit inline-JS, regex-extracted.
  Its scraped price/yield are unreliable (embedded peer table) — don't use them.
  REITs lack `sectorName` — detect via `realEstateInvestmentTrust`.
- **yfinance** (`app/services/yfinance_source.py`): optional fallback only, rate-limited.
- Yields/rates are **computed** from dividend history (`compute_dividend_metrics`), not scraped.
- Incremental price updates: `ingest.ingest_prices()` checks latest date in DB, fetches only the gap.

## Conventions

- Holdings use **lots** (not "purchases" or "transactions")
- **Fwd Yield** = forward dividend yield on current price
- **Yield on Cost** = forward dividend / purchase cost (per-lot metric)
- **Fwd Div/Yr** = forward annual dividend per share (industry standard, not TTM)
- **Divs Earned** = total dividends received (dollar amount, no percentage)
- TTM yield and payout ratio are computed on the fly from dividend history, not stored
- Combine $ and % in one cell for gain columns (e.g. "+$2,175 (+11.8%)")
- Stock detail pages are public (no auth). Portfolio features require login.
- Delete button only visible in edit mode.

## DB notes

- `market_cap` is BigInteger (int32 overflows for DBS)
- Bulk insert prices in batches of 500 (`upsert_prices`)
- Unique constraints: (stock_id, ex_date) for dividends, (stock_id, date) for prices

See DEVLOG.md for full project history and known issues.
