import ssl

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

# Tolerate a stray wrapping quote or whitespace (common when the URL is pasted
# into a CI secret), then drop the query string -- asyncpg takes ssl via
# connect_args, not sslmode= in the URL.
db_url = settings.database_url.strip().strip('"').strip("'").split("?")[0]
if "://" not in db_url:
    raise RuntimeError(
        "DATABASE_URL is not a valid connection string "
        f"(got {db_url[:12]!r}...). Expected postgresql+asyncpg://user:pass@host/db"
    )
ssl_context = ssl.create_default_context()
engine = create_async_engine(
    db_url,
    echo=False,
    connect_args={"ssl": ssl_context},
    # Neon (serverless Postgres) drops idle connections. Without these, the first
    # request after an idle period fails with "connection is closed" before the
    # pool recovers. pre_ping validates a connection before use; recycle caps its
    # lifetime below Neon's idle timeout.
    pool_pre_ping=True,
    pool_recycle=300,
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        yield session
