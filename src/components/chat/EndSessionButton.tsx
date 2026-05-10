'use client';
import { useState } from 'react';

export function EndSessionButton({
  onEnd,
  disabled,
}: {
  onEnd: () => void;
  disabled: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <div className="mt-3 surface-deep p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          Seansı bitirip rapor üretmek istediğine emin misin?
        </p>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setConfirming(false)} className="btn-outline">
            Vazgeç
          </button>
          <button onClick={onEnd} disabled={disabled} className="btn-primary">
            Evet, bitir
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-3 text-center">
      <button onClick={() => setConfirming(true)} disabled={disabled} className="btn-quiet">
        Seansı bitir & rapor al
      </button>
    </div>
  );
}
