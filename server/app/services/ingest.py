"""Unified stock data ingestion.

One pipeline, one entry point (`ingest_stock`), used by both the seed scripts
and the API's add-ticker path so every stock is populated the same way.

Sources:
- BeanSprout (growbeansprout.com) -- company info + full dividend history
- Yahoo Chart API -- daily close prices

yfinance lives in ``yfinance_source.py`` as an optional fallback; it is
rate-limited on many networks and is not wired into this pipeline by default.
"""

import logging
import re
from collections import Counter
from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.daily_price import DailyPrice
from app.models.dividend import Dividend
from app.models.stock import Stock
from app.services.beansprout_scraper import (
    fetch_dividends_from_beansprout,
    fetch_dividends_yahoo_chart,
    fetch_price_history_yahoo_chart,
    fetch_stock_from_beansprout,
)

logger = logging.getLogger(__name__)

# Canonical dividend-frequency vocabulary. Everything is mapped onto one of these.
FREQ_MONTHLY = "Monthly"
FREQ_QUARTERLY = "Quarterly"
FREQ_SEMI_ANNUAL = "Semi-Annual"
FREQ_ANNUAL = "Annual"
FREQ_IRREGULAR = "Irregular"

_FREQ_ALIASES = {
    "monthly": FREQ_MONTHLY,
    "quarterly": FREQ_QUARTERLY,
    "quarter": FREQ_QUARTERLY,
    "semi-annually": FREQ_SEMI_ANNUAL,
    "semi annually": FREQ_SEMI_ANNUAL,
    "semi-annual": FREQ_SEMI_ANNUAL,
    "semiannual": FREQ_SEMI_ANNUAL,
    "biannual": FREQ_SEMI_ANNUAL,
    "half-yearly": FREQ_SEMI_ANNUAL,
    "annually": FREQ_ANNUAL,
    "annual": FREQ_ANNUAL,
    "yearly": FREQ_ANNUAL,
    "irregular": FREQ_IRREGULAR,
    "none": FREQ_IRREGULAR,
}

# Corporate suffixes that mark a string as already being a full legal name,
# so a "PREFIX: Full Name" split should not fire.
_NAME_SUFFIX_RE = re.compile(
    r"(ltd\.?|limited|trust|reit|corp\.?|corporation|holdings|plc|group|inc\.?)$",
    re.IGNORECASE,
)


def clean_name(raw: str | None, ticker: str) -> str:
    """BeanSprout returns some names as ``"OCBC: Oversea-Chinese Banking Corp Ltd"``.

    Keep the fuller legal name on the right of the first colon.
    """
    if not raw or not raw.strip():
        return ticker
    name = raw.strip()
    if ": " in name:
        left, right = name.split(": ", 1)
        left, right = left.strip(), right.strip()
        # Only treat the left as a ticker/abbreviation prefix, not a real name.
        if right and len(left) <= 25 and not _NAME_SUFFIX_RE.search(left):
            name = right
    return name


def normalize_frequency(raw: str | None) -> str | None:
    if not raw:
        return None
    return _FREQ_ALIASES.get(raw.strip().lower())


def infer_frequency(ex_dates: list[date]) -> str | None:
    """Infer cadence from the gaps between the last ~3 years of ex-dividend dates."""
    if not ex_dates:
        return None
    cutoff = date.today() - timedelta(days=3 * 365)
    recent = sorted(d for d in ex_dates if d >= cutoff)
    if len(recent) < 2:
        recent = sorted(ex_dates)[-6:]
    if len(recent) < 2:
        return None

    per_year = Counter(d.year for d in recent)
    # Use whole years only (first/last may be partial).
    whole_years = [c for y, c in sorted(per_year.items())[1:-1]] or list(per_year.values())
    avg = sum(whole_years) / len(whole_years)

    if avg >= 9:
        return FREQ_MONTHLY
    if avg >= 3.5:
        return FREQ_QUARTERLY
    if avg >= 1.5:
        return FREQ_SEMI_ANNUAL
    if avg >= 0.75:
        return FREQ_ANNUAL
    return FREQ_IRREGULAR


_PAYMENTS_PER_YEAR = {
    FREQ_MONTHLY: 12,
    FREQ_QUARTERLY: 4,
    FREQ_SEMI_ANNUAL: 2,
    FREQ_ANNUAL: 1,
}


def compute_dividend_metrics(
    dividends: list[dict],
    last_price: float | None,
    frequency: str | None,
    pe_ratio: float | None = None,
) -> dict:
    """Derive dividend rates/yields from the dividend history.

    BeanSprout's scraped ``dividendYield`` is unreliable (it sometimes picks up
    a value from an embedded peer-comparison table), so we compute our own from
    the regular-dividend history, which is parsed from a clean HTML table.

    - ``ttm_*``     : trailing 12 months of ex-dividends
    - ``forward_*`` : the trailing ``payments_per_year`` dividends summed. For a
                      regular payer this equals TTM; for one that recently
                      changed its payout it reflects the new run-rate. Falls
                      back to TTM when the frequency is unknown/irregular.
    """
    out: dict = {}
    if not dividends:
        return out

    rows = sorted(dividends, key=lambda d: d["ex_date"], reverse=True)
    today = date.today()

    ttm_rate = round(
        sum(d["amount_per_share"] for d in rows if d["ex_date"] >= today - timedelta(days=365)),
        4,
    )
    if ttm_rate > 0:
        out["ttm_dividend_rate"] = ttm_rate

    # Forward run-rate: sum of the last N payments, where N is the stated
    # payments-per-year but at least the number actually paid in the last year
    # (some names -- e.g. REITs mid-restructuring -- pay more often than their
    # labelled frequency). This tracks a recent cut or raise, unlike plain TTM.
    ttm_count = sum(1 for d in rows if d["ex_date"] >= today - timedelta(days=365))
    per_year = _PAYMENTS_PER_YEAR.get(frequency)
    n = max(per_year or 0, ttm_count)
    if n and len(rows) >= n:
        forward_rate = round(sum(d["amount_per_share"] for d in rows[:n]), 4)
    elif ttm_rate > 0:
        forward_rate = ttm_rate
    else:
        forward_rate = None

    if forward_rate:
        out["annual_dividend_rate"] = forward_rate

    if last_price and last_price > 0:
        if forward_rate:
            out["forward_dividend_yield"] = round(forward_rate / last_price, 4)
        if ttm_rate > 0:
            out["ttm_dividend_yield"] = round(ttm_rate / last_price, 4)

        # payout ratio = dividends / earnings, with EPS approximated as price / PE
        if pe_ratio and pe_ratio > 0 and ttm_rate > 0:
            eps = last_price / pe_ratio
            if eps > 0:
                out["payout_ratio"] = round(ttm_rate / eps, 4)

    return out


# Fields BeanSprout is trusted for. Price comes from Yahoo (its scraped price is
# polluted by an embedded peer table); yields/rates are computed from dividends.
_BEANSPROUT_FIELDS = (
    "name", "sector", "industry", "description", "website", "address",
    "currency", "dividend_frequency", "market_cap", "pe_ratio", "payout_ratio",
)


def fetch_stock(ticker: str) -> dict | None:
    """Company profile from BeanSprout, normalized to the Stock column shape."""
    raw = fetch_stock_from_beansprout(ticker)
    if not raw:
        return None
    raw["name"] = clean_name(raw.get("name"), ticker)
    raw["dividend_frequency"] = normalize_frequency(raw.get("dividend_frequency"))
    return {k: raw[k] for k in _BEANSPROUT_FIELDS if raw.get(k) is not None}


def fetch_dividends(ticker: str) -> list[dict]:
    """Dividend history.

    Yahoo Chart API is the source of truth for amounts and full history; Yahoo
    does not provide payment dates, so those are enriched from BeanSprout by
    matching ex-dates. Falls back entirely to BeanSprout if Yahoo returns nothing.
    """
    divs = fetch_dividends_yahoo_chart(ticker)
    if not divs:
        logger.info("fetch_dividends: Yahoo empty for %s, using BeanSprout", ticker)
        return fetch_dividends_from_beansprout(ticker)

    pay_dates = {d["ex_date"]: d["pay_date"] for d in fetch_dividends_from_beansprout(ticker)}
    for d in divs:
        if d["pay_date"] is None and pay_dates.get(d["ex_date"]):
            d["pay_date"] = pay_dates[d["ex_date"]]
    return divs


def fetch_prices(ticker: str, period: str = "10y") -> list[dict]:
    return fetch_price_history_yahoo_chart(ticker, period=period)


async def upsert_stock(db: AsyncSession, data: dict) -> Stock:
    stmt = (
        insert(Stock)
        .values(**data)
        .on_conflict_do_update(index_elements=["ticker"], set_=data)
        .returning(Stock)
    )
    result = await db.execute(stmt)
    return result.scalar_one()


async def upsert_dividends(db: AsyncSession, stock_id: int, dividends: list[dict]) -> int:
    if not dividends:
        return 0
    values = [{"stock_id": stock_id, **d} for d in dividends]
    stmt = insert(Dividend).values(values)
    stmt = stmt.on_conflict_do_update(
        index_elements=["stock_id", "ex_date"],
        set_={
            "amount_per_share": stmt.excluded.amount_per_share,
            "pay_date": func.coalesce(stmt.excluded.pay_date, Dividend.pay_date),
        },
    )
    result = await db.execute(stmt)
    return result.rowcount or 0


async def replace_dividends(db: AsyncSession, stock_id: int, dividends: list[dict]) -> int:
    """Upsert the fetched dividends and delete any stored ones not in the set.

    Yahoo's `range=max` history is authoritative, so rows it doesn't contain are
    stale artifacts (e.g. from the earlier scraper that split one payout into
    several same-ex-date rows).
    """
    if not dividends:
        return 0
    await upsert_dividends(db, stock_id, dividends)
    keep = {d["ex_date"] for d in dividends}
    earliest = min(keep)
    existing = await db.execute(
        select(Dividend.id, Dividend.ex_date).where(Dividend.stock_id == stock_id)
    )
    # Only prune within the fetched window -- never touch rows older than what
    # this fetch covers (protects against a partial fallback source).
    stale = [
        row.id for row in existing
        if row.ex_date >= earliest and row.ex_date not in keep
    ]
    if stale:
        await db.execute(Dividend.__table__.delete().where(Dividend.id.in_(stale)))
    return len(dividends)


async def upsert_prices(db: AsyncSession, stock_id: int, prices: list[dict]) -> int:
    if not prices:
        return 0
    total = 0
    batch_size = 500
    for i in range(0, len(prices), batch_size):
        batch = prices[i : i + batch_size]
        values = [{"stock_id": stock_id, **p} for p in batch]
        stmt = (
            insert(DailyPrice)
            .values(values)
            .on_conflict_do_nothing(index_elements=["stock_id", "date"])
        )
        result = await db.execute(stmt)
        total += result.rowcount or 0
    return total


def _period_for_gap(days_missing: int) -> str:
    for threshold, period in (
        (8, "5d"),
        (35, "1mo"),
        (100, "3mo"),
        (200, "6mo"),
        (400, "1y"),
        (800, "2y"),
        (1900, "5y"),
    ):
        if days_missing < threshold:
            return period
    return "10y"


async def ingest_prices(db: AsyncSession, stock: Stock, *, full_period: str = "10y") -> int:
    """Fetch only the prices missing since the latest stored date (or full history)."""
    latest = await db.scalar(
        select(func.max(DailyPrice.date)).where(DailyPrice.stock_id == stock.id)
    )
    if latest and latest >= date.today() - timedelta(days=1):
        return 0

    period = _period_for_gap((date.today() - latest).days) if latest else full_period
    prices = fetch_prices(stock.ticker, period=period)
    if latest:
        prices = [p for p in prices if p["date"] > latest]
    return await upsert_prices(db, stock.id, prices)


async def ingest_stock(
    db: AsyncSession,
    ticker: str,
    *,
    with_prices: bool = True,
    price_period: str = "10y",
) -> Stock | None:
    """Populate one stock end to end: company info + dividends + prices.

    Idempotent -- safe to re-run. Returns the Stock, or None if the ticker
    could not be resolved from the data source.
    """
    ticker = ticker.upper()
    info = fetch_stock(ticker)
    if not info:
        logger.warning("ingest_stock: no data for %s", ticker)
        return None
    info["ticker"] = ticker
    info["is_active"] = True

    dividends = fetch_dividends(ticker)

    # Last price from Yahoo -- BeanSprout's scraped price is polluted by the
    # embedded peer table for some tickers (REITs in particular).
    recent = fetch_prices(ticker, period="5d")
    if recent:
        info["last_price"] = recent[-1]["close_price"]

    # Fill missing/blank frequency from the actual dividend cadence.
    if not info.get("dividend_frequency") and dividends:
        info["dividend_frequency"] = infer_frequency([d["ex_date"] for d in dividends])

    # Compute dividend rates/yields from history (scraped yield is unreliable).
    metrics = compute_dividend_metrics(
        dividends, info.get("last_price"), info.get("dividend_frequency"), info.get("pe_ratio")
    )
    info.update(metrics)

    info["last_updated"] = datetime.utcnow()
    stock = await upsert_stock(db, info)

    n_divs = await replace_dividends(db, stock.id, dividends)

    n_prices = 0
    if with_prices:
        n_prices = await ingest_prices(db, stock, full_period=price_period)

    await db.commit()
    logger.info(
        "ingest_stock: %s (%s) %d divs, +%d prices", ticker, stock.name, n_divs, n_prices
    )
    return stock


async def refresh_all(
    db: AsyncSession,
    *,
    info: bool = True,
    dividends: bool = True,
    prices: bool = True,
) -> dict:
    """Refresh every active stock. Intended for the scheduled job (Phase 2)."""
    rows = await db.execute(select(Stock).where(Stock.is_active.is_(True)))
    stocks = rows.scalars().all()

    updated, failed = 0, []
    for stock in stocks:
        try:
            if prices:
                await ingest_prices(db, stock)

            # Latest close from the price table is the source of truth for price.
            latest_close = await db.scalar(
                select(DailyPrice.close_price)
                .where(DailyPrice.stock_id == stock.id)
                .order_by(DailyPrice.date.desc())
                .limit(1)
            )
            if latest_close:
                stock.last_price = latest_close

            if info:
                fresh = fetch_stock(stock.ticker)
                if fresh:
                    for key in (
                        "name", "sector", "industry", "description", "website",
                        "address", "dividend_frequency", "payout_ratio",
                        "market_cap", "pe_ratio",
                    ):
                        if fresh.get(key) is not None:
                            setattr(stock, key, fresh[key])
                    stock.last_updated = datetime.utcnow()

            if dividends:
                divs = fetch_dividends(stock.ticker)
                await replace_dividends(db, stock.id, divs)
                if not stock.dividend_frequency and divs:
                    stock.dividend_frequency = infer_frequency([d["ex_date"] for d in divs])
                for key, val in compute_dividend_metrics(
                    divs, stock.last_price, stock.dividend_frequency, stock.pe_ratio
                ).items():
                    setattr(stock, key, val)

            await db.commit()
            updated += 1
        except Exception:
            await db.rollback()
            logger.exception("refresh_all: %s failed", stock.ticker)
            failed.append(stock.ticker)

    return {"updated": updated, "failed": failed, "total": len(stocks)}
