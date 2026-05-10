'use client';
import { useEffect, useRef } from 'react';
import { MessageFeedback, type FeedbackState } from './MessageFeedback';
import { RichText } from './RichText';

export type Msg = {
  id: string;
  role: 'student' | 'client';
  content: string;
  created_at: string;
  persistedId?: string;
  feedback?: FeedbackState;
};

export function MessageList({ messages }: { messages: Msg[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  return (
    <div ref={ref} className="flex-1 overflow-y-auto py-10 pr-2">
      {messages.length === 0 && (
        <div className="text-center py-24">
          <p className="font-display-italic text-3xl text-muted leading-tight">
            Seans başladı.
            <br />
            Bir cümle ile başla.
          </p>
        </div>
      )}

      <div className="space-y-10 max-w-2xl mx-auto">
        {messages.map((m) => (
          <article key={m.id} className="slide-in">
            <span
              className={`speaker-label ${m.role === 'student' ? 'speaker-label--student' : ''}`}
            >
              {m.role === 'student' ? '— Sen, terapist' : '— Danışan'}
            </span>
            <div className={m.role === 'student' ? 'bubble-student' : 'bubble-client'}>
              {m.role === 'client' ? (
                m.content ? (
                  <RichText text={m.content} />
                ) : (
                  <span className="typing-dots" aria-label="yazıyor">
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
              <div className="mt-3">
                <MessageFeedback messageId={m.persistedId} initial={m.feedback ?? null} />
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
