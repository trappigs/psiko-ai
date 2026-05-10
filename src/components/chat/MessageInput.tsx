'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

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

  // Auto-grow textarea up to ~8 lines
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    const max = 220;
    el.style.height = Math.min(max, el.scrollHeight) + 'px';
  }, [text]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  }

  return (
    <form onSubmit={submit} className="relative">
      <div
        className={`flex items-end gap-2 bg-paper border border-rule rounded-3xl shadow-[var(--shadow-lift)] px-3 py-2 transition-colors ${
          disabled ? 'opacity-60' : 'focus-within:border-ink'
        }`}
      >
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
            borderRadius: 0,
            boxShadow: 'none',
            padding: '0.5rem 0.5rem',
            fontFamily: 'var(--font-sans)',
            fontStyle: 'normal',
            fontSize: '15.5px',
            lineHeight: '1.5',
            resize: 'none',
            overflow: 'auto',
          }}
          className="flex-1 disabled:opacity-50 placeholder:text-muted"
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
          aria-label="Gönder"
          className="shrink-0 w-9 h-9 rounded-full bg-ink text-paper flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent transition-colors mb-0.5"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M7 13V1M7 1L1 7M7 1L13 7"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <p className="text-[11px] text-muted mt-2 px-2 tracking-wide text-center">
        Enter ile gönder · Shift+Enter ile satır atla
      </p>
    </form>
  );
}
