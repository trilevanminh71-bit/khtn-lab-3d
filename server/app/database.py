"""
database.py — Kết nối CSDL bất đồng bộ (SQLAlchemy 2.0 async).

- Có biến môi trường DATABASE_URL (Neon PostgreSQL) → dùng driver asyncpg.
- Không có, hoặc PostgreSQL không kết nối được khi khởi động → TỰ FALLBACK sang SQLite
  `sqlite+aiosqlite:///./local_lab.db` (file nằm trong thư mục server/), phù hợp mạng LAN lớp học không Internet.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import AsyncIterator
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
logger = logging.getLogger("khtn-lab.db")

SERVER_DIR = Path(__file__).resolve().parent.parent
SQLITE_URL = f"sqlite+aiosqlite:///{(SERVER_DIR / 'local_lab.db').as_posix()}"


class Base(DeclarativeBase):
    """Lớp cơ sở cho mọi bảng ORM."""


def normalize_database_url(raw: str | None) -> tuple[str, dict]:
    """
    Chuẩn hóa DATABASE_URL.
    Đầu vào: chuỗi kết nối (có thể rỗng, dạng postgres://, postgresql://, kèm ?sslmode=require của Neon).
    Đầu ra: (url cho SQLAlchemy async, connect_args).
    """
    if not raw or not raw.strip():
        return SQLITE_URL, {}
    url = raw.strip()
    if url.startswith("sqlite"):
        if "+aiosqlite" not in url:
            url = url.replace("sqlite://", "sqlite+aiosqlite://", 1)
        return url, {}
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]
    # asyncpg không hiểu tham số sslmode/channel_binding → chuyển thành connect_args
    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query))
    connect_args: dict = {}
    sslmode = query.pop("sslmode", None)
    query.pop("channel_binding", None)
    if sslmode and sslmode != "disable":
        connect_args["ssl"] = "require"
    url = urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))
    return url, connect_args


def _make_engine(url: str, connect_args: dict) -> AsyncEngine:
    if url.startswith("sqlite"):
        return create_async_engine(url, echo=False, connect_args={"check_same_thread": False})
    return create_async_engine(url, echo=False, pool_pre_ping=True, pool_size=5, max_overflow=5, connect_args=connect_args)


_url, _args = normalize_database_url(os.getenv("DATABASE_URL"))
engine: AsyncEngine = _make_engine(_url, _args)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


def database_kind() -> str:
    """Tên loại CSDL đang dùng: 'postgresql' hoặc 'sqlite'."""
    return "postgresql" if engine.url.get_backend_name().startswith("postgresql") else "sqlite"


async def init_db() -> None:
    """Tạo bảng; nếu PostgreSQL lỗi kết nối thì chuyển sang SQLite cục bộ để lớp học vẫn chạy."""
    global engine, SessionLocal
    from . import models  # noqa: F401  (đăng ký các bảng vào Base.metadata)

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:  # pragma: no cover - phụ thuộc mạng
        if database_kind() == "sqlite":
            raise
        logger.warning("Không kết nối được PostgreSQL (%s) → chuyển sang SQLite cục bộ.", exc)
        await engine.dispose()
        engine = _make_engine(SQLITE_URL, {})
        SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncIterator[AsyncSession]:
    """Dependency FastAPI: cấp một phiên làm việc CSDL cho mỗi request."""
    async with SessionLocal() as session:
        yield session
