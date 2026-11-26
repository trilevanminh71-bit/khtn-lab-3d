"""
schemas.py — Kiểu dữ liệu vào/ra của API (Pydantic v2).
JSON dùng camelCase để khớp trực tiếp với kiểu TypeScript `SubmissionRecord` ở client.
"""
from __future__ import annotations

import math
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


# ----------------------------- Bài nộp ------------------------------
class SubmissionIn(CamelModel):
    uid: str = Field(min_length=3, max_length=160)
    plugin_id: str = Field(max_length=80)
    student_name: str = Field(default="", max_length=120)
    student_code: str = Field(max_length=16)
    class_code: str = Field(max_length=16)
    score: int = Field(ge=0, le=100)
    pre_score: int = Field(default=0, ge=0)
    pre_max: int = Field(default=0, ge=0)
    post_score: int = Field(default=0, ge=0)
    post_max: int = Field(default=0, ge=0)
    result_value: Optional[float] = None
    true_value: Optional[float] = None
    rel_error_percent: float = Field(default=0.0, ge=0)
    misconceptions: list[str] = Field(default_factory=list)
    likert: list[int] = Field(default_factory=list)
    duration_sec: int = Field(default=0, ge=0)
    created_at: int = Field(description="Thời điểm nộp (mili-giây Unix)")
    synced: bool = True
    source: str = "lan"
    # --- Bằng chứng để máy chủ kiểm tra (client mới gửi; client cũ không có → gắn cờ "thieu-bang-chung")
    valid_trials: Optional[int] = Field(default=None, ge=0, le=500)
    min_trials: Optional[int] = Field(default=None, ge=0, le=50)
    data_estimate: Optional[float] = None
    seed: Optional[int] = Field(default=None, ge=0, le=0xFFFFFFFF)
    pre_answered: Optional[bool] = None
    post_answered: Optional[bool] = None
    events: list[dict[str, Any]] = Field(default_factory=list, max_length=300)
    # Do máy chủ tính, client gửi lên bị bỏ qua
    flags: list[str] = Field(default_factory=list)

    @field_validator("result_value", "true_value", "data_estimate", mode="before")
    @classmethod
    def _nan_to_none(cls, v: Any) -> Any:
        """Client gửi NaN (JSON null) khi chưa có giá trị → lưu NULL."""
        if v is None:
            return None
        try:
            f = float(v)
        except (TypeError, ValueError):
            return None
        return None if math.isnan(f) or math.isinf(f) else f

    @field_validator("likert")
    @classmethod
    def _likert_range(cls, v: list[int]) -> list[int]:
        return [min(5, max(0, int(x))) for x in v[:10]]


class SubmissionOut(SubmissionIn):
    # Không trả nhật kí thao tác trong danh sách (nặng); xem riêng qua /api/submissions/{uid}/events
    events: list[dict[str, Any]] = Field(default_factory=list, exclude=True)


class SyncRequest(BaseModel):
    submissions: list[SubmissionIn] = Field(max_length=500)


class RejectedItem(CamelModel):
    uid: str
    reasons: list[str]


class SyncResponse(CamelModel):
    received: int
    inserted: int
    duplicates: int
    rejected: list[RejectedItem] = Field(default_factory=list)
    flagged: int = 0


class ClassAnalytics(CamelModel):
    class_code: str
    count: int
    average_score: float
    average_gain: float
    flagged: int = 0
    misconceptions: dict[str, int]
    submissions: list[SubmissionOut]


class BackupIn(BaseModel):
    submissions: list[SubmissionIn] = Field(max_length=5000)


class BackupStored(BaseModel):
    stored: int


# ---------------------------- Đăng nhập -----------------------------
class QuickJoinIn(CamelModel):
    name: str = Field(min_length=2, max_length=120)
    student_code: str = Field(min_length=1, max_length=16)
    class_code: str = Field(min_length=2, max_length=16)


class UserOut(CamelModel):
    id: int
    code: str
    name: str
    class_code: str
    role: str


class DemoLoginIn(BaseModel):
    role: Literal["student", "teacher"] = "student"


# ----------------------------- Giao bài -----------------------------
class AssignmentIn(CamelModel):
    class_code: str = Field(min_length=2, max_length=16)
    plugin_id: str = Field(max_length=80)
    title: str = Field(min_length=3, max_length=200)
    note: str = ""


class AssignmentOut(AssignmentIn):
    id: int


class PluginIn(BaseModel):
    plugin: dict[str, Any]


class PluginOut(BaseModel):
    id: str
    version: int
    plugin: dict[str, Any]


# ---------------------------- Trợ lý AI -----------------------------
class TutorIn(BaseModel):
    plugin_id: str = Field(max_length=80)
    subject: str = Field(default="physics", max_length=20)
    question: str = Field(min_length=1, max_length=800)
    context: str = Field(default="", max_length=1500)
    # Định danh để tính hạn mức AI theo học sinh (không có → tính theo địa chỉ IP)
    student_code: str = Field(default="", max_length=16)
    class_code: str = Field(default="", max_length=16)


class TutorOut(BaseModel):
    answer: str
    source: Literal["ai", "cache", "offline", "guardrail"]
