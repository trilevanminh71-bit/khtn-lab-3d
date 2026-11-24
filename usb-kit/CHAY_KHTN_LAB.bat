@echo off
REM Nhap dup de chay KHTN-Lab 3D tu USB - khong can Internet, khong can cai dat.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve-offline.ps1"
if errorlevel 1 pause
