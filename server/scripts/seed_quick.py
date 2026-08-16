"""Seed stocks from GrowBeanSprout (fallback when yfinance is rate-limited).

Run: python -m scripts.seed_quick
"""

import asyncio
import logging
import time

from app.database import async_session
from app.services.beansprout_scraper import fetch_stock_from_beansprout, fetch_dividends_from_beansprout, fetch_price_history_yahoo_chart
from app.services.data_fetcher import upsert_stock, upsert_dividends, upsert_prices

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

TICKERS = [
    "D05.SI", "O39.SI", "U11.SI",
    "Z74.SI", "C38U.SI", "A17U.SI",
    "ME8U.SI", "N2IU.SI", "J69U.SI",
    "BN4.SI", "S63.SI", "C52.SI",
    "S68.SI", "AJBU.SI", "T82U.SI",
]

DELAY = 3


async def main():
    success = 0
    failed = []

    for i, ticker in enumerate(TICKERS):
        logger.info("Seeding %s (%d/%d)...", ticker, i + 1, len(TICKERS))

        info = fetch_stock_from_beansprout(ticker)
        if not info:
            logger.warning("  ✗ %s — no data from BeanSprout", ticker)
            failed.append(ticker)
            if i < len(TICKERS) - 1:
                time.sleep(DELAY)
            continue

        async with async_session() as db:
            try:
                stock = await upsert_stock(db, info)
                logger.info("  ✓ %s — %s (price: %s)", ticker, stock.name, info.get("last_price"))

                divs = fetch_dividends_from_beansprout(ticker)
                if divs:
                    await upsert_dividends(db, stock.id, divs)
                    logger.info("    %d dividends loaded", len(divs))

                prices = fetch_price_history_yahoo_chart(ticker)
                if prices:
                    await upsert_prices(db, stock.id, prices)
                    logger.info("    %d price points loaded", len(prices))

                await db.commit()
                success += 1
            except Exception:
                logger.exception("  ✗ %s — DB error", ticker)
                failed.append(ticker)

        if i < len(TICKERS) - 1:
            time.sleep(DELAY)

    logger.info("Done: %d/%d succeeded", success, len(TICKERS))
    if failed:
        logger.warning("Failed: %s", ", ".join(failed))


if __name__ == "__main__":
    asyncio.run(main())
