"""SGD conversion using spot FX rates.

A handful of SGX names trade in USD/GBP/EUR. Stock-level views show native
currency; anything aggregated (holdings, portfolio) is converted to SGD here at
the latest spot rate. Rates are cached in `fx_rates` and refreshed nightly from
Yahoo (`<CUR>SGD=X`).
"""

import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fx_rate import FxRate
from app.services.beansprout_scraper import fetch_quote_yahoo

logger = logging.getLogger(__name__)

# Foreign currencies we may hold, and their Yahoo cross ticker (quote = SGD).
FX_TICKERS = {
    "USD": "USDSGD=X",
    "GBP": "GBPSGD=X",
    "EUR": "EURSGD=X",
}


async def refresh_fx_rates(db: AsyncSession) -> dict[str, float]:
    """Fetch the latest spot rates and upsert them. Returns {currency: sgd_per_unit}."""
    out: dict[str, float] = {}
    for currency, ticker in FX_TICKERS.items():
        quote = await fetch_quote_yahoo(ticker)
        rate = quote["last_price"] if quote else None
        if not rate or rate <= 0:
            logger.warning("refresh_fx_rates: no rate for %s", currency)
            continue
        stmt = insert(FxRate).values(
            currency=currency, sgd_per_unit=rate, updated_at=datetime.utcnow()
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["currency"],
            set_={"sgd_per_unit": rate, "updated_at": datetime.utcnow()},
        )
        await db.execute(stmt)
        out[currency] = rate
    await db.commit()
    logger.info("refresh_fx_rates: %s", out)
    return out


async def load_rates(db: AsyncSession) -> dict[str, float]:
    """{currency: sgd_per_unit}, always including SGD -> 1.0."""
    rows = await db.execute(select(FxRate))
    rates = {"SGD": 1.0}
    for r in rows.scalars():
        rates[r.currency] = r.sgd_per_unit
    return rates


def to_sgd(amount: float | None, currency: str | None, rates: dict[str, float]) -> float | None:
    """Convert `amount` (in `currency`) to SGD. Missing rate -> treat as SGD (1:1)."""
    if amount is None:
        return None
    return amount * rates.get(currency or "SGD", 1.0)
