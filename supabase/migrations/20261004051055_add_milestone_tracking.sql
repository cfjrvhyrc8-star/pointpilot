-- Source-verified milestone and annual-fee-waiver thresholds.
create table if not exists public.card_milestone_rules (
 id uuid primary key default gen_random_uuid(),
 issuer text not null,
 card_name text not null,
 rule_type text not null check (rule_type in ('milestone','fee_waiver')),
 cadence text not null check (cadence in ('quarterly','annual')),
 progress_field text not null check (progress_field in ('quarterly_spend','annual_spend')),
 target_amount numeric not null check (target_amount > 0),
 reward_text text not null,
 estimated_value numeric check (estimated_value is null or estimated_value >= 0),
 source_url text not null,
 verified_at date not null,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique (issuer, card_name, rule_type, cadence, target_amount)
);

alter table public.card_milestone_rules enable row level security;
revoke all on table public.card_milestone_rules from anon, authenticated;
grant select on table public.card_milestone_rules to authenticated;
drop policy if exists "Authenticated users can read active milestone rules" on public.card_milestone_rules;
create policy "Authenticated users can read active milestone rules"
 on public.card_milestone_rules for select to authenticated using (active = true);
create index if not exists card_milestone_rules_card_idx
 on public.card_milestone_rules(card_name) where active;

insert into public.card_milestone_rules
(issuer,card_name,rule_type,cadence,progress_field,target_amount,reward_text,estimated_value,source_url,verified_at)
values
('HDFC Bank','Diners Club Black Metal','milestone','quarterly','quarterly_spend',400000,'10,000 bonus Reward Points for the calendar quarter',10000,'https://www.hdfc.bank.in/credit-cards/diners-club-black-metal-edition-credit-card','2026-09-20'),
('HDFC Bank','Diners Club Black Metal','fee_waiver','annual','annual_spend',800000,'Next annual membership fee waived',10000,'https://www.hdfc.bank.in/credit-cards/diners-club-black-metal-edition-credit-card','2026-09-20'),
('American Express India','Platinum Travel','milestone','annual','annual_spend',190000,'7,500 Membership Rewards milestone bonus',2250,'https://www.americanexpress.com/in/benefits/platinum-travel-credit-card/','2026-09-20'),
('American Express India','Platinum Travel','milestone','annual','annual_spend',400000,'10,000 Membership Rewards milestone bonus',3000,'https://www.americanexpress.com/in/benefits/platinum-travel-credit-card/','2026-09-20'),
('American Express India','Platinum Travel','milestone','annual','annual_spend',700000,'22,500 Membership Rewards plus ₹10,000 Taj voucher',16750,'https://www.americanexpress.com/in/benefits/platinum-travel-credit-card/','2026-09-20'),
('ICICI Bank','Times Black','milestone','annual','annual_spend',2000000,'Luxury-stay milestone benefit',20000,'https://www.icici.bank.in/personal-banking/cards/credit-card/times-black-icici-credit-card','2026-09-20'),
('ICICI Bank','Times Black','fee_waiver','annual','annual_spend',2500000,'Next annual membership fee waived',20000,'https://www.icici.bank.in/personal-banking/cards/credit-card/times-black-icici-credit-card','2026-09-20')
on conflict (issuer,card_name,rule_type,cadence,target_amount) do update set
 progress_field=excluded.progress_field,reward_text=excluded.reward_text,
 estimated_value=excluded.estimated_value,source_url=excluded.source_url,
 verified_at=excluded.verified_at,active=true;

-- User-entered statement totals. No transaction data or card number is stored.
create table if not exists public.user_card_spend_progress (
 wallet_card_id uuid primary key references public.wallet_cards(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 annual_spend numeric not null default 0 check (annual_spend >= 0),
 quarterly_spend numeric not null default 0 check (quarterly_spend >= 0),
 cycle_start date,
 quarter_start date,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

alter table public.user_card_spend_progress enable row level security;
create index if not exists user_card_spend_progress_user_idx on public.user_card_spend_progress(user_id);
revoke all on table public.user_card_spend_progress from anon, authenticated;
grant select, insert, update, delete on table public.user_card_spend_progress to authenticated;
drop policy if exists "card progress owner select" on public.user_card_spend_progress;
drop policy if exists "card progress owner insert" on public.user_card_spend_progress;
drop policy if exists "card progress owner update" on public.user_card_spend_progress;
drop policy if exists "card progress owner delete" on public.user_card_spend_progress;
create policy "card progress owner select" on public.user_card_spend_progress
 for select to authenticated using ((select auth.uid()) = user_id);
create policy "card progress owner insert" on public.user_card_spend_progress
 for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
   select 1 from public.wallet_cards w where w.id = wallet_card_id and w.user_id = (select auth.uid())
  )
 );
create policy "card progress owner update" on public.user_card_spend_progress
 for update to authenticated
 using ((select auth.uid()) = user_id)
 with check (
  (select auth.uid()) = user_id and exists (
   select 1 from public.wallet_cards w where w.id = wallet_card_id and w.user_id = (select auth.uid())
  )
 );
create policy "card progress owner delete" on public.user_card_spend_progress
 for delete to authenticated using ((select auth.uid()) = user_id);
