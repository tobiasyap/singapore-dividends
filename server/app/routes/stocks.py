from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_, func, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.dividend import Dividend
from app.models.daily_price import DailyPrice
from app.models.stock import Stock
from app.schemas.stock import (
    DividendResponse,
    PriceResponse,
    StockResponse,
    StockSearchResult,
)

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get("/search", response_model=list[StockSearchResult])
async def search_stocks(
    q: str = Query("", min_length=0),
    sector: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Stock).where(Stock.is_active.is_(True))
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(Stock.ticker.ilike(pattern), Stock.name.ilike(pattern))
        )
    if sector:
        stmt = stmt.where(Stock.sector == sector)
    stmt = stmt.order_by(Stock.market_cap.desc().nulls_last()).limit(100)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{ticker}", response_model=StockResponse)
async def get_stock(ticker: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Stock).where(Stock.ticker == ticker.upper())
    )
    stock = result.scalar_one_or_none()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    one_year_ago = date.today() - timedelta(days=365)
    result = await db.execute(
        select(func.sum(Dividend.amount_per_share))
        .where(Dividend.stock_id == stock.id, Dividend.ex_date >= one_year_ago)
    )
    ttm_div_total = result.scalar() or 0

    if stock.last_price and ttm_div_total > 0:
        stock.ttm_dividend_yield = round(ttm_div_total / stock.last_price, 4)
        stock.ttm_dividend_rate = round(ttm_div_total, 4)

    if stock.pe_ratio and stock.last_price and ttm_div_total > 0:
        eps = stock.last_price / stock.pe_ratio
        stock.payout_ratio = round(ttm_div_total / eps, 4) if eps > 0 else None

    return stock


@router.get("/{ticker}/dividends", response_model=list[DividendResponse])
async def get_dividends(ticker: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Stock).where(Stock.ticker == ticker.upper())
    )
    stock = result.scalar_one_or_none()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    result = await db.execute(
        select(Dividend)
        .where(Dividend.stock_id == stock.id)
        .order_by(Dividend.ex_date.desc())
    )
    return result.scalars().all()


@router.get("/{ticker}/prices", response_model=list[PriceResponse])
async def get_prices(
    ticker: str,
    period: str = "1y",
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Stock).where(Stock.ticker == ticker.upper())
    )
    stock = result.scalar_one_or_none()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    periods = {"1m": 30, "3m": 90, "6m": 180, "1y": 365, "5y": 1825, "10y": 3650, "max": 36500}
    days = periods.get(period, 365)
    since = date.today() - timedelta(days=days)

    result = await db.execute(
        select(DailyPrice)
        .where(DailyPrice.stock_id == stock.id, DailyPrice.date >= since)
        .order_by(DailyPrice.date)
    )
    return result.scalars().all()
