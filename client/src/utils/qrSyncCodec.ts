/**
 * utils/qrSyncCodec.ts — Nén / giải mã kết quả bài làm thành chuỗi ngắn (< 180 ký tự) cho mã QR.
 *
 * Thiết kế để QR "siêu dễ quét" bằng camera điện thoại cũ:
 *  - Chỉ dùng ký tự thuộc bảng QR Alphanumeric (0-9, A-Z, ".", "/", "-") → mật độ điểm thấp nhất.
 *  - Số nguyên mã hóa cơ số 36 (viết hoa).
 *  - Cuối chuỗi là checksum 3 ký tự (FNV-1a mod 36³) để phát hiện quét sai / sửa tay.
 *
 * Định dạng: K1.LOP.MAHS.P.DIEM.PRE/PREMAX.POST/POSTMAX.SAISO.MASK.LIKERT.THOIGIAN.PHUT.CHK
 */
import type { QrPayload } from '../types/lab';
import { hashString } from './randomizer';

const PREFIX = 'K1';
const SEP = '.';

/** Chuẩn hóa mã lớp / mã học sinh: chữ in hoa, số, gạch ngang; tối đa 12 ký tự */
export function sanitizeCode(code: string): string {
  const noAccent = code.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'D');
  return noAccent
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 12);
}

const b36 = (n: number): string => Math.max(0, Math.round(n)).toString(36).toUpperCase();
const fromB36 = (s: string): number => {
  if (!/^[0-9A-Z]+$/.test(s)) return Number.NaN;
  return parseInt(s, 36);
};

/** Checksum 3 ký tự base36 của phần thân */
export function checksum(body: string): string {
  return (hashString(body) % 46656).toString(36).toUpperCase().padStart(3, '0');
}

/** Mã hóa payload → chuỗi QR. Ném lỗi nếu dài quá 180 ký tự (không xảy ra với dữ liệu hợp lệ). */
export function encodeQrPayload(p: QrPayload): string {
  const likert = p.likert
    .slice(0, 8)
    .map((x) => String(Math.min(5, Math.max(0, Math.round(x)))))
    .join('');
  const parts = [
    PREFIX,
    sanitizeCode(p.classCode) || 'NA',
    sanitizeCode(p.studentCode) || 'NA',
    b36(p.pluginIndex),
    b36(Math.min(100, p.score)),
    `${b36(p.preScore)}/${b36(p.preMax)}`,
    `${b36(p.postScore)}/${b36(p.postMax)}`,
    b36(Math.min(99999, p.relErrorPercent * 10)),
    b36(p.misconceptionMask >>> 0),
    likert || '0',
    b36(Math.min(1679615, p.durationSec)),
    b36(p.createdAtMin)
  ];
  const body = parts.join(SEP);
  const out = `${body}${SEP}${checksum(body)}`;
  if (out.length > 180) throw new Error('Chuỗi QR vượt quá 180 ký tự');
  return out;
}

export type QrDecodeResult = { ok: true; payload: QrPayload } | { ok: false; error: string };

/** Giải mã chuỗi QR → payload, kiểm tra checksum và từng trường */
export function decodeQrPayload(raw: string): QrDecodeResult {
  const text = raw.trim().toUpperCase();
  const parts = text.split(SEP);
  if (parts.length !== 13 || parts[0] !== PREFIX) {
    return { ok: false, error: 'Mã QR không phải định dạng KHTN-Lab 3D.' };
  }
  const chk = parts.pop() as string;
  const body = parts.join(SEP);
  if (checksum(body) !== chk) return { ok: false, error: 'Sai checksum — mã QR bị quét lỗi hoặc đã bị sửa.' };
  const [, classCode, studentCode, pIdx, score, pre, post, err, mask, likert, dur, created] = parts;
  const [preS, preM] = pre.split('/');
  const [postS, postM] = post.split('/');
  const nums = [pIdx, score, preS, preM, postS, postM, err, mask, dur, created].map(fromB36);
  if (nums.some((n) => Number.isNaN(n))) return { ok: false, error: 'Dữ liệu số trong mã QR không hợp lệ.' };
  if (!/^[0-5]+$/.test(likert)) return { ok: false, error: 'Dữ liệu khảo sát trong mã QR không hợp lệ.' };
  const [pluginIndex, sc, preScore, preMax, postScore, postMax, errX10, misconceptionMask, durationSec, createdAtMin] =
    nums;
  if (sc > 100) return { ok: false, error: 'Điểm vượt quá 100 — mã QR không hợp lệ.' };
  return {
    ok: true,
    payload: {
      classCode,
      studentCode,
      pluginIndex,
      score: sc,
      preScore,
      preMax,
      postScore,
      postMax,
      relErrorPercent: errX10 / 10,
      misconceptionMask,
      likert: likert === '0' ? [] : likert.split('').map(Number),
      durationSec,
      createdAtMin
    }
  };
}
