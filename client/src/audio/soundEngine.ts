/**
 * audio/soundEngine.ts — Âm thanh tổng hợp bằng Web Audio API thuần (0 KB file âm thanh).
 * Mỗi hàm tạo sóng (oscillator) hoặc nhiễu trắng có bao biên độ (envelope) ngắn để mô phỏng:
 *  - click: tiếng công tắc; snap: tiếng gắn khớp; bubble: sủi bọt khí; alarm: còi cảnh báo sự cố;
 *  - success / error: phản hồi đúng/sai; pour: tiếng rót chất lỏng; tick: tiếng tích đồng hồ.
 * An toàn: nếu trình duyệt chặn AudioContext (chưa có cử chỉ người dùng) thì bỏ qua im lặng.
 */
export type SoundName = 'click' | 'snap' | 'bubble' | 'alarm' | 'success' | 'error' | 'pour' | 'tick';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  /** Khởi tạo AudioContext lười (sau cử chỉ chạm/bấm đầu tiên) */
  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!this.ctx) {
      try {
        this.ctx = new Ctor();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Phát một nốt: tần số f (Hz), dạng sóng, thời lượng dur (s), âm lượng cực đại vol */
  private tone(f: number, type: OscillatorType, dur: number, vol: number, delay = 0, fEnd?: number): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t0);
    if (fEnd) osc.frequency.exponentialRampToValueAtTime(fEnd, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Nhiễu trắng lọc thông dải — dùng cho tiếng rót chất lỏng */
  private noise(dur: number, vol: number, freq: number): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
  }

  play(name: SoundName): void {
    switch (name) {
      case 'click':
        this.tone(1800, 'square', 0.04, 0.08);
        break;
      case 'tick':
        this.tone(2400, 'sine', 0.03, 0.05);
        break;
      case 'snap':
        this.tone(520, 'triangle', 0.07, 0.15);
        this.tone(880, 'triangle', 0.08, 0.12, 0.05);
        break;
      case 'bubble':
        for (let i = 0; i < 5; i++) {
          this.tone(300 + Math.random() * 500, 'sine', 0.08, 0.06, i * 0.07, 900 + Math.random() * 600);
        }
        break;
      case 'alarm':
        for (let i = 0; i < 3; i++) {
          this.tone(880, 'sawtooth', 0.18, 0.12, i * 0.4);
          this.tone(660, 'sawtooth', 0.18, 0.12, i * 0.4 + 0.2);
        }
        break;
      case 'success':
        this.tone(523, 'sine', 0.12, 0.12);
        this.tone(659, 'sine', 0.12, 0.12, 0.1);
        this.tone(784, 'sine', 0.2, 0.12, 0.2);
        break;
      case 'error':
        this.tone(220, 'square', 0.25, 0.08, 0, 140);
        break;
      case 'pour':
        this.noise(0.6, 0.15, 1200);
        break;
    }
  }
}

/** Thể hiện dùng chung toàn ứng dụng */
export const soundEngine = new SoundEngine();
