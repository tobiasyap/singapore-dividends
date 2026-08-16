from datetime import datetime

from sqlalchemy import String, Float, Boolean, DateTime, Text, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Stock(Base):
    __tablename__ = "stocks"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    sector: Mapped[str | None] = mapped_column(String(100))
    industry: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    website: Mapped[str | None] = mapped_column(String(512))
    address: Mapped[str | None] = mapped_column(String(512))
    currency: Mapped[str] = mapped_column(String(10), default="SGD")

    last_price: Mapped[float | None] = mapped_column(Float)
    forward_dividend_yield: Mapped[float | None] = mapped_column(Float)
    ttm_dividend_yield: Mapped[float | None] = mapped_column(Float)
    five_year_avg_yield: Mapped[float | None] = mapped_column(Float)
    annual_dividend_rate: Mapped[float | None] = mapped_column(Float)
    ttm_dividend_rate: Mapped[float | None] = mapped_column(Float)
    dividend_frequency: Mapped[str | None] = mapped_column(String(50))
    payout_ratio: Mapped[float | None] = mapped_column(Float)
    market_cap: Mapped[int | None] = mapped_column(BigInteger)
    pe_ratio: Mapped[float | None] = mapped_column(Float)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_updated: Mapped[datetime | None] = mapped_column(DateTime)

    dividends: Mapped[list["Dividend"]] = relationship(back_populates="stock")
    daily_prices: Mapped[list["DailyPrice"]] = relationship(back_populates="stock")
    holdings: Mapped[list["Holding"]] = relationship(back_populates="stock")
