"""
integrity.py — Kiểm tra tính toàn vẹn bài nộp phía máy chủ (không tin hoàn toàn vào client).

Đầu vào : một SubmissionIn (kèm "bằng chứng" client gửi: số lần đo hợp lệ, minTrials, giá trị tính từ số liệu,
          seed đã dùng, nhật kí thao tác).
Đầu ra  : (reasons_reject, flags)
          - reasons_reject: lí do TỪ CHỐI lưu (bài rỗng / vô nghĩa) → không vào thống kê lớp.
          - flags         : cờ NGHI VẤN để giáo viên xem lại (vẫn lưu).
Ý nghĩa : chặn tình trạng nộp bài 0 lần đo, resultValue rỗng, sai số 999%, seed bị sửa, thời gian làm bất thường.
Giới hạn: máy chủ không chạy lại mô phỏng, nên một client bị sửa mã vẫn có thể gửi số giả — cờ nghi vấn giúp giáo viên phát hiện.
"""
from __future__ import annotations

import math

from .schemas import SubmissionIn

# Thời gian làm bài tối thiểu hợp lí (giây) — ngắn hơn thì gắn cờ
MIN_DURATION_SEC = 180
# Ngưỡng sai số coi là "không có kết quả" (client kẹp sai số tại 999)
REL_ERROR_CAP = 999.0
# Kết quả lệch quá mức này so với giá trị tính từ chính số liệu đo → bất thường
MAX_DATA_DEVIATION_PERCENT = 50.0


def fnv1a32(text: str) -> int:
    """Cùng thuật toán hashString() phía client (FNV-1a 32 bit) — tính seed chuẩn từ mã lớp + mã HS."""
    h = 0x811C9DC5
    for ch in text:
        for unit in ch.encode("utf-16-le")[::2]:  # mã ASCII sau khi sanitize → 1 đơn vị UTF-16
            h ^= unit
            h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def expected_seed(class_code: str, student_code: str) -> int:
    return fnv1a32(f"{class_code}|{student_code}")


def check_submission(s: SubmissionIn, class_code: str, student_code: str) -> tuple[list[str], list[str]]:
    reject: list[str] = []
    flags: list[str] = []

    # --- Từ chối: bài rỗng / vô nghĩa
    if s.result_value is None:
        reject.append("Chưa có kết quả (resultValue rỗng).")
    if s.rel_error_percent >= REL_ERROR_CAP or math.isnan(s.rel_error_percent):
        reject.append("Sai số không hợp lệ (≥ 999%).")
    if s.valid_trials is not None and s.min_trials is not None and s.valid_trials < s.min_trials:
        reject.append(f"Chưa đủ lần đo hợp lệ ({s.valid_trials}/{s.min_trials}).")
    if s.valid_trials == 0:
        reject.append("Không có lần đo hợp lệ nào.")
    if s.post_max > 0 and s.post_answered is False:
        reject.append("Chưa làm câu hỏi sau thí nghiệm.")

    # --- Cờ nghi vấn: vẫn lưu, giáo viên xem lại
    if s.valid_trials is None or s.min_trials is None:
        flags.append("thieu-bang-chung")  # client cũ không gửi số lần đo hợp lệ
    if s.duration_sec < MIN_DURATION_SEC:
        flags.append("thoi-gian-ngan")
    if s.pre_max > 0 and s.pre_answered is False:
        flags.append("bo-qua-cau-hoi-truoc")
    if s.seed is not None and s.seed != expected_seed(class_code, student_code):
        flags.append("seed-bi-sua")
    if s.result_value is not None and s.data_estimate is not None and s.data_estimate != 0:
        dev = abs(s.result_value - s.data_estimate) / abs(s.data_estimate) * 100
        if dev > MAX_DATA_DEVIATION_PERCENT:
            flags.append("lech-so-lieu")
    if s.result_value is not None and s.true_value not in (None, 0):
        rel = abs(s.result_value - s.true_value) / abs(s.true_value) * 100
        if abs(min(REL_ERROR_CAP, rel) - s.rel_error_percent) > 1.0:
            flags.append("sai-so-khong-khop")
    if s.score >= 90 and s.duration_sec < MIN_DURATION_SEC:
        flags.append("diem-cao-bat-thuong")
    return reject, flags
