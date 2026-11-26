/**
 * utils/integrityFlags.ts — Nhãn tiếng Việt cho cờ nghi vấn do máy chủ gắn (server/app/integrity.py).
 * Đầu vào: mã cờ (chuỗi). Đầu ra: nhãn ngắn + giải thích cho giáo viên. Cờ lạ → hiện nguyên mã.
 */
export const FLAG_LABELS: Record<string, { label: string; hint: string }> = {
  'thieu-bang-chung': { label: 'Thiếu bằng chứng', hint: 'Bài gửi từ phiên bản ứng dụng cũ, không kèm số lần đo hợp lệ để kiểm tra.' },
  'thoi-gian-ngan': { label: 'Làm quá nhanh', hint: 'Thời gian làm bài dưới 3 phút.' },
  'bo-qua-cau-hoi-truoc': { label: 'Bỏ qua câu hỏi trước', hint: 'Không làm câu hỏi trước thí nghiệm — không đo được tiến bộ.' },
  'seed-bi-sua': { label: 'Đề bị sửa', hint: 'Bộ thông số (seed) không khớp với mã lớp + mã học sinh — có thể đã sửa dữ liệu trình duyệt để đổi đề.' },
  'lech-so-lieu': { label: 'Lệch số liệu', hint: 'Kết quả nhập lệch hơn 50% so với giá trị tính từ chính số liệu đã đo.' },
  'sai-so-khong-khop': { label: 'Sai số không khớp', hint: 'Sai số gửi lên khác với sai số máy chủ tự tính từ kết quả.' },
  'diem-cao-bat-thuong': { label: 'Điểm cao bất thường', hint: 'Điểm ≥ 90 nhưng làm bài dưới 3 phút.' },
  'trung-ket-qua-ban-khac': { label: 'Trùng kết quả bạn khác', hint: 'Kết quả trùng khít với một học sinh khác cùng lớp, cùng bài — nghi chép bài.' }
};

export function flagLabel(code: string): string {
  return FLAG_LABELS[code]?.label ?? code;
}
