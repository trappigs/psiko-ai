'use client';
import { useEffect, useRef, useState } from 'react';

export function MessageInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  }

  return (
    <form onSubmit={submit} className="border-t border-rule pt-4">
      <div className="surface flex items-end gap-2 p-2">
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Terapist olarak yanıtını yaz…"
          disabled={disabled}
          autoFocus
          style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
          className="flex-1 resize-none p-2 disabled:opacity-50 placeholder:text-muted"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(e as unknown as React.FormEvent);
            }
          }}
        />
        <button type="submit" disabled={disabled || !text.trim()} className="btn-primary mb-0.5">
          Gönder
        </button>
      </div>
      <p className="text-[11px] text-muted mt-1.5 px-1">
        Enter ile gönder · Shift+Enter ile satır atla
      </p>
    </form>
  );
}
