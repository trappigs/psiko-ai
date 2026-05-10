'use client';
import { useEffect } from 'react';
import { CaseBriefing, type CaseSheet } from './CaseBriefing';

export function CaseSheetDrawer({
  open,
  onClose,
  caseData,
}: {
  open: boolean;
  onClose: () => void;
  caseData: CaseSheet;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 bg-ink/30 backdrop-blur-sm transition-opacity duration-200 z-40 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      <aside
        role="dialog"
        aria-label="Vaka dosyası"
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-paper border-l border-rule shadow-2xl transition-transform duration-300 z-50 overflow-y-auto ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="sticky top-0 bg-paper/95 backdrop-blur border-b border-rule px-6 py-3 flex items-center justify-between">
          <p className="label-caps">Vaka dosyası</p>
          <button onClick={onClose} className="btn-quiet text-xs" aria-label="Kapat">
            Kapat ✕
          </button>
        </header>
        <div className="p-6">
          <CaseBriefing c={caseData} />
        </div>
      </aside>
    </>
  );
}
