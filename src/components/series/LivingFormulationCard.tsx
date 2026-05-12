import type { Formulation } from '@/lib/formulation';

export function LivingFormulationCard({
  seriesId,
  formulation,
}: {
  seriesId: string;
  formulation: Formulation | null;
}) {
  const hasContent = !!(
    formulation?.presenting ||
    formulation?.hypothesis ||
    formulation?.patterns ||
    formulation?.next_session
  );

  return (
    <section className="surface-deep px-6 py-6 mb-10">
      <div className="flex items-baseline justify-between mb-4">
        <p className="label-caps">Yaşayan formülasyon</p>
        <a href={`/seri/${seriesId}/formulasyon`} className="btn-quiet text-xs">
          Düzenle →
        </a>
      </div>
      {hasContent ? (
        <div className="space-y-4">
          {formulation?.presenting && (
            <Row label="Sunulan sorun" text={formulation.presenting} />
          )}
          {formulation?.hypothesis && (
            <Row label="Hipotez" text={formulation.hypothesis} />
          )}
          {formulation?.patterns && (
            <Row label="Örüntüler" text={formulation.patterns} />
          )}
          {formulation?.next_session && (
            <Row label="Sonraki seans" text={formulation.next_session} />
          )}
        </div>
      ) : (
        <p className="text-sm text-muted italic">
          Henüz formülasyon yazmadın. İlk seansını bitirdikten sonra yazabilirsin.
        </p>
      )}
    </section>
  );
}

function Row({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="label-caps mb-1 text-xs">{label}</p>
      <p className="text-base leading-relaxed font-display-italic">{text}</p>
    </div>
  );
}
