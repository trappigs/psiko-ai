'use client';
import { useState } from 'react';

export function MessageInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState('');
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  }
  return (
    <form onSubmit={submit} className="flex gap-2 border-t pt-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Mesajını yaz..."
        disabled={disabled}
        className="flex-1 border rounded p-2 resize-none disabled:opacity-50"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit(e as unknown as React.FormEvent);
          }
        }}
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="bg-black text-white px-4 rounded disabled:opacity-50"
      >
        Gönder
      </button>
    </form>
  );
}
