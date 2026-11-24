"""
api/auth.py — Đăng nhập nhanh cho lớp học (mạng LAN, không mật khẩu):
- POST /api/auth/quick-join : học sinh nhập tên + mã HS + mã lớp → tạo/lấy hồ sơ
- POST /api/auth/demo-login : tài khoản trình diễn (học sinh / giáo viên) cho giám khảo KHKT
"""
from __future__ import annotations

import re

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import Classroom, User
from ..schemas import DemoLoginIn, QuickJoinIn, UserOut

router = APIRouter(prefix="/api/auth", tags=["Đăng nhập"])


def sanitize_code(code: str) -> str:
    """Chuẩn hóa mã lớp / mã học sinh giống client: in hoa, chỉ A-Z 0-9 -, tối đa 12 ký tự."""
    return re.sub(r"[^A-Z0-9-]", "", code.upper().replace("Đ", "D"))[:12]


async def ensure_classroom(session: AsyncSession, class_code: str) -> Classroom:
    room = (await session.execute(select(Classroom).where(Classroom.code == class_code))).scalar_one_or_none()
    if room is None:
        room = Classroom(code=class_code, name=f"Lớp {class_code}")
        session.add(room)
        await session.flush()
    return room


@router.post("/quick-join", response_model=UserOut)
async def quick_join(body: QuickJoinIn, session: AsyncSession = Depends(get_session)) -> User:
    class_code = sanitize_code(body.class_code) or "TUDO"
    code = sanitize_code(body.student_code) or "KHACH"
    await ensure_classroom(session, class_code)
    user = (await session.execute(select(User).where(User.class_code == class_code, User.code == code))).scalar_one_or_none()
    if user is None:
        user = User(code=code, name=body.name.strip(), class_code=class_code, role="student")
        session.add(user)
    else:
        user.name = body.name.strip()
    await session.commit()
    await session.refresh(user)
    return user


@router.post("/demo-login", response_model=UserOut)
async def demo_login(body: DemoLoginIn, session: AsyncSession = Depends(get_session)) -> User:
    class_code = "10T1"
    code = "GV-DEMO" if body.role == "teacher" else "HS-DEMO"
    await ensure_classroom(session, class_code)
    user = (await session.execute(select(User).where(User.class_code == class_code, User.code == code))).scalar_one_or_none()
    if user is None:
        user = User(code=code, name="Giáo viên trình diễn" if body.role == "teacher" else "Học sinh trình diễn", class_code=class_code, role=body.role)
        session.add(user)
        await session.commit()
        await session.refresh(user)
    return user
