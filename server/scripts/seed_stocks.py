"""Seed the database with SGX dividend stocks.

Run from the server directory:
    python -m scripts.seed_stocks
"""

import asyncio
import logging
import time

from app.database import async_session
from app.services.data_fetcher import seed_stock

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

# Popular SGX dividend-paying stocks: STI components, blue chips, REITs
SGX_DIVIDEND_TICKERS = [
    # Banks
    "D05.SI",  # DBS
    "O39.SI",  # OCBC
    "U11.SI",  # UOB
    # Telecoms
    "Z74.SI",  # Singtel
    "CC3.SI",  # StarHub
    # REITs
    "C38U.SI",  # CapitaLand Integrated Commercial Trust
    "A17U.SI",  # CapitaLand Ascendas REIT
    "ME8U.SI",  # Mapletree Industrial Trust
    "N2IU.SI",  # Mapletree Pan Asia Commercial Trust
    "M44U.SI",  # Mapletree Logistics Trust
    "J69U.SI",  # Frasers Centrepoint Trust
    "T82U.SI",  # Suntec REIT
    "AJBU.SI",  # Keppel DC REIT
    "BUOU.SI",  # Frasers Logistics & Commercial Trust
    "HMN.SI",  # CapitaLand China Trust (formerly CLCT)
    "J91U.SI",  # ESR-LOGOS REIT
    "SK6U.SI",  # Parkway Life REIT
    "C2PU.SI",  # Paragon REIT
    "CRPU.SI",  # Sasseur REIT
    "AU8U.SI",  # CapitaLand India Trust
    # Industrials / Conglomerates
    "BN4.SI",  # Keppel Ltd
    "S63.SI",  # ST Engineering
    "C09.SI",  # City Developments
    "U96.SI",  # Sembcorp Industries
    "S68.SI",  # SGX
    "H78.SI",  # Hongkong Land
    "F34.SI",  # Wilmar International
    "V03.SI",  # Venture Corporation
    "BS6.SI",  # YZJ Shipbuilding
    # Consumer / Healthcare
    "D01.SI",  # DFI Retail Group
    "C52.SI",  # ComfortDelGro
    "G13.SI",  # Genting Singapore
    "N03.SI",  # Sheng Siong
    # Utilities / Infrastructure
    "AWX.SI",  # AEM Holdings
    "A7RU.SI",  # Keppel Infrastructure Trust
    "AJQQ.SI",  # NetLink NBN Trust
    # Property developers
    "U14.SI",  # UOL Group
    "C61U.SI",  # CapitaLand Investment
    # Others
    "S58.SI",  # SATS
    "J36.SI",  # Jardine Matheson
]

BATCH_SIZE = 5
BATCH_DELAY = 10


async def main():
    total = len(SGX_DIVIDEND_TICKERS)
    success = 0
    failed = []

    for i in range(0, total, BATCH_SIZE):
        batch = SGX_DIVIDEND_TICKERS[i : i + BATCH_SIZE]
        logger.info(
            "Processing batch %d-%d of %d", i + 1, min(i + BATCH_SIZE, total), total
        )

        for j, ticker in enumerate(batch):
            async with async_session() as db:
                try:
                    stock = await seed_stock(db, ticker)
                    if stock:
                        logger.info("  ✓ %s — %s", ticker, stock.name)
                        success += 1
                    else:
                        logger.warning("  ✗ %s — no data returned", ticker)
                        failed.append(ticker)
                except Exception:
                    logger.exception("  ✗ %s — error", ticker)
                    failed.append(ticker)
            if j < len(batch) - 1:
                time.sleep(2)

        if i + BATCH_SIZE < total:
            logger.info("Waiting %ds before next batch...", BATCH_DELAY)
            time.sleep(BATCH_DELAY)

    logger.info("Done: %d/%d succeeded", success, total)
    if failed:
        logger.warning("Failed tickers: %s", ", ".join(failed))


if __name__ == "__main__":
    asyncio.run(main())
