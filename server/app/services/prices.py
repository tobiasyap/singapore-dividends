from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.daily_price import DailyPrice


async def get_recent_closes(
    db: AsyncSession, stock_ids: list[int], days: int = 30
) -> dict[int, list[float]]:
    """{stock_id: [close_price, ...]} oldest->newest, for a trend sparkline."""
    if not stock_ids:
        return {}
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(DailyPrice.stock_id, DailyPrice.close_price)
        .where(DailyPrice.stock_id.in_(stock_ids), DailyPrice.date >= since)
        .order_by(DailyPrice.stock_id, DailyPrice.date)
    )
    out: dict[int, list[float]] = {}
    for stock_id, close_price in result.all():
        out.setdefault(stock_id, []).append(close_price)
    return out
