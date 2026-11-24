## Mô tả thay đổi

<!-- Thay đổi gì, vì sao? Liên quan bài/issue nào? -->

## Loại thay đổi

- [ ] Sửa lỗi
- [ ] Tính năng mới
- [ ] Nội dung bài học (plugin / câu hỏi / công thức)
- [ ] Tài liệu

## Checklist bắt buộc

- [ ] `cd client && npm install && npx tsc --noEmit && npm run test && npm run build` → exit code 0
- [ ] `python -m py_compile server/app/main.py server/app/database.py server/app/models.py server/app/schemas.py server/app/api/auth.py server/app/api/assignments.py server/app/api/submissions.py server/app/api/tutor.py` → exit code 0
- [ ] 100% chuỗi giao diện tiếng Việt, đúng danh pháp IUPAC theo SGK 2018
- [ ] Không có `any`, `TODO`, hàm rỗng, nút bấm không hoạt động
- [ ] File khoa học có chú thích tiếng Việt (đầu vào, đầu ra, ý nghĩa)
- [ ] Bài mới: đã thêm quy trình chuẩn vào `engines/__tests__/plugins.test.ts`
- [ ] Đã thử trên điện thoại (màn hình dọc) và chế độ "Đồ họa máy yếu"
- [ ] Không đổi thứ tự `BUILTIN_PLUGINS`

## Ảnh chụp màn hình (nếu đổi giao diện)
