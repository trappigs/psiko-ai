import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { CaseBriefing, type CaseSheet } from '@/components/case/CaseBriefing';
import { AppShell } from '@/components/shell/AppShell';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  const { data: c } = await sb
    .from('cases')
    .select(
      'id, title, presenting, diagnosis_hint, background, personality, speech_style, difficulty, insight_level, defense_style, register, created_at'
    )
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();
  if (!c) notFound();

  // determine ordinal index in the catalogue
  const { data: order } = await sb
    .from('cases')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  const idx = (order ?? []).findIndex((row) => row.id === id);

  const sheet: CaseSheet = {
    id: c.id,
    title: c.title,
    presenting: c.presenting,
    diagnosis_hint: c.diagnosis_hint,
    background: c.background,
    personality: c.personality,
    speech_style: c.speech_style,
    difficulty: c.difficulty as 'easy' | 'medium' | 'hard',
    insight_level: c.insight_level,
    defense_style: c.defense_style,
    register: c.register,
  };

  return (
    <AppShell userEmail={user.email}>
      <div className="max-w-2xl mx-auto px-6 md:px-10 py-8 md:py-12">
        <nav className="mb-8">
          <a href="/" className="btn-quiet text-xs">← Tüm vakalar</a>
        </nav>

        <CaseBriefing c={sheet} index={idx >= 0 ? idx + 1 : undefined} />

      <hr className="rule-soft mt-12 mb-10" />

      <section className="surface-deep p-6">
        <p className="label-caps mb-4">Hazırlanmak için kendine sor</p>
        <ul className="space-y-3 text-sm leading-relaxed text-ink-soft">
          <li className="flex gap-3">
            <span className="font-mono text-muted">·</span>
            Bu vakaya nasıl bir açılışla başlardın?
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-muted">·</span>
            İlk üç soruda neyi keşfetmeyi hedefliyorsun?
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-muted">·</span>
            Söylem kaydı ve savunması göz önüne alındığında nasıl bir tonda olmalısın?
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-muted">·</span>
            Hangi konuya gitmemen gerektiğini düşünüyorsun (henüz)?
          </li>
        </ul>
      </section>

      <div className="mt-12 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs text-muted max-w-sm leading-relaxed">
          Seansı başlattığında 45 dakikalık süre sayacı işlemeye başlar. Vaka dosyasına seans
          sırasında üst köşeden geri dönebilirsin.
        </p>
        <a href={`/seans/start?case=${c.id}`} className="btn-primary">
          Hazırım, seansa başla →
        </a>
      </div>
      </div>
    </AppShell>
  );
}
