from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_user
from app.models.dividend import Dividend
from app.models.holding import Holding
from app.models.portfolio import Portfolio
from app.models.stock import Stock
from app.models.user import User
from app.schemas.holding import (
    GroupedHolding,
    HoldingCreate,
    HoldingResponse,
    HoldingUpdate,
)
from app.schemas.stock import StockResponse
from app.services.beansprout_scraper import fetch_stock_from_beansprout, fetch_dividends_from_beansprout
from app.services.data_fetcher import upsert_stock, upsert_dividends

router = APIRouter(prefix="/api/holdings", tags=["holdings"])


async def _get_portfolio(db: AsyncSession, user: User) -> Portfolio:
    result = await db.execute(
        select(Portfolio).where(Portfolio.user_id == user.id).limit(1)
    )
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        portfolio = Portfolio(user_id=user.id, name="My Portfolio")
        db.add(portfolio)
        await db.flush()
    return portfolio


@router.get("", response_model=list[GroupedHolding])
async def get_holdings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    portfolio = await _get_portfolio(db, user)
    result = await db.execute(
        select(Holding)
        .where(Holding.portfolio_id == portfolio.id)
        .options(selectinload(Holding.stock))
        .order_by(Holding.stock_id, Holding.purchase_date)
    )
    holdings = result.scalars().all()

    stock_ids = list({h.stock_id for h in holdings})
    div_result = await db.execute(
        select(Dividend).where(Dividend.stock_id.in_(stock_ids)).order_by(Dividend.ex_date)
    )
    all_dividends = div_result.scalars().all()
    divs_by_stock: dict[int, list[Dividend]] = defaultdict(list)
    for d in all_dividends:
        divs_by_stock[d.stock_id].append(d)

    def _calc_divs_received(holding: Holding) -> float:
        total = 0.0
        for d in divs_by_stock.get(holding.stock_id, []):
            if d.ex_date >= holding.purchase_date:
                total += d.amount_per_share * holding.shares
        return round(total, 2)

    grouped: dict[int, list[Holding]] = defaultdict(list)
    for h in holdings:
        grouped[h.stock_id].append(h)

    out: list[GroupedHolding] = []
    for stock_id, lots in grouped.items():
        stock = lots[0].stock
        total_shares = sum(l.shares for l in lots)
        total_cost = sum(l.shares * l.cost_per_share for l in lots)
        avg_cost = total_cost / total_shares if total_shares else 0
        market_value = (stock.last_price * total_shares) if stock.last_price else None

        lot_responses = []
        group_divs = 0.0
        for l in lots:
            lot_divs = _calc_divs_received(l)
            group_divs += lot_divs
            lr = HoldingResponse(
                id=l.id,
                stock_id=l.stock_id,
                shares=l.shares,
                cost_per_share=l.cost_per_share,
                purchase_date=l.purchase_date,
                notes=l.notes,
                dividends_received=lot_divs,
                stock=StockResponse.model_validate(stock),
            )
            lot_responses.append(lr)

        out.append(
            GroupedHolding(
                stock=StockResponse.model_validate(stock),
                total_shares=total_shares,
                avg_cost=round(avg_cost, 4),
                total_cost=round(total_cost, 2),
                market_value=round(market_value, 2) if market_value else None,
                dividends_received=round(group_divs, 2),
                lots=lot_responses,
            )
        )

    out.sort(key=lambda g: g.market_value or 0, reverse=True)
    return out


@router.post("", response_model=HoldingResponse, status_code=201)
async def add_holding(
    body: HoldingCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    portfolio = await _get_portfolio(db, user)

    result = await db.execute(
        select(Stock).where(Stock.ticker == body.ticker.upper())
    )
    stock = result.scalar_one_or_none()

    if not stock:
        info = fetch_stock_from_beansprout(body.ticker.upper())
        if not info:
            raise HTTPException(status_code=404, detail="Stock not found on SGX")
        stock = await upsert_stock(db, info)
        divs = fetch_dividends_from_beansprout(body.ticker.upper())
        if divs:
            await upsert_dividends(db, stock.id, divs)
        await db.commit()

    holding = Holding(
        portfolio_id=portfolio.id,
        stock_id=stock.id,
        shares=body.shares,
        cost_per_share=body.cost_per_share,
        purchase_date=date.fromisoformat(body.purchase_date),
        notes=body.notes,
    )
    db.add(holding)
    await db.commit()

    result = await db.execute(
        select(Holding)
        .where(Holding.id == holding.id)
        .options(selectinload(Holding.stock))
    )
    h = result.scalar_one()
    div_result = await db.execute(
        select(Dividend).where(Dividend.stock_id == h.stock_id, Dividend.ex_date >= h.purchase_date)
    )
    divs_total = sum(d.amount_per_share * h.shares for d in div_result.scalars().all())
    return HoldingResponse(
        id=h.id, stock_id=h.stock_id, shares=h.shares, cost_per_share=h.cost_per_share,
        purchase_date=h.purchase_date, notes=h.notes, dividends_received=round(divs_total, 2),
        stock=StockResponse.model_validate(h.stock),
    )


@router.put("/{holding_id}", response_model=HoldingResponse)
async def update_holding(
    holding_id: int,
    body: HoldingUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    portfolio = await _get_portfolio(db, user)
    result = await db.execute(
        select(Holding)
        .where(Holding.id == holding_id, Holding.portfolio_id == portfolio.id)
        .options(selectinload(Holding.stock))
    )
    holding = result.scalar_one_or_none()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    if body.shares is not None:
        holding.shares = body.shares
    if body.cost_per_share is not None:
        holding.cost_per_share = body.cost_per_share
    if body.purchase_date is not None:
        holding.purchase_date = date.fromisoformat(body.purchase_date)
    if body.notes is not None:
        holding.notes = body.notes

    await db.commit()
    await db.refresh(holding)

    div_result = await db.execute(
        select(Dividend).where(Dividend.stock_id == holding.stock_id, Dividend.ex_date >= holding.purchase_date)
    )
    divs_total = sum(d.amount_per_share * holding.shares for d in div_result.scalars().all())
    return HoldingResponse(
        id=holding.id, stock_id=holding.stock_id, shares=holding.shares,
        cost_per_share=holding.cost_per_share, purchase_date=holding.purchase_date,
        notes=holding.notes, dividends_received=round(divs_total, 2),
        stock=StockResponse.model_validate(holding.stock),
    )


@router.delete("/{holding_id}", status_code=204)
async def delete_holding(
    holding_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    portfolio = await _get_portfolio(db, user)
    result = await db.execute(
        select(Holding).where(
            Holding.id == holding_id, Holding.portfolio_id == portfolio.id
        )
    )
    holding = result.scalar_one_or_none()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    await db.delete(holding)
    await db.commit()
