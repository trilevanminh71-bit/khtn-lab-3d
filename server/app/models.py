"""
models.py — Bảng dữ liệu (SQLAlchemy ORM).

- User        : học sinh / giáo viên (đăng nhập nhanh bằng mã lớp + mã HS, không mật khẩu — dùng trong mạng LAN lớp học)
- Classroom   : lớp học (10T1, 10T2…)
- Assignment  : bài thí nghiệm giáo viên giao cho lớp
- Submission  : bài nộp (điểm, trắc nghiệm trước/sau, sai số, ngộ nhận, khảo sát) — khóa duy nhất `uid` chống trùng
- CustomPlugin: bài học tùy biến (JSON LabPluginDef) chia sẻ cho cả lớp
- TutorCache  : bộ nhớ đệm câu trả lời AI (tiết kiệm hạn mức Gemini)
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, BigInteger, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Classroom(Base):
    __tablename__ = "classrooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), default="")
    teacher_name: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("class_code", "code", name="uq_user_class_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(16), index=True)
    name: Mapped[str] = mapped_column(String(120))
    class_code: Mapped[str] = mapped_column(String(16), ForeignKey("classrooms.code"), index=True)
    role: Mapped[str] = mapped_column(String(16), default="student")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    class_code: Mapped[str] = mapped_column(String(16), index=True)
    plugin_id: Mapped[str] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(200))
    note: Mapped[str] = mapped_column(Text, default="")
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uid: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    plugin_id: Mapped[str] = mapped_column(String(80), index=True)
    student_name: Mapped[str] = mapped_column(String(120))
    student_code: Mapped[str] = mapped_column(String(16), index=True)
    class_code: Mapped[str] = mapped_column(String(16), index=True)
    score: Mapped[int] = mapped_column(Integer)
    pre_score: Mapped[int] = mapped_column(Integer, default=0)
    pre_max: Mapped[int] = mapped_column(Integer, default=0)
    post_score: Mapped[int] = mapped_column(Integer, default=0)
    post_max: Mapped[int] = mapped_column(Integer, default=0)
    result_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    true_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    rel_error_percent: Mapped[float] = mapped_column(Float, default=0.0)
    misconceptions: Mapped[list] = mapped_column(JSON, default=list)
    likert: Mapped[list] = mapped_column(JSON, default=list)
    duration_sec: Mapped[int] = mapped_column(Integer, default=0)
    created_at_ms: Mapped[int] = mapped_column(BigInteger)
    source: Mapped[str] = mapped_column(String(16), default="lan")
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CustomPlugin(Base):
    __tablename__ = "custom_plugins"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON)
    version: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class TutorCache(Base):
    __tablename__ = "tutor_cache"

    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    answer: Mapped[str] = mapped_column(Text)
    hits: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
