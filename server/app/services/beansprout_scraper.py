import asyncio
import logging
import math
import re
from datetime import datetime

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}


def _extract_field(text: str, field: str) -> str | None:
    # Order matters: BeanSprout pages embed a peer/screener table where the same
    # field can appear as a bare integer (e.g. `dividendYield:6`). Fractional
    # values (`.0454`) belong to the target stock and appear first in the doc,
    # so try the leading-dot decimal form before the bare-integer form.
    patterns = [
        rf'{field}:"([^"]*)"',
        rf'{field}:(\d+\.\d+)',
        rf'{field}:(\.\d+)',
        rf'{field}:(\d+)',
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            return m.group(1)
    return None


def _extract_float(text: str, field: str) -> float | None:
    val = _extract_field(text, field)
    if val is None:
        return None
    try:
        return float(val)
    except ValueError:
        return None


def _extract_int(text: str, field: str) -> int | None:
    m = re.search(rf'{field}:"?(\d+)"?', text)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            return None
    return None


def _extract_data_from_sveltekit(html: str) -> dict | None:
    soup = BeautifulSoup(html, "html.parser")
    for script in soup.find_all("script"):
        text = script.string or ""
        if "regularMarketPrice" not in text:
            continue

        name_match = re.search(r'symbol:\{[^}]*?name:"([^"]+)"', text)
        ticker_match = re.search(r'exchangeTicker:"([^"]+)"', text)

        return {
            "name": name_match.group(1) if name_match else None,
            "exchangeTicker": ticker_match.group(1) if ticker_match else None,
            "regularMarketPrice": _extract_float(text, "regularMarketPrice"),
            "dividendYield": _extract_float(text, "dividendYield"),
            "dividendRate": _extract_float(text, "dividendRate"),
            "marketCap": _extract_int(text, "marketCap"),
            "trailingPE": _extract_float(text, "trailingPE"),
            "sectorName": _extract_field(text, "sectorName"),
            "industryName": _extract_field(text, "industryName"),
            "website": _extract_field(text, "website"),
            "headquarters": _extract_field(text, "headquarters"),
            "ceo": _extract_field(text, "ceo"),
            "employees": _extract_int(text, "employees"),
            "dividendFrequency": _extract_field(text, "dividendFrequency"),
            "payoutRatio": _extract_float(text, "payoutRatio"),
            "targetPrice": _extract_float(text, "targetPrice"),
            "trailingAnnualDividendYield": _extract_float(text, "trailingAnnualDividendYield"),
            "trailingAnnualDividendRate": _extract_float(text, "trailingAnnualDividendRate"),
        }
    return None


def _extract_description(html: str) -> str | None:
    soup = BeautifulSoup(html, "html.parser")
    section = soup.select_one('section[data-content="company-description"]')
    if section:
        p = section.find("p")
        if p:
            return p.get_text(strip=True)
    return None


def _parse_dividends_html(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    section = soup.select_one('section[data-content="dividend-payout-history"]')
    if not section:
        return []

    table = section.find("table")
    if not table:
        return []

    # BeanSprout splits one payout into multiple rows sharing an ex-date (e.g. a
    # REIT distribution broken into taxable / tax-exempt / capital components).
    # Aggregate rows by ex-date so each payment is a single dividend record.
    by_ex_date: dict = {}
    for row in table.find_all("tr"):
        classes = row.get("class", [])
        if "card-regular" not in classes:
            continue
        cells = row.find_all("td")
        if len(cells) < 3:
            continue
        try:
            ex_date_str = cells[0].get_text(strip=True)
            pay_date_str = cells[1].get_text(strip=True)
            amount_str = cells[2].get_text(strip=True).replace("$", "").replace(",", "")

            ex_date = datetime.strptime(ex_date_str, "%d %b %Y").date()
            pay_date = None
            if pay_date_str and pay_date_str != "-":
                try:
                    pay_date = datetime.strptime(pay_date_str, "%d %b %Y").date()
                except ValueError:
                    pass
            amount = float(amount_str)
        except (ValueError, IndexError):
            continue

        entry = by_ex_date.setdefault(
            ex_date, {"ex_date": ex_date, "pay_date": pay_date, "_parts": [], "currency": "SGD"}
        )
        entry["_parts"].append(amount)
        if pay_date and not entry["pay_date"]:
            entry["pay_date"] = pay_date

    return [
        {
            "ex_date": d["ex_date"],
            "pay_date": d["pay_date"],
            "amount_per_share": math.fsum(d["_parts"]),
            "currency": d["currency"],
        }
        for d in sorted(by_ex_date.values(), key=lambda d: d["ex_date"], reverse=True)
    ]


async def fetch_stock_from_beansprout(ticker: str) -> dict | None:
    clean_ticker = ticker.upper()
    try:
        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=15) as client:
            resp = await client.get(f"https://growbeansprout.com/quote/{clean_ticker}")
            if resp.status_code != 200:
                logger.warning("BeanSprout returned %d for %s", resp.status_code, clean_ticker)
                return None

            data = _extract_data_from_sveltekit(resp.text)
            description = _extract_description(resp.text)

            if not data or not data.get("regularMarketPrice"):
                logger.warning("No data found for %s", clean_ticker)
                return None

            market_cap = data.get("marketCap")
            if isinstance(market_cap, str):
                try:
                    market_cap = int(market_cap)
                except ValueError:
                    market_cap = None

            is_reit = "realEstateInvestmentTrust" in (resp.text if not data.get("sectorName") else "")
            sector = data.get("sectorName") or ("Real Estate" if is_reit else None)
            industry = data.get("industryName") or ("REIT" if is_reit else None)

            return {
                "ticker": clean_ticker,
                "name": data.get("name") or clean_ticker,
                "sector": sector,
                "industry": industry,
                "description": description,
                "website": data.get("website"),
                "address": data.get("headquarters"),
                "currency": "SGD",
                "last_price": data.get("regularMarketPrice"),
                "forward_dividend_yield": data.get("dividendYield"),
                "ttm_dividend_yield": data.get("trailingAnnualDividendYield"),
                "five_year_avg_yield": None,
                "annual_dividend_rate": data.get("dividendRate"),
                "ttm_dividend_rate": data.get("trailingAnnualDividendRate"),
                "dividend_frequency": data.get("dividendFrequency"),
                "payout_ratio": data.get("payoutRatio"),
                "market_cap": market_cap,
                "pe_ratio": data.get("trailingPE"),
                "is_active": True,
                "last_updated": datetime.utcnow(),
            }
    except Exception:
        logger.exception("Failed to scrape BeanSprout for %s", clean_ticker)
        return None


async def fetch_dividends_from_beansprout(ticker: str) -> list[dict]:
    clean_ticker = ticker.upper()
    try:
        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=15) as client:
            resp = await client.get(f"https://growbeansprout.com/quote/{clean_ticker}/dividend")
            if resp.status_code != 200:
                return []
            return _parse_dividends_html(resp.text)
    except Exception:
        logger.exception("Failed to scrape dividends from BeanSprout for %s", clean_ticker)
        return []


async def _yahoo_chart(ticker: str, period: str, events: str | None = None, retries: int = 3) -> dict | None:
    """Return the raw `chart.result[0]` object from the Yahoo Chart API, or None."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker.upper()}"
    params = {"range": period, "interval": "1d"}
    if events:
        params["events"] = events
    chart_headers = {**HEADERS, "Accept": "application/json, */*"}
    try:
        async with httpx.AsyncClient(headers=chart_headers, follow_redirects=True, timeout=15) as client:
            for attempt in range(retries):
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    result = resp.json().get("chart", {}).get("result", [])
                    return result[0] if result else None
                logger.warning(
                    "Yahoo chart %d for %s (attempt %d/%d)",
                    resp.status_code, ticker, attempt + 1, retries,
                )
                await asyncio.sleep(3 * (attempt + 1))
    except Exception:
        logger.exception("Failed to fetch Yahoo chart for %s", ticker)
    return None


async def fetch_price_history_yahoo_chart(ticker: str, period: str = "10y", retries: int = 3) -> list[dict]:
    result = await _yahoo_chart(ticker, period, retries=retries)
    if not result:
        return []
    timestamps = result.get("timestamp", [])
    closes = result.get("indicators", {}).get("quote", [{}])[0].get("close", [])
    prices = []
    for ts, close in zip(timestamps, closes):
        if close is None:
            continue
        prices.append(
            {"date": datetime.utcfromtimestamp(ts).date(), "close_price": float(close)}
        )
    return prices


async def fetch_quote_yahoo(ticker: str) -> dict | None:
    """Latest close + trading currency from the Yahoo Chart API `meta` block."""
    result = await _yahoo_chart(ticker, "5d")
    if not result:
        return None
    meta = result.get("meta", {})
    closes = [
        c
        for c in result.get("indicators", {}).get("quote", [{}])[0].get("close", [])
        if c is not None
    ]
    return {
        "last_price": float(closes[-1]) if closes else meta.get("regularMarketPrice"),
        "currency": meta.get("currency"),
    }


async def fetch_dividends_yahoo_chart(ticker: str, period: str = "max", retries: int = 3) -> list[dict]:
    """Full dividend history from the Yahoo Chart API `events` payload.

    Clean and complete (no split components, no peer-table pollution). The event
    `date` is the ex-dividend date; Yahoo does not provide the payment date.
    """
    result = await _yahoo_chart(ticker, period, events="div", retries=retries)
    if not result:
        return []
    raw = result.get("events", {}).get("dividends", {})
    out = []
    for ev in raw.values():
        try:
            out.append(
                {
                    "ex_date": datetime.utcfromtimestamp(ev["date"]).date(),
                    "pay_date": None,
                    "amount_per_share": float(ev["amount"]),
                    "currency": "SGD",
                }
            )
        except (KeyError, TypeError, ValueError):
            continue
    out.sort(key=lambda d: d["ex_date"], reverse=True)
    return out
