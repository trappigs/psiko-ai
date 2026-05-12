import type { GeneratedCase, Difficulty } from './case-types';

export type AgeRange = 'ergen' | 'genc_yetiskin' | 'orta_yas' | 'ileri_yas';
export type Gender = 'kadin' | 'erkek' | 'non_binary' | 'belirtmek_istemiyor';
export type CultureSegment = 'tr_koylu' | 'tr_sehirli' | 'tr_diaspora' | 'serbest';
export type Occupation =
  | 'ogrenci'
  | 'beyaz_yaka'
  | 'mavi_yaka'
  | 'esnaf'
  | 'issiz'
  | 'emekli';
export type RelationshipStatus = 'bekar' | 'iliskide' | 'evli' | 'ayrilmis' | 'dul';
export type FamilyStructure =
  | 'tek_cocuk'
  | 'kalabalik'
  | 'ayri_ebeveyn'
  | 'vefat_ebeveyn';
export type ReferralSource = 'kendi' | 'aile' | 'sevgili' | 'mahkeme' | 'okul_is';
export type ResistanceLevel = 'direngen' | 'dengeli' | 'isbirlikci';
export type SchoolFit = 'cbt' | 'psikodinamik' | 'humanistik' | 'sistemik';
export type PriorTherapy = 'ilk_kez' | 'kisa_sure' | 'uzun_gecmis';
export type VariantLabel = 'Daha açık' | 'Dengeli' | 'Direngen';

export type CastingParams = {
  age_range?: AgeRange;
  gender?: Gender;
  culture_segment?: CultureSegment;
  culture_freetext?: string;
  occupation?: Occupation;
  relationship_status?: RelationshipStatus;
  family_structure?: FamilyStructure;
  referral_source?: ReferralSource;
  difficulty?: Difficulty;
  resistance_level?: ResistanceLevel;
  school_fit?: SchoolFit;
  prior_therapy?: PriorTherapy;
  theme_hint?: string;
};

export type CandidateCase = GeneratedCase & {
  variant_label: VariantLabel;
};

export type GenerateCandidatesResult = {
  candidates: CandidateCase[];
  token_count: number;
};
