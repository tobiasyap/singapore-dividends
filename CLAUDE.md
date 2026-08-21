# Singapore Dividends

SG dividend stock portfolio tracker. React + FastAPI + Neon PostgreSQL.

## Run locally

```bash
# Backend (from server/)
.venv\Scripts\uvicorn app.main:app --reload --port 8000

# Frontend (from client/)
npx vite --port 5173

# Kill stale processes
Get-Process -Name "python*" | Stop-Process -Force
```

Python 3.12 venv at `server/.venv/`. Vite proxies `/api/*` to localhost:8000.

## Tech stack

- Frontend: React 19 + Vite + TypeScript + Tailwind v4 + Recharts + Zustand + TanStack Query
- Backend: FastAPI + async SQLAlchemy + Alembic
- DB: Neon PostgreSQL (ap-southeast-1)
- Auth: Google OAuth implicit flow (`useGoogleLogin` → `POST /api/auth/google-token`)

## Data sources

- **BeanSprout** (growbeansprout.com): Primary source for stock info + dividends. SvelteKit app — data is inline JS, not JSON. Extract with regex. REITs lack `sectorName` — detect via `realEstateInvestmentTrust` field.
- **Yahoo Chart API** (`query1.finance.yahoo.com/v8/finance/chart/`): Price history. Must send `Accept: application/json` header or you get 406.
- **yfinance**: Rate-limited from some networks. Use BeanSprout + Yahoo Chart API instead.
- Incremental price updates: `seed_prices.py` checks latest date in DB, only fetches the missing period.

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
