-- Automatic exchange-rate refresh. The fx-rates-refresh edge function calls this with the
-- service role; guests can never reach it. Rates expire after the validity window, so if the
-- provider stops working guests simply see Naira prices instead of a stale quote.
begin;

create or replace function public.apply_fx_rate_refresh(
  target_currency text,
  next_ngn_per_unit numeric,
  rate_source text,
  valid_hours integer default 48
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_curr text := upper(btrim(coalesce(target_currency, '')));
  previous public.currency_exchange_rates%rowtype;
begin
  if clean_curr not in ('USD', 'GBP', 'EUR') then
    raise exception 'Unsupported currency %.', clean_curr;
  end if;
  if next_ngn_per_unit is null or next_ngn_per_unit <= 0 then
    raise exception 'Exchange rate must be greater than zero.';
  end if;
  if valid_hours is null or valid_hours < 1 or valid_hours > 168 then
    raise exception 'Validity must be between 1 and 168 hours.';
  end if;

  select * into previous from public.currency_exchange_rates where currency = clean_curr;

  -- Safety: once a provider rate is stored, refuse a sudden jump of more than 25%.
  if found and previous.source = rate_source
     and abs(next_ngn_per_unit / previous.ngn_per_unit - 1) > 0.25 then
    raise exception 'Rate for % changed by more than 25%%; not applied. Review manually.', clean_curr;
  end if;

  insert into public.currency_exchange_rates (
    currency, currency_pair, ngn_per_unit, buffer_rate, source,
    effective_at, expires_at, is_active, updated_at
  )
  values (
    clean_curr, 'NGN/' || clean_curr, round(next_ngn_per_unit, 4), 0.1000, rate_source,
    now(), now() + make_interval(hours => valid_hours), true, now()
  )
  on conflict (currency) do update
    set ngn_per_unit = excluded.ngn_per_unit,
        source = excluded.source,
        effective_at = now(),
        expires_at = excluded.expires_at,
        is_active = true,
        updated_at = now();
end;
$$;

revoke all on function public.apply_fx_rate_refresh(text, numeric, text, integer) from public, anon, authenticated;
grant execute on function public.apply_fx_rate_refresh(text, numeric, text, integer) to service_role;

-- Every 6 hours, same secret-header pattern as the email dispatchers.
do $schedule$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_extension where extname = 'pg_net') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'hamlet-fx-rates-refresh';
    execute $cron$
      select cron.schedule(
        'hamlet-fx-rates-refresh',
        '7 */6 * * *',
        $job$
        select net.http_post(
          url := 'https://jopnnevqnwrpldrojmdu.supabase.co/functions/v1/fx-rates-refresh',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', 'sb_publishable_x3rhVUomAGCOccPuoDXrDw_sSpdya7W',
            'x-hamlet-internal-secret',
              (select decrypted_secret from vault.decrypted_secrets where name = 'hamlet_email_dispatch_secret')
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 15000
        );
        $job$
      )
    $cron$;
  end if;
end;
$schedule$;

commit;
