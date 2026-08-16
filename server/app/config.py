from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://localhost/singapore_dividends"
    google_client_id: str = ""
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_expiry_days: int = 7
    cors_origins: str = "http://localhost:5173"
    cron_secret: str = ""

    model_config = {"env_file": ".env"}


settings = Settings()
