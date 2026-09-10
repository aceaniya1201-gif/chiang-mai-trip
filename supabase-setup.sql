-- Run once in a dedicated Supabase project's SQL editor.
-- This project should only contain this private, unlisted trip's data.

create table if not exists public.trip_events (
  trip_id uuid not null,
  id text not null,
  day date not null,
  position double precision not null,
  time text not null,
  title text not null,
  description text not null default '',
  links jsonb not null default '[]'::jsonb,
  checked boolean not null default false,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by text not null,
  primary key (trip_id, id)
);

create table if not exists public.trip_expenses (
  trip_id uuid not null,
  id text not null,
  event_id text not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null check (currency in ('THB', 'CNY')),
  category text not null,
  payer text not null,
  note text not null default '',
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by text not null,
  primary key (trip_id, id)
);

create index if not exists trip_events_day_position_idx
  on public.trip_events (trip_id, day, position);
create index if not exists trip_expenses_event_idx
  on public.trip_expenses (trip_id, event_id);

alter table public.trip_events enable row level security;
alter table public.trip_expenses enable row level security;

-- The random trip UUID acts as the unlisted room identifier. Keep the final
-- deployed URL within the five-person group and use a dedicated Supabase project.
drop policy if exists "trip events are shared with link holders" on public.trip_events;
drop policy if exists "trip expenses are shared with link holders" on public.trip_expenses;
create policy "trip events are shared with link holders"
  on public.trip_events for all to anon using (true) with check (true);
create policy "trip expenses are shared with link holders"
  on public.trip_expenses for all to anon using (true) with check (true);

grant select, insert, update on public.trip_events to anon;
grant select, insert, update on public.trip_expenses to anon;
