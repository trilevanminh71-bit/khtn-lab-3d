# CLAUDE.md — KHTN-Lab 3D (Bộ nhớ kiến trúc & tiến độ)

> Ứng dụng Web 3D (PWA) Phòng Thí Nghiệm Ảo Siêu Nhẹ — Vật lí, Hóa học, Sinh học Lớp 10
> Chuẩn SGK *Kết nối tri thức với cuộc sống* — Chương trình GDPT 2018.
> Khi người dùng gõ **"Tiếp tục"**: đọc lại file này và viết nối tiếp từ mục `[ ]` đầu tiên.

## 1. Kiến trúc 4 tầng (client)

| Tầng | Thư mục | Vai trò |
|---|---|---|
| Dữ liệu | `client/src/plugins/` | Bài thí nghiệm = **JSON thuần** (`LabPluginDef`), không chứa hàm → CMS / No-Code / Remote JSON sửa được |
| Mô phỏng | `client/src/engines/` | `*Solver.ts` = công thức khoa học thuần (test được), `*SceneBuilder.ts` = dựng 3D theo template |
| Lõi 3D | `client/src/core/` | `ThreeEngineCore` (renderer, camera, OrbitControls, raycaster, snap points, split-screen scissor, auto-FPS, dispose) |
| Giao diện | `client/src/components/` | React + Tailwind, modal lớn dùng `React.lazy` |

- Liên kết plugin ↔ công thức qua `solverId` (xem `engines/solverRegistry.ts`).
- Liên kết plugin ↔ cảnh 3D qua `sceneTemplate`: 5 template dùng cho Wizard (`track | circuit | beaker | titration | microscope`) + template chuyên biệt (`force | airtrack | molecule | cell | membrane | signal`; `track` có `sceneOptions.rig` = `mc964` / `freefall2`).
- 23 bài mặc định; thứ tự `BUILTIN_PLUGINS` mã hóa trong QR → chỉ thêm vào cuối; bài tự tạo bắt đầu từ `CUSTOM_INDEX_BASE = 500`. Ngộ nhận tối đa 31 mục (mặt nạ bit), chỉ thêm cuối.
- Bảng số liệu/biểu đồ/phiếu in dùng chung `utils/trialTable.ts`, `components/TrialTable.tsx`, `DataChart.tsx`, `WorksheetModal.tsx`. Đổi thông số bài → tăng `version` (nháp cũ bị bỏ qua).
- Bài tạo bằng No-Code Wizard dùng `solverId: "custom-formula"` + biểu thức an toàn (`engines/formulaEvaluator.ts`, không dùng `eval`).
- Backend: FastAPI + SQLAlchemy async. `DATABASE_URL` (Neon PostgreSQL → `postgresql+asyncpg`) hoặc fallback `sqlite+aiosqlite:///./local_lab.db`.
  - Ghi chú: thêm `asyncpg` vào requirements vì `psycopg2` không hỗ trợ async (psycopg2-binary vẫn giữ cho công cụ quản trị/migration).

## 2. Phiên bản thư viện cố định

Frontend: react/react-dom ^18.3.1, typescript ^5.5.3, vite ^5.4.0, vitest ^2.1.0, three ^0.169.0, @types/three ^0.169.0,
zustand ^4.5.5, dexie ^4.0.8, lucide-react ^0.445.0, vite-plugin-pwa ^0.20.5, qrcode ^1.5.4, @types/qrcode ^1.5.5,
jsqr ^1.4.0, tailwindcss ^3.4.10, postcss ^8.4.47, autoprefixer ^10.4.20.
Backend: fastapi, uvicorn[standard], sqlalchemy[asyncio] (kèm greenlet — bắt buộc cho async), aiosqlite, asyncpg, psycopg2-binary, pydantic, google-genai, python-dotenv.

## 3. Quy ước code

- 100% chuỗi giao diện tiếng Việt; danh pháp IUPAC theo SGK 2018 (sulfuric acid, copper(II) sulfate, potassium permanganate, sodium thiosulfate, hydrogen peroxide).
- Cấm `any`, cấm `// TODO`, cấm hàm rỗng, cấm nút chết.
- Mỗi file khoa học / engine / plugin có comment tiếng Việt: đầu vào, đầu ra, ý nghĩa vật lí/hóa học/sinh học.
- Font hệ thống (không CDN). PIN mặc định `2026` (lưu dạng SHA-256).
- Cổng kiểm thử bắt buộc:
  - `cd client && npm install && npx tsc --noEmit && npm run test && npm run build`
  - `python -m py_compile server/app/main.py server/app/database.py server/app/models.py server/app/schemas.py server/app/api/auth.py server/app/api/assignments.py server/app/api/submissions.py server/app/api/tutor.py`

## 4. Ghi chú kĩ thuật đã kiểm chứng

- **Cổng cố định: Frontend 5175, Backend 8001** (5173/8000 dành cho dự án khác). Vite `strictPort`, proxy `/api` → 8001; app tự dò API `<hostname>:8001`.

- Engine dev: `window.__khtnEngine` (chỉ khi `import.meta.env.DEV`) để kiểm tra cảnh 3D từ DevTools.
- Trình duyệt nhúng của Claude desktop chặn Service Worker → kiểm tra PWA/offline bằng Chrome/Edge thật.
- `useEffect` phải có thân `{ }`: Chrome mới cho `scrollIntoView` trả Promise, trả ra làm cleanup sẽ sập trang.
- Thử trong trình duyệt bằng `import('/src/store/...')` sau khi sửa file có thể lấy bản store khác (HMR `?t=`) → khởi động lại dev server trước.
- Heredoc dài trong Bash tool có thể lỗi phân tích cú pháp → dùng Write tool để tạo file.

## 5. Checklist tiến độ

### Pha 0 — Nền tảng
- [x] CLAUDE.md
- [x] client: package.json, tsconfig, vite.config (PWA), tailwind, postcss, index.html, vercel.json, .prettierrc, .env.example
- [x] config/appConfig.ts, types/lab.ts
- [x] audio/soundEngine.ts, utils/* (haptics, cryptoPin, randomizer, qrSyncCodec, bugSnapshot, debounceGuard)
- [x] offline/db.ts, offline/RemoteSyncManager.ts, store/useLabStore.ts

### Pha 1 — Mô phỏng
- [x] engines/physics (physicsSolver, physicsSceneBuilder)
- [x] engines/chemistry (chemistrySolver, chemistrySceneBuilder)
- [x] engines/biology (biologySolver, microscopeShader, biologySceneBuilder)
- [x] engines/formulaEvaluator, gradingEngine, solverRegistry, statistics (solver 12 bài)
- [x] engines/sceneFactory, sceneKit
- [x] engines/__tests__ (Vitest)

### Pha 2 — Dữ liệu
- [x] plugins: 4 Vật lí, 4 Hóa học, 4 Sinh học + pluginRegistry
- [x] data: offlineTutorKB, misconceptionKB, khktBenchmarkSeed, userGuidesData

### Pha 3 — Lõi 3D & Giao diện
- [x] core: SceneErrorBoundary, WebGLCheckGuard, ThreeEngineCore, LabCanvasHost
- [x] components (21 file) + App.tsx + main.tsx

### Pha 4 — Backend
- [x] server: requirements, render.yaml, .env.example, app/main, database, models, schemas, api/*

### Pha 5 — Tài liệu & Đóng gói
- [x] README, CONTRIBUTING, .github/PULL_REQUEST_TEMPLATE.md, docs/* (5 file), .gitignore
- [x] start.bat/.sh, build-offline-usb.bat/.sh (+ usb-kit)

### Pha 7 — Nâng cấp học liệu (23 bài)
- [x] practicalSolver, conceptSolver (Hóa, Sinh), redox; cảnh 3D mới; 11 bài thêm + 4 bài nâng cấp
- [x] SimControls, góc nhìn theo bước, nguyên tắc, thẻ làm tiếp, DataChart, WorksheetModal

### Pha 6 — Kiểm thử
- [x] tsc --noEmit, vitest, vite build, py_compile — exit code 0
