'use client';
import { useEffect, useRef } from 'react';
import { MessageFeedback, type FeedbackState } from './MessageFeedback';
import { RichText } from './RichText';

export type Msg = {
  id: string;
  role: 'student' | 'client';
  content: string;
  created_at: string;
  /** Server-assigned message id once persisted; until then undefined for in-flight assistant messages. */
  persistedId?: string;
  /** Existing feedback for the persisted message (only relevant for client messages). */
  feedback?: FeedbackState;
};

export function MessageList({ messages }: { messages: Msg[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);
  return (
    <div ref={ref} className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
      {messages.length === 0 && (
        <div className="text-center py-16">
          <p className="font-display-italic text-2xl text-muted">
            Seans başladı. Selamla, hoşgeldin de.
          </p>
        </div>
      )}
      {messages.map((m) => (
        <div
          key={m.id}
          className={`flex flex-col slide-in ${
            m.role === 'student' ? 'items-end' : 'items-start'
          }`}
        >
          <span className="label-caps mb-1 px-1">
            {m.role === 'student' ? 'Sen — terapist' : 'Danışan'}
          </span>
          <div
            className={`max-w-[85%] ${
              m.role === 'student' ? 'bubble-student' : 'bubble-client'
            }`}
          >
            {m.role === 'client' ? (
              m.content ? (
                <RichText text={m.content} />
              ) : (
                <span className="typing-dots inline-flex items-center" aria-label="yazıyor">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              )
            ) : (
              <span className="whitespace-pre-wrap">{m.content}</span>
            )}
          </div>
          {m.role === 'client' && m.persistedId && (
            <div className="max-w-[85%] mt-1.5">
              <MessageFeedback messageId={m.persistedId} initial={m.feedback ?? null} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
