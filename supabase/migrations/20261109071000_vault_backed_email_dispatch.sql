-- Vault-backed authentication for scheduled HAMLET email dispatch.
-- Existing Edge Function secrets remain valid and are not changed by this migration.
-- A separate random scheduler token is generated inside Supabase Vault; its value is
-- never stored in Git, returned by this migration, or granted to anon/authenticated.

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
    return;
  end if;

  if not exists (
    select 1
    from vault.secrets
    where name = 'hamlet_email_dispatch_secret'
  ) then
    scheduler_secret := replace(
      gen_random_uuid()::text || gen_random_uuid()::text || gen_random_uuid()::text,
      '-',
      ''
    );
    perform vault.create_secret(
      scheduler_secret,
      'hamlet_email_dispatch_secret',
      'Private shared token used only by trusted pg_cron email dispatch jobs.'
    );
  end if;
end;
$secret$;

create or replace function public.verify_hamlet_email_dispatch_secret(candidate_secret text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  stored_secret text;
begin
  if candidate_secret is null or length(candidate_secret) < 32 then
    return false;
  end if;

  if to_regclass('vault.decrypted_secrets') is null then
    return false;
  end if;

  execute
    'select decrypted_secret from vault.decrypted_secrets where name = $1'
    into stored_secret
    using 'hamlet_email_dispatch_secret';

  return stored_secret is not null
    and length(stored_secret) >= 32
    and candidate_secret = stored_secret;
end;
$function$;

revoke all on function public.verify_hamlet_email_dispatch_secret(text)
  from public, anon, authenticated;
grant execute on function public.verify_hamlet_email_dispatch_secret(text)
  to service_role;

comment on function public.verify_hamlet_email_dispatch_secret(text) is
  'Service-role-only verifier for a random internal email dispatch token stored in Supabase Vault.';
