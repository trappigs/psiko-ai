'use client';
import { useState } from 'react';
import {
  MICROSKILL_LABELS,
  MICROSKILL_DESC,
  type Microskills,
  totalQuestions,
  openQuestionRatio,
} from '@/lib/openai/supervisor-prompt';

const ORDER: (keyof Microskills)[] = [
  'open_question',
  'closed_question',
  'reflection',
  'empathy',
  'summary',
  'advice_or_interpretation',
];

export function MicroskillsBreakdown({ skills }: { skills: Microskills }) {
  const [expanded, setExpanded] = useState<keyof Microskills | null>(null);
  const max = Math.max(1, ...ORDER.map((k) => skills[k].count));
  const total = totalQuestions(skills);
  const openRatio = openQuestionRatio(skills);

  return (
    <section>
      <p className="label-caps mb-4">Beceri dağılımı</p>

      {total > 0 && (
        <div className="mb-8 surface-deep px-5 py-4 flex items-baseline justify-between gap-6 flex-wrap">
          <div>
            <p className="label-caps mb-1">Açık-uçlu / Toplam soru</p>
            <p className="font-display text-3xl">
              <em className="font-display-italic text-accent">
                {(openRatio * 100).toFixed(0)}%
              </em>
              <span className="text-base text-muted ml-2 font-sans">
                ({skills.open_question.count} / {total})
              </span>
            </p>
          </div>
          <p className="text-xs text-muted max-w-xs leading-relaxed">
            İlk seanslarda açık-uçlu sorularının yüksek (≥%60) olması, danışanın kendi sözcükleriyle
            açılmasına alan tanır.
          </p>
        </div>
      )}

      <ul className="divide-y divide-rule">
        {ORDER.map((k) => {
          const e = skills[k];
          const isOpen = expanded === k;
          const isAdviceFlag = k === 'advice_or_interpretation' && e.count >= 3;
          return (
            <li key={k} className="py-4">
              <button
                onClick={() => setExpanded(isOpen ? null : k)}
                className="w-full text-left grid grid-cols-[1fr_auto] items-center gap-4 hover:opacity-80 transition-opacity"
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="font-display text-lg leading-tight">
                      {MICROSKILL_LABELS[k]}
                    </span>
                    {isAdviceFlag && (
                      <span className="text-[10px] tracking-wide text-warn">
                        ⚠ erken aşamada fazla
                      </span>
                    )}
                  </div>
                  <div className="h-1 bg-paper-deep rounded-full overflow-hidden">
                    <div
                      className="h-full transition-[width] duration-700"
                      style={{
                        width: `${(e.count / max) * 100}%`,
                        background:
                          k === 'advice_or_interpretation'
                            ? 'var(--color-warn)'
                            : k === 'closed_question'
                              ? 'var(--color-muted)'
                              : 'var(--color-ink)',
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 shrink-0">
                  <span className="font-mono text-2xl tabular-nums">{e.count}</span>
                  <span className="text-xs text-muted">
                    {isOpen ? '▾' : '▸'}
                  </span>
                </div>
              </button>
              {isOpen && (
                <div className="mt-3 pl-1 space-y-2">
                  <p className="text-xs text-muted leading-relaxed max-w-xl">
                    {MICROSKILL_DESC[k]}
                  </p>
                  {e.examples.length > 0 ? (
                    <ul className="space-y-1.5">
                      {e.examples.map((ex, i) => (
                        <li
                          key={i}
                          className="font-display-italic text-sm border-l-2 border-rule pl-3 py-0.5"
                        >
                          “{ex}”
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted italic">— bu seansta örnek yok —</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
