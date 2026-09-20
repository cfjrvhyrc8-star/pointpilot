create table if not exists public.wallet_cards(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,card_name text not null,points bigint not null default 0 check(points>=0),currency text not null,role text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()); alter table public.wallet_cards enable row level security; create policy "wallet owner select" on public.wallet_cards for select to authenticated using ((select auth.uid())=user_id); create policy "wallet owner insert" on public.wallet_cards for insert to authenticated with check ((select auth.uid())=user_id); create policy "wallet owner update" on public.wallet_cards for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id); create policy "wallet owner delete" on public.wallet_cards for delete to authenticated using ((select auth.uid())=user_id); create table if not exists public.reward_rules(id uuid primary key default gen_random_uuid(),issuer text not null,card_name text,currency text not null,partner text not null,partner_type text not null,transfer_ratio numeric,min_transfer integer,max_transfer integer,transfer_time text,source_url text,effective_date date,verified_at timestamptz,notes text,active boolean not null default true); alter table public.reward_rules enable row level security; create policy "reward rules public read" on public.reward_rules for select to anon,authenticated using(active=true); create index if not exists reward_rules_partner_idx on public.reward_rules(partner); create index if not exists wallet_cards_user_idx on public.wallet_cards(user_id);

-- PointPilot master rewards catalogue (2026-09-21)
-- Only source-verified ratios are activated. Portal-gated or dynamic rates remain non-optimizable.

alter table public.reward_rules
  add column if not exists route_status text not null default 'verified',
  add column if not exists redemption_value numeric,
  add column if not exists redemption_currency text,
  add column if not exists min_redeem_points integer,
  add column if not exists max_redeem_points integer,
  add column if not exists redeem_increment integer,
  add column if not exists confidence text not null default 'high',
  add column if not exists program_url text,
  add column if not exists source_type text not null default 'issuer';

create index if not exists reward_rules_card_idx on public.reward_rules(issuer, card_name);
create index if not exists reward_rules_type_status_idx on public.reward_rules(partner_type, route_status);

delete from public.reward_rules
where (issuer, card_name) in (
  ('HDFC Bank','Diners Black Metal'),
  ('ICICI Bank','Times Black'),
  ('American Express India','Platinum Travel'),
  ('Scapia','Scapia'),
  ('IDFC FIRST Bank','Mayura'),
  ('IDFC FIRST Bank','Wealth'),
  ('OneCard','OneCard')
);

insert into public.reward_rules
(issuer,card_name,currency,partner,partner_type,transfer_ratio,source_url,effective_date,verified_at,notes,route_status,confidence,program_url,source_type)
values
('HDFC Bank','Diners Black Metal','HDFC Reward Points','Turkish Airlines Miles&Smiles','airline_transfer',2.0,'https://www.hdfcbank.com/content/bbp/repositories/723fb80a-2dde-42a3-9793-7ae1be57c87f/?path=%2FPersonal%2FPay%2FCards%2FCredit+Card%2FCredit+Card+Landing+Page%2FCredit+Cards%2FSuper+Premium%2FDiners+Club+Black+Metal+Edition%2FRewards-TnC-Diners-Black-Metal.pdf','2024-01-15','2026-09-21 00:00:00+00','Issuer T&C: effective 15 Jan 2024; 2 HDFC Reward Points convert to 1 loyalty point.','verified','high','https://www.turkishairlines.com/en-int/miles-and-smiles/','issuer'),
('HDFC Bank','Diners Black Metal','HDFC Reward Points','Accor ALL','hotel_transfer',2.0,'https://www.hdfcbank.com/content/bbp/repositories/723fb80a-2dde-42a3-9793-7ae1be57c87f/?path=%2FPersonal%2FPay%2FCards%2FCredit+Card%2FCredit+Card+Landing+Page%2FCredit+Cards%2FSuper+Premium%2FDiners+Club+Black+Metal+Edition%2FRewards-TnC-Diners-Black-Metal.pdf','2024-01-15','2026-09-21 00:00:00+00','Issuer T&C: effective 15 Jan 2024; 2 HDFC Reward Points convert to 1 loyalty point.','verified','high','https://all.accor.com/','issuer'),
('HDFC Bank','Diners Black Metal','HDFC Reward Points','Avianca LifeMiles','airline_transfer',2.0,'https://www.hdfcbank.com/content/bbp/repositories/723fb80a-2dde-42a3-9793-7ae1be57c87f/?path=%2FPersonal%2FPay%2FCards%2FCredit+Card%2FCredit+Card+Landing+Page%2FCredit+Cards%2FSuper+Premium%2FDiners+Club+Black+Metal+Edition%2FRewards-TnC-Diners-Black-Metal.pdf','2024-01-15','2026-09-21 00:00:00+00','Issuer T&C: effective 15 Jan 2024; 2 HDFC Reward Points convert to 1 loyalty point.','verified','high','https://www.lifemiles.com/','issuer');

insert into public.reward_rules
(issuer,card_name,currency,partner,partner_type,transfer_ratio,source_url,effective_date,verified_at,notes,route_status,confidence,program_url,source_type)
values
('ICICI Bank','Times Black','ICICI Reward Points','Air India Maharaja Club','airline_transfer',1.0,'https://www.timesblack.com/benefits/signature-benefits/maharaja-points-timesblack','2026-09-21','2026-09-21 00:00:00+00','Times Black page: 1 RP = 1 Maharaja Point instantly; no minimum and no conversion cap; credited in 5 working days.','verified','high','https://www.airindia.com/in/en/maharaja-club.html','issuer');

insert into public.reward_rules
(issuer,card_name,currency,partner,partner_type,redemption_value,redemption_currency,min_redeem_points,max_redeem_points,redeem_increment,source_url,effective_date,verified_at,notes,route_status,confidence,program_url,source_type)
values
('American Express India','Platinum Travel','Membership Rewards','Air India','voucher',0.30,'INR',20000,40000,20000,'https://www.americanexpress.com/in/benefits/platinum-travel-credit-card/','2026-09-21','2026-09-21 00:00:00+00','20,000 points = ₹6,000 voucher or 40,000 points = ₹12,000 voucher.','verified','high','https://www.airindia.com/','issuer'),
('American Express India','Platinum Travel','Membership Rewards','Taj Hotels and Resorts','voucher',0.40,'INR',12500,25000,12500,'https://www.americanexpress.com/in/benefits/platinum-travel-credit-card/','2026-09-21','2026-09-21 00:00:00+00','12,500 points = ₹5,000 voucher or 25,000 points = ₹10,000 voucher.','verified','high','https://www.tajhotels.com/','issuer'),
('American Express India','Platinum Travel','Membership Rewards','The Postcard Hotels','voucher',0.50,'INR',20000,20000,20000,'https://www.americanexpress.com/in/benefits/platinum-travel-credit-card/','2026-09-21','2026-09-21 00:00:00+00','20,000 points = ₹10,000 voucher.','verified','high','https://www.postcardresorts.com/','issuer'),
('American Express India','Platinum Travel','Membership Rewards','Amex Insta Voucher catalogue','voucher',null,null,null,null,null,'https://www.americanexpress.com/in/benefits/platinum-travel-credit-card/','2026-09-21','2026-09-21 00:00:00+00','Current India page: e-vouchers from 100+ brands including Amazon and Myntra. Exact live denomination/rate must be read from the Amex redemption catalogue.','catalogue_required','medium','https://www.americanexpress.com/en-in/rewards/membership-rewards/','issuer');

insert into public.reward_rules
(issuer,card_name,currency,partner,partner_type,redemption_value,redemption_currency,source_url,effective_date,verified_at,notes,route_status,confidence,program_url,source_type)
values
('Scapia','Scapia','Scapia Coins','Scapia Travel','direct_travel',0.20,'INR','https://www.scapia.cards/product/blog/scapia-coins','2026-09-21','2026-09-21 00:00:00+00','5 Scapia Coins = ₹1; coins can be applied to flights, hotels, trains, buses, visas, experiences and shopping in the Scapia app.','verified','high','https://www.scapia.cards/','issuer'),
('IDFC FIRST Bank','Mayura','IDFC FIRST Reward Points','IDFC FIRST Travel & Shop','direct_travel',0.50,'INR','https://www.idfcfirstbank.com/content/dam/idfcfirstbank/pdf/Mayura-CC-Rewards-Structure-TnC-28-05-25.pdf','2025-05-28','2026-09-21 00:00:00+00','1 Reward Point = ₹0.50 for hotel and flight bookings through Travel & Shop; 1 RP = ₹0.25 elsewhere.','verified','high','https://www.idfcfirstbank.com/','issuer'),
('IDFC FIRST Bank','Wealth','IDFC FIRST Reward Points','IDFC FIRST Rewards','direct_travel',0.25,'INR','https://www.idfcfirstbank.com/content/dam/idfcfirstbank/pdf/Wealth-CC-Rewards-Structure-TnC-28-05-25-copy.pdf','2025-05-28','2026-09-21 00:00:00+00','Current Wealth reward terms state 1 Reward Point = ₹0.25; no airline/hotel transfer ratio is activated here.','verified','high','https://www.idfcfirstbank.com/','issuer'),
('OneCard','OneCard','OneCard Reward Points','OneStore Gift Cards','voucher',null,'INR','https://www.getonecard.app/legal/store_tnc/','2026-09-21','2026-09-21 00:00:00+00','OneStore terms allow reward points for up to 50% of eligible order value; the conversion rate may be revised by the issuer, so PointPilot must read the live catalogue before valuing it.','dynamic_rate','high','https://www.getonecard.app/','issuer');


-- Card catalogue: detailed issuer-verified metadata for the wallet detail view.
create table if not exists public.card_catalog (
 id uuid primary key default gen_random_uuid(), issuer text not null, card_name text not null,
 network text, annual_fee numeric, joining_fee numeric, forex_markup numeric,
 base_reward text, accelerated_reward text, lounge_benefit text, travel_benefit text,
 milestone_benefit text, key_benefits jsonb not null default '[]'::jsonb,
 reward_currency text, redemption_summary text, source_url text, verified_at timestamptz,
 active boolean not null default true, unique(issuer, card_name)
);
alter table public.card_catalog enable row level security;
create policy "card catalog public read" on public.card_catalog for select to anon,authenticated using(active=true);
create index if not exists card_catalog_card_idx on public.card_catalog(card_name);
