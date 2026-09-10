from datetime import date

from pydantic import BaseModel


class StockResponse(BaseModel):
    id: int
    ticker: str
    name: str
    sector: str | None
    industry: str | None
    description: str | None
    website: str | None
    address: str | None
    currency: str
    last_price: float | None
    forward_dividend_yield: float | None
    ttm_dividend_yield: float | None
    five_year_avg_yield: float | None
    annual_dividend_rate: float | None
    ttm_dividend_rate: float | None
    dividend_frequency: str | None
    payout_ratio: float | None
    market_cap: int | None
    pe_ratio: float | None

    model_config = {"from_attributes": True}


class StockSearchResult(BaseModel):
    id: int
    ticker: str
    name: str
    sector: str | None
    currency: str
    last_price: float | None
    forward_dividend_yield: float | None
    ttm_dividend_yield: float | None
    market_cap: int | None

    model_config = {"from_attributes": True}


class DividendResponse(BaseModel):
    id: int
    ex_date: date
    pay_date: date | None
    amount_per_share: float
    currency: str

    model_config = {"from_attributes": True}


class PriceResponse(BaseModel):
    date: date
    close_price: float

    model_config = {"from_attributes": True}
