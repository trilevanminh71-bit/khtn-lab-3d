# serve-offline.ps1 — Máy chủ web tĩnh siêu nhẹ chạy bằng PowerShell có sẵn trên mọi Windows (không cần cài gì).
# Vì sao cần: trình duyệt chặn module JavaScript & Service Worker khi mở bằng file:// (lỗi CORS).
# Chạy qua http://localhost thì hết lỗi và ứng dụng hoạt động offline đầy đủ.
param([int]$Port = 8080, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot 'web'
if (-not (Test-Path (Join-Path $root 'index.html'))) { Write-Host 'Khong tim thay thu muc web\index.html'; exit 1 }
$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.mjs' = 'text/javascript; charset=utf-8';
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json; charset=utf-8'; '.webmanifest' = 'application/manifest+json';
  '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.ico' = 'image/x-icon'; '.glb' = 'model/gltf-binary';
  '.wasm' = 'application/wasm'; '.md' = 'text/plain; charset=utf-8'; '.txt' = 'text/plain; charset=utf-8'
}
$listener = $null
# Thử lần lượt các cổng 8080–8099 nếu cổng đang bận
for ($p = $Port; $p -lt $Port + 20; $p++) {
  try {
    $candidate = New-Object System.Net.HttpListener
    $candidate.Prefixes.Add("http://localhost:$p/")
    $candidate.Start()
    $listener = $candidate
    $Port = $p
    break
  } catch { }
}
if ($null -eq $listener) { Write-Host 'Khong mo duoc cong mang nao (8080-8099).'; exit 1 }
$url = "http://localhost:$Port/"
Write-Host "KHTN-Lab 3D dang chay offline tai $url  (dong cua so nay de tat)"
if (-not $NoBrowser) { Start-Process $url }
$rootFull = [IO.Path]::GetFullPath($root)
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ($path -eq '') { $path = 'index.html' }
    $full = [IO.Path]::GetFullPath((Join-Path $root $path))
    if (-not $full.StartsWith($rootFull)) { $ctx.Response.StatusCode = 403; continue }
    if (-not (Test-Path $full -PathType Leaf)) { $full = Join-Path $root 'index.html' }
    $ext = [IO.Path]::GetExtension($full).ToLower()
    if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] } else { $ctx.Response.ContentType = 'application/octet-stream' }
    if ($full.EndsWith('sw.js')) { $ctx.Response.Headers.Add('Cache-Control', 'no-cache') }
    $bytes = [IO.File]::ReadAllBytes($full)
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch {
    $ctx.Response.StatusCode = 500
  } finally {
    $ctx.Response.Close()
  }
}
