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

function Avatar({ role }: { role: 'student' | 'client' }) {
  if (role === 'student') {
    return (
      <div className="shrink-0 w-7 h-7 rounded-full bg-paper-deep border border-rule flex items-center justify-center text-[11px] font-medium text-ink">
        S
      </div>
    );
  }
  return (
    <div className="shrink-0 w-7 h-7 rounded-full bg-ink flex items-center justify-center text-[11px] font-medium text-paper">
      D
    </div>
  );
}

export function MessageList({ messages }: { messages: Msg[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  return (
    <div ref={ref} className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-10 pb-40">
        {messages.length === 0 && (
          <div className="text-center py-32">
            <p className="font-display-italic text-3xl text-muted leading-tight">
              Seans başladı.
              <br />
              Bir cümleyle başla.
            </p>
          </div>
        )}

        <div className="space-y-8">
          {messages.map((m) => (
            <article key={m.id} className="slide-in">
              <header className="flex items-center gap-2.5 mb-2">
                <Avatar role={m.role} />
                <span className="text-xs font-medium tracking-wide text-ink">
                  {m.role === 'student' ? 'Sen (öğrenci)' : 'Danışan'}
                </span>
              </header>
              <div className="pl-[38px]">
                {m.role === 'client' ? (
                  <div className="text-[15.5px] leading-[1.7] text-ink">
                    {m.content ? (
                      <RichText text={m.content} />
                    ) : (
                      <span className="typing-dots" aria-label="yazıyor">
                        <span></span>
                        <span></span>
                        <span></span>
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-paper-deep px-4 py-3 text-[15.5px] leading-[1.65] text-ink whitespace-pre-wrap inline-block max-w-full">
                    {m.content}
                  </div>
                )}
                {m.role === 'client' && m.persistedId && (
                  <div className="mt-3">
                    <MessageFeedback messageId={m.persistedId} initial={m.feedback ?? null} />
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
