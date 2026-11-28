-- Euro (EUR) quotes alongside USD/GBP. Same 10% buffer, same NGN settlement.
-- The EUR rate row is inserted INACTIVE with a placeholder value: no guest can be
-- quoted in euros until an admin sets a real rate via upsert_exchange_rate_config.
begin;

alter table public.currency_exchange_rates drop constraint if exists currency_exchange_rates_currency_check;
alter table public.currency_exchange_rates add constraint currency_exchange_rates_currency_check
  check (currency in ('USD', 'GBP', 'EUR'));
alter table public.currency_exchange_rates drop constraint if exists currency_exchange_rates_currency_pair_check;
alter table public.currency_exchange_rates add constraint currency_exchange_rates_currency_pair_check
  check (currency_pair in ('NGN/USD', 'NGN/GBP', 'NGN/EUR'));

alter table public.bookings drop constraint if exists bookings_quote_currency_check;
alter table public.bookings add constraint bookings_quote_currency_check
  check (quote_currency in ('NGN', 'USD', 'GBP', 'EUR'));
alter table public.bookings drop constraint if exists bookings_currency_pair_check;
alter table public.bookings add constraint bookings_currency_pair_check
  check (currency_pair in ('NGN/NGN', 'NGN/USD', 'NGN/GBP', 'NGN/EUR'));

-- Patch the three functions in place so every other line stays exactly as deployed.
do $$
declare
  def text;
  patched text;
begin
  select pg_get_functiondef('public.enforce_booking_request_integrity()'::regprocedure) into def;
  patched := replace(def, 'if requested_curr in (''USD'', ''GBP'') then', 'if requested_curr in (''USD'', ''GBP'', ''EUR'') then');
  if patched = def then raise exception 'enforce_booking_request_integrity: pattern not found'; end if;
  execute patched;

  select pg_get_functiondef('public.refresh_booking_fx_quote(text,text)'::regprocedure) into def;
  patched := replace(def, 'if clean_curr not in (''NGN'', ''USD'', ''GBP'') then', 'if clean_curr not in (''NGN'', ''USD'', ''GBP'', ''EUR'') then');
  if patched = def then raise exception 'refresh_booking_fx_quote: pattern not found'; end if;
  execute patched;

  select pg_get_functiondef('public.upsert_exchange_rate_config(text,numeric,text,boolean,timestamptz)'::regprocedure) into def;
  patched := replace(def, 'if clean_curr not in (''USD'', ''GBP'') then', 'if clean_curr not in (''USD'', ''GBP'', ''EUR'') then');
  if patched = def then raise exception 'upsert_exchange_rate_config: pattern not found'; end if;
  execute patched;
end $$;

-- Placeholder only; inactive rows are never used for quotes.
insert into public.currency_exchange_rates (currency, currency_pair, ngn_per_unit, buffer_rate, source, is_active)
values ('EUR', 'NGN/EUR', 1, 0.1000, 'pending_admin_rate', false)
on conflict (currency) do nothing;

commit;
