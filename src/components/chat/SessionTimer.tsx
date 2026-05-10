'use client';
import { useEffect, useState } from 'react';
import { remainingSeconds, sessionDurationMinutes } from '@/lib/session';

export function SessionTimer({
  startedAt,
  onExpire,
}: {
  startedAt: string;
  onExpire: () => void;
}) {
  const [secs, setSecs] = useState<number | null>(null);
  useEffect(() => {
    setSecs(remainingSeconds(new Date(startedAt)));
    const t = setInterval(() => {
      const r = remainingSeconds(new Date(startedAt));
      setSecs(r);
      if (r === 0) {
        onExpire();
        clearInterval(t);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [startedAt, onExpire]);

  const total = sessionDurationMinutes() * 60;
  const ratio = secs === null ? 0 : 1 - secs / total;
  const lowTime = secs !== null && secs < 5 * 60;

  if (secs === null) {
    return (
      <span className="font-mono text-xs text-muted tabular-nums">--:--</span>
    );
  }
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');

  return (
    <div className="flex items-center gap-3 justify-end">
      <span className="label-caps">Kalan</span>
      <div className="w-20 h-px bg-rule relative overflow-visible">
        <div
          className="absolute top-1/2 left-0 -translate-y-1/2 h-px transition-[width] duration-1000 ease-linear"
          style={{
            width: `${Math.max(2, ratio * 100)}%`,
            background: lowTime ? 'var(--color-accent)' : 'var(--color-ink)',
            height: lowTime ? '2px' : '1px',
          }}
        />
      </div>
      <span
        className={`font-mono text-sm tabular-nums ${
          lowTime ? 'text-accent' : 'text-ink'
        }`}
      >
        {m}:{s}
      </span>
    </div>
  );
}
