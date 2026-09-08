"""Seed the database with SGX dividend stocks via the unified ingest pipeline.

Idempotent -- safe to re-run; existing stocks are refreshed in place.

    python -m scripts.seed_stocks           # all tickers
    python -m scripts.seed_stocks D05.SI O39.SI   # just these
"""

import asyncio
import logging
import sys
import time

from app.database import async_session
from app.services.ingest import ingest_stock

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

# SGX dividend names: STI blue chips, major REITs / business trusts, and
# established dividend-paying mid-caps. Phase 3 expands this to a curated ~80.
SGX_DIVIDEND_TICKERS = [
    # Banks
    "D05.SI", "O39.SI", "U11.SI",
    # Telecoms
    "Z74.SI", "CC3.SI",
    # REITs & business trusts
    "C38U.SI", "A17U.SI", "ME8U.SI", "N2IU.SI", "M44U.SI", "J69U.SI",
    "T82U.SI", "AJBU.SI", "BUOU.SI", "HMN.SI", "J91U.SI", "SK6U.SI",
    "C2PU.SI", "CRPU.SI", "AU8U.SI", "A7RU.SI", "AJQQ.SI",
    # Industrials / conglomerates
    "BN4.SI", "S63.SI", "C09.SI", "U96.SI", "S68.SI", "H78.SI",
    "F34.SI", "V03.SI", "BS6.SI",
    # Consumer / healthcare
    "D01.SI", "C52.SI", "G13.SI", "N03.SI",
    # Utilities / infrastructure / property
    "AWX.SI", "U14.SI", "C61U.SI", "S58.SI", "J36.SI",
]

BATCH_DELAY = 2.0


async def main(tickers: list[str]):
    total = len(tickers)
    success, failed = 0, []

    for i, ticker in enumerate(tickers, 1):
        async with async_session() as db:
            try:
                stock = await ingest_stock(db, ticker, with_prices=True, price_period="10y")
                if stock:
                    logger.info("  [%d/%d] OK  %s -- %s", i, total, ticker, stock.name)
                    success += 1
                else:
                    logger.warning("  [%d/%d] --  %s -- no data", i, total, ticker)
                    failed.append(ticker)
            except Exception:
                logger.exception("  [%d/%d] ERR %s", i, total, ticker)
                failed.append(ticker)
        if i < total:
            time.sleep(BATCH_DELAY)

    logger.info("Done: %d/%d succeeded", success, total)
    if failed:
        logger.warning("Failed: %s", ", ".join(failed))


if __name__ == "__main__":
    args = [t.upper() for t in sys.argv[1:]] or SGX_DIVIDEND_TICKERS
    asyncio.run(main(args))
