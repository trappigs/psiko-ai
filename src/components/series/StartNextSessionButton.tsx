'use client';
import { useState } from 'react';
import { TimeGapModal } from './TimeGapModal';

export function StartNextSessionButton({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        Yeni seans başlat →
      </button>
      <TimeGapModal open={open} onClose={() => setOpen(false)} caseId={caseId} />
    </>
  );
}
