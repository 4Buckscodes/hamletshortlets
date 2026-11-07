-- Allow a submitted property-partner application to begin property intake immediately.
-- Partner approval/verification remains separate; properties stay non-public until reviewed.
-- This does not grant partner role, booking controls, referral earnings, or payout access.

create or replace function public.can_submit_partner_property()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and public.is_account_active()
    and (
      public.has_role('partner')
      or public.has_role('admin')
      or exists (
        select 1
        from public.partner_applications application
        where application.applicant_id = (select auth.uid())
          and application.status in ('pending', 'needs_correction')
          and application.role in (
            'Property owner',
            'Authorised manager',
            'Multi-property operator'
          )
      )
    );
$$;

revoke all on function public.can_submit_partner_property() from public, anon;
grant execute on function public.can_submit_partner_property() to authenticated;

-- Preserve the existing hardened RPC bodies and replace only their role gate.
do $$
declare
  function_signature regprocedure;
  function_definition text;
  updated_definition text;
begin
  foreach function_signature in array array[
    'public.submit_partner_property(jsonb,jsonb)'::regprocedure,
    'public.update_and_resubmit_partner_property(text,jsonb,jsonb,text)'::regprocedure
  ]
  loop
    function_definition := pg_get_functiondef(function_signature);
    updated_definition := replace(
      function_definition,
      'not public.has_role(''partner'')',
      'not public.can_submit_partner_property()'
    );

    if updated_definition = function_definition then
      raise exception 'Could not locate the expected partner-role guard in %.', function_signature;
    end if;

    execute updated_definition;
  end loop;
end;
$$;

comment on function public.can_submit_partner_property() is
  'Allows active approved partners/admins and active applicants with a pending or correction-requested inventory partner application to submit or correct listings. Does not confer payout eligibility.';


-- Allow pending inventory applicants to upload only into their own user-scoped folder.
do $$
begin
  if to_regclass('storage.objects') is not null then
    drop policy if exists "Active partners and admins can upload property media" on storage.objects;
    drop policy if exists "Active partner applicants and admins can upload property media" on storage.objects;
    create policy "Active partner applicants and admins can upload property media"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'property-media'
        and public.can_submit_partner_property()
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
  end if;
end
$$;
