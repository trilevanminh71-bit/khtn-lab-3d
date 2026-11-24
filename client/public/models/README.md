# Thư mục mô hình 3D (tùy chọn)

Mặc định KHTN-Lab 3D **tự dựng toàn bộ mô hình bằng code Three.js** (0 KB tải thêm) để chạy trên máy yếu.

Nếu nhóm muốn nâng cấp mô hình đẹp hơn:
1. Xuất mô hình từ Blender sang `.glb`, bật nén **Draco** (Export → glTF 2.0 → Compression).
2. Giữ dung lượng mỗi file < 1,5 MB, số tam giác < 30.000.
3. Cách nhanh nhất (không cần code): mở **Cổng giáo viên → Tài nguyên 3D** trong web và tải file `.glb`
   lên — file được lưu trong IndexedDB của trình duyệt và tự thay thế mô hình mặc định của bài.
4. Nếu dùng nén Draco, chép thư mục `draco/` (từ `node_modules/three/examples/jsm/libs/draco/`) vào `public/draco/`.
