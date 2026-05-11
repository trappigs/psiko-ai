-- supabase/migrations/0017_case_source.sql
-- 'curated': elden yazılmış vakalar (kütüphanede görünür)
-- 'ai_generated': serbest seans için AI tarafından anlık üretilen, kütüphanede gizli
ALTER TABLE public.cases
  ADD COLUMN source text NOT NULL DEFAULT 'curated'
  CHECK (source IN ('curated', 'ai_generated'));

CREATE INDEX cases_source_active_idx
  ON public.cases (source, is_active);

COMMENT ON COLUMN public.cases.source IS
  'curated = elden yazılmış kütüphane vakası; ai_generated = serbest seans için anlık üretilen, listede görünmez';
