from datetime import date

from pydantic import BaseModel

from app.schemas.stock import StockResponse


class HoldingCreate(BaseModel):
    ticker: str
    shares: int
    cost_per_share: float
    purchase_date: str
    notes: str | None = None


class HoldingUpdate(BaseModel):
    shares: int | None = None
    cost_per_share: float | None = None
    purchase_date: str | None = None
    notes: str | None = None


class HoldingResponse(BaseModel):
    id: int
    stock_id: int
    shares: int
    cost_per_share: float
    purchase_date: date
    notes: str | None
    dividends_received: float
    stock: StockResponse

    model_config = {"from_attributes": True}


class GroupedHolding(BaseModel):
    stock: StockResponse
    total_shares: int
    avg_cost: float
    total_cost: float
    market_value: float | None
    dividends_received: float
    lots: list[HoldingResponse]
