'use client';
import { useState } from 'react';
import { MessageList, type Msg } from './MessageList';
import { MessageInput } from './MessageInput';
import { SessionTimer } from './SessionTimer';
import { EndSessionButton } from './EndSessionButton';
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
  caseTitle: string;
  startedAt: string;
  initialMessages: Msg[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(props.initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [expired, setExpired] = useState(false);

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
    setMessages((m) => [...m, userMsg, assistantMsg]);
    setStreaming(true);

    const res = await fetch('/api/seans/message', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: props.sessionId, content }),
    });

    if (!res.ok || !res.body) {
      setStreaming(false);
      const err = await res.json().catch(() => ({}));
      if (err.error === 'session_expired') setExpired(true);
      setMessages((m) => m.slice(0, -1));
      alert(err.error ?? 'Bir hata oluştu, tekrar dene.');
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
      const { visible } = splitMsgIdMarker(acc);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { ...copy[copy.length - 1], content: visible };
        return copy;
      });
    }
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
    else alert('Seans bitirilemedi.');
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      <header className="border-b border-rule bg-paper/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-3 grid grid-cols-3 items-center gap-4">
          <a href="/" className="btn-quiet text-xs justify-self-start">
            ← Vakalar
          </a>
          <div className="text-center min-w-0">
            <p className="label-caps">Seans</p>
            <h2 className="font-display-italic text-base leading-tight truncate">
              {props.caseTitle}
            </h2>
          </div>
          <div className="justify-self-end">
            <SessionTimer startedAt={props.startedAt} onExpire={() => setExpired(true)} />
          </div>
        </div>
      </header>

      <MessageList messages={messages} />

      <div className="sticky bottom-0 border-t border-rule bg-gradient-to-t from-paper via-paper to-paper/0 pb-4">
        <div className="max-w-3xl mx-auto px-4 md:px-6 pt-3">
          <MessageInput onSend={send} disabled={streaming || expired} />
          <EndSessionButton onEnd={endSession} disabled={streaming} />
          {expired && (
            <p className="text-center text-sm text-accent mt-3 font-display-italic">
              Süre doldu. Lütfen seansı bitir.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
