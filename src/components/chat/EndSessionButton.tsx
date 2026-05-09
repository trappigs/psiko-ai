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
      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded flex items-center justify-between">
        <span className="text-sm">Seansı bitirmek istediğine emin misin? Rapor üretilecek.</span>
        <div className="flex gap-2">
          <button
            onClick={() => setConfirming(false)}
            className="text-sm px-3 py-1 border rounded"
          >
            Vazgeç
          </button>
          <button
            onClick={onEnd}
            disabled={disabled}
            className="text-sm px-3 py-1 bg-black text-white rounded"
          >
            Evet, bitir
          </button>
        </div>
      </div>
    );
  }
  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={disabled}
      className="mt-3 text-sm underline self-center disabled:opacity-50"
    >
      Seansı bitir ve rapor al
    </button>
  );
}
