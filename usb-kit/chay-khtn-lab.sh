#!/usr/bin/env bash
# Chạy KHTN-Lab 3D từ USB trên macOS / Linux (cần python3 — có sẵn trên macOS và hầu hết Linux)
cd "$(dirname "$0")"
exec python3 serve_offline.py 8080
