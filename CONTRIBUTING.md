# Cẩm nang nhóm phát triển KHTN-Lab 3D

## 1. Bản đồ file — "muốn sửa X thì mở file nào?"

| Muốn sửa | Mở file |
|---|---|
| Tên app, tên trường, thành viên, màu, PIN mặc định, hạn mức AI, link cập nhật | `client/src/config/appConfig.ts` |
| Nội dung một bài (mục tiêu, bước, câu hỏi, khoảng thông số) | `client/src/plugins/<môn>/<bài>.ts` (hoặc dùng CMS trên web) |
| Công thức khoa học của bài | `client/src/engines/<môn>/<môn>Solver.ts` |
| Mô hình 3D | `client/src/engines/<môn>/<môn>SceneBuilder.ts`, dụng cụ dùng chung ở `engines/sceneKit.ts` |
| Hình tế bào dưới kính hiển vi | `client/src/engines/biology/microscopeShader.ts` |
| Cách chấm điểm / giải thích trừ điểm | `client/src/engines/gradingEngine.ts` |
| Kho ngộ nhận / gợi mở AI offline | `client/src/data/misconceptionKB.ts`, `data/offlineTutorKB.ts` |
| Giao diện | `client/src/components/*.tsx` |
| Trạng thái toàn cục (bước, đo, PPE, cài đặt) | `client/src/store/useLabStore.ts` |
| API máy chủ | `server/app/api/*.py` |

## 2. Quy trình Git

1. `git checkout -b tinh-nang/ten-ngan` (hoặc `sua-loi/...`).
2. Code + test. Chạy **cổng kiểm thử** (xem README) — phải exit code 0.
3. `git commit -m "Thêm bài đo khối lượng riêng"` (tiếng Việt, động từ đầu câu).
4. Mở Pull Request, điền checklist trong `.github/PULL_REQUEST_TEMPLATE.md`. Ít nhất 1 thành viên review.

## 3. Quy ước bắt buộc

- 100% chuỗi giao diện tiếng Việt; danh pháp IUPAC theo SGK 2018 (sulfuric acid, copper(II) sulfate…).
- TypeScript strict, **không dùng `any`**, không để `TODO`, không để nút bấm "chết".
- File khoa học có chú thích tiếng Việt: đầu vào, đầu ra, ý nghĩa vật lí/hóa học/sinh học.
- Không thêm thư viện mới khi chưa thống nhất nhóm (giữ ứng dụng siêu nhẹ).
- Không đổi thứ tự `BUILTIN_PLUGINS` trong `pluginRegistry.ts` (chỉ số được mã hóa trong QR).

## 4. Thêm bài Lớp 11–12 trong 15 phút

### Cách A — Không cần code (5 phút)
Cổng GV → Quản lý → **Tạo bài mới không cần code**: chọn template 3D, nhập công thức (ví dụ `U / R`), câu hỏi → Lưu. Xuất `.json` để chia sẻ.

### Cách B — Bài chuẩn có công thức riêng (15 phút)
1. **Bộ giải** (5 phút): trong `engines/physics/physicsSolver.ts` (hoặc môn tương ứng) thêm một `LabSolver`:
   ```ts
   export const ohmSolver: LabSolver = {
     id: 'ohm-law',
     description: 'I = U / R',
     measure(ctx) { const I = ctx.params.U / ctx.hidden.R * (1 + 0.005 * gaussian(ctx.rng));
       return { values: { I: roundTo(I, 3) }, visual: { switchOn: true, current: I, readoutA: `${I.toFixed(3)} A` } }; },
     preview(ctx) { return { switchOn: false, current: 0, readoutA: '0.000 A' }; },
     trueResult(ctx) { return ctx.hidden.R; },
     estimateFromTrials(trials) { return mean(trials.map((t) => t.params.U / t.values.I)); },
     incidents() { return []; }
   };
   ```
   rồi thêm vào mảng `physicsSolvers`.
2. **Plugin** (7 phút): sao chép `plugins/physics/batteryEmf.ts` → đổi `id`, `solverId: 'ohm-law'`, `params`, `hidden`, `measurements`, `result`, `steps` (trigger theo template), câu hỏi.
3. **Đăng ký** (1 phút): thêm vào **cuối** mảng `BUILTIN_PLUGINS`.
4. **Test** (2 phút): thêm quy trình chuẩn vào `PROTOCOLS` trong `engines/__tests__/plugins.test.ts`, chạy `npm run test`.

Thẻ tương tác (`trigger`) có sẵn theo template:
- `track`: `gate-slot` (snap), `timer`, `release`, `ball`
- `circuit`: `voltmeter-slot` (snap), `ammeter`, `switch`, `battery`, `rheostat`
- `beaker`: `beaker-slot` (snap), `reagent-a`, `reagent-b`, `catalyst`, `water-bath`
- `titration`: `flask-slot` (snap), `stopcock`, `acid-bottle`
- `microscope`: `stage-slot` (snap), `light`, `fine-knob`, `coarse-knob`, `objective-turret`, `dropper`

## 5. Báo lỗi
Mở web với `?debug=true` → bảng Debug → **Xuất Bug Snapshot** → đính kèm file JSON vào issue.
