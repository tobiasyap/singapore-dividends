from datetime import date

from sqlalchemy import ForeignKey, Float, Date, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class DailyPrice(Base):
    __tablename__ = "daily_prices"
    __table_args__ = (UniqueConstraint("stock_id", "date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("stocks.id"), index=True)
    date: Mapped[date] = mapped_column(Date)
    close_price: Mapped[float] = mapped_column(Float)

    stock: Mapped["Stock"] = relationship(back_populates="daily_prices")
