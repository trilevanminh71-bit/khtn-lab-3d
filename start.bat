@echo off
REM Chay 1 cham KHTN-Lab 3D tren Windows: Backend FastAPI (0.0.0.0:8001) + Web Frontend (0.0.0.0:5175)
cd /d "%~dp0"
where python >nul 2>nul || (echo [LOI] Chua cai Python 3.10+ tai https://www.python.org & pause & exit /b 1)
where npm >nul 2>nul || (echo [LOI] Chua cai Node.js 18+ tai https://nodejs.org & pause & exit /b 1)
if not exist server\.venv (
  echo [1/3] Tao moi truong Python va cai thu vien may chu...
  python -m venv server\.venv
  server\.venv\Scripts\python -m pip install -q -r server\requirements.txt
)
if not exist client\node_modules (
  echo [2/3] Cai thu vien giao dien - npm install...
  pushd client
  call npm install --no-audit --no-fund
  popd
)
echo [3/3] Khoi dong may chu va giao dien...
start "KHTN-Lab API 8001" cmd /k "cd /d %~dp0server && .venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8001"
start "KHTN-Lab Web 5175" cmd /k "cd /d %~dp0client && npm run dev"
echo ==============================================================
echo  May nay:  http://localhost:5175
echo  Hoc sinh cung Wi-Fi: http://IP-may-giao-vien:5175  (xem IP bang lenh ipconfig)
echo  Dong 2 cua so den de dung.
echo ==============================================================
timeout /t 4 >nul
start "" http://localhost:5175
