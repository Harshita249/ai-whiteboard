from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# File-based sqlite for local/dev. Change to your DB URL in production.
SYNC_DATABASE_URL = "sqlite:///./whiteboard.db"
ASYNC_DATABASE_URL = "sqlite+aiosqlite:///./whiteboard.db"

# synchronous engine (used for metadata.create_all)
engine = create_engine(SYNC_DATABASE_URL, connect_args={"check_same_thread": False})

# async engine for async DB operations (used by endpoints)
async_engine = create_async_engine(ASYNC_DATABASE_URL, future=True, echo=False)

# async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Declarative base used by models.py
Base = declarative_base()
