"""yfinance data source -- optional fallback only.

yfinance is rate-limited/blocked from many networks (including some SG ISPs),
so the primary pipeline in ``ingest.py`` uses BeanSprout + Yahoo Chart API.
These helpers stay available for local use or as a manual fallback and return
the same normalized dict shape as ``ingest.fetch_stock`` / ``fetch_dividends``.
"""

import logging

import yfinance as yf

from app.services.ingest import clean_name, normalize_frequency

logger = logging.getLogger(__name__)


def fetch_stock(ticker: str) -> dict | None:
    try:
        t = yf.Ticker(ticker)
        info = t.info
        if not info or info.get("quoteType") is None:
            return None

        div_yield = info.get("dividendYield")
        if div_yield and div_yield > 1:  # yfinance sometimes returns percent
            div_yield = div_yield / 100

        return {
            "ticker": ticker.upper(),
            "name": clean_name(info.get("longName") or info.get("shortName"), ticker),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "description": info.get("longBusinessSummary"),
            "website": info.get("website"),
            "address": ", ".join(
                filter(None, [info.get("address1"), info.get("city"), info.get("country")])
            )
            or None,
            "currency": info.get("currency", "SGD"),
            "last_price": info.get("currentPrice") or info.get("regularMarketPrice"),
            "forward_dividend_yield": div_yield,
            "ttm_dividend_yield": info.get("trailingAnnualDividendYield"),
            "five_year_avg_yield": info.get("fiveYearAvgDividendYield"),
            "annual_dividend_rate": info.get("dividendRate"),
            "ttm_dividend_rate": info.get("trailingAnnualDividendRate"),
            "dividend_frequency": normalize_frequency(info.get("dividendFrequency")),
            "payout_ratio": info.get("payoutRatio"),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "is_active": True,
        }
    except Exception:
        logger.exception("yfinance: failed to fetch info for %s", ticker)
        return None


def fetch_dividends(ticker: str) -> list[dict]:
    try:
        divs = yf.Ticker(ticker).dividends
        if divs.empty:
            return []
        return [
            {"ex_date": idx.date(), "amount_per_share": float(val), "currency": "SGD"}
            for idx, val in divs.items()
        ]
    except Exception:
        logger.exception("yfinance: failed to fetch dividends for %s", ticker)
        return []


def fetch_prices(ticker: str, period: str = "10y") -> list[dict]:
    try:
        hist = yf.Ticker(ticker).history(period=period)
        if hist.empty:
            return []
        return [
            {"date": idx.date(), "close_price": round(float(row["Close"]), 4)}
            for idx, row in hist.iterrows()
        ]
    except Exception:
        logger.exception("yfinance: failed to fetch prices for %s", ticker)
        return []
