"""serve_offline.py — Máy chủ tĩnh cho bản USB trên macOS/Linux (Python 3 có sẵn). Chống lỗi CORS khi mở từ file://."""
import functools
import http.server
import socketserver
import sys
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent / "web"


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".webmanifest": "application/manifest+json",
        ".glb": "model/gltf-binary",
    }

    def send_head(self):
        target = ROOT / self.path.split("?")[0].lstrip("/")
        if self.path in ("/", "") or not target.exists():
            self.path = "/index.html"
        return super().send_head()


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    for p in range(port, port + 20):
        try:
            httpd = socketserver.TCPServer(("127.0.0.1", p), functools.partial(Handler, directory=str(ROOT)))
        except OSError:
            continue
        url = f"http://localhost:{p}/"
        print(f"KHTN-Lab 3D đang chạy offline tại {url} — nhấn Ctrl+C để tắt")
        webbrowser.open(url)
        with httpd:
            httpd.serve_forever()
        return
    print("Không mở được cổng 8080–8099.")


if __name__ == "__main__":
    main()
