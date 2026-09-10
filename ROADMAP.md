# Roadmap / TODO

Task tracking for Singapore Dividends. Sits alongside DEVLOG.md (which is the
"why / how it works" record). Check items off as they land; keep the phase
summary at the bottom current.

Status key: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` dropped

---

## Now — blocking

- [~] **Login broken.** Google OAuth popup step fails (backend `/google-token`,
      DB, JWT all verified working; ~1 real account already exists). Need the
      console error + confirm the OAuth client's Authorized JavaScript origins
      include `http://localhost:5173`. Portfolio features (Dashboard, Holdings,
      add-ticker) are unusable until this is fixed.

## Next — high value

- [ ] **Multi-currency support.** Needed to bring back the USD-denominated names
      excluded from the seed: Hongkong Land (H78), Jardine Matheson (J36), DFI
      Retail (D01), Hutchison Port Holdings Trust (NS8U), plus the US/UK/EU REITs
      (Prime US, KORE US, United Hampshire, Elite UK, NTT DC, Digital Core,
      Acrophyte, Stoneweg Europe).
      - `ingest_stock` already stores the real `currency` from Yahoo.
      - Need: currency-aware `formatCurrency` / `formatCompact` /
        `formatDividendAmount` (show US$/£/€), a currency badge on the stock page,
        and a decision on portfolio aggregation (block mixed-currency, or add FX).
      - Then add those ~12 tickers to `seed_stocks.py` and re-seed.
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
| — | Housekeeping: `dev.ps1`, off-peak cron | #8 |

**Current phase:** post-Phase-3 — fixing login, then multi-currency.
