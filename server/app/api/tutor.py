"""
api/tutor.py — Trợ lý AI Socratic: POST /api/tutor/analyze

Luồng: Guardrail (chặn xin đáp án / nội dung không phù hợp) → Cache CSDL → Gemini 2.5 Flash (timeout 7 giây)
→ nếu không có GEMINI_API_KEY hoặc lỗi mạng: trả gợi ý Socratic offline theo môn học.
Nguyên tắc sư phạm: không đưa đáp án số; đặt câu hỏi dẫn dắt; dùng danh pháp IUPAC theo SGK 2018.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import unicodedata

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import TutorCache
from ..schemas import TutorIn, TutorOut

router = APIRouter(prefix="/api/tutor", tags=["Trợ lý AI"])
logger = logging.getLogger("khtn-lab.tutor")

SYSTEM_PROMPT = (
    "Bạn là trợ lý dạy học Khoa học tự nhiên lớp 10 (SGK Kết nối tri thức với cuộc sống, GDPT 2018) theo phương pháp Socratic. "
    "QUY TẮC: (1) Không bao giờ đưa đáp án số cuối cùng hay lời giải hoàn chỉnh; (2) đặt 1–2 câu hỏi gợi mở và nhắc công thức/khái niệm liên quan; "
    "(3) tối đa 120 từ, tiếng Việt, thân thiện; (4) dùng danh pháp IUPAC: sulfuric acid, copper(II) sulfate, potassium permanganate, "
    "sodium thiosulfate, hydrogen peroxide; thuật ngữ: suất điện động, điện trở trong, cổng quang điện, tế bào nhân sơ, tế bào nhân thực, co nguyên sinh; "
    "(5) từ chối lịch sự mọi nội dung ngoài học tập."
)

OFFLINE_HINTS = {
    "physics": "🤔 Đại lượng nào em đo trực tiếp, đại lượng nào phải tính? Công thức nào nối chúng — và em đã đổi đơn vị sang SI (m, s, kg) chưa?",
    "chemistry": "🤔 Phương trình hóa học đã cân bằng chưa? Tỉ lệ số mol giữa chất em biết và chất cần tìm là bao nhiêu? Nhớ đổi mL sang L khi tính số mol.",
    "biology": "🤔 Em quan sát được hiện tượng gì, khác mẫu đối chứng ra sao? Cấu trúc nào của tế bào giải thích hiện tượng đó?",
}


def normalize(text: str) -> str:
    """Bỏ dấu tiếng Việt, chữ thường — để so khớp từ khóa và tạo khóa cache ổn định."""
    t = unicodedata.normalize("NFD", text).replace("đ", "d").replace("Đ", "D")
    return "".join(c for c in t if unicodedata.category(c) != "Mn").lower().strip()


def guardrail(question: str) -> str | None:
    """Trả về câu từ chối nếu vi phạm, None nếu hợp lệ."""
    q = normalize(question)
    if any(w in q for w in ("chui", "giet", "hack", "mat khau", "ma pin")):
        return "Trợ lý chỉ hỗ trợ học tập Khoa học tự nhiên. Em hãy hỏi về thí nghiệm đang làm nhé."
    if any(w in q for w in ("cho em dap an", "dap an la", "giai ho", "lam ho", "cho dap an", "dap so")):
        return "Mình không đưa đáp án trực tiếp 😊 Em đã có những số liệu nào, và công thức nào nối chúng với đại lượng cần tìm?"
    return None


def cache_key(plugin_id: str, question: str) -> str:
    return hashlib.sha256(f"{plugin_id}|{normalize(question)}".encode("utf-8")).hexdigest()[:64]


async def ask_gemini(question: str, context: str) -> str | None:
    """Gọi Gemini (google-genai). Trả None nếu chưa cấu hình khóa, thiếu thư viện, lỗi hoặc quá 7 giây."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        logger.warning("Chưa cài google-genai — dùng gợi ý offline.")
        return None
    try:
        client = genai.Client(api_key=api_key)
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
                contents=f"{context}\nCâu hỏi của học sinh: {question}",
                config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT, temperature=0.4, max_output_tokens=400),
            ),
            timeout=7.0,
        )
        text = (response.text or "").strip()
        return text or None
    except Exception as exc:  # pragma: no cover - phụ thuộc mạng
        logger.warning("Gemini lỗi: %s", exc)
        return None


@router.post("/analyze", response_model=TutorOut)
async def analyze(body: TutorIn, session: AsyncSession = Depends(get_session)) -> TutorOut:
    refusal = guardrail(body.question)
    if refusal:
        return TutorOut(answer=refusal, source="guardrail")
    key = cache_key(body.plugin_id, body.question)
    cached = await session.get(TutorCache, key)
    if cached is not None:
        cached.hits += 1
        await session.commit()
        return TutorOut(answer=cached.answer, source="cache")
    answer = await ask_gemini(body.question, body.context)
    if answer is None:
        hint = OFFLINE_HINTS.get(body.subject, OFFLINE_HINTS["physics"])
        return TutorOut(answer=f"{hint}\n\n(Gợi ý offline từ máy chủ lớp)", source="offline")
    session.add(TutorCache(key=key, answer=answer))
    await session.commit()
    return TutorOut(answer=answer, source="ai")
