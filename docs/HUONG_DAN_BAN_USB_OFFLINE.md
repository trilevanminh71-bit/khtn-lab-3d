# Bản USB offline — cho trường không có Internet

## 1. Đóng gói (làm một lần trên máy có Node.js)
```bash
build-offline-usb.bat      # Windows
./build-offline-usb.sh     # macOS / Linux
```
Kết quả: thư mục `KHTN-Lab-USB/` (khoảng 1,4 MB):
```
KHTN-Lab-USB/
├── web/                  # Ứng dụng đã build (đường dẫn tương đối ./)
├── CHAY_KHTN_LAB.bat     # Windows: nhấp đúp để chạy
├── serve-offline.ps1     # Máy chủ mini bằng PowerShell có sẵn trong Windows
├── chay-khtn-lab.sh      # macOS / Linux
├── serve_offline.py      # Máy chủ mini bằng Python 3
└── HUONG_DAN.html        # Hướng dẫn cho người dùng cuối
```

## 2. Chạy trên máy học sinh
- **Windows 7/10/11:** nhấp đúp `CHAY_KHTN_LAB.bat` → trình duyệt tự mở `http://localhost:8080`. Không cần cài Node, Python hay quyền quản trị.
- **macOS / Linux:** `./chay-khtn-lab.sh`.
- Cổng 8080 bận → tự thử 8081…8099.

## 3. Vì sao không mở thẳng `index.html`?
Trình duyệt chặn JavaScript dạng module và Service Worker trên `file://` (chính sách CORS / secure context) → trang trắng. Máy chủ mini phục vụ qua `http://localhost` — được coi là "secure context" nên PWA, IndexedDB, Web Crypto đều hoạt động.

## 4. Chép từ USB sang máy (khuyến nghị)
Chép thư mục `KHTN-Lab-USB` vào ổ cứng để chạy nhanh hơn và dữ liệu nháp/bài nộp (IndexedDB theo địa chỉ `localhost:8080`) được giữ lại giữa các lần mở. Sau lần mở đầu có thể **Cài đặt ứng dụng** từ thanh địa chỉ Chrome/Edge.

## 5. Thu bài khi không có mạng
Học sinh nộp bài → phiếu có **mã QR < 180 ký tự**. Giáo viên quét bằng Cổng GV trên máy có camera (laptop chạy bản USB ở `localhost` dùng được camera), hoặc gõ/dán chuỗi mã.

## 6. Mạng LAN nội bộ không Internet
Nếu có một router Wi-Fi (không cần Internet): chạy `start.bat` trên máy giáo viên → học sinh mở `http://<IP máy GV>:5175`, bài nộp tự đồng bộ về máy chủ SQLite trên máy giáo viên. Xem [HUONG_DAN_QUAN_TRI_VA_DEPLOY.md](HUONG_DAN_QUAN_TRI_VA_DEPLOY.md).

## 7. Xử lí sự cố
| Hiện tượng | Cách xử lí |
|---|---|
| Cửa sổ đen tắt ngay | Chuột phải `CHAY_KHTN_LAB.bat` → Run as administrator, hoặc mở PowerShell: `powershell -ExecutionPolicy Bypass -File serve-offline.ps1` |
| Báo lỗi WebGL | Bật tăng tốc phần cứng trong trình duyệt; dùng Chrome/Edge bản mới |
| Rất chậm | ⚙ Cài đặt → Đồ họa máy yếu |
| Internet Explorer | Không hỗ trợ — dùng Chrome, Edge, Firefox, Cốc Cốc |
