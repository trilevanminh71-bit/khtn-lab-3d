/**
 * Sinh biểu tượng PWA dạng PNG (192, 512, 180 cho iOS) KHÔNG cần thư viện ngoài.
 * Vẽ: nền xanh lab bo góc + bình tam giác (erlenmeyer) trắng + chất lỏng xanh ngọc + nguyên tử.
 * Chạy: node scripts/gen-icons.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x / size, y / size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
// Hàm tô điểm ảnh theo tọa độ chuẩn hóa u,v ∈ [0,1]
function pixel(u, v) {
  const bg = [15, 118, 110, 255];
  // Bình tam giác: cổ bình 0.42–0.58, thân từ v=0.42 tới 0.82
  const neck = v > 0.18 && v < 0.42 && u > 0.42 && u < 0.58;
  const t = (v - 0.42) / 0.4;
  const half = 0.08 + t * 0.26;
  const body = v >= 0.42 && v < 0.82 && Math.abs(u - 0.5) < half;
  const liquid = body && v > 0.6;
  const edge = body && Math.abs(u - 0.5) > half - 0.025;
  const dx = u - 0.72, dy = v - 0.24;
  const atom = Math.abs(Math.hypot(dx, dy) - 0.09) < 0.012 || Math.hypot(dx, dy) < 0.025;
  if (edge || neck) return [240, 253, 250, 255];
  if (liquid) return [94, 234, 212, 255];
  if (body) return [204, 251, 241, 255];
  if (atom) return [253, 224, 71, 255];
  return bg;
}
mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192, pixel));
writeFileSync('public/icons/icon-512.png', png(512, pixel));
writeFileSync('public/icons/apple-touch-icon.png', png(180, pixel));
writeFileSync(
  'public/icons/icon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#0f766e"/><path d="M42 18h16v24l26 40H16l26-40z" fill="#ccfbf1" stroke="#f0fdfa" stroke-width="3"/><path d="M28 62h44l12 20H16z" fill="#5eead4"/><circle cx="72" cy="24" r="9" fill="none" stroke="#fde047" stroke-width="2.4"/><circle cx="72" cy="24" r="2.5" fill="#fde047"/></svg>`
);
console.log('Đã sinh biểu tượng PWA trong public/icons/');
