"""Refresh every active stock: company info + dividends + incremental prices.

Entry point for the scheduled job (.github/workflows/refresh-data.yml). Safe to
run by hand any time.

    python -m scripts.refresh                 # info + dividends + prices
    python -m scripts.refresh --prices-only    # just the daily price gap

Exits non-zero only if more than a quarter of stocks failed -- a single transient
source hiccup should not fail the whole run.
"""

import asyncio
import logging
import sys

from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

FAILURE_THRESHOLD = 0.25


def _db_fingerprint() -> str:
    """Scheme + host + length of DATABASE_URL -- no credentials. For CI debugging."""
    url = settings.database_url.strip()
    scheme = url.split("://", 1)[0] if "://" in url else "(no ://)"
    host = url.split("@")[-1].split("/")[0] if "@" in url else "(no @)"
    return f"scheme={scheme!r} host={host!r} len={len(url)}"


# Logged before importing app.database, whose engine is built at import time and
# would raise here on a malformed URL.
logger.info("DB %s", _db_fingerprint())

from app.database import async_session  # noqa: E402
from app.services.ingest import refresh_all  # noqa: E402


async def main(prices_only: bool):
    async with async_session() as db:
        result = await refresh_all(
            db,
            info=not prices_only,
            dividends=not prices_only,
            prices=True,
        )

    logger.info("Refresh complete: %s", result)
    total = result["total"] or 1
    failed = result["failed"]
    if len(failed) / total > FAILURE_THRESHOLD:
        logger.error("%d/%d stocks failed -- likely a source/schema break", len(failed), total)
        sys.exit(1)
    if failed:
        logger.warning("Some stocks failed (below threshold): %s", ", ".join(failed))


if __name__ == "__main__":
    asyncio.run(main("--prices-only" in sys.argv))
