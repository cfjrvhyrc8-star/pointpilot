-- A single private travel target gives each user a persistent destination for
-- their wallet and airline-mile balances. No traveller names, ticket data,
-- loyalty credentials or payment details are stored here.
create table if not exists public.user_trip_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal_name text not null default 'My next award trip' check (char_length(goal_name) between 1 and 80),
  origin varchar(3) not null check (origin ~ '^[A-Z]{3}$'),
  destination varchar(3) not null check (destination ~ '^[A-Z]{3}$'),
  travel_date date,
  cabin text not null default 'BUSINESS' check (cabin in ('ECONOMY','PREMIUM_ECONOMY','BUSINESS','FIRST')),
  program_code text not null,
  cash_fare numeric not null default 0 check (cash_fare >= 0),
  taxes numeric not null default 0 check (taxes >= 0),
  miles_required bigint not null default 0 check (miles_required >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_trip_goals enable row level security;
revoke all on table public.user_trip_goals from anon, authenticated;
grant select, insert, update, delete on table public.user_trip_goals to authenticated;

drop policy if exists "trip goal owner select" on public.user_trip_goals;
drop policy if exists "trip goal owner insert" on public.user_trip_goals;
drop policy if exists "trip goal owner update" on public.user_trip_goals;
drop policy if exists "trip goal owner delete" on public.user_trip_goals;

create policy "trip goal owner select" on public.user_trip_goals
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "trip goal owner insert" on public.user_trip_goals
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "trip goal owner update" on public.user_trip_goals
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "trip goal owner delete" on public.user_trip_goals
  for delete to authenticated using ((select auth.uid()) = user_id);
