"""
api/assignments.py — Giao bài và chia sẻ bài học tùy biến:
- GET  /api/assignments?class_code=10T1 : danh sách bài được giao
- POST /api/assignments                  : giáo viên giao bài
- GET  /api/plugins                      : bài học tùy biến (gói JSON) dùng chung cho cả lớp
- POST /api/plugins                      : lưu / cập nhật bài tùy biến (cần ADMIN_TOKEN nếu đã đặt)
"""
from __future__ import annotations

import os
import re

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import Assignment, CustomPlugin
from ..schemas import AssignmentIn, AssignmentOut, PluginIn, PluginOut

router = APIRouter(prefix="/api", tags=["Giao bài & bài học"])

REQUIRED_PLUGIN_FIELDS = ("id", "title", "subject", "sceneTemplate", "solverId", "params", "steps", "result")


def require_admin(x_admin_token: str | None) -> None:
    """Nếu máy chủ có đặt ADMIN_TOKEN thì thao tác ghi phải gửi header X-Admin-Token khớp."""
    token = os.getenv("ADMIN_TOKEN", "")
    if token and x_admin_token != token:
        raise HTTPException(status_code=401, detail="Sai hoặc thiếu mã quản trị (X-Admin-Token).")


@router.get("/assignments", response_model=list[AssignmentOut])
async def list_assignments(class_code: str | None = Query(default=None), session: AsyncSession = Depends(get_session)) -> list[Assignment]:
    stmt = select(Assignment).order_by(Assignment.created_at.desc())
    if class_code:
        stmt = stmt.where(Assignment.class_code == class_code.upper())
    return list((await session.execute(stmt)).scalars().all())


@router.post("/assignments", response_model=AssignmentOut, status_code=201)
async def create_assignment(body: AssignmentIn, session: AsyncSession = Depends(get_session)) -> Assignment:
    item = Assignment(class_code=body.class_code.upper(), plugin_id=body.plugin_id, title=body.title, note=body.note)
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item


@router.get("/plugins", response_model=list[PluginOut])
async def list_plugins(session: AsyncSession = Depends(get_session)) -> list[PluginOut]:
    rows = (await session.execute(select(CustomPlugin).order_by(CustomPlugin.id))).scalars().all()
    return [PluginOut(id=r.id, version=r.version, plugin=r.data) for r in rows]


@router.post("/plugins", response_model=PluginOut)
async def upsert_plugin(body: PluginIn, session: AsyncSession = Depends(get_session), x_admin_token: str | None = Header(default=None)) -> PluginOut:
    require_admin(x_admin_token)
    data = body.plugin
    missing = [k for k in REQUIRED_PLUGIN_FIELDS if k not in data]
    if missing:
        raise HTTPException(status_code=422, detail=f"Bài học thiếu trường: {', '.join(missing)}")
    pid = str(data["id"])
    if not re.fullmatch(r"[a-z0-9-]{3,60}", pid):
        raise HTTPException(status_code=422, detail="Mã bài chỉ gồm chữ thường, số, gạch ngang (3–60 ký tự).")
    row = await session.get(CustomPlugin, pid)
    if row is None:
        row = CustomPlugin(id=pid, data=data, version=int(data.get("version", 1)))
        session.add(row)
    else:
        row.data = data
        row.version = max(row.version + 1, int(data.get("version", 1)))
    await session.commit()
    return PluginOut(id=row.id, version=row.version, plugin=row.data)
