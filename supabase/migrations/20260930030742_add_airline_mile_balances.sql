create table if not exists public.airline_mile_balances (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 program_code text not null,
 miles bigint not null default 0 check(miles >= 0),
 expiry_date date,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id, program_code)
);

alter table public.airline_mile_balances enable row level security;
create index if not exists airline_mile_balances_user_idx on public.airline_mile_balances(user_id);

revoke all on table public.airline_mile_balances from anon, authenticated;
grant select, insert, update, delete on table public.airline_mile_balances to authenticated;

drop policy if exists "airline miles owner select" on public.airline_mile_balances;
drop policy if exists "airline miles owner insert" on public.airline_mile_balances;
drop policy if exists "airline miles owner update" on public.airline_mile_balances;
drop policy if exists "airline miles owner delete" on public.airline_mile_balances;

create policy "airline miles owner select"
 on public.airline_mile_balances for select to authenticated
 using ((select auth.uid()) = user_id);
create policy "airline miles owner insert"
 on public.airline_mile_balances for insert to authenticated
 with check ((select auth.uid()) = user_id);
create policy "airline miles owner update"
 on public.airline_mile_balances for update to authenticated
 using ((select auth.uid()) = user_id)
 with check ((select auth.uid()) = user_id);
create policy "airline miles owner delete"
 on public.airline_mile_balances for delete to authenticated
 using ((select auth.uid()) = user_id);
