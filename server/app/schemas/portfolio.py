from pydantic import BaseModel


class SectorAllocation(BaseModel):
    sector: str
    value: float
    percentage: float


class PortfolioOverview(BaseModel):
    total_value: float
    total_cost: float
    unrealised_gain: float
    unrealised_gain_pct: float
    forward_yield: float | None
    projected_annual_income: float
    sector_allocations: list[SectorAllocation]


class PortfolioHistoryPoint(BaseModel):
    date: str
    value: float


class MonthlyDividend(BaseModel):
    month: str
    amount: float
