export function CastingTrigger() {
  return (
    <a
      href="/dosya-yarat"
      className="surface w-full text-left px-5 py-5 mb-8 flex items-center justify-between gap-4 hover:bg-paper-soft transition"
    >
      <div>
        <p className="label-caps mb-1">Casting</p>
        <p className="font-display text-xl">
          İstediğim <em className="font-display-italic">danışanı</em> yarat
        </p>
        <p className="text-sm text-muted mt-1">
          Detaylı parametre + 3 aday + seçim.
        </p>
      </div>
      <span className="btn-outline shrink-0">Yarat</span>
    </a>
  );
}
