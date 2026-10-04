-- Reassert least-privilege access after the account-switch audit.
alter table public.wallet_cards enable row level security;
revoke all on table public.wallet_cards from anon, authenticated;
grant select, insert, update, delete on table public.wallet_cards to authenticated;

drop policy if exists "wallet owner select" on public.wallet_cards;
drop policy if exists "wallet owner insert" on public.wallet_cards;
drop policy if exists "wallet owner update" on public.wallet_cards;
drop policy if exists "wallet owner delete" on public.wallet_cards;

create policy "wallet owner select" on public.wallet_cards for select to authenticated
 using ((select auth.uid()) = user_id);
create policy "wallet owner insert" on public.wallet_cards for insert to authenticated
 with check ((select auth.uid()) = user_id);
create policy "wallet owner update" on public.wallet_cards for update to authenticated
 using ((select auth.uid()) = user_id)
 with check ((select auth.uid()) = user_id);
create policy "wallet owner delete" on public.wallet_cards for delete to authenticated
 using ((select auth.uid()) = user_id);
