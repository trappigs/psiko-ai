'use client';
import { useEffect, useRef } from 'react';

export type Msg = {
  id: string;
  role: 'student' | 'client';
  content: string;
  created_at: string;
};

export function MessageList({ messages }: { messages: Msg[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);
  return (
    <div ref={ref} className="flex-1 overflow-y-auto space-y-3 py-2">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`max-w-[80%] p-3 rounded-lg ${
            m.role === 'student' ? 'ml-auto bg-black text-white' : 'mr-auto bg-gray-100'
          }`}
        >
          <span className="block text-xs opacity-70 mb-1">
            {m.role === 'student' ? 'S' : 'D'}
          </span>
          <span className="whitespace-pre-wrap">{m.content || '...'}</span>
        </div>
      ))}
    </div>
  );
}
