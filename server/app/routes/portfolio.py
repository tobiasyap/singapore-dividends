from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_user
from app.models.daily_price import DailyPrice
from app.models.dividend import Dividend
from app.models.holding import Holding
from app.models.portfolio import Portfolio
from app.models.user import User
from app.schemas.portfolio import (
    MonthlyDividend,
    PortfolioHistoryPoint,
    PortfolioOverview,
    SectorAllocation,
)
from app.services.fx import load_rates, to_sgd

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


async def _get_portfolio(db: AsyncSession, user: User) -> Portfolio:
    result = await db.execute(
        select(Portfolio).where(Portfolio.user_id == user.id).limit(1)
    )
    return result.scalar_one_or_none()


@router.get("", response_model=PortfolioOverview)
async def get_portfolio_overview(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    portfolio = await _get_portfolio(db, user)
    if not portfolio:
        return PortfolioOverview(
            total_value=0,
            total_cost=0,
            unrealised_gain=0,
            unrealised_gain_pct=0,
            forward_yield=None,
            projected_annual_income=0,
            sector_allocations=[],
        )

    result = await db.execute(
        select(Holding)
        .where(Holding.portfolio_id == portfolio.id)
        .options(selectinload(Holding.stock))
    )
    holdings = result.scalars().all()
    rates = await load_rates(db)  # portfolio totals are all in SGD

    total_value = 0.0
    total_cost = 0.0
    annual_income = 0.0
    sector_values: dict[str, float] = defaultdict(float)

    for h in holdings:
        cur = h.stock.currency or "SGD"
        total_cost += h.shares * to_sgd(h.cost_per_share, cur, rates)
        price = to_sgd(h.stock.last_price, cur, rates)
        if price:
            value = h.shares * price
            total_value += value
            sector = h.stock.sector or "Other"
            sector_values[sector] += value
        if h.stock.annual_dividend_rate:
            annual_income += h.shares * to_sgd(h.stock.annual_dividend_rate, cur, rates)

    unrealised = total_value - total_cost
    unrealised_pct = (unrealised / total_cost) if total_cost else 0
    fwd_yield = (annual_income / total_value) if total_value else None

    allocations = [
        SectorAllocation(
            sector=s,
            value=round(v, 2),
            percentage=round(v / total_value * 100, 2) if total_value else 0,
        )
        for s, v in sorted(sector_values.items(), key=lambda x: -x[1])
    ]

    return PortfolioOverview(
        total_value=round(total_value, 2),
        total_cost=round(total_cost, 2),
        unrealised_gain=round(unrealised, 2),
        unrealised_gain_pct=round(unrealised_pct, 4),
        forward_yield=round(fwd_yield, 4) if fwd_yield else None,
        projected_annual_income=round(annual_income, 2),
        sector_allocations=allocations,
    )


@router.get("/history", response_model=list[PortfolioHistoryPoint])
async def get_portfolio_history(
    period: str = Query("1y"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    portfolio = await _get_portfolio(db, user)
    if not portfolio:
        return []

    periods = {"1m": 30, "3m": 90, "6m": 180, "1y": 365, "all": 3650}
    days = periods.get(period, 365)
    since = date.today() - timedelta(days=days)

    result = await db.execute(
        select(Holding)
        .where(Holding.portfolio_id == portfolio.id)
        .options(selectinload(Holding.stock))
    )
    holdings = result.scalars().all()
    if not holdings:
        return []

    rates = await load_rates(db)  # spot FX applied across all history (approximation)
    ccy_by_stock = {h.stock_id: (h.stock.currency or "SGD") for h in holdings}

    stock_ids = list({h.stock_id for h in holdings})
    result = await db.execute(
        select(DailyPrice)
        .where(DailyPrice.stock_id.in_(stock_ids), DailyPrice.date >= since)
        .order_by(DailyPrice.date)
    )
    prices = result.scalars().all()

    price_map: dict[tuple[int, date], float] = {}
    all_dates: set[date] = set()
    for p in prices:
        price_map[(p.stock_id, p.date)] = to_sgd(p.close_price, ccy_by_stock.get(p.stock_id), rates)
        all_dates.add(p.date)

    last_known: dict[int, float] = {}
    history: list[PortfolioHistoryPoint] = []

    for d in sorted(all_dates):
        total = 0.0
        for h in holdings:
            if h.purchase_date > d:
                continue
            price = price_map.get((h.stock_id, d))
            if price is not None:
                last_known[h.stock_id] = price
            p = last_known.get(h.stock_id)
            if p:
                total += h.shares * p
        if total > 0:
            history.append(PortfolioHistoryPoint(date=d.isoformat(), value=round(total, 2)))

    return history


@router.get("/dividends", response_model=list[MonthlyDividend])
async def get_portfolio_dividends(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    portfolio = await _get_portfolio(db, user)
    if not portfolio:
        return []

    result = await db.execute(
        select(Holding).where(Holding.portfolio_id == portfolio.id)
    )
    holdings = result.scalars().all()
    if not holdings:
        return []

    stock_ids = list({h.stock_id for h in holdings})
    one_year_ago = date.today() - timedelta(days=365)

    result = await db.execute(
        select(Dividend)
        .where(Dividend.stock_id.in_(stock_ids), Dividend.ex_date >= one_year_ago)
        .order_by(Dividend.ex_date)
    )
    dividends = result.scalars().all()
    rates = await load_rates(db)

    holding_map: dict[int, list[Holding]] = defaultdict(list)
    for h in holdings:
        holding_map[h.stock_id].append(h)

    # Zero-fill all 12 calendar months so the chart always shows a full
    # trailing year, not just the months that happened to pay a dividend.
    today = date.today()
    month_keys: list[str] = []
    for i in range(11, -1, -1):
        y, m = today.year, today.month - i
        while m <= 0:
            m += 12
            y -= 1
        month_keys.append(f"{y:04d}-{m:02d}")

    monthly: dict[str, float] = {k: 0.0 for k in month_keys}
    for div in dividends:
        month_key = div.ex_date.strftime("%Y-%m")
        if month_key not in monthly:
            continue
        amount_sgd = to_sgd(div.amount_per_share, div.currency, rates)
        for h in holding_map.get(div.stock_id, []):
            if h.purchase_date <= div.ex_date:
                monthly[month_key] += amount_sgd * h.shares

    return [MonthlyDividend(month=m, amount=round(monthly[m], 2)) for m in month_keys]
