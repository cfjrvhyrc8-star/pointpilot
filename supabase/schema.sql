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

-- Card catalogue seed. Metadata is source-verified and should be refreshed when issuer terms change.
insert into public.card_catalog
(issuer,card_name,network,annual_fee,joining_fee,forex_markup,base_reward,accelerated_reward,lounge_benefit,travel_benefit,milestone_benefit,key_benefits,reward_currency,redemption_summary,source_url,verified_at)
values
('HDFC Bank','Diners Club Black Metal','Diners Club',10000,10000,2.0,'1 RP per ₹150 eligible spend','Up to 10X via SmartBuy; 2X weekend dining','Unlimited access to 1,300+ lounges in India and abroad','5X flights and 10X hotels via SmartBuy; up to 70% booking value via points','10,000 bonus RP each calendar quarter on ₹4 lakh spend; renewal fee waiver at ₹8 lakh/12 months','["Club Marriott, Amazon Prime and Swiggy One on ₹1.5 lakh in first 90 days","6 complimentary golf games per quarter, up to 24 annually","Up to 40% off dining via Swiggy Dineout","24x7 concierge"]'::jsonb,'HDFC Reward Points','SmartBuy flight/hotel redemption up to ₹1 per point; airmiles up to 1:1; products/vouchers up to ₹0.50','https://www.hdfc.bank.in/credit-cards/diners-club-black-metal-edition-credit-card',now()),
('ICICI Bank','Times Black','Visa',20000,20000,1.49,'2% domestic rewards; 2.5% international rewards','Up to 6X flights, 12X hotels and 6X vouchers via iShop','Unlimited domestic and international lounge access','1 RP = 1 Maharaja Point instantly; luxury stay and travel milestone benefits','₹25 lakh annual spend waives next annual fee; ₹20 lakh milestone includes luxury stay','["₹20,000 luxury stay gift choice","Visa airport and travel services","Zomato Gold","1% fuel surcharge waiver","24x7 concierge"]'::jsonb,'ICICI Reward Points','1 Reward Point converts to 1 Air India Maharaja Point; other redemption values depend on catalogue','https://www.icici.bank.in/personal-banking/cards/credit-card/times-black-icici-credit-card',now()),
('American Express India','Platinum Travel','American Express',5000,5000,null,'1 Membership Reward point per ₹50 eligible spend','3X via Reward Multiplier; milestone bonuses at ₹1.9L/₹4L/₹7L','8 complimentary domestic lounge visits/year, max 2 per quarter; Priority Pass membership','Platinum Travel Collection includes Air India, Taj and Postcard vouchers; hotel/airline transfer partners','7,500 RP at ₹1.9 lakh; 10,000 RP at ₹4 lakh; 22,500 RP + ₹10,000 Taj voucher at ₹7 lakh','["10,000 welcome MR after ₹15,000 spend within 90 days","Fuel waiver at HPCL subject to terms","Membership Rewards do not expire","Transfer to airline and hotel partners"]'::jsonb,'Membership Rewards','Air India ₹0.30/RP; Taj ₹0.40/RP; Postcard ₹0.50/RP on specified redemption blocks','https://www.americanexpress.com/in/benefits/platinum-travel-credit-card/',now()),
('Scapia','Scapia Federal Credit Card','Visa/RuPay',0,0,0,'Rewards on eligible spends','Travel rewards on Scapia app after ₹20,000 combined monthly spend','International airport privileges subject to spend/booking conditions','Zero forex; travel booking rewards; no-cost EMI for eligible Scapia travel bookings','International airport rewards can unlock with qualifying flight booking','["Zero joining and annual fee","Zero forex on Visa card","No-cost EMI for eligible Scapia travel","Travel rewards on Scapia app"]'::jsonb,'Scapia Coins','Direct Scapia travel redemption currently modeled at ₹0.20/coin; catalogue terms can change','https://www.scapia.cards/',now()),
('IDFC FIRST Bank','FIRST Mayura','Mastercard',5999,5999,0,'1X = 1 point per ₹150; 5X up to ₹20,000 monthly and 10X above ₹20,000','10X on incremental spend above ₹20,000 monthly and birthday spend','4 domestic lounge/spa visits including guest access per quarter; 4 international lounge visits per quarter','Zero forex; trip cancellation cover up to ₹50,000/year; travel rewards via FIRST Rewards','Welcome cashback and travel/lifestyle benefits subject to current terms','["Metal card","Zero forex markup","Up to 40 golf rounds/lessons yearly","Buy-one-get-one movie offer twice monthly"]'::jsonb,'IDFC FIRST Reward Points','₹0.50/point for Travel & Shop redemption under current verified reward rules','https://www.idfcfirstbank.com/content/dam/idfcfirstbank/pdf/Mayura-CC-Rewards-Structure-TnC-28-05-25.pdf',now()),
('IDFC FIRST Bank','FIRST Wealth','Visa Infinite',0,0,0,'1X = 1 point per ₹200 on standard eligible spends','10X on dining/travel/birthday; 3X on other eligible spends','1 domestic + 1 international airport lounge visit per quarter; golf benefits subject to terms','20% hotel and 10% flight bonus rewards via FIRST Rewards; zero forex','Lifetime free; travel/lifestyle benefits subject to current terms','["Zero joining and annual fee","Trip cancellation cover up to ₹10,000","24x7 concierge","Visa Infinite travel benefits"]'::jsonb,'IDFC FIRST Reward Points','₹0.25/point under current verified redemption rule','https://www.idfcfirst.bank.in/credit-card/wealth',now()),
('OneCard','One Credit Card','Visa/Mastercard/RuPay',0,0,null,'1 point per ₹50 purchase','5X on top 2 categories when qualifying across 3 categories','Lounge access and travel benefits vary by issuer/network and current programme','Pay with points; current reward programme includes travel/merchant redemption options','No annual fee under lifetime-free terms','["Instant points credit","Fractional points","5X top 2 categories","No rewards redemption fee"]'::jsonb,'OneRewards','Current terms include points redemption against eligible transactions/cash and dynamic store offers','https://www.getonecard.app/legal/fed_mitc/',now())
on conflict (issuer,card_name) do update set
 network=excluded.network,annual_fee=excluded.annual_fee,joining_fee=excluded.joining_fee,forex_markup=excluded.forex_markup,
 base_reward=excluded.base_reward,accelerated_reward=excluded.accelerated_reward,lounge_benefit=excluded.lounge_benefit,
 travel_benefit=excluded.travel_benefit,milestone_benefit=excluded.milestone_benefit,key_benefits=excluded.key_benefits,
 reward_currency=excluded.reward_currency,redemption_summary=excluded.redemption_summary,source_url=excluded.source_url,
 verified_at=excluded.verified_at,active=true;
