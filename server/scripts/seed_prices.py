"""Update daily price history (incremental) for every active stock.

First run per stock fetches full 10y history; later runs fetch only the gap
since the latest stored date. Delegates to ``ingest.ingest_prices``.

    python -m scripts.seed_prices
"""

import asyncio
import logging
import time

from sqlalchemy import select

from app.database import async_session
from app.models.stock import Stock
from app.services.ingest import ingest_prices

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)


async def main():
    async with async_session() as db:
        stocks = (await db.execute(select(Stock).where(Stock.is_active.is_(True)))).scalars().all()

    logger.info("Updating prices for %d stocks...", len(stocks))
    added, up_to_date = 0, 0

    for i, stock in enumerate(stocks, 1):
        async with async_session() as db:
            stock = await db.merge(stock)
            n = await ingest_prices(db, stock)
            await db.commit()
        if n:
            logger.info("  [%d/%d] %s +%d points", i, len(stocks), stock.ticker, n)
            added += 1
        else:
            logger.info("  [%d/%d] %s up to date", i, len(stocks), stock.ticker)
            up_to_date += 1
        time.sleep(1)

    logger.info("Done: %d updated, %d already current", added, up_to_date)


if __name__ == "__main__":
    asyncio.run(main())
