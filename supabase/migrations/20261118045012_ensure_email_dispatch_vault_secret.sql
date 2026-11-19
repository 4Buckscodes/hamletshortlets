-- Ensure the scheduled email dispatcher has its private Vault token.
do $extensions$
begin
  if exists (select 1 from pg_available_extensions where name = 'supabase_vault') then
    execute 'create extension if not exists supabase_vault with schema vault';
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron';
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    execute 'create extension if not exists pg_net';
  end if;
end;
$extensions$;

do $secret$
declare
  scheduler_secret text;
begin
  if to_regclass('vault.secrets') is null then
    raise notice 'Supabase Vault is not available; customer email dispatch remains queued until Vault is enabled.';
    return;
  end if;

  if not exists (
    select 1 from vault.secrets where name = 'hamlet_email_dispatch_secret'
  ) then
    scheduler_secret := replace(
      gen_random_uuid()::text || gen_random_uuid()::text || gen_random_uuid()::text,
      '-', ''
    );
    perform vault.create_secret(
      scheduler_secret,
      'hamlet_email_dispatch_secret',
      'Private shared token used only by trusted HAMLET pg_cron email dispatch jobs.'
    );
  end if;
end;
$secret$;