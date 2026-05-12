create table public.case_series_reports (
  id                    uuid primary key default gen_random_uuid(),
  series_id             uuid not null references public.case_series(id) on delete cascade,
  closing_reflection    text,
  summary               text not null,
  arc                   text not null,
  themes                jsonb not null default '[]',
  growth                jsonb not null default '[]',
  missed_opportunities  jsonb not null default '[]',
  final_formulation     jsonb,
  next_steps            text not null,
  generated_at          timestamptz not null default now()
);

create unique index case_series_reports_series_uniq
  on public.case_series_reports(series_id);

alter table public.case_series_reports enable row level security;

create policy "users access own series reports"
  on public.case_series_reports for all to authenticated
  using (
    exists (
      select 1 from public.case_series cs
      where cs.id = case_series_reports.series_id and cs.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.case_series cs
      where cs.id = case_series_reports.series_id and cs.user_id = auth.uid()
    )
  );
