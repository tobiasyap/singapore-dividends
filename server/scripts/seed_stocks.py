"""Seed the database with the SGX dividend universe via the unified ingest pipeline.

Idempotent -- safe to re-run; existing stocks are refreshed in place.

    python -m scripts.seed_stocks              # the whole list
    python -m scripts.seed_stocks D05.SI O39.SI   # just these

The list below was built by surveying BeanSprout's /reits and /securities/stocks
directories through the pipeline (2026-09) and keeping names that have paid a
dividend within the last ~15 months.

Some names trade in USD/GBP/EUR -- their prices and dividends are stored and
shown in that currency; aggregated views (holdings, portfolio) convert to SGD
at the spot rate (see services/fx.py).

Anything not listed here can still be pulled in on demand via the add-ticker flow.
"""

import asyncio
import logging
import sys

from app.database import async_session
from app.services.ingest import ingest_stock

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

# Blue chips + established dividend mid-caps (SGD)
STOCKS = [
    "D05.SI",   # DBS Group Holdings
    "O39.SI",   # OCBC
    "U11.SI",   # United Overseas Bank
    "Z74.SI",   # Singtel
    "CC3.SI",   # StarHub
    "S68.SI",   # Singapore Exchange (SGX)
    "S63.SI",   # ST Engineering
    "BN4.SI",   # Keppel
    "9CI.SI",   # CapitaLand Investment
    "C6L.SI",   # Singapore Airlines
    "F34.SI",   # Wilmar International
    "BS6.SI",   # Yangzijiang Shipbuilding
    "C07.SI",   # Jardine Cycle & Carriage
    "J36.SI",   # Jardine Matheson (USD)
    "H78.SI",   # Hongkong Land (USD)
    "D01.SI",   # DFI Retail Group (USD)
    "Y92.SI",   # Thai Beverage
    "U96.SI",   # Sembcorp Industries
    "C09.SI",   # City Developments
    "U14.SI",   # UOL Group
    "G13.SI",   # Genting Singapore
    "5E2.SI",   # Seatrium
    "EB5.SI",   # First Resources
    "S58.SI",   # SATS
    "OV8.SI",   # Sheng Siong
    "V03.SI",   # Venture Corporation
    "E5H.SI",   # Golden Agri-Resources
    "TQ5.SI",   # Frasers Property
    "U10.SI",   # UOB-Kay Hian
    "VC2.SI",   # Olam Group
    "S59.SI",   # SIA Engineering
    "H02.SI",   # Haw Par Corporation
    "AWX.SI",   # AEM Holdings
    "C52.SI",   # ComfortDelGro
    "AIY.SI",   # iFAST Corporation
    "F17.SI",   # GuocoLand
    "H22.SI",   # Hong Leong Asia
    "H15.SI",   # Hotel Properties
    "558.SI",   # UMS Integration
    "8YZ.SI",   # Yangzijiang Maritime Development
    "BVA.SI",   # Top Glove
    "BSL.SI",   # Raffles Medical Group
    "F03.SI",   # Food Empire Holdings
    "OU8.SI",   # Centurion Corporation
    "OYY.SI",   # PropNex
    "G92.SI",   # China Aviation Oil
    "PCT.SI",   # PC Partner Group
    "P52.SI",   # Pan-United Corporation
    "AP4.SI",   # Riverstone Holdings
    "E28.SI",   # Frencken Group
    "S61.SI",   # SBS Transit
    "BEC.SI",   # BRC Asia
    "S41.SI",   # Hong Leong Finance
    "Z25.SI",   # Yanlord Land Group
    "RE4.SI",   # Geo Energy Resources
    "T6I.SI",   # Valuemax Group
    "F9D.SI",   # Boustead Singapore
    "544.SI",   # CSE Global
    "5WJ.SI",   # Moneymax Financial Services
    "S08.SI",   # Singapore Post
    "LJ3.SI",   # OUE
    "QES.SI",   # China Sunsine Chemical
    "MZH.SI",   # Nanofilm Technologies
    "E3B.SI",   # Wee Hur Holdings
    "5TP.SI",   # CNMC Goldmine Holdings
    "F83.SI",   # COSCO Shipping International (Singapore)
    "S56.SI",   # Samudera Shipping Line
    "P34.SI",   # Delfi
    "8AZ.SI",   # Aztech Global
    "ZQM.SI",   # Soilbuild Construction Group
]

# S-REITs (SGD-denominated only)
REITS = [
    "C38U.SI",  # CapitaLand Integrated Commercial Trust
    "A17U.SI",  # CapitaLand Ascendas REIT
    "N2IU.SI",  # Mapletree Pan Asia Commercial Trust
    "M44U.SI",  # Mapletree Logistics Trust
    "ME8U.SI",  # Mapletree Industrial Trust
    "AJBU.SI",  # Keppel DC REIT
    "J69U.SI",  # Frasers Centrepoint Trust
    "K71U.SI",  # Keppel REIT
    "T82U.SI",  # Suntec REIT
    "BUOU.SI",  # Frasers Logistics & Commercial Trust
    "HMN.SI",   # CapitaLand Ascott Trust
    "C2PU.SI",  # Parkway Life REIT
    "TS0U.SI",  # OUE REIT
    "8C8U.SI",  # Centurion Accommodation REIT
    "JYEU.SI",  # Lendlease Global Commercial REIT
    "9A4U.SI",  # ESR REIT
    "CY6U.SI",  # CapitaLand India Trust
    "P40U.SI",  # Starhill Global REIT
    "O5RU.SI",  # AIMS APAC REIT
    "Q5T.SI",   # Far East Hospitality Trust
    "AU8U.SI",  # CapitaLand China Trust
    "J85.SI",   # CDL Hospitality Trusts
    "CRPU.SI",  # Sasseur REIT
    "M1GU.SI",  # Sabana Industrial REIT
    "AW9U.SI",  # First REIT
    "UD1U.SI",  # IREIT Global
    "DHLU.SI",  # Daiwa House Logistics Trust
    # Foreign-currency REITs (prices/dividends in the currency shown)
    "DCRU.SI",  # Digital Core REIT (USD)
    "NTDU.SI",  # NTT DC REIT (USD)
    "OXMU.SI",  # Prime US REIT (USD)
    "CMOU.SI",  # KORE US REIT (USD)
    "ODBU.SI",  # United Hampshire US REIT (USD)
    "XZL.SI",   # Acrophyte Hospitality Trust (USD)
    "MXNU.SI",  # Elite UK REIT (GBP)
    "SET.SI",   # Stoneweg Europe Stapled Trust (EUR)
]

# Business trusts
TRUSTS = [
    "CJLU.SI",  # NetLink NBN Trust
    "A7RU.SI",  # Keppel Infrastructure Trust
    "NS8U.SI",  # Hutchison Port Holdings Trust (USD)
]

SGX_DIVIDEND_TICKERS = STOCKS + REITS + TRUSTS

BATCH_DELAY = 1.5


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
            await asyncio.sleep(BATCH_DELAY)

    logger.info("Done: %d/%d succeeded", success, total)
    if failed:
        logger.warning("Failed: %s", ", ".join(failed))


if __name__ == "__main__":
    args = [t.upper() for t in sys.argv[1:]] or SGX_DIVIDEND_TICKERS
    asyncio.run(main(args))
