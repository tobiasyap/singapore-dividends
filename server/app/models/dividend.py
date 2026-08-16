from datetime import date

from sqlalchemy import ForeignKey, Float, String, Date, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Dividend(Base):
    __tablename__ = "dividends"
    __table_args__ = (UniqueConstraint("stock_id", "ex_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("stocks.id"), index=True)
    ex_date: Mapped[date] = mapped_column(Date)
    pay_date: Mapped[date | None] = mapped_column(Date)
    amount_per_share: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(10), default="SGD")

    stock: Mapped["Stock"] = relationship(back_populates="dividends")
