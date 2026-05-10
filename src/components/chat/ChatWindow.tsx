'use client';
import { useEffect, useRef, useState } from 'react';
import { MessageList, type Msg } from './MessageList';
import { MessageInput } from './MessageInput';
import { SessionTimer } from './SessionTimer';
import { EndSessionButton } from './EndSessionButton';
import { CaseSheetDrawer } from '@/components/case/CaseSheetDrawer';
import type { CaseSheet } from '@/components/case/CaseBriefing';
import { useRouter } from 'next/navigation';

const MSG_ID_PATTERN = /\n\n__MSG_ID__:([0-9a-f-]{36})__$/;
const MSG_ID_PREFIX_PATTERN = /\n\n__(M(S(G(_(I(D(_(_(:[0-9a-f-]*)?)?)?)?)?)?)?)?)?$/;

function splitMsgIdMarker(text: string): { visible: string; msgId: string | undefined } {
  const m = text.match(MSG_ID_PATTERN);
  if (m) return { visible: text.slice(0, -m[0].length), msgId: m[1] };
  const partial = text.match(MSG_ID_PREFIX_PATTERN);
  if (partial) return { visible: text.slice(0, -partial[0].length), msgId: undefined };
  return { visible: text, msgId: undefined };
}

export function ChatWindow(props: {
  sessionId: string;
  caseSheet: CaseSheet;
  startedAt: string;
  initialMessages: Msg[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(props.initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [expired, setExpired] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorLabel = (code: string) => {
    switch (code) {
      case 'session_expired':
        return 'Süre doldu — yeni mesaj gönderilemiyor.';
      case 'rate_limited':
        return 'Günlük kotanı doldurdun. Yarın yeniden gel.';
      case 'session_not_active':
        return 'Bu seans zaten kapanmış.';
      case 'unauthorized':
        return 'Oturum süresi dolmuş, yeniden giriş yap.';
      default:
        return 'Bir şey ters gitti, tekrar dene.';
    }
  };

  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  async function send(content: string) {
    const userMsg: Msg = {
      id: 'tmp-' + Date.now(),
      role: 'student',
      content,
      created_at: new Date().toISOString(),
    };
    const assistantMsg: Msg = {
      id: 'tmp-asst-' + Date.now(),
      role: 'client',
      content: '',
      created_at: new Date().toISOString(),
    };
    setError(null);
    setMessages((m) => [...m, userMsg, assistantMsg]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let res: Response;
    try {
      res = await fetch('/api/seans/message', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ session_id: props.sessionId, content }),
        signal: controller.signal,
      });
    } catch {
      return; // aborted (likely unmounted) or network error
    }

    if (!mountedRef.current) return;

    if (!res.ok || !res.body) {
      setStreaming(false);
      const err = await res.json().catch(() => ({}));
      if (!mountedRef.current) return;
      if (err.error === 'session_expired') setExpired(true);
      setMessages((m) => m.slice(0, -1));
      setError(errorLabel(err.error ?? ''));
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!mountedRef.current) return;
        acc += decoder.decode(value, { stream: true });
        const { visible } = splitMsgIdMarker(acc);
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: visible };
          return copy;
        });
      }
    } catch {
      return; // stream interrupted
    }
    if (!mountedRef.current) return;
    const { visible, msgId } = splitMsgIdMarker(acc);
    setMessages((m) => {
      const copy = [...m];
      copy[copy.length - 1] = {
        ...copy[copy.length - 1],
        content: visible,
        persistedId: msgId,
      };
      return copy;
    });
    setStreaming(false);
  }

  async function endSession() {
    const res = await fetch('/api/seans/end', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: props.sessionId }),
    });
    if (res.ok) router.push(`/rapor/${props.sessionId}`);
    else setError('Seans bitirilemedi, bir saniye sonra tekrar dene.');
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      <header className="border-b border-rule bg-paper/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-3 grid grid-cols-[auto_1fr_auto] items-center gap-4">
          <a href="/" className="btn-quiet text-xs">
            ← Vakalar
          </a>
          <div className="text-center min-w-0">
            <p className="label-caps">Seans</p>
            <h2 className="font-display-italic text-base leading-tight truncate">
              {props.caseSheet.title}
            </h2>
          </div>
          <div className="flex items-center gap-4 justify-end">
            <button
              onClick={() => setSheetOpen(true)}
              className="btn-quiet text-xs"
              aria-label="Vaka dosyası"
              title="Vaka dosyasını aç (her an erişebilirsin)"
            >
              Dosya ☰
            </button>
            <SessionTimer startedAt={props.startedAt} onExpire={() => setExpired(true)} />
          </div>
        </div>
      </header>

      <CaseSheetDrawer
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        caseData={props.caseSheet}
      />

      <MessageList messages={messages} />

      <div className="sticky bottom-0 border-t border-rule bg-gradient-to-t from-paper via-paper to-paper/0 pb-4">
        <div className="max-w-3xl mx-auto px-4 md:px-6 pt-3">
          {error && (
            <div className="mb-3 surface-deep border-l-2 border-l-danger px-4 py-3 flex items-start gap-3 slide-in">
              <span className="text-danger mt-0.5">⚠</span>
              <p className="text-sm text-ink-soft flex-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="btn-quiet text-xs"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>
          )}
          <MessageInput onSend={send} disabled={streaming || expired} />
          <EndSessionButton onEnd={endSession} disabled={streaming} />
          {expired && !error && (
            <p className="text-center text-sm text-accent mt-3 font-display-italic">
              Süre doldu. Lütfen seansı bitir.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
