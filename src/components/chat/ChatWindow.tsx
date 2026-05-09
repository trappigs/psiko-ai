'use client';
import { useState } from 'react';
import { MessageList, type Msg } from './MessageList';
import { MessageInput } from './MessageInput';
import { SessionTimer } from './SessionTimer';
import { EndSessionButton } from './EndSessionButton';
import { useRouter } from 'next/navigation';

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
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { ...copy[copy.length - 1], content: acc };
        return copy;
      });
    }
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
    <div className="max-w-3xl mx-auto p-4 flex flex-col h-[calc(100vh-3rem)]">
      <header className="flex items-center justify-between border-b pb-3 mb-3">
        <a href="/" className="text-sm underline">
          ← Vakalara dön
        </a>
        <h2 className="font-semibold">{props.caseTitle}</h2>
        <SessionTimer startedAt={props.startedAt} onExpire={() => setExpired(true)} />
      </header>
      <MessageList messages={messages} />
      <MessageInput onSend={send} disabled={streaming || expired} />
      <EndSessionButton onEnd={endSession} disabled={streaming} />
      {expired && (
        <p className="text-center text-sm text-amber-700 mt-2">
          Süre doldu. Lütfen seansı bitir.
        </p>
      )}
    </div>
  );
}
