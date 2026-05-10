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
  if (secs === null) {
    return <span className="text-sm tabular-nums">⏱ --:--</span>;
  }
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');
  return (
    <span className="text-sm tabular-nums">
      ⏱ {m}:{s}
    </span>
  );
}
