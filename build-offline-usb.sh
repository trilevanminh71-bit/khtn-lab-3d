#!/usr/bin/env bash
# Đóng gói bản Web chạy offline từ USB → thư mục KHTN-Lab-USB/ (chép nguyên thư mục này vào USB)
set -e
cd "$(dirname "$0")"
echo "[1/3] Cài thư viện & build bản USB (đường dẫn tương đối ./)..."
cd client
[ -d node_modules ] || npm install --no-audit --no-fund
npm run build:usb
cd ..
echo "[2/3] Tạo thư mục KHTN-Lab-USB..."
rm -rf KHTN-Lab-USB
mkdir -p KHTN-Lab-USB/web
cp -R client/dist/. KHTN-Lab-USB/web/
cp usb-kit/CHAY_KHTN_LAB.bat usb-kit/serve-offline.ps1 usb-kit/serve_offline.py usb-kit/chay-khtn-lab.sh usb-kit/HUONG_DAN.html KHTN-Lab-USB/
chmod +x KHTN-Lab-USB/chay-khtn-lab.sh
echo "[3/3] Xong! Chép thư mục KHTN-Lab-USB vào USB. Mở HUONG_DAN.html để xem cách chạy."
du -sh KHTN-Lab-USB 2>/dev/null || true
