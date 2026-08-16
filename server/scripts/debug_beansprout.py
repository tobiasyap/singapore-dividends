"""Debug: check what fields BeanSprout provides for CICT (REIT)."""
import re
import httpx
from bs4 import BeautifulSoup

resp = httpx.get(
    "https://growbeansprout.com/quote/C38U.SI",
    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
    follow_redirects=True,
)
soup = BeautifulSoup(resp.text, "html.parser")

for s in soup.find_all("script"):
    text = s.string or ""
    if "regularMarketPrice" not in text:
        continue

    for keyword in ["api/", "/chart", "yahoo", "finance.api", "query1.", "query2.", "cdn.growbeansprout", "strapi", "/api/stocks", "/api/quote"]:
        for m in re.finditer(re.escape(keyword), text):
            snippet = text[max(0,m.start()-40):m.start()+160]
            print(f"\n--- '{keyword}' at pos {m.start()} ---")
            print(snippet)
            break
