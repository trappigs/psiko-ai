'use client';
import { useEffect, useState } from 'react';
import { remainingSeconds } from '@/lib/session';

export function SessionTimer({
  startedAt,
  onExpire,
}: {
  startedAt: string;
  onExpire: () => void;
}) {
  const [secs, setSecs] = useState(() => remainingSeconds(new Date(startedAt)));
  useEffect(() => {
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
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');
  return (
    <span className="text-sm tabular-nums">
      ⏱ {m}:{s}
    </span>
  );
}
