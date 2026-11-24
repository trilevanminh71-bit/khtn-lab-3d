# Hướng dẫn giáo viên — Quản lý lớp, thu bài QR, CMS & số liệu KHKT

## 1. Vào Cổng giáo viên
Nút **Cổng GV** → nhập PIN (mặc định **2026**). Phiên PIN có hiệu lực 30 phút. Sai 5 lần bị khóa 30 giây.
**Đổi PIN ngay:** ⚙ Cài đặt → Đổi mã PIN (PIN chỉ lưu dạng băm SHA-256).

## 2. Thu bài
| Cách | Khi nào | Thao tác |
|---|---|---|
| **Quét QR** | Không có mạng | Cổng GV → **Thu bài QR** → Bật camera → đưa mã QR trên phiếu của học sinh vào khung. Mã sai/bị sửa điểm bị từ chối (checksum). Có ô dán mã thủ công. |
| **Đồng bộ LAN** | Có máy chủ lớp (`start.bat`) | Bài học sinh tự gửi về máy chủ. Cổng GV → **Đồng bộ LAN** để kéo về trình duyệt. |
| **Sao lưu JSON** | Chuyển máy | Quản lý → Sao lưu JSON / Khôi phục |

Camera trình duyệt chỉ hoạt động trên `https://` hoặc `localhost`. Trong mạng LAN `http://`, dùng điện thoại quét QR đọc chuỗi rồi dán, hoặc mở Cổng GV trên chính máy chủ (`localhost`).

## 3. Phân tích
- **Tổng quan lớp:** lọc theo lớp/bài; điểm, trắc nghiệm trước → sau, sai số đo.
- **Ngộ nhận:** ngộ nhận khoa học phổ biến của lớp (theo chương SGK) + gợi ý khắc phục.
- **Tăng trưởng Pre/Post:** % đúng trước/sau, hệ số Hake g (≥ 0,7 cao; 0,3–0,7 trung bình).
- **Xuất CSV:** mã hóa UTF-8 BOM — mở bằng Excel không lỗi font tiếng Việt.

## 4. CMS — sửa đề không cần code
Quản lý → **Sửa đề, câu hỏi, thông số**: chọn bài → sửa tên, mục tiêu, lí thuyết, số lần đo tối thiểu, sai số cho phép, khoảng thông số, câu hỏi trước/sau, từ khóa bắt buộc trong kết luận → **Lưu**.
- **Khôi phục gốc:** bỏ bản sửa.
- **Xuất gói .json:** chia sẻ cho đồng nghiệp (họ dùng **Nhập gói .json**).
- **Cập nhật từ xa:** đưa file gói lên GitHub (raw) hoặc Google Drive (công khai), dán link vào ⚙ Cài đặt → mọi máy tự cập nhật khi có mạng.

## 5. Tạo bài mới trong 4 bước (No-Code Wizard)
1. Chọn template 3D: Máng trượt, Mạch điện, Cốc hóa học, Chuẩn độ, Kính hiển vi.
2. Tên bài, môn, mục tiêu, lí thuyết, có dùng hóa chất hay không.
3. Thông số & công thức: tham số học sinh chỉnh (ví dụ `U`), thông số ẩn (ví dụ `R`), công thức đo (`U / R`), đáp án (`R`), cách tính từ số liệu (`U / m`). Hệ thống **chạy thử** và báo nếu công thức không nhất quán.
4. Câu hỏi trắc nghiệm → **Lưu**. Bài xuất hiện ngay trong danh sách.

## 6. Tài nguyên 3D
Quản lý → **Ảnh tiêu bản / mô hình .glb**: tải ảnh tiêu bản kính hiển vi thật (≤ 3 MB) để thay hình mô phỏng, hoặc mô hình `.glb` (≤ 8 MB) đặt lên bàn thí nghiệm.

## 7. Số liệu KHKT
Tab **Số liệu KHKT**: so sánh lớp thực nghiệm **10T1** với đối chứng **10T2** — Hake g, điểm báo cáo, sai số đo, khảo sát Likert, **t-test Welch (p-value)**, **Cohen's d**.
Nút **Nạp dữ liệu mẫu 80 HS** chỉ để minh họa quy trình phân tích. **Khi dự thi bắt buộc dùng số liệu thật** thu từ học sinh (xóa dữ liệu mẫu trước).

## 8. Chế độ trình diễn KHKT
Nút 🏆 (cần PIN): hiển thị FPS, Draw Calls, tam giác, RAM; đổi mức đồ họa trực tiếp; nút **giả lập sự cố** (đoản mạch, thiếu bảo hộ, khí SO₂…) để giám khảo xem cơ chế cảnh báo an toàn. Nút ▥ **So sánh 3D**: chia đôi màn hình 2 thí nghiệm.
