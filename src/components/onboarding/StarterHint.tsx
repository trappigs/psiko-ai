type StarterCase = {
  id: string;
  title: string;
  presenting: string;
};

/**
 * Yeni-başlayan önerisi: hiç tamamlanmış seansı yoksa, en kolay vakaya yumuşak yönlendirme.
 */
export function StarterHint({ starter }: { starter: StarterCase }) {
  return (
    <div className="surface mb-12 p-6 grid md:grid-cols-[auto_1fr_auto] items-center gap-6">
      <div className="font-mono text-xs text-accent tracking-wider whitespace-nowrap">
        ★ Yeni başlıyorsan
      </div>
      <div>
        <p className="font-display-italic text-xl leading-tight">{starter.title}</p>
        <p className="text-sm text-ink-soft mt-1.5 line-clamp-2 max-w-xl">
          {starter.presenting}
        </p>
      </div>
      <a href={`/vaka/${starter.id}`} className="btn-primary whitespace-nowrap">
        İlk seansını başlat →
      </a>
    </div>
  );
}
