from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import auth, stocks, holdings, portfolio

app = FastAPI(title="Singapore Dividends API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(stocks.router)
app.include_router(holdings.router)
app.include_router(portfolio.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
