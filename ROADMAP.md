# Roadmap / TODO

Task tracking for Singapore Dividends. Sits alongside DEVLOG.md (which is the
"why / how it works" record). Check items off as they land; keep the phase
summary at the bottom current.

Status key: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` dropped

---

## Done

- [x] ~~Login broken~~ — resolved (was transient / OAuth origin).
- [x] **Multi-currency (Phase 4).** `fx_rates` table + `services/fx.py` (spot
      USD/GBP/EUR→SGD from Yahoo, refreshed nightly). Stock/Browse views show
      native currency + a badge; Holdings/Dashboard/portfolio convert to SGD at
      spot with a note. Added the 12 excluded tickers — DB now 108 stocks
      (96 SGD, 10 USD, 1 GBP, 1 EUR). Verified end to end.
      - Known approximation: portfolio *history* chart uses today's rate for all
        past dates (true historical FX is a later refinement).
      - Minor: chart Y-axis ticks still show a bare `$` for non-SGD stocks.

## Next — high value

- [ ] **Replace the placeholder `JWT_SECRET`.** `server/.env` has
      `change-me-to...`. Generate a real one:
      `python -c "import secrets; print(secrets.token_hex(32))"`. (Invalidates
      the existing session — a re-login.)
- [ ] **Dashboard charts** — apply the same first-paint fix as the stock page
      (gate on data + fixed-height wrapper + `debounce`). Portfolio value chart,
      sector donut, monthly dividend bar chart.
- [ ] **Special vs regular dividends.** Yahoo `events=div` lumps them, so a year
      with a special (e.g. DBS 2023) shows an inflated bar in the annual DPS
      chart. Tag specials (size vs trailing median?) and either flag or exclude
      them from the "forward" calc.
- [ ] **Historical FX** for the portfolio value chart (daily USDSGD/GBPSGD/EURSGD
      series instead of today's spot for all history).

## Later — polish

- [ ] `add_holding` — the light fix is in (returns in ~3s, `BackgroundTask`
      backfills prices). Could go further: return `202` + a "pending" state in
      the UI + polling, and make it fully non-blocking under load.
- [ ] Landing page polish.
- [ ] Mobile responsiveness pass.
- [ ] `useGoogleLogin` implicit flow → authorization-code flow (more secure).
- [ ] `website` / `address` null for REITs — BeanSprout doesn't carry it. Skip,
      or a small hardcoded map (only if it's worth it — no fabricated data).

## Deployment — not started

- [ ] Frontend → Vercel, backend → Render (per original plan). Env vars, CORS
      origins, the OAuth client's production origins, and switch the refresh
      job's `DATABASE_URL` handling if moving to a gated endpoint.

## Watch / verify

- [ ] **First Sunday full-refresh** hasn't run yet — confirm it completes
      (~10 min, all 96 stocks, profile + dividends + prices).
- [x] Weekday prices-only refresh — verified (run #5, 96/96, ~4 min).
- [x] Cron moved to off-peak `:17` (top of hour was ~4h late).

---

## Phases (all merged to `main`)

| Phase | What | PRs |
|---|---|---|
| **1** | Unified data pipeline (`ingest.py`), Yahoo for prices+dividends, BeanSprout for profile, computed yields, full-precision storage, REIT payout nulled | #1, #2 |
| **2** | GitHub Actions refresh (`scripts/refresh.py`), 5-year avg yield, async scraper, non-blocking add-holding, chart first-paint fix | #3, #4, #5, #7 |
| **3** | 96-stock SGD dividend universe, currency capture, split refresh cadence | #6 |
| **4** | Multi-currency: `fx_rates` + spot conversion, native currency on stock views, SGD on aggregates, +12 foreign tickers (108 total) | — |
| — | Housekeeping: `dev.ps1`, off-peak cron, ROADMAP | #8, #9 |

**Current phase:** post-Phase-4 — Dashboard chart fix + JWT secret next.
