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
    <div ref={ref} className="flex-1 overflow-y-auto space-y-3 py-2">
      {messages.map((m) => (
        <div key={m.id} className={`flex flex-col ${m.role === 'student' ? 'items-end' : 'items-start'}`}>
          <div
            className={`max-w-[80%] p-3 rounded-lg ${
              m.role === 'student' ? 'bg-black text-white' : 'bg-gray-100'
            }`}
          >
            <span className="block text-xs opacity-70 mb-1">
              {m.role === 'student' ? 'S' : 'D'}
            </span>
            {m.role === 'client' ? (
              <RichText text={m.content || '...'} />
            ) : (
              <span className="whitespace-pre-wrap">{m.content || '...'}</span>
            )}
          </div>
          {m.role === 'client' && m.persistedId && (
            <div className="max-w-[80%]">
              <MessageFeedback messageId={m.persistedId} initial={m.feedback ?? null} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
