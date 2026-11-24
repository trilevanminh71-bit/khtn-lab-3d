/**
 * engines/biology/microscopeShader.ts — Shader GLSL vẽ THỊ TRƯỜNG KÍNH HIỂN VI hoàn toàn bằng thuật toán
 * (không cần ảnh tiêu bản → 0 KB, chạy offline).
 *
 * Kĩ thuật: sơ đồ Voronoi (mỗi ô = 1 tế bào) + hàm khoảng cách (SDF) cho vi khuẩn hình que, nhân, nhiễm sắc thể.
 * Uniform:
 *  - uSpec   : 0 vi khuẩn sữa chua · 1 biểu bì hành · 2 niêm mạc miệng · 3 co nguyên sinh · 4 đỉnh rễ hành
 *  - uFov    : đường kính thị trường (µm) = 180 000 / độ phóng đại (số trường 18 mm)
 *  - uBlur   : 0 nét → 1 mờ (lệch tiêu cự)
 *  - uProto  : tỉ lệ tế bào co nguyên sinh (0..1)
 *  - uStain  : độ đậm thuốc nhuộm (0..1)
 *  - uMI     : tỉ lệ tế bào đang phân chia (chỉ số nguyên phân)
 *  - uSeed   : hạt giống bố cục (đổi vi trường)
 *  - uTex/uUseTex : ảnh tiêu bản thật do giáo viên tải lên (ghi đè hình procedural)
 *  - uLight  : đèn kính hiển vi bật (1) / tắt (0)
 */
import * as THREE from 'three';

export const MICROSCOPE_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const MICROSCOPE_FRAGMENT = /* glsl */ `
precision mediump float;
uniform float uSpec;
uniform float uFov;
uniform float uBlur;
uniform float uProto;
uniform float uStain;
uniform float uMI;
uniform float uSeed;
uniform float uLight;
uniform float uUseTex;
uniform sampler2D uTex;
varying vec2 vUv;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p + uSeed) * 43758.5453);
}
float hash1(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed * 1.7) * 43758.5453); }

// Voronoi: x = khoảng cách tới tâm ô, y = khoảng cách tới biên ô, z = mã ngẫu nhiên của ô, w = góc ngẫu nhiên
vec4 voronoi(vec2 x, float jitter) {
  vec2 n = floor(x);
  vec2 f = fract(x);
  vec2 mg = vec2(0.0);
  vec2 mr = vec2(0.0);
  float md = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = 0.5 + (hash2(n + g) - 0.5) * jitter;
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < md) { md = d; mr = r; mg = g; }
    }
  }
  float ed = 8.0;
  for (int j = -2; j <= 2; j++) {
    for (int i = -2; i <= 2; i++) {
      vec2 g = mg + vec2(float(i), float(j));
      vec2 o = 0.5 + (hash2(n + g) - 0.5) * jitter;
      vec2 r = g + o - f;
      if (dot(mr - r, mr - r) > 0.00001) ed = min(ed, dot(0.5 * (mr + r), normalize(r - mr)));
    }
  }
  return vec4(sqrt(md), ed, hash1(n + mg), hash1(n + mg + 7.3) * 6.2831);
}

// Khoảng cách tới đoạn thẳng (vi khuẩn hình que = capsule)
float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

vec3 specimen(vec2 c, float soft) {
  vec3 bg = vec3(0.93, 0.94, 0.9);
  if (uSpec < 0.5) {
    // Vi khuẩn lactic: que dài ~2 µm, nhuộm xanh methylene, KHÔNG có nhân
    vec2 p = c * uFov / 4.0;
    vec2 n = floor(p);
    vec3 col = bg * vec3(0.98, 0.97, 0.92);
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = n + vec2(float(i), float(j));
        vec2 o = hash2(g);
        float a = hash1(g) * 6.2831;
        vec2 dir = vec2(cos(a), sin(a)) * 0.25;
        vec2 ctr = g + o;
        float d = sdCapsule(p, ctr - dir, ctr + dir, 0.09);
        col = mix(col, vec3(0.25, 0.35, 0.75) * (0.7 + 0.3 * uStain), 1.0 - smoothstep(-soft, soft, d));
      }
    }
    return col;
  }
  if (uSpec < 1.5 || (uSpec > 2.5 && uSpec < 3.5)) {
    // Biểu bì vảy hành: tế bào dài ~220 µm (tỉ lệ 3:1), thành cellulose rõ, nhân hình tròn
    vec2 p = c * uFov / vec2(220.0, 75.0);
    vec4 v = voronoi(p, 0.35);
    float wall = 1.0 - smoothstep(0.02, 0.02 + soft * 4.0, v.y);
    bool plasmo = uSpec > 2.5;
    vec3 cyto = plasmo ? vec3(0.97, 0.95, 0.96) : vec3(0.95, 0.88, 0.82);
    vec3 col = cyto;
    if (plasmo) {
      // Co nguyên sinh: khối nguyên sinh chất màu tím (anthocyanin) tách khỏi thành tế bào
      float shrink = (v.z < uProto) ? 0.13 + 0.12 * fract(v.z * 13.0) : 0.03;
      float inside = smoothstep(shrink, shrink + soft * 3.0, v.y);
      col = mix(cyto, vec3(0.55, 0.2, 0.55), inside);
    } else {
      // Nhân tế bào: hình tròn gần tâm ô Voronoi, bắt màu nâu khi nhuộm
      float nucleus = 1.0 - smoothstep(0.08, 0.08 + soft * 3.0, v.x);
      col = mix(col, vec3(0.55, 0.38, 0.3) * (0.8 + 0.4 * uStain), nucleus * 0.8);
    }
    return mix(col, vec3(0.45, 0.3, 0.22), wall);
  }
  if (uSpec < 2.5) {
    // Niêm mạc miệng: tế bào dẹt, hình đa giác không đều (~60 µm), nhân nhỏ bắt màu xanh
    vec2 p = c * uFov / 70.0;
    vec4 v = voronoi(p, 0.9);
    float body = 1.0 - smoothstep(0.03, 0.03 + soft * 3.0, 0.08 - v.y + 0.04 * sin(v.w * 3.0 + p.x * 4.0));
    float present = step(0.25, v.z);
    vec3 col = mix(bg, vec3(0.8, 0.86, 0.95), body * present);
    float nucleus = 1.0 - smoothstep(0.09, 0.09 + soft * 3.0, v.x);
    return mix(col, vec3(0.2, 0.3, 0.7) * (0.7 + 0.3 * uStain), nucleus * present);
  }
  // Đỉnh rễ hành: tế bào vuông nhỏ (~25 µm) xếp sít; một phần đang nguyên phân
  vec2 p = c * uFov / 25.0;
  vec4 v = voronoi(p, 0.2);
  float wall = 1.0 - smoothstep(0.015, 0.015 + soft * 3.0, v.y);
  vec3 col = vec3(0.96, 0.86, 0.86);
  vec3 chrom = vec3(0.45, 0.05, 0.2) * (0.5 + 0.6 * uStain);
  vec2 q = p - floor(p);
  // Toạ độ trong ô (ô gần như lưới vuông vì jitter nhỏ)
  vec2 local = q - 0.5;
  float dividing = step(v.z, uMI);
  float phase = fract(v.z * 37.0);
  float ang = v.w;
  vec2 axis = vec2(cos(ang), sin(ang));
  vec2 perp = vec2(-axis.y, axis.x);
  float along = dot(local, axis);
  float across = dot(local, perp);
  float m = 0.0;
  if (dividing > 0.5) {
    if (phase < 0.45) {
      // Kì đầu: NST co xoắn, dạng sợi lấm tấm trong nhân
      m = (1.0 - smoothstep(0.18, 0.2, v.x)) * step(0.45, fract(sin(dot(q * 40.0, vec2(3.1, 7.7))) * 991.0));
    } else if (phase < 0.65) {
      // Kì giữa: NST xếp 1 hàng trên mặt phẳng xích đạo
      m = (1.0 - smoothstep(0.03, 0.05, abs(along))) * (1.0 - smoothstep(0.18, 0.2, abs(across)));
    } else if (phase < 0.77) {
      // Kì sau: hai nhóm NST đi về hai cực
      m = (1.0 - smoothstep(0.03, 0.05, abs(abs(along) - 0.16))) * (1.0 - smoothstep(0.15, 0.17, abs(across)));
    } else {
      // Kì cuối: hai nhân con, vách ngăn giữa
      m = 1.0 - smoothstep(0.07, 0.09, min(length(local - axis * 0.2), length(local + axis * 0.2)));
      wall = max(wall, 1.0 - smoothstep(0.01, 0.02, abs(along)));
    }
  } else {
    // Kì trung gian: nhân tròn bắt màu nhạt, có hạch nhân
    m = (1.0 - smoothstep(0.15, 0.17, v.x)) * 0.55 + (1.0 - smoothstep(0.03, 0.05, v.x)) * 0.45;
  }
  col = mix(col, chrom, clamp(m, 0.0, 1.0) * (0.6 + 0.4 * uStain));
  col = mix(col, vec3(0.75, 0.5, 0.55), wall);
  // Nhuộm quá lâu: cả tế bào chất sẫm màu
  col = mix(col, vec3(0.5, 0.15, 0.3), clamp((uStain - 0.95) * 4.0, 0.0, 0.6));
  return col;
}

void main() {
  vec2 c = vUv - 0.5;
  float r = length(c);
  if (r > 0.5) { gl_FragColor = vec4(0.02, 0.02, 0.03, 1.0); return; }
  float soft = 0.004 + uBlur * 0.12;
  vec3 col;
  if (uUseTex > 0.5) {
    float zoom = clamp(uFov / 1800.0, 0.02, 1.0);
    col = texture2D(uTex, c * zoom + 0.5).rgb;
  } else {
    col = specimen(c, soft);
  }
  // Mờ khi lệch tiêu cự: giảm tương phản
  col = mix(col, vec3(0.85, 0.85, 0.82), uBlur * 0.55);
  // Mép tối dần (vignette) và đèn
  float vig = smoothstep(0.5, 0.36, r);
  col *= mix(0.25, 1.0, vig);
  col *= mix(0.06, 1.0, uLight);
  gl_FragColor = vec4(col, 1.0);
}
`;

/** Tạo vật liệu shader kính hiển vi với các uniform mặc định */
export function createMicroscopeMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: MICROSCOPE_VERTEX,
    fragmentShader: MICROSCOPE_FRAGMENT,
    uniforms: {
      uSpec: { value: 1 },
      uFov: { value: 1800 },
      uBlur: { value: 0 },
      uProto: { value: 0 },
      uStain: { value: 0.7 },
      uMI: { value: 0.12 },
      uSeed: { value: 1 },
      uLight: { value: 0 },
      uUseTex: { value: 0 },
      uTex: { value: null }
    }
  });
}

/** Mã số mẫu dùng trong shader */
export function specimenCode(name: string): number {
  switch (name) {
    case 'bacteria':
      return 0;
    case 'onion':
      return 1;
    case 'cheek':
      return 2;
    case 'plasmolysis':
      return 3;
    case 'root-tip':
      return 4;
    default:
      return 1;
  }
}

/** Đường kính thị trường (µm) theo độ phóng đại tổng, số trường FN = 18 mm */
export function fieldOfViewUm(magnification: number): number {
  return 180000 / Math.max(1, magnification);
}
