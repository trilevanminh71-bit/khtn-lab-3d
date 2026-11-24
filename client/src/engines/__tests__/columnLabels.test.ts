/**
 * Kiểm thử tiêu đề cột bảng số liệu: không lộ khóa tiếng Anh, có fallback an toàn cho khóa lạ.
 */
import { describe, expect, it } from 'vitest';
import { columnLabel } from '../../utils/columnLabels';
import { BUILTIN_PLUGINS } from '../../plugins/pluginRegistry';

describe('Tiêu đề cột bảng số liệu', () => {
  it('bài kính hiển vi dùng tên cột tiếng Việt', () => {
    const p = BUILTIN_PLUGINS.find((x) => x.id === 'sh10-quan-sat-te-bao')!;
    expect(p.params.map(columnLabel)).toEqual(['Mẫu vật', 'Vật kính', 'Thị kính', 'Ốc vi cấp', 'Dầu soi']);
  });
  it('12 bài: khóa dài (từ tiếng Anh) không bao giờ hiện nguyên văn, kí hiệu khoa học được giữ', () => {
    for (const p of BUILTIN_PLUGINS) {
      const headers = p.params.map(columnLabel);
      expect(new Set(headers).size, p.id).toBe(headers.length);
      p.params.forEach((d, i) => {
        if (d.key.length > 2) expect(headers[i], `${p.id}:${d.key}`).not.toBe(d.key);
      });
    }
    expect(columnLabel({ key: 'h', label: 'Độ cao thả bi' })).toBe('h');
    expect(columnLabel({ key: 'R0', label: 'Điện trở bảo vệ R₀' })).toBe('R0');
  });
  it('khóa chưa ánh xạ: dùng nhãn tiếng Việt, thiếu nhãn thì dùng khóa; không dính thuộc tính của Object', () => {
    expect(columnLabel({ key: 'humidity', label: 'Độ ẩm (0: khô · 1: ẩm)' })).toBe('Độ ẩm');
    expect(columnLabel({ key: 'humidity', label: '' })).toBe('humidity');
    expect(columnLabel({ key: 'humidity' })).toBe('humidity');
    expect(columnLabel({ key: 'constructor', label: 'Cấu trúc' })).toBe('Cấu trúc');
  });
});
