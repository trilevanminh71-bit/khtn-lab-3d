@echo off
REM Dong goi ban Web chay offline tu USB -> thu muc KHTN-Lab-USB\ (chep nguyen thu muc nay vao USB)
cd /d "%~dp0"
where npm >nul 2>nul || (echo [LOI] Chua cai Node.js 18+ & pause & exit /b 1)
echo [1/3] Build ban USB...
pushd client
if not exist node_modules call npm install --no-audit --no-fund
call npm run build:usb
if errorlevel 1 (popd & echo [LOI] Build that bai & pause & exit /b 1)
popd
echo [2/3] Tao thu muc KHTN-Lab-USB...
if exist KHTN-Lab-USB rmdir /s /q KHTN-Lab-USB
mkdir KHTN-Lab-USB\web
xcopy /e /i /q /y client\dist KHTN-Lab-USB\web >nul
copy /y usb-kit\CHAY_KHTN_LAB.bat KHTN-Lab-USB\ >nul
copy /y usb-kit\serve-offline.ps1 KHTN-Lab-USB\ >nul
copy /y usb-kit\serve_offline.py KHTN-Lab-USB\ >nul
copy /y usb-kit\chay-khtn-lab.sh KHTN-Lab-USB\ >nul
copy /y usb-kit\HUONG_DAN.html KHTN-Lab-USB\ >nul
echo [3/3] Xong! Chep thu muc KHTN-Lab-USB vao USB, nhap dup CHAY_KHTN_LAB.bat de chay.
pause
