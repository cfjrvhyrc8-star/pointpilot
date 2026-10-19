-- LOCAL PROPOSAL ONLY. Not a migration and not applied to a hosted project.
-- Generate the deployment migration with the Supabase CLI after review.
create table public.assist_staff (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.assist_staff enable row level security;
revoke all on public.assist_staff from public,anon,authenticated;
grant select on public.assist_staff to authenticated;
create policy staff_self on public.assist_staff for select to authenticated
 using (user_id=(select auth.uid()));

create table public.assist_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 service text not null check(service in ('redemption','benefits','health')),
 brief text not null check(length(trim(brief)) between 10 and 1500),
 travellers integer not null default 1 check(travellers between 1 and 20),
 flexibility text not null default 'fixed' check(flexibility in ('fixed','flexible','unsure')),
 status text not null default 'draft' check(status in ('draft','submitted')),
 consent_version text,
 created_at timestamptz not null default now(),
 check(status='draft' or coalesce(consent_version='assist-scoping-v1',false))
);
create index assist_requests_owner on public.assist_requests(user_id,created_at desc);
create index assist_requests_queue on public.assist_requests(created_at) where status='submitted';
alter table public.assist_requests enable row level security;
revoke all on public.assist_requests from public,anon,authenticated;
grant select,insert on public.assist_requests to authenticated;
grant update(service,brief,travellers,flexibility,status,consent_version) on public.assist_requests to authenticated;
create policy requests_read on public.assist_requests for select to authenticated using (
 user_id=(select auth.uid()) or (status='submitted' and exists(select 1 from public.assist_staff where user_id=(select auth.uid())))
);
create policy requests_create on public.assist_requests for insert to authenticated
 with check(user_id=(select auth.uid()) and status='draft' and consent_version is null);
create policy requests_edit on public.assist_requests for update to authenticated
 using(user_id=(select auth.uid()) and status='draft')
 with check(user_id=(select auth.uid()) and status in ('draft','submitted'));

-- Append-only staff scoping notes. No paid/research/delivery state is available.
create table public.assist_case_events (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.assist_requests(id) on delete cascade,
 actor_id uuid not null references auth.users(id),
 kind text not null check(kind in ('received','needs_information','scope_reviewed')),
 message text not null check(length(trim(message)) between 1 and 1500),
 created_at timestamptz not null default now()
);
create index assist_case_events_request on public.assist_case_events(request_id,created_at);
alter table public.assist_case_events enable row level security;
revoke all on public.assist_case_events from public,anon,authenticated;
grant select,insert on public.assist_case_events to authenticated;
create policy events_read on public.assist_case_events for select to authenticated using (
 exists(select 1 from public.assist_requests r where r.id=request_id and r.status='submitted')
);
create policy events_create on public.assist_case_events for insert to authenticated with check (
 actor_id=(select auth.uid()) and exists(select 1 from public.assist_staff where user_id=(select auth.uid()))
 and exists(select 1 from public.assist_requests r where r.id=request_id and r.status='submitted')
);

-- Internal draft quote revisions only. No acceptance or payment authority.
create table public.assist_quote_drafts (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.assist_requests(id) on delete cascade,
 revision integer not null check(revision>0),
 author_id uuid not null references auth.users(id),
 scope text not null check(length(trim(scope)) between 10 and 3000),
 calculation jsonb not null check(jsonb_typeof(calculation)='object'),
 created_at timestamptz not null default now(),
 unique(request_id,revision)
);
create index assist_quote_drafts_request on public.assist_quote_drafts(request_id);
alter table public.assist_quote_drafts enable row level security;
revoke all on public.assist_quote_drafts from public,anon,authenticated;
grant select,insert on public.assist_quote_drafts to authenticated;
create policy quote_staff_read on public.assist_quote_drafts for select to authenticated using (
 exists(select 1 from public.assist_staff where user_id=(select auth.uid()))
);
create policy quote_staff_create on public.assist_quote_drafts for insert to authenticated with check (
 author_id=(select auth.uid()) and exists(select 1 from public.assist_staff where user_id=(select auth.uid()))
 and exists(select 1 from public.assist_requests r where r.id=request_id and r.status='submitted')
);
