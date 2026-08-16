import logging
import time
from datetime import datetime, date

import yfinance as yf
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.daily_price import DailyPrice
from app.models.dividend import Dividend
from app.models.stock import Stock

logger = logging.getLogger(__name__)

BATCH_SIZE = 20
BATCH_DELAY_SECONDS = 1.5


def _infer_frequency(dividends_per_year: int) -> str:
    if dividends_per_year >= 10:
        return "Monthly"
    if dividends_per_year >= 3:
        return "Quarterly"
    if dividends_per_year >= 1:
        return "Semi-Annually"
    return "Annually"


def fetch_stock_info(ticker: str) -> dict | None:
    try:
        t = yf.Ticker(ticker)
        info = t.info
        if not info or info.get("quoteType") is None:
            return None

        div_history = t.dividends
        divs_last_year = 0
        if not div_history.empty:
            one_year_ago = datetime.now().timestamp() - 365.25 * 86400
            divs_last_year = len(
                [d for d in div_history.index if d.timestamp() > one_year_ago]
            )

        return {
            "ticker": ticker,
            "name": info.get("longName") or info.get("shortName", ticker),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "description": info.get("longBusinessSummary"),
            "website": info.get("website"),
            "address": ", ".join(
                filter(
                    None,
                    [
                        info.get("address1"),
                        info.get("city"),
                        info.get("country"),
                    ],
                )
            )
            or None,
            "currency": info.get("currency", "SGD"),
            "last_price": info.get("currentPrice") or info.get("regularMarketPrice"),
            "forward_dividend_yield": (
                info.get("dividendYield", 0) / 100
                if info.get("dividendYield") and info["dividendYield"] > 1
                else info.get("dividendYield")
            ),
            "ttm_dividend_yield": info.get("trailingAnnualDividendYield"),
            "five_year_avg_yield": (
                info.get("fiveYearAvgDividendYield", 0) / 100
                if info.get("fiveYearAvgDividendYield")
                and info["fiveYearAvgDividendYield"] > 1
                else info.get("fiveYearAvgDividendYield")
            ),
            "annual_dividend_rate": info.get("dividendRate"),
            "ttm_dividend_rate": info.get("trailingAnnualDividendRate"),
            "dividend_frequency": _infer_frequency(divs_last_year),
            "payout_ratio": info.get("payoutRatio"),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "is_active": True,
            "last_updated": datetime.utcnow(),
        }
    except Exception:
        logger.exception("Failed to fetch info for %s", ticker)
        return None


def fetch_dividends(ticker: str) -> list[dict]:
    try:
        t = yf.Ticker(ticker)
        divs = t.dividends
        if divs.empty:
            return []
        return [
            {
                "ex_date": idx.date(),
                "amount_per_share": float(val),
                "currency": "SGD",
            }
            for idx, val in divs.items()
        ]
    except Exception:
        logger.exception("Failed to fetch dividends for %s", ticker)
        return []


def fetch_price_history(ticker: str, period: str = "10y") -> list[dict]:
    try:
        t = yf.Ticker(ticker)
        hist = t.history(period=period)
        if hist.empty:
            return []
        return [
            {"date": idx.date(), "close_price": float(row["Close"])}
            for idx, row in hist.iterrows()
        ]
    except Exception:
        logger.exception("Failed to fetch price history for %s", ticker)
        return []


async def upsert_stock(db: AsyncSession, data: dict) -> Stock:
    stmt = (
        insert(Stock)
        .values(**data)
        .on_conflict_do_update(index_elements=["ticker"], set_=data)
        .returning(Stock)
    )
    result = await db.execute(stmt)
    return result.scalar_one()


async def upsert_dividends(db: AsyncSession, stock_id: int, dividends: list[dict]):
    if not dividends:
        return
    values = [{"stock_id": stock_id, **d} for d in dividends]
    stmt = insert(Dividend).values(values).on_conflict_do_nothing(index_elements=["stock_id", "ex_date"])
    await db.execute(stmt)


async def upsert_prices(db: AsyncSession, stock_id: int, prices: list[dict]):
    if not prices:
        return
    batch_size = 500
    for i in range(0, len(prices), batch_size):
        batch = prices[i : i + batch_size]
        values = [{"stock_id": stock_id, **p} for p in batch]
        stmt = insert(DailyPrice).values(values).on_conflict_do_nothing(index_elements=["stock_id", "date"])
        await db.execute(stmt)


async def seed_stock(db: AsyncSession, ticker: str) -> Stock | None:
    logger.info("Seeding %s", ticker)
    info = fetch_stock_info(ticker)
    if not info:
        return None

    stock = await upsert_stock(db, info)

    dividends = fetch_dividends(ticker)
    if dividends:
        await upsert_dividends(db, stock.id, dividends)

    prices = fetch_price_history(ticker)
    if prices:
        await upsert_prices(db, stock.id, prices)

    await db.commit()
    return stock


async def refresh_stock(db: AsyncSession, ticker: str):
    info = fetch_stock_info(ticker)
    if not info:
        return

    result = await db.execute(select(Stock).where(Stock.ticker == ticker))
    stock = result.scalar_one_or_none()
    if not stock:
        return

    for key, val in info.items():
        setattr(stock, key, val)

    dividends = fetch_dividends(ticker)
    if dividends:
        await upsert_dividends(db, stock.id, dividends)

    today_price = fetch_price_history(ticker, period="5d")
    if today_price:
        await upsert_prices(db, stock.id, today_price)

    await db.commit()
