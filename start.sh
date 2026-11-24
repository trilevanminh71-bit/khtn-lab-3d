#!/usr/bin/env bash
# Chạy 1 chạm KHTN-Lab 3D trên macOS / Linux: Backend FastAPI (0.0.0.0:8000) + Web Frontend (0.0.0.0:5173)
set -e
cd "$(dirname "$0")"
PY=python3
command -v python3 >/dev/null 2>&1 || PY=python
if [ ! -d server/.venv ]; then
  echo "[1/3] Tạo môi trường Python & cài thư viện máy chủ..."
  $PY -m venv server/.venv
  server/.venv/bin/pip install -q -r server/requirements.txt
fi
if [ ! -d client/node_modules ]; then
  echo "[2/3] Cài thư viện giao diện (npm install)..."
  (cd client && npm install --no-audit --no-fund)
fi
echo "[3/3] Khởi động..."
(cd server && .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000) &
BACK=$!
trap 'kill $BACK 2>/dev/null' EXIT
IP=$( (hostname -I 2>/dev/null || ipconfig getifaddr en0 2>/dev/null || true) | awk '{print $1}')
echo "=============================================================="
echo " Máy này:   http://localhost:5173"
if [ -n "$IP" ]; then echo " Học sinh cùng Wi-Fi mở: http://$IP:5173  (API: http://$IP:8000)"; fi
echo " Nhấn Ctrl+C để dừng."
echo "=============================================================="
cd client && npm run dev -- --port 5173
