create table public.case_series (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  case_id     uuid not null references public.cases(id),
  status      text not null default 'open' check (status in ('open','closed')),
  created_at  timestamptz not null default now(),
  closed_at   timestamptz
);

create unique index case_series_open_uniq
  on public.case_series(user_id, case_id)
  where status = 'open';

create index case_series_user_idx on public.case_series(user_id);

alter table public.case_series enable row level security;

create policy "users manage own series"
  on public.case_series for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.sessions
  add column series_id uuid references public.case_series(id);

create index sessions_series_idx on public.sessions(series_id);

-- backfill: her mevcut seans kendi closed serisine girer
do $$
declare
  s record;
  new_series_id uuid;
begin
  for s in
    select id, user_id, case_id from public.sessions where series_id is null
  loop
    insert into public.case_series(user_id, case_id, status, closed_at)
    values (s.user_id, s.case_id, 'closed', now())
    returning id into new_series_id;
    update public.sessions set series_id = new_series_id where id = s.id;
  end loop;
end $$;

alter table public.sessions alter column series_id set not null;
