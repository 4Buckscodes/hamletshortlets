-- Production-only schedule for HAMLET customer and operations email queues.
-- Requires the Vault-backed auth migration and the active customer/admin Edge Functions.
-- Each job runs every minute and claims at most 20 queue rows.

do $schedule$
declare
  existing_job record;
begin
  for existing_job in
    select jobid
    from cron.job
    where jobname in (
      'hamlet-customer-email-dispatch',
      'hamlet-admin-email-dispatch'
    )
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'hamlet-customer-email-dispatch',
    '* * * * *',
    $job$
      select net.http_post(
        url := 'https://jopnnevqnwrpldrojmdu.supabase.co/functions/v1/customer-notifications-dispatch',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', 'sb_publishable_x3rhVUomAGCOccPuoDXrDw_sSpdya7W',
          'x-hamlet-internal-secret',
            (select decrypted_secret
             from vault.decrypted_secrets
             where name = 'hamlet_email_dispatch_secret')
        ),
        body := '{"batchLimit":20}'::jsonb,
        timeout_milliseconds := 10000
      );
    $job$
  );

  perform cron.schedule(
    'hamlet-admin-email-dispatch',
    '* * * * *',
    $job$
      select net.http_post(
        url := 'https://jopnnevqnwrpldrojmdu.supabase.co/functions/v1/admin-notifications-dispatch',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', 'sb_publishable_x3rhVUomAGCOccPuoDXrDw_sSpdya7W',
          'x-hamlet-internal-secret',
            (select decrypted_secret
             from vault.decrypted_secrets
             where name = 'hamlet_email_dispatch_secret')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 10000
      );
    $job$
  );
end;
$schedule$;
