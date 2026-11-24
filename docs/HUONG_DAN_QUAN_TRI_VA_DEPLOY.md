# Quản trị máy chủ, mạng LAN lớp học & Deploy Cloud

## 1. Máy chủ lớp học (mạng LAN, không cần Internet)
Máy giáo viên (Windows/macOS/Linux) cài **Python ≥ 3.10** và **Node.js ≥ 18**, sau đó:
- Windows: nhấp đúp `start.bat`
- macOS/Linux: `./start.sh`

Script tự tạo `server/.venv`, cài thư viện, chạy:
- Backend FastAPI: `0.0.0.0:8000` (CSDL SQLite `server/local_lab.db`)
- Frontend: `0.0.0.0:5173`

Học sinh cùng Wi-Fi mở `http://<IP máy GV>:5173` (xem IP: `ipconfig` trên Windows). Ứng dụng tự dò API tại `http://<cùng IP>:8000`; nếu khác, đặt trong ⚙ Cài đặt → **Máy chủ lớp học** → *Lưu & thử*.

**Tường lửa Windows:** cho phép Python và Node khi được hỏi (mạng Private).

## 2. Biến môi trường máy chủ (`server/.env`, xem `.env.example`)
| Biến | Ý nghĩa |
|---|---|
| `DATABASE_URL` | Trống → SQLite. Neon: `postgresql://user:pass@host/db?sslmode=require` (tự chuyển sang driver asyncpg). PostgreSQL lỗi kết nối khi khởi động → tự fallback SQLite. |
| `GEMINI_API_KEY` | Khóa Google AI Studio cho trợ lý AI. Trống → gợi ý Socratic offline. |
| `GEMINI_MODEL` | Mặc định `gemini-2.5-flash` |
| `CORS_ORIGINS` | Thêm origin được phép (đã tự cho phép localhost, IP LAN nội bộ, `*.vercel.app`) |
| `ADMIN_TOKEN` | Bảo vệ `GET /api/backup` và `POST /api/plugins` (header `X-Admin-Token`) |

## 3. API
| Phương thức | Đường dẫn | Chức năng |
|---|---|---|
| GET | `/api/health` | Kiểm tra sống (client ping 30 giây/lần, đánh thức Render) |
| POST | `/api/auth/quick-join` | Học sinh vào lớp bằng tên + mã HS + mã lớp |
| POST | `/api/auth/demo-login` | Tài khoản trình diễn |
| GET/POST | `/api/assignments` | Giao bài cho lớp |
| GET/POST | `/api/plugins` | Bài học tùy biến dùng chung |
| POST | `/api/submissions/sync` | Nhận lô bài nộp (chống trùng theo `uid`) |
| GET | `/api/analytics/class/{class_code}` | Thống kê lớp + danh sách bài |
| GET/POST | `/api/backup` | Sao lưu / khôi phục |
| POST | `/api/tutor/analyze` | Trợ lý AI Socratic (Gemini + guardrail + cache CSDL) |

Tài liệu tương tác: `http://<máy chủ>:8000/docs`.

## 4. Deploy Cloud miễn phí
### Neon (PostgreSQL)
1. Tạo project tại neon.tech → sao chép *Connection string* (có `sslmode=require`).

### Render (Backend)
1. Đưa mã nguồn lên GitHub.
2. Render → **New → Blueprint** → chọn repo (dùng `server/render.yaml`).
3. Điền `DATABASE_URL`, `GEMINI_API_KEY`, `CORS_ORIGINS` (URL Vercel). Health check: `/api/health`.
4. Gói miễn phí "ngủ" sau 15 phút — lần gọi đầu mất ~30–50 giây; app vẫn chạy offline trong lúc chờ.

### Vercel (Frontend)
1. Vercel → **Add New Project** → repo → **Root Directory: `client`** (Framework Vite, đã có `vercel.json`).
2. Biến môi trường: `VITE_API_URL=https://khtn-lab-3d-api.onrender.com`, tùy chọn `VITE_REMOTE_UPDATE_URL`.
3. Deploy → có HTTPS nên camera quét QR, cài PWA trên iPhone/Android hoạt động đầy đủ.

## 5. Gói cập nhật bài học từ xa
CMS → **Xuất toàn bộ** → đưa file JSON lên GitHub (dùng link *raw*) hoặc Google Drive (chia sẻ công khai) → dán link vào ⚙ Cài đặt hoặc `VITE_REMOTE_UPDATE_URL`. Khi `version` trong gói tăng, các máy tự cài khi có mạng.

## 6. Sao lưu & bảo trì
- Sao lưu SQLite: chép `server/local_lab.db` khi máy chủ đã tắt.
- Sao lưu qua web: Cổng GV → Quản lý → Sao lưu JSON / Gửi sao lưu lên máy chủ.
- Cập nhật ứng dụng: `git pull` → chạy lại `start.bat`. PWA trên máy học sinh tự hỏi "Cập nhật ngay".
- Báo lỗi: thêm `?debug=true` vào địa chỉ → Xuất Bug Snapshot.
