'use client';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'psk_seen_welcome';

const STEPS: Array<{ num: string; title: string; body: string }> = [
  {
    num: '01',
    title: 'Bir vaka seç',
    body:
      'Kütüphaneden bir vaka aç — kolay/orta/zor seviyelerinde, farklı tanı ve psikolojik yapılarda 21 vaka var. Seansa başlamadan önce vaka dosyasını oku.',
  },
  {
    num: '02',
    title: 'Seansı yürüt',
    body:
      '45 dakikalık bir seans. AI danışan vakanın söylem kaydında konuşur, beden dilini de gösterir. Üst köşeden vaka dosyasına her an dönebilirsin.',
  },
  {
    num: '03',
    title: 'Kendi formülasyonunu yaz',
    body:
      'Seans biter bitmez, raporu görmeden önce kendi okumanı yaz: sunulan sorun, hipotez, örüntüler, sonraki seans planı. Atlanabilir ama atlama.',
  },
  {
    num: '04',
    title: 'Değerlendirme raporunu oku',
    body:
      'Mikrobeceri sayımı, alıntılı somut geri bildirim, formülasyon karşılaştırması. İlerleme sayfasında tüm seansların trendini izle.',
  },
];

export function WelcomeModal({ shouldShow }: { shouldShow: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!shouldShow) return;
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(STORAGE_KEY) === '1') return;
    setOpen(true);
  }, [shouldShow]);

  function close() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, '1');
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <>
      <div
        onClick={close}
        aria-hidden
        className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Hoş geldin"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <div className="surface max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 md:p-10">
          <header className="mb-8">
            <p className="label-caps mb-3">Hoş geldin</p>
            <h2 className="font-display text-3xl md:text-4xl leading-[1.05]">
              Pratiğe başlamadan önce <em className="font-display-italic">akış nasıl işliyor</em>?
            </h2>
            <p className="text-sm text-muted mt-3 leading-relaxed">
              Dört adımlı bir döngü. Her seansta tekrar eder, zamanla becerin keskinleşir.
            </p>
          </header>

          <ol className="space-y-6 mb-10">
            {STEPS.map((s) => (
              <li key={s.num} className="grid grid-cols-[2.5rem_1fr] gap-4">
                <span className="font-mono text-xs text-muted pt-1 tabular-nums">{s.num}</span>
                <div>
                  <p className="font-display-italic text-xl leading-tight">{s.title}</p>
                  <p className="text-sm text-ink-soft leading-relaxed mt-1.5">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="surface-deep px-5 py-4 mb-8">
            <p className="text-xs text-ink-soft leading-relaxed">
              <span className="text-warn font-medium">⚠ Hatırlatma:</span> Bu uygulama yalnızca
              eğitim amaçlıdır. AI danışan gerçek bir kişi değildir; üretilenler profesyonel
              süpervizyonun yerini tutmaz.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <button onClick={close} className="btn-quiet text-xs">
              Görmedim say
            </button>
            <button onClick={close} className="btn-primary">
              Anladım, başlayalım →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
