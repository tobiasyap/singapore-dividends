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
        past dates. Deprioritized for now — see below.
      - Minor: chart Y-axis ticks still show a bare `$` for non-SGD stocks.
- [ ] **Historical FX for the portfolio value chart.** Dev holdings happen to
      be 100% SGD today (checked 2026-09-16), so this is invisible in current
      testing — but **this app is headed for public release**, and any real
      user could hold USD/GBP/EUR stocks from day one, so "no one's affected"
      is not a durable reason to skip it. Kept open, just not urgent: SGD's FX
      moves are usually small enough that the spot-for-all-history
      approximation won't visibly reshape most users' charts, and a correct
      fix needs a full daily-FX-history ingestion pipeline + table. Reasonable
      to leave for post-launch unless it turns out to matter in practice.
- [x] **Dashboard chart first-paint fix.** Page now gates entirely on
      `isLoading`/`portfolio` before any chart mounts (no partial render with
      empty data), plus fixed pixel heights on each `ResponsiveContainer` — same
      flicker this item was tracking. Not byte-identical to the stock page's
      fix (no explicit `debounce={50}`), but the actual bug is gone.
- [x] **Nightly-refresh watchdog** (`check-refresh.yml`). GitHub's own
      `schedule` trigger can skip a day silently, not just run late — this
      checks ~5h after the expected trigger and dispatches a fallback run if
      nothing succeeded that day. Built, deployed, and verified live end to
      end (PRs #11, #12).
- [x] **Visual redesign to the approved mockup.** Horizontal top bar
      (replaces the sidebar), retuned color tokens (indigo dividend accent,
      colorblind-safe gain/loss pair, categorical chart palette), frameless
      tables/dashboard with light section dividers, mobile bottom tab bar,
      new logo (`LogoMark` + matching favicon). Landing page intentionally
      excluded — see "Landing page polish" below.
- [x] **Trend sparklines** on Holdings and Browse Stocks rows; monthly
      dividend income chart now zero-fills all 12 trailing months instead of
      only months with a payout.
- [x] **Replace the placeholder `JWT_SECRET`.** Generated a real 64-char
      `secrets.token_hex(32)` value into `server/.env`, restarted the backend
      to pick it up. Sessions signed under the old placeholder are invalid —
      expected, just re-login.
- [x] **Data-source docs corrected.** `CLAUDE.md` said BeanSprout was
      "company profile only" — untrue for dividends: `ingest.fetch_dividends()`
      uses Yahoo for amounts/ex-dates and BeanSprout only to fill in pay-dates
      by matching ex-date. Confirmed 2026-09-16 that all 108 stocks currently
      get amounts from Yahoo (BeanSprout's full-fallback path isn't exercised
      by anything in the current universe).

## Next — high value

- [ ] **Special vs regular dividends.** Yahoo `events=div` lumps them, so a year
      with a special (e.g. DBS 2023) shows an inflated bar in the annual DPS
      chart. Tag specials (size vs trailing median?) and either flag or exclude
      them from the "forward" calc. Note: a naive size-vs-trailing-median
      heuristic throws too many false positives (banks routinely pay a much
      bigger final than interim dividend every year — that's normal, not a
      special) — needs a same-period-prior-year comparison or similar, not
      just a ratio threshold.

## Later — polish

- [ ] `add_holding` — the light fix is in (returns in ~3s, `BackgroundTask`
      backfills prices). Could go further: return `202` + a "pending" state in
      the UI + polling, and make it fully non-blocking under load.
- [ ] Landing page polish. Logo already swapped in (`LogoMark`); the rest of
      the page (hero, feature previews) still predates the redesign and was
      deliberately deferred until a mockup exists for it.
- [ ] Mobile responsiveness pass — largely covered as a side effect of the
      redesign (Topbar's bottom tab bar, Dashboard's responsive grid columns).
      What's left is verification, not new work: spot-check Holdings/Browse
      tables and Stock Detail on a real narrow viewport.
- [ ] `useGoogleLogin` implicit flow → authorization-code flow (more secure).
- [ ] `website` / `address` null for REITs — BeanSprout doesn't carry it. Skip,
      or a small hardcoded map (only if it's worth it — no fabricated data).

## Deployment — not started

- [ ] Frontend → Vercel, backend → Render (per original plan). Env vars, CORS
      origins, the OAuth client's production origins, and switch the refresh
      job's `DATABASE_URL` handling if moving to a gated endpoint.
- [ ] **Replace GitHub Actions' `schedule` trigger with Render's native Cron
      Job** hitting the `cron_secret`-gated refresh endpoint. Investigated
      2026-09-15: GH's schedule event is consistently 3-6h late *every day*
      regardless of which minute is chosen (confirmed the delay is in
      GitHub's own scheduler, not runner queueing) — it's best-effort with no
      SLA. Fine for now since `check-refresh.yml` catches full no-shows, but
      not something to rely on once this matters to real users.

## Watch / verify

- [x] **First Sunday full-refresh** — ran 2026-09-13, 108/108 updated, 0
      failed, ~8.5 min.
- [x] Weekday prices-only refresh — verified (run #5, 96/96, ~4 min).
- [x] Cron moved to off-peak `:17` — didn't actually help (see Deployment
      section: the delay is scheduler-side, not minute-of-hour congestion).
      Kept anyway since it doesn't hurt; real fix is a dedicated scheduler.

---

## Phases (all merged to `main`)

| Phase | What | PRs |
|---|---|---|
| **1** | Unified data pipeline (`ingest.py`), Yahoo for prices+dividends, BeanSprout for profile, computed yields, full-precision storage, REIT payout nulled | #1, #2 |
| **2** | GitHub Actions refresh (`scripts/refresh.py`), 5-year avg yield, async scraper, non-blocking add-holding, chart first-paint fix | #3, #4, #5, #7 |
| **3** | 96-stock SGD dividend universe, currency capture, split refresh cadence | #6 |
| **4** | Multi-currency: `fx_rates` + spot conversion, native currency on stock views, SGD on aggregates, +12 foreign tickers (108 total) | #10 |
| — | Housekeeping: `dev.ps1`, off-peak cron, ROADMAP | #8, #9 |
| **5** | Nightly-refresh watchdog (`check-refresh.yml`), trend sparklines on Holdings/Browse, dividend income zero-fill, full visual redesign to the approved mockup (top bar, tokens, frameless UI, mobile nav, new logo) | #11, #12, direct-to-main |

**Current phase:** post-Phase-5 — special-dividend tagging next; real
scheduler + `LandingPage` redesign queued for the eventual deploy pass.
