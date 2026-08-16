import ssl

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

db_url = settings.database_url.split("?")[0]
ssl_context = ssl.create_default_context()
engine = create_async_engine(db_url, echo=False, connect_args={"ssl": ssl_context})
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        yield session
