"""
api/submissions.py — Thu bài & phân tích:
- POST /api/submissions/sync             : nhận lô bài nộp (bỏ qua trùng uid; TỪ CHỐI bài rỗng/bất thường; gắn cờ nghi vấn)
- GET  /api/analytics/class/{class_code}/rejected : bài bị máy chủ từ chối (rỗng / bất thường) của lớp
- GET  /api/submissions/{uid}/events     : nhật kí thao tác của một bài nộp (cần ADMIN_TOKEN nếu đã đặt)
- GET  /api/analytics/class/{class_code} : thống kê lớp (điểm TB, hệ số Hake g TB, ngộ nhận) + danh sách bài
- GET  /api/backup                       : tải toàn bộ bài nộp (cần ADMIN_TOKEN nếu đã đặt)
- POST /api/backup                       : khôi phục / gửi sao lưu từ trình duyệt giáo viên
"""
from __future__ import annotations

from collections import Counter

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..integrity import check_submission
from ..models import RejectedSubmission, Submission, SubmissionEvent
from ..schemas import BackupIn, BackupStored, ClassAnalytics, RejectedItem, RejectedOut, SubmissionIn, SubmissionOut, SyncRequest, SyncResponse
from .assignments import require_admin
from .auth import ensure_classroom, sanitize_code

router = APIRouter(prefix="/api", tags=["Bài nộp & phân tích"])


def normalized_gain(pre: int, post: int, maximum: int) -> float:
    """Hệ số tăng trưởng Hake: g = (sau − trước)/(tối đa − trước)."""
    if maximum - pre <= 0:
        return 0.0
    return (post - pre) / (maximum - pre)


def to_model(s: SubmissionIn, source: str, flags: list[str]) -> Submission:
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
        valid_trials=s.valid_trials,
        reported_seed=s.seed,
        flags=flags,
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
        valid_trials=r.valid_trials,
        flags=list(r.flags or []),
    )


async def store_batch(session: AsyncSession, items: list[SubmissionIn], source: str) -> tuple[int, int, list[RejectedItem], int]:
    """Lưu lô bài nộp, trả về (số bài mới, số bài trùng, bài bị từ chối, số bài bị gắn cờ)."""
    if not items:
        return 0, 0, [], 0
    uids = [s.uid for s in items]
    existing = set((await session.execute(select(Submission.uid).where(Submission.uid.in_(uids)))).scalars().all())
    inserted = 0
    flagged = 0
    rejected: list[RejectedItem] = []
    seen: set[str] = set()
    for s in items:
        if s.uid in existing or s.uid in seen:
            continue
        seen.add(s.uid)
        cls = sanitize_code(s.class_code) or "TUDO"
        code = sanitize_code(s.student_code) or "KHACH"
        reasons, flags = check_submission(s, cls, code)
        if reasons:
            rejected.append(RejectedItem(uid=s.uid, reasons=reasons))
            session.add(RejectedSubmission(uid=s.uid, class_code=cls, student_code=code, plugin_id=s.plugin_id, reasons=reasons))
            continue
        # Trùng kết quả với học sinh khác cùng lớp, cùng bài → nghi chép bài
        if s.result_value is not None:
            twin = (
                await session.execute(
                    select(Submission.uid).where(
                        Submission.class_code == cls,
                        Submission.plugin_id == s.plugin_id,
                        Submission.result_value == s.result_value,
                        Submission.student_code != code,
                    ).limit(1)
                )
            ).first()
            if twin is not None:
                flags.append("trung-ket-qua-ban-khac")
        await ensure_classroom(session, cls)
        session.add(to_model(s, source, flags))
        for ev in s.events[-300:]:
            session.add(
                SubmissionEvent(
                    uid=s.uid,
                    at_ms=int(ev.get("at", 0) or 0),
                    kind=str(ev.get("type", ""))[:40],
                    detail=str(ev.get("detail", ""))[:300],
                )
            )
        inserted += 1
        flagged += 1 if flags else 0
    await session.commit()
    return inserted, len(items) - inserted - len(rejected), rejected, flagged


@router.post("/submissions/sync", response_model=SyncResponse)
async def sync_submissions(body: SyncRequest, session: AsyncSession = Depends(get_session)) -> SyncResponse:
    inserted, dup, rejected, flagged = await store_batch(session, body.submissions, "lan")
    return SyncResponse(received=len(body.submissions), inserted=inserted, duplicates=dup, rejected=rejected, flagged=flagged)


@router.get("/analytics/class/{class_code}", response_model=ClassAnalytics)
async def class_analytics(class_code: str, session: AsyncSession = Depends(get_session)) -> ClassAnalytics:
    code = sanitize_code(class_code)
    rows = (await session.execute(select(Submission).where(Submission.class_code == code).order_by(Submission.created_at_ms.desc()))).scalars().all()
    scores = [r.score for r in rows]
    flagged = sum(1 for r in rows if r.flags)
    gains = [normalized_gain(r.pre_score, r.post_score, r.post_max) for r in rows if r.post_max > 0]
    mis = Counter(m for r in rows for m in (r.misconceptions or []))
    return ClassAnalytics(
        class_code=code,
        count=len(rows),
        average_score=round(sum(scores) / len(scores), 2) if scores else 0.0,
        average_gain=round(sum(gains) / len(gains), 3) if gains else 0.0,
        flagged=flagged,
        misconceptions=dict(mis.most_common()),
        submissions=[to_out(r) for r in rows],
    )


@router.get("/analytics/class/{class_code}/rejected", response_model=list[RejectedOut])
async def class_rejected(class_code: str, session: AsyncSession = Depends(get_session)) -> list[RejectedOut]:
    """Danh sách bài bị từ chối của lớp (mới nhất trước, tối đa 500) để giáo viên biết học sinh nào nộp bài rỗng."""
    code = sanitize_code(class_code)
    rows = (
        await session.execute(
            select(RejectedSubmission).where(RejectedSubmission.class_code == code).order_by(RejectedSubmission.received_at.desc()).limit(500)
        )
    ).scalars().all()
    return [
        RejectedOut(
            uid=r.uid,
            student_code=r.student_code,
            plugin_id=r.plugin_id,
            reasons=list(r.reasons or []),
            received_at=int(r.received_at.timestamp() * 1000) if r.received_at else 0,
        )
        for r in rows
    ]


@router.get("/backup")
async def export_backup(session: AsyncSession = Depends(get_session), x_admin_token: str | None = Header(default=None)) -> dict:
    require_admin(x_admin_token)
    rows = (await session.execute(select(Submission).order_by(Submission.created_at_ms))).scalars().all()
    return {"format": "khtn-lab-backup", "submissions": [to_out(r).model_dump(by_alias=True) for r in rows]}


@router.post("/backup", response_model=BackupStored)
async def import_backup(body: BackupIn, session: AsyncSession = Depends(get_session)) -> BackupStored:
    inserted, _, _, _ = await store_batch(session, body.submissions, "backup")
    return BackupStored(stored=inserted)


@router.get("/submissions/{uid}/events")
async def submission_events(uid: str, session: AsyncSession = Depends(get_session), x_admin_token: str | None = Header(default=None)) -> dict:
    """Nhật kí thao tác của một bài nộp (giáo viên xem lại khi bài bị gắn cờ)."""
    require_admin(x_admin_token)
    row = (await session.execute(select(Submission).where(Submission.uid == uid))).scalars().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài nộp.")
    evs = (await session.execute(select(SubmissionEvent).where(SubmissionEvent.uid == uid).order_by(SubmissionEvent.at_ms))).scalars().all()
    return {"uid": uid, "flags": list(row.flags or []), "events": [{"at": e.at_ms, "type": e.kind, "detail": e.detail} for e in evs]}
