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
      <span className="font-mono text-xs text-muted tabular-nums">--:-- kaldı</span>
    );
  }
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');

  return (
    <div className="flex items-center gap-3">
      <div className="w-24 h-1 bg-paper-deep rounded-full overflow-hidden">
        <div
          className="h-full transition-[width] duration-1000 ease-linear"
          style={{
            width: `${Math.min(100, ratio * 100)}%`,
            background: lowTime ? 'var(--color-accent)' : 'var(--color-ink)',
          }}
        />
      </div>
      <span
        className={`font-mono text-xs tabular-nums ${
          lowTime ? 'text-accent' : 'text-muted'
        }`}
      >
        {m}:{s}
      </span>
    </div>
  );
}
