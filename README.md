# 🧪 KHTN-Lab 3D

**Phòng thí nghiệm 3D ảo siêu nhẹ — Vật lí · Hóa học · Sinh học Lớp 10**
Chuẩn SGK *Kết nối tri thức với cuộc sống* — Chương trình GDPT 2018.

Ứng dụng **Web 3D chuẩn PWA**: mở trên trình duyệt máy tính, iPhone (Safari), Android (Chrome), ghim ra màn hình chính như ứng dụng, **chạy hoàn toàn offline** sau lần mở đầu tiên. Không cần cài app native.

| Mục tiêu | Cách đáp ứng |
|---|---|
| Dự thi KHKT | Chế độ KHKT (FPS/Draw calls/RAM trực tiếp, giả lập sự cố), số liệu đối chứng 10T1/10T2 với t-test Welch, Cohen's d, Hake g, xuất CSV |
| Máy yếu, trường thiếu thiết bị, vùng không Internet | Three.js thuần, mô hình dựng bằng code (0 KB file 3D), tự hạ chất lượng khi FPS < 28, bản USB offline, nộp bài bằng mã QR |
| Cập nhật nội dung không cần code | CMS sửa đề, No-Code Wizard tạo bài mới 4 bước, tải ảnh tiêu bản / mô hình .glb, gói cập nhật JSON từ GitHub/Drive |

## 12 bài thí nghiệm

| Vật lí | Hóa học | Sinh học |
|---|---|---|
| Đo tốc độ bằng cổng quang điện (Bài 6) | Tốc độ phản ứng sodium thiosulfate + sulfuric acid — hệ số Van't Hoff (Bài 19) | Quan sát tế bào nhân sơ & tế bào nhân thực (Bài 10) |
| Đo gia tốc rơi tự do (Bài 11) | Xúc tác MnO₂ / catalase phân hủy hydrogen peroxide (Bài 19) | Co nguyên sinh – phản co nguyên sinh (Bài 12) |
| Định luật II Newton trên đệm khí (Bài 15) | Chuẩn độ Fe²⁺ bằng potassium permanganate (Bài 15) | Ảnh hưởng nhiệt độ, pH đến enzyme amylase (Chương 4) |
| Suất điện động & điện trở trong của pin (mở rộng) | Enthalpy Zn + copper(II) sulfate (Bài 17) | Chỉ số nguyên phân ở đỉnh rễ hành (Bài 21) |

Mỗi học sinh nhận **bộ thông số ẩn riêng** (g, E, r, nồng độ…) sinh từ mã HS + mã lớp → không chép được số liệu.

## Chạy nhanh

**Yêu cầu:** Node.js ≥ 18, Python ≥ 3.10.

- Windows: nhấp đúp `start.bat`
- macOS / Linux: `./start.sh`

Mở `http://localhost:5175` (giao diện) — máy chủ API ở `http://localhost:8001` (tài liệu API: `/docs`). Dự án dùng cố định cặp cổng **5175 / 8001** để không trùng dự án khác dùng 5173 / 8000. Học sinh cùng Wi-Fi mở `http://<IP máy giáo viên>:5175`.

Chạy thủ công:

```bash
# Giao diện
cd client && npm install && npm run dev            # → http://localhost:5175 (proxy /api → 8001)
# Máy chủ (tùy chọn — app vẫn chạy đầy đủ khi không có máy chủ)
cd server && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt   # macOS/Linux: .venv/bin/pip
.venv/Scripts/python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## Đóng gói USB offline

```bash
build-offline-usb.bat     # Windows
./build-offline-usb.sh    # macOS / Linux
```

Tạo thư mục `KHTN-Lab-USB/` (≈ 1,4 MB). Chép vào USB, nhấp đúp `CHAY_KHTN_LAB.bat` — máy chủ mini PowerShell có sẵn trong Windows chạy web tại `http://localhost:8080`, tránh lỗi CORS khi mở `file://`. Chi tiết: [docs/HUONG_DAN_BAN_USB_OFFLINE.md](docs/HUONG_DAN_BAN_USB_OFFLINE.md).

## Deploy Cloud (miễn phí)

- **Frontend → Vercel:** Root Directory `client`, dùng sẵn `client/vercel.json`. Biến `VITE_API_URL` = URL backend.
- **Backend → Render:** dùng `server/render.yaml` (Blueprint Path). Đặt `DATABASE_URL` (Neon PostgreSQL), `GEMINI_API_KEY`; `ALLOWED_ORIGINS` khi dùng tên miền riêng. Cổng lấy từ `$PORT` của Render.
- **CSDL → Neon PostgreSQL:** dán chuỗi kết nối `postgresql://...?...sslmode=require`; không đặt thì tự dùng SQLite.

Chi tiết: [docs/HUONG_DAN_QUAN_TRI_VA_DEPLOY.md](docs/HUONG_DAN_QUAN_TRI_VA_DEPLOY.md).

## Kiểm thử (cổng bắt buộc trước khi gộp code)

```bash
cd client && npm install && npx tsc --noEmit && npm run test && npm run build
python -m py_compile server/app/main.py server/app/database.py server/app/models.py server/app/schemas.py server/app/api/auth.py server/app/api/assignments.py server/app/api/submissions.py server/app/api/tutor.py
```

Vitest kiểm chứng toàn bộ công thức Lý–Hóa–Sinh, chấm điểm, mã QR, biểu thức No-Code, thống kê KHKT, PIN SHA-256, và chạy **quy trình chuẩn của cả 12 bài** để đảm bảo kết quả nằm trong sai số cho phép.

## Tài liệu

- [Hướng dẫn học sinh](docs/HUONG_DAN_HOC_SINH_WEB.md)
- [Hướng dẫn giáo viên & CMS](docs/HUONG_DAN_GIAO_VIEN_VA_CMS.md)
- [Bản USB offline](docs/HUONG_DAN_BAN_USB_OFFLINE.md)
- [Quản trị, mạng LAN & Deploy](docs/HUONG_DAN_QUAN_TRI_VA_DEPLOY.md)
- [Kiến trúc & tiêu chí KHKT](docs/KIEN_TRUC_VA_TIEU_CHI_KHKT.md)
- [Cẩm nang đóng góp cho nhóm](CONTRIBUTING.md)

Mã PIN giáo viên mặc định: **2026** (đổi ngay trong ⚙ Cài đặt).
