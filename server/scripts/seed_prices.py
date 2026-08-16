"""Seed/update price history from Yahoo chart API.

First run: fetches full 10y history.
Subsequent runs: only fetches from the latest date in DB (incremental).

Run: python -m scripts.seed_prices
"""

import asyncio
import logging
import time
from datetime import date, timedelta

from sqlalchemy import select, func

from app.database import async_session
from app.models.daily_price import DailyPrice
from app.models.stock import Stock
from app.services.beansprout_scraper import fetch_price_history_yahoo_chart
from app.services.data_fetcher import upsert_prices

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

PERIOD_MAP = {
    range(0, 8): "5d",
    range(8, 35): "1mo",
    range(35, 100): "3mo",
    range(100, 200): "6mo",
    range(200, 400): "1y",
    range(400, 800): "2y",
    range(800, 1900): "5y",
}


def _pick_period(days_missing: int) -> str:
    for rng, period in PERIOD_MAP.items():
        if days_missing in rng:
            return period
    return "10y"


async def main():
    async with async_session() as db:
        result = await db.execute(select(Stock).where(Stock.is_active.is_(True)))
        stocks = result.scalars().all()

    logger.info("Updating prices for %d stocks...", len(stocks))
    success = 0
    skipped = 0

    for i, stock in enumerate(stocks):
        async with async_session() as db:
            result = await db.execute(
                select(func.max(DailyPrice.date)).where(DailyPrice.stock_id == stock.id)
            )
            latest_date = result.scalar()

        if latest_date and latest_date >= date.today() - timedelta(days=1):
            logger.info("  %s (%d/%d) — up to date (%s)", stock.ticker, i + 1, len(stocks), latest_date)
            skipped += 1
            continue

        if latest_date:
            days_missing = (date.today() - latest_date).days
            period = _pick_period(days_missing)
            logger.info("  %s (%d/%d) — last: %s, fetching %s...", stock.ticker, i + 1, len(stocks), latest_date, period)
        else:
            period = "10y"
            logger.info("  %s (%d/%d) — no history, fetching %s...", stock.ticker, i + 1, len(stocks), period)

        prices = fetch_price_history_yahoo_chart(stock.ticker, period=period)
        if prices:
            new_prices = [p for p in prices if not latest_date or p["date"] > latest_date]
            if new_prices:
                async with async_session() as db:
                    await upsert_prices(db, stock.id, new_prices)
                    await db.commit()
                logger.info("    +%d new points (total fetched: %d)", len(new_prices), len(prices))
            else:
                logger.info("    already up to date")
            success += 1
        else:
            logger.warning("    no prices returned")
        time.sleep(1)

    logger.info("Done: %d updated, %d skipped, %d total", success, skipped, len(stocks))


if __name__ == "__main__":
    asyncio.run(main())
