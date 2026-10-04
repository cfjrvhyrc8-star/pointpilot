create table if not exists public.user_spend_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_spend jsonb not null default '{}'::jsonb
    check (jsonb_typeof(monthly_spend) = 'object'),
  preferred_goal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_spend_profiles enable row level security;

revoke all on table public.user_spend_profiles from anon, authenticated;
grant select, insert, update, delete on table public.user_spend_profiles to authenticated;

drop policy if exists "spend profile owner select" on public.user_spend_profiles;
drop policy if exists "spend profile owner insert" on public.user_spend_profiles;
drop policy if exists "spend profile owner update" on public.user_spend_profiles;
drop policy if exists "spend profile owner delete" on public.user_spend_profiles;

create policy "spend profile owner select"
  on public.user_spend_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "spend profile owner insert"
  on public.user_spend_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "spend profile owner update"
  on public.user_spend_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "spend profile owner delete"
  on public.user_spend_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);
