alter table public.sessions
  add column summary jsonb,
  add column time_gap_label text;

alter table public.case_series
  add column formulation jsonb;

comment on column public.sessions.summary is
  'Seans-sonu AI özeti: {headline, key_events[], promises[], hypothesis_update}';
comment on column public.sessions.time_gap_label is
  'Bu seans ile önceki seans arasındaki zaman ipucu (örn "1 hafta sonra")';
comment on column public.case_series.formulation is
  'Seri-canonical yaşayan formülasyon (case-bazında evrilen)';
