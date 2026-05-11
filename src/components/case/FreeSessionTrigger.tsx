'use client';
import { useState } from 'react';
import { FreeSessionModal } from './FreeSessionModal';

export function FreeSessionTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="surface w-full text-left px-5 py-5 mb-8 flex items-center justify-between gap-4 hover:bg-paper-soft transition"
      >
        <div>
          <p className="label-caps mb-1">Serbest seans</p>
          <p className="font-display text-xl">Sürpriz bir <em className="font-display-italic">danışan</em></p>
          <p className="text-sm text-muted mt-1">Dosya yok — seans sonunda açılır.</p>
        </div>
        <span className="btn-outline shrink-0">Başlat</span>
      </button>
      <FreeSessionModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
