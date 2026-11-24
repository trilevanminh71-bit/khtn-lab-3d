/**
 * components/AiTutorDrawer.tsx — Trợ lý AI Socratic.
 * Luồng trả lời: Guardrail → Cache IndexedDB → Máy chủ (/api/tutor/analyze, Gemini 2.5 Flash)
 *   → (nếu có API key riêng) gọi trực tiếp Gemini → KHO GỢI MỞ CỤC BỘ khi API lỗi. Tổng thời gian chờ tối đa 8 giây.
 * CHẶN GỬI khi: mất mạng, hết hạn mức trong ngày, hoặc API báo quá tải (429, tạm nghỉ 60 giây).
 *   Khi bị chặn, khung hiện lí do và danh sách gợi ý cục bộ chỉ để đọc (không gửi câu hỏi).
 * Giọng nói: nhận dạng tiếng Việt (Web Speech API) — micro tự ẩn khi bị chặn/không hỗ trợ; đọc câu trả lời bằng TTS.
 * Mọi API trình duyệt tùy chọn đều kiểm tra typeof === 'function' và bọc try/catch.
 */
import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Send, Volume2, WifiOff, X } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { APP_CONFIG, SUBJECT_LABELS } from '../config/appConfig';
import { guardrailCheck, OFFLINE_TUTOR_KB, offlineTutorReply } from '../data/offlineTutorKB';
import { bumpAiQuota, getAiCache, getAiQuotaUsed, setAiCache } from '../offline/db';
import { createGuard } from '../utils/debounceGuard';
import { hashString } from '../utils/randomizer';
import { normalizeVi } from '../engines/gradingEngine';
import { currentApiUrl } from '../services/appServices';
import { logAction } from '../utils/bugSnapshot';
import type { TutorMessage } from '../types/lab';

const askGuard = createGuard(1500);
/** Thời gian tạm nghỉ (ms) khi API báo 429 — quá hạn mức/phút */
const API_COOLDOWN_MS = 60000;

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
type SRCtor = new () => SpeechRecognitionLike;

function getSR(): SRCtor | null {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  const ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return typeof ctor === 'function' ? ctor : null;
}

/** Dừng nhận dạng giọng nói an toàn (một số trình duyệt ném lỗi nếu chưa bắt đầu) */
function stopRecognition(rec: SpeechRecognitionLike | null): void {
  try {
    if (rec && typeof rec.stop === 'function') rec.stop();
  } catch {
    /* đã dừng trước đó */
  }
}

/** Đọc số lượt AI đã dùng hôm nay; IndexedDB bị chặn → coi như 0 */
async function readQuota(): Promise<number> {
  try {
    const n = await getAiQuotaUsed();
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

const SYSTEM_PROMPT =
  'Bạn là trợ lý dạy học Khoa học tự nhiên lớp 10 (SGK Kết nối tri thức) theo phương pháp Socratic. ' +
  'KHÔNG đưa đáp án số cuối cùng; đặt 1–2 câu hỏi gợi mở, nêu công thức hoặc khái niệm liên quan, tối đa 120 từ, tiếng Việt, ' +
  'dùng danh pháp IUPAC (sulfuric acid, copper(II) sulfate, potassium permanganate...). Từ chối nội dung ngoài học tập.';

/** Gọi với thời gian chờ */
async function withTimeout<T>(p: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await p(ctrl.signal);
  } finally {
    clearTimeout(t);
  }
}

const BADGE: Record<TutorMessage['source'], string> = { ai: 'AI', offline: 'Gợi ý cục bộ', cache: 'Bộ nhớ đệm', guardrail: 'Bảo vệ', student: '', system: '' };

export default function AiTutorDrawer() {
  const plugin = useLabStore((s) => s.plugin);
  const online = useLabStore((s) => s.online);
  const trials = useLabStore((s) => s.trials);
  const geminiKey = useLabStore((s) => s.settings.geminiApiKey);
  const [msgs, setMsgs] = useState<TutorMessage[]>([
    { role: 'tutor', text: `Chào em! Mình là trợ lý Socratic cho bài "${plugin.shortTitle}". Em đang vướng ở đâu? Mình sẽ gợi ý bằng câu hỏi để em tự tìm ra lời giải.`, source: 'system', at: Date.now() }
  ]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [quota, setQuota] = useState(0);
  const [cooldown, setCooldown] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const outOfQuota = quota >= APP_CONFIG.aiDailyQuota;
  const blockReason = !online
    ? 'Đang offline — không gửi được câu hỏi cho AI. Em xem các gợi ý có sẵn trong khung này, khi có mạng khung này tự mở lại.'
    : outOfQuota
      ? `Đã hết hạn mức AI hôm nay (${quota}/${APP_CONFIG.aiDailyQuota}). Em xem các gợi ý có sẵn trong khung này, ngày mai hỏi tiếp nhé.`
      : cooldown
        ? 'Dịch vụ AI đang quá tải (hết hạn mức tạm thời). Em thử lại sau khoảng 1 phút.'
        : null;
  const blocked = blockReason !== null;
  const SR = getSR();
  const canVoice = !blocked && SR !== null;
  const localHints = OFFLINE_TUTOR_KB.filter((e) => e.pluginIds.includes(plugin.id));

  useEffect(() => {
    void readQuota().then(setQuota);
  }, []);

  // Cuộn xuống tin mới nhất. PHẢI dùng thân hàm { }: Chrome mới cho scrollIntoView trả về Promise,
  // nếu để effect trả giá trị đó thì React coi là hàm dọn dẹp và gọi nhầm → "t is not a function".
  useEffect(() => {
    const el = endRef.current;
    if (!el || typeof el.scrollIntoView !== 'function') return;
    try {
      el.scrollIntoView({ behavior: 'smooth' });
    } catch {
      /* trình duyệt cũ không hỗ trợ tùy chọn cuộn */
    }
  }, [msgs]);

  useEffect(() => {
    return () => {
      stopRecognition(recRef.current);
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    };
  }, []);

  // Vừa mất mạng / hết hạn mức → dừng micro đang nghe
  useEffect(() => {
    if (blocked) stopRecognition(recRef.current);
  }, [blocked]);

  const push = (m: TutorMessage): void => setMsgs((x) => [...x, m]);

  const startCooldown = (): void => {
    setCooldown(true);
    if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    cooldownTimer.current = setTimeout(() => setCooldown(false), API_COOLDOWN_MS);
  };

  /** Ghi nhận một lượt AI thành công; lỗi IndexedDB không được làm mất câu trả lời */
  const recordAiUse = async (key: string, reply: string): Promise<void> => {
    try {
      setQuota(await bumpAiQuota());
      await setAiCache(key, reply);
    } catch {
      setQuota((n) => n + 1);
    }
  };

  const answer = async (q: string): Promise<TutorMessage> => {
    const g = guardrailCheck(q);
    if (!g.allowed) return { role: 'tutor', text: g.reply ?? '', source: 'guardrail', at: Date.now() };
    const key = `${plugin.id}:${hashString(normalizeVi(q.trim()))}`;
    const cached = await getAiCache(key).catch(() => undefined);
    if (cached) return { role: 'tutor', text: cached, source: 'cache', at: Date.now() };
    const context = `Bài: ${plugin.title} (${SUBJECT_LABELS[plugin.subject]}). Đại lượng cần tìm: ${plugin.result.label}. Học sinh đã đo ${trials.length} lần.`;
    const started = Date.now();
    const remaining = (): number => Math.max(500, APP_CONFIG.aiTimeoutMs - (Date.now() - started));
    // 1) Máy chủ lớp / cloud
    try {
      const res = await withTimeout(
        (signal) =>
          fetch(`${currentApiUrl()}/api/tutor/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plugin_id: plugin.id, subject: plugin.subject, question: q, context }),
            signal
          }),
        remaining()
      );
      if (res.status === 429) startCooldown();
      if (res.ok) {
        const data = (await res.json()) as { answer?: unknown; source?: unknown } | null;
        const reply = typeof data?.answer === 'string' ? data.answer.trim() : '';
        if (reply && data?.source !== 'offline') {
          if (data?.source === 'ai') await recordAiUse(key, reply);
          const source: TutorMessage['source'] = data?.source === 'cache' || data?.source === 'guardrail' ? data.source : 'ai';
          return { role: 'tutor', text: reply, source, at: Date.now() };
        }
      }
    } catch {
      /* chuyển sang phương án tiếp theo */
    }
    // 2) Gọi trực tiếp Gemini bằng API key riêng (khóa gửi qua header, không đưa vào URL)
    if (geminiKey) {
      try {
        const res = await withTimeout(
          (signal) =>
            fetch(`https://generativelanguage.googleapis.com/v1beta/models/${APP_CONFIG.geminiModel}:generateContent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: [{ role: 'user', parts: [{ text: `${context}\nCâu hỏi của học sinh: ${q}` }] }],
                generationConfig: { temperature: 0.4, maxOutputTokens: 400 }
              }),
              signal
            }),
          remaining()
        );
        if (res.status === 429) startCooldown();
        if (res.ok) {
          const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
          const t = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
          if (t) {
            await recordAiUse(key, t);
            return { role: 'tutor', text: t, source: 'ai', at: Date.now() };
          }
        }
      } catch {
        /* hết thời gian hoặc lỗi mạng → gợi ý cục bộ */
      }
    }
    return { role: 'tutor', text: `${offlineTutorReply(plugin.id, plugin.subject, q)}\n\n(AI chưa phản hồi được nên mình dùng gợi ý có sẵn.)`, source: 'offline', at: Date.now() };
  };

  const send = (q: string): void => {
    const question = q.trim();
    if (!question || blocked || busy) return;
    void askGuard
      .run(async () => {
        setBusy(true);
        try {
          // Kiểm tra lại ngay trước khi gửi: mạng / hạn mức có thể vừa thay đổi (kể cả ở tab khác)
          const used = await readQuota();
          setQuota((n) => Math.max(n, used));
          if (!useLabStore.getState().online || used >= APP_CONFIG.aiDailyQuota) return;
          push({ role: 'student', text: question, source: 'student', at: Date.now() });
          setText('');
          logAction('ai-ask', question.slice(0, 80));
          push(await answer(question));
        } catch (e) {
          logAction('ai-error', e instanceof Error ? e.message : String(e));
          push({ role: 'tutor', text: 'Trợ lý gặp lỗi khi trả lời. Em thử hỏi lại sau ít phút nhé.', source: 'system', at: Date.now() });
        } finally {
          setBusy(false);
        }
      })
      .catch(() => setBusy(false));
  };

  const toggleMic = (): void => {
    if (listening) {
      stopRecognition(recRef.current);
      return;
    }
    if (!SR || blocked) return;
    try {
      const rec = new SR();
      rec.lang = 'vi-VN';
      rec.interimResults = false;
      rec.onresult = (e) => {
        const t = e.results?.[0]?.[0]?.transcript ?? '';
        setText(t);
        send(t);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
      useLabStore.getState().toast('warning', 'Không mở được micro trên trình duyệt này.');
    }
  };

  const speak = (t: string): void => {
    try {
      const synth = window.speechSynthesis;
      if (!synth || typeof synth.speak !== 'function' || typeof window.SpeechSynthesisUtterance !== 'function') return;
      if (typeof synth.cancel === 'function') synth.cancel();
      const u = new SpeechSynthesisUtterance(t.replace(/[🤔💡]/gu, ''));
      u.lang = 'vi-VN';
      const voices = typeof synth.getVoices === 'function' ? synth.getVoices() : [];
      const vi = voices.find((v) => v.lang.startsWith('vi'));
      if (vi) u.voice = vi;
      synth.speak(u);
    } catch {
      useLabStore.getState().toast('warning', 'Trình duyệt này không đọc được thành tiếng.');
    }
  };

  return (
    <div className="no-print fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-700 bg-slate-950 shadow-2xl" role="dialog" aria-label="Trợ lý AI Socratic">
      <header className="flex items-center gap-2 border-b border-slate-800 p-3">
        <span className="text-xl" aria-hidden="true">🤖</span>
        <div className="flex-1">
          <h2 className="text-sm font-bold">Trợ lý AI Socratic</h2>
          <p className={`text-xs ${blocked ? 'text-warn' : 'text-slate-400'}`}>
            {!online ? 'Offline' : outOfQuota ? 'Hết hạn mức' : cooldown ? 'AI đang quá tải' : 'Sẵn sàng'} · Hạn mức hôm nay: {quota}/{APP_CONFIG.aiDailyQuota}
          </p>
        </div>
        <button className="btn-ghost p-1.5" onClick={() => useLabStore.getState().setTutorOpen(false)} aria-label="Đóng trợ lý">
          <X size={18} />
        </button>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[88%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${m.role === 'student' ? 'ml-auto bg-lab-700 text-white' : 'bg-slate-800 text-slate-100'}`}>
            {m.text}
            {m.role === 'tutor' && (
              <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                {BADGE[m.source] && <span className="chip bg-slate-700">{BADGE[m.source]}</span>}
                <button className="hover:text-white" onClick={() => speak(m.text)} aria-label="Đọc to câu trả lời">
                  <Volume2 size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
        {busy && <div className="text-xs text-slate-400">Trợ lý đang suy nghĩ… (tối đa 8 giây)</div>}
        {blocked && localHints.length > 0 && (
          <section className="space-y-2 rounded-xl border border-slate-700 p-3 text-sm" aria-label="Gợi ý có sẵn">
            <h3 className="font-semibold text-lab-400">Gợi ý có sẵn cho bài này</h3>
            {localHints.map((e) => (
              <div key={e.id}>
                <ul className="list-disc space-y-0.5 pl-4 text-slate-200">
                  {e.questions.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-slate-400">💡 {e.hint}</p>
              </div>
            ))}
          </section>
        )}
        <div ref={endRef} />
      </div>
      {blocked ? (
        <p className="mx-3 flex items-start gap-2 rounded-lg border border-amber-500/60 bg-amber-900/30 p-2 text-xs text-amber-200" role="status">
          <WifiOff size={14} className="mt-0.5 shrink-0" /> {blockReason}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1 px-3">
          {['Em nên bắt đầu từ đâu?', 'Công thức nào cần dùng?', 'Vì sao kết quả của em bị lệch?'].map((s) => (
            <button key={s} className="chip bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40" disabled={busy} onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        className="flex gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input className="input disabled:opacity-50" value={text} onChange={(e) => setText(e.target.value)} disabled={blocked} placeholder={blocked ? 'Tạm thời không gửi được câu hỏi' : 'Hỏi về thí nghiệm…'} aria-label="Câu hỏi cho trợ lý" />
        {canVoice && (
          <button type="button" className={`btn px-2 ${listening ? 'border-danger text-danger' : ''}`} onClick={toggleMic} aria-label={listening ? 'Dừng ghi âm' : 'Hỏi bằng giọng nói'}>
            {listening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
        <button type="submit" className="btn-primary px-3" disabled={blocked || busy || !text.trim()} aria-label="Gửi">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
