"""
api/submissions.py — Thu bài & phân tích:
- POST /api/submissions/sync             : nhận lô bài nộp từ máy học sinh (bỏ qua bài trùng uid)
- GET  /api/analytics/class/{class_code} : thống kê lớp (điểm TB, hệ số Hake g TB, ngộ nhận) + danh sách bài
- GET  /api/backup                       : tải toàn bộ bài nộp (cần ADMIN_TOKEN nếu đã đặt)
- POST /api/backup                       : khôi phục / gửi sao lưu từ trình duyệt giáo viên
"""
from __future__ import annotations

from collections import Counter

from fastapi import APIRouter, Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import Submission
from ..schemas import BackupIn, BackupStored, ClassAnalytics, SubmissionIn, SubmissionOut, SyncRequest, SyncResponse
from .assignments import require_admin
from .auth import ensure_classroom, sanitize_code

router = APIRouter(prefix="/api", tags=["Bài nộp & phân tích"])


def normalized_gain(pre: int, post: int, maximum: int) -> float:
    """Hệ số tăng trưởng Hake: g = (sau − trước)/(tối đa − trước)."""
    if maximum - pre <= 0:
        return 0.0
    return (post - pre) / (maximum - pre)


def to_model(s: SubmissionIn, source: str) -> Submission:
    return Submission(
        uid=s.uid,
        plugin_id=s.plugin_id,
        student_name=s.student_name or s.student_code,
        student_code=sanitize_code(s.student_code) or "KHACH",
        class_code=sanitize_code(s.class_code) or "TUDO",
        score=s.score,
        pre_score=s.pre_score,
        pre_max=s.pre_max,
        post_score=s.post_score,
        post_max=s.post_max,
        result_value=s.result_value,
        true_value=s.true_value,
        rel_error_percent=s.rel_error_percent,
        misconceptions=s.misconceptions,
        likert=s.likert,
        duration_sec=s.duration_sec,
        created_at_ms=s.created_at,
        source=source,
    )


def to_out(r: Submission) -> SubmissionOut:
    return SubmissionOut(
        uid=r.uid,
        plugin_id=r.plugin_id,
        student_name=r.student_name,
        student_code=r.student_code,
        class_code=r.class_code,
        score=r.score,
        pre_score=r.pre_score,
        pre_max=r.pre_max,
        post_score=r.post_score,
        post_max=r.post_max,
        result_value=r.result_value,
        true_value=r.true_value,
        rel_error_percent=r.rel_error_percent,
        misconceptions=list(r.misconceptions or []),
        likert=list(r.likert or []),
        duration_sec=r.duration_sec,
        created_at=r.created_at_ms,
        synced=True,
        source=r.source,
    )


async def store_batch(session: AsyncSession, items: list[SubmissionIn], source: str) -> tuple[int, int]:
    """Lưu lô bài nộp, trả về (số bài mới, số bài trùng)."""
    if not items:
        return 0, 0
    uids = [s.uid for s in items]
    existing = set((await session.execute(select(Submission.uid).where(Submission.uid.in_(uids)))).scalars().all())
    inserted = 0
    seen: set[str] = set()
    for s in items:
        if s.uid in existing or s.uid in seen:
            continue
        seen.add(s.uid)
        await ensure_classroom(session, sanitize_code(s.class_code) or "TUDO")
        session.add(to_model(s, source))
        inserted += 1
    await session.commit()
    return inserted, len(items) - inserted


@router.post("/submissions/sync", response_model=SyncResponse)
async def sync_submissions(body: SyncRequest, session: AsyncSession = Depends(get_session)) -> SyncResponse:
    inserted, dup = await store_batch(session, body.submissions, "lan")
    return SyncResponse(received=len(body.submissions), inserted=inserted, duplicates=dup)


@router.get("/analytics/class/{class_code}", response_model=ClassAnalytics)
async def class_analytics(class_code: str, session: AsyncSession = Depends(get_session)) -> ClassAnalytics:
    code = sanitize_code(class_code)
    rows = (await session.execute(select(Submission).where(Submission.class_code == code).order_by(Submission.created_at_ms.desc()))).scalars().all()
    scores = [r.score for r in rows]
    gains = [normalized_gain(r.pre_score, r.post_score, r.post_max) for r in rows if r.post_max > 0]
    mis = Counter(m for r in rows for m in (r.misconceptions or []))
    return ClassAnalytics(
        class_code=code,
        count=len(rows),
        average_score=round(sum(scores) / len(scores), 2) if scores else 0.0,
        average_gain=round(sum(gains) / len(gains), 3) if gains else 0.0,
        misconceptions=dict(mis.most_common()),
        submissions=[to_out(r) for r in rows],
    )


@router.get("/backup")
async def export_backup(session: AsyncSession = Depends(get_session), x_admin_token: str | None = Header(default=None)) -> dict:
    require_admin(x_admin_token)
    rows = (await session.execute(select(Submission).order_by(Submission.created_at_ms))).scalars().all()
    return {"format": "khtn-lab-backup", "submissions": [to_out(r).model_dump(by_alias=True) for r in rows]}


@router.post("/backup", response_model=BackupStored)
async def import_backup(body: BackupIn, session: AsyncSession = Depends(get_session)) -> BackupStored:
    inserted, _ = await store_batch(session, body.submissions, "backup")
    return BackupStored(stored=inserted)
