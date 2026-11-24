"""
main.py — Điểm vào máy chủ KHTN-Lab 3D (FastAPI).

Chạy: python -m app.main  hoặc  uvicorn app.main:app --host 0.0.0.0 --port 8001  (hoặc start.bat / start.sh ở thư mục gốc)
Cổng mặc định của dự án: backend 8001, frontend 5175 (đổi bằng biến môi trường PORT).
- CORS linh hoạt: localhost, mọi IP mạng LAN nội bộ (10.x, 172.16–31.x, 192.168.x), *.vercel.app
  và danh sách ALLOWED_ORIGINS (tên cũ CORS_ORIGINS vẫn được đọc) — ví dụ tên miền riêng https://lab.truong.edu.vn.
- Trên Render: cổng lấy từ biến $PORT do Render cấp (xem render.yaml).
- /api/health: endpoint siêu nhẹ — client ping mỗi 30 giây để báo trạng thái LAN và đánh thức Render free tier.
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import database
from .api import assignments, auth, submissions, tutor

DEFAULT_PORT = 8001
FRONTEND_ORIGINS = ["http://localhost:5175", "http://127.0.0.1:5175"]

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")

LAN_ORIGIN_REGEX = (
    r"^https?://("
    r"localhost|127\.0\.0\.1|\[::1\]|"
    r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
    r"192\.168\.\d{1,3}\.\d{1,3}|"
    r"172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|"
    r"[a-z0-9-]+\.vercel\.app"
    r")(:\d+)?$"
)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await database.init_db()
    logging.getLogger("khtn-lab").info("Máy chủ sẵn sàng — CSDL: %s", database.database_kind())
    yield
    await database.engine.dispose()


app = FastAPI(
    title="KHTN-Lab 3D API",
    description="Máy chủ lớp học: thu bài, phân tích, giao bài, bài học tùy biến, trợ lý AI Socratic.",
    version="1.0.0",
    lifespan=lifespan,
)

def parse_allowed_origins() -> list[str]:
    """Đọc ALLOWED_ORIGINS (hoặc CORS_ORIGINS cũ), phân cách dấu phẩy; bỏ dấu "/" cuối để khớp header Origin."""
    raw = ",".join(filter(None, [os.getenv("ALLOWED_ORIGINS", ""), os.getenv("CORS_ORIGINS", "")]))
    return [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]


extra_origins = FRONTEND_ORIGINS + parse_allowed_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=extra_origins,
    allow_origin_regex=LAN_ORIGIN_REGEX,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Admin-Token"],
    max_age=600,
)


@app.get("/api/health", tags=["Hệ thống"])
async def health() -> dict:
    return {"status": "ok", "database": database.database_kind(), "time": datetime.now(timezone.utc).isoformat()}


@app.get("/", tags=["Hệ thống"])
async def root() -> dict:
    return {"name": "KHTN-Lab 3D API", "docs": "/docs", "health": "/api/health"}


app.include_router(auth.router)
app.include_router(assignments.router)
app.include_router(submissions.router)
app.include_router(tutor.router)


if __name__ == "__main__":
    # Cho phép chạy trực tiếp: cd server && python -m app.main  → lắng nghe 0.0.0.0:8001
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.getenv("PORT", str(DEFAULT_PORT))))
