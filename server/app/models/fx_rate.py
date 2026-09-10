from datetime import datetime

from sqlalchemy import DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class FxRate(Base):
    """Spot exchange rate to SGD. One row per foreign currency we hold.

    `sgd_per_unit` = how many SGD one unit of `currency` is worth (e.g. USD ~1.27).
    Refreshed by the nightly job from Yahoo (`<CUR>SGD=X`).
    """

    __tablename__ = "fx_rates"

    currency: Mapped[str] = mapped_column(String(3), primary_key=True)
    sgd_per_unit: Mapped[float] = mapped_column(Float)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
