"""Refresh every active stock: company info + dividends + incremental prices.

This is the entry point the scheduled job will call (Phase 2). Safe to run
by hand any time.

    python -m scripts.refresh                 # info + dividends + prices
    python -m scripts.refresh --prices-only    # just the daily price gap
"""

import asyncio
import logging
import sys

from app.database import async_session
from app.services.ingest import refresh_all

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)


async def main(prices_only: bool):
    async with async_session() as db:
        result = await refresh_all(
            db,
            info=not prices_only,
            dividends=not prices_only,
            prices=True,
        )
    logger.info("Refresh complete: %s", result)
    if result["failed"]:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main("--prices-only" in sys.argv))
