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
    <form onSubmit={submit} className="max-w-2xl mx-auto w-full">
      <div className="flex items-end gap-3">
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          placeholder="Terapist olarak yanıtla…"
          disabled={disabled}
          autoFocus
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--color-rule)',
            borderRadius: 0,
            boxShadow: 'none',
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: '1.0625rem',
          }}
          className="flex-1 resize-none p-2 disabled:opacity-50 placeholder:text-muted focus:[border-bottom-color:var(--color-ink)]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(e as unknown as React.FormEvent);
            }
          }}
        />
        <button type="submit" disabled={disabled || !text.trim()} className="btn-primary">
          Gönder →
        </button>
      </div>
      <p className="text-[11px] text-muted mt-2 px-1 tracking-wide">
        Enter ile gönder · Shift+Enter ile satır atla
      </p>
    </form>
  );
}
