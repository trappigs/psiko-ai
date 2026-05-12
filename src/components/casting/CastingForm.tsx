'use client';
import { useState } from 'react';
import type {
  CastingParams,
  AgeRange,
  Gender,
  CultureSegment,
  Occupation,
  RelationshipStatus,
  FamilyStructure,
  ReferralSource,
  ResistanceLevel,
  SchoolFit,
  PriorTherapy,
} from '@/lib/openai/casting-types';
import type { Difficulty } from '@/lib/openai/case-types';

type Option<T extends string> = { value: T; label: string };

const AGE: Option<AgeRange>[] = [
  { value: 'ergen', label: 'Ergen' },
  { value: 'genc_yetiskin', label: 'Genç yetişkin' },
  { value: 'orta_yas', label: 'Orta yaş' },
  { value: 'ileri_yas', label: 'İleri yaş' },
];
const GENDER: Option<Gender>[] = [
  { value: 'kadin', label: 'Kadın' },
  { value: 'erkek', label: 'Erkek' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'belirtmek_istemiyor', label: 'Belirtmiyor' },
];
const CULTURE: Option<CultureSegment>[] = [
  { value: 'tr_koylu', label: 'TR köylü/taşra' },
  { value: 'tr_sehirli', label: 'TR şehirli' },
  { value: 'tr_diaspora', label: 'TR diaspora' },
  { value: 'serbest', label: 'Serbest yaz' },
];
const OCCUPATION: Option<Occupation>[] = [
  { value: 'ogrenci', label: 'Öğrenci' },
  { value: 'beyaz_yaka', label: 'Beyaz yaka' },
  { value: 'mavi_yaka', label: 'Mavi yaka' },
  { value: 'esnaf', label: 'Esnaf' },
  { value: 'issiz', label: 'İşsiz' },
  { value: 'emekli', label: 'Emekli' },
];
const RELATIONSHIP: Option<RelationshipStatus>[] = [
  { value: 'bekar', label: 'Bekar' },
  { value: 'iliskide', label: 'İlişkide' },
  { value: 'evli', label: 'Evli' },
  { value: 'ayrilmis', label: 'Ayrılmış' },
  { value: 'dul', label: 'Dul' },
];
const FAMILY: Option<FamilyStructure>[] = [
  { value: 'tek_cocuk', label: 'Tek çocuk' },
  { value: 'kalabalik', label: 'Kalabalık' },
  { value: 'ayri_ebeveyn', label: 'Ayrı ebeveyn' },
  { value: 'vefat_ebeveyn', label: 'Vefat etmiş ebeveyn' },
];
const REFERRAL: Option<ReferralSource>[] = [
  { value: 'kendi', label: 'Kendi kararı' },
  { value: 'aile', label: 'Aile' },
  { value: 'sevgili', label: 'Sevgili' },
  { value: 'mahkeme', label: 'Mahkeme' },
  { value: 'okul_is', label: 'Okul / iş' },
];
const DIFFICULTY: Option<Difficulty>[] = [
  { value: 'easy', label: 'Kolay' },
  { value: 'medium', label: 'Orta' },
  { value: 'hard', label: 'Zor' },
];
const RESISTANCE: Option<ResistanceLevel>[] = [
  { value: 'isbirlikci', label: 'İşbirlikçi' },
  { value: 'dengeli', label: 'Dengeli' },
  { value: 'direngen', label: 'Direngen' },
];
const SCHOOL: Option<SchoolFit>[] = [
  { value: 'cbt', label: 'CBT' },
  { value: 'psikodinamik', label: 'Psikodinamik' },
  { value: 'humanistik', label: 'Hümanistik' },
  { value: 'sistemik', label: 'Sistemik' },
];
const PRIOR: Option<PriorTherapy>[] = [
  { value: 'ilk_kez', label: 'İlk kez' },
  { value: 'kisa_sure', label: 'Kısa süre denedi' },
  { value: 'uzun_gecmis', label: 'Uzun geçmişi var' },
];

export function CastingForm({
  onSubmit,
  loading,
}: {
  onSubmit: (params: CastingParams) => void;
  loading: boolean;
}) {
  const [p, setP] = useState<CastingParams>({});

  function update<K extends keyof CastingParams>(key: K, value: CastingParams[K]) {
    setP((prev) => ({ ...prev, [key]: prev[key] === value ? undefined : value }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(p);
      }}
      className="space-y-8"
    >
      <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
        <FieldSet label="Yaş aralığı">
          <Segment
            value={p.age_range}
            options={AGE}
            onChange={(v) => update('age_range', v)}
          />
        </FieldSet>

        <FieldSet label="Cinsiyet">
          <Segment
            value={p.gender}
            options={GENDER}
            onChange={(v) => update('gender', v)}
          />
        </FieldSet>

        <FieldSet label="Kültür / bağlam">
          <Segment
            value={p.culture_segment}
            options={CULTURE}
            onChange={(v) => update('culture_segment', v)}
          />
          {(p.culture_segment === 'serbest' || p.culture_freetext) && (
            <input
              type="text"
              maxLength={120}
              value={p.culture_freetext ?? ''}
              onChange={(e) =>
                setP((prev) => ({ ...prev, culture_freetext: e.target.value }))
              }
              placeholder={
                p.culture_segment === 'serbest'
                  ? 'kültürel bağlamı yaz…'
                  : 'opsiyonel ek bağlam'
              }
              className="w-full mt-2 px-3 py-2 border border-rule rounded text-sm bg-paper"
            />
          )}
        </FieldSet>

        <FieldSet label="Meslek / sosyo-ekonomik">
          <Segment
            value={p.occupation}
            options={OCCUPATION}
            onChange={(v) => update('occupation', v)}
          />
        </FieldSet>

        <FieldSet label="İlişki durumu">
          <Segment
            value={p.relationship_status}
            options={RELATIONSHIP}
            onChange={(v) => update('relationship_status', v)}
          />
        </FieldSet>

        <FieldSet label="Aile yapısı">
          <Segment
            value={p.family_structure}
            options={FAMILY}
            onChange={(v) => update('family_structure', v)}
          />
        </FieldSet>

        <FieldSet label="Geliş sebebi">
          <Segment
            value={p.referral_source}
            options={REFERRAL}
            onChange={(v) => update('referral_source', v)}
          />
        </FieldSet>

        <FieldSet label="Zorluk">
          <Segment
            value={p.difficulty}
            options={DIFFICULTY}
            onChange={(v) => update('difficulty', v)}
          />
        </FieldSet>

        <FieldSet label="Direnç düzeyi">
          <Segment
            value={p.resistance_level}
            options={RESISTANCE}
            onChange={(v) => update('resistance_level', v)}
          />
        </FieldSet>

        <FieldSet label="Ekol uyumu">
          <Segment
            value={p.school_fit}
            options={SCHOOL}
            onChange={(v) => update('school_fit', v)}
          />
        </FieldSet>

        <FieldSet label="Önceki terapi">
          <Segment
            value={p.prior_therapy}
            options={PRIOR}
            onChange={(v) => update('prior_therapy', v)}
          />
        </FieldSet>

        <FieldSet label="Tema ipucu (opsiyonel)">
          <input
            type="text"
            maxLength={120}
            value={p.theme_hint ?? ''}
            onChange={(e) =>
              setP((prev) => ({ ...prev, theme_hint: e.target.value }))
            }
            placeholder="ör. iş yerinde tükenmişlik"
            className="w-full px-3 py-2 border border-rule rounded text-sm bg-paper"
          />
        </FieldSet>
      </div>

      <div className="pt-6 border-t border-rule flex justify-end">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? '3 aday üretiliyor…' : 'Danışan üret →'}
        </button>
      </div>
    </form>
  );
}

function FieldSet({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="label-caps mb-2">{label}</legend>
      {children}
    </fieldset>
  );
}

function Segment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | undefined;
  options: Option<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`px-3 py-1.5 border rounded-full text-xs transition-colors ${
            value === o.value
              ? 'border-accent bg-accent/10 text-ink'
              : 'border-rule text-muted hover:border-ink hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
