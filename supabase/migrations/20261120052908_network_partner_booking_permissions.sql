-- Network partners manage bookings on the properties they manage.
--
-- An active partner_network_memberships row is the partner entitlement and
-- profiles.role stays 'guest' (20261116090000). Three booking RPCs still branched
-- on profiles.role, so a network-member property owner could not check, accept or
-- decline booking requests on their own listing, record issue investigation
-- updates, or submit caution-deposit inspection reports.
--
-- has_role('partner') is true for an active account with an active network
-- membership. Each partner branch still requires can_manage_property() (active
-- property access), so this grants nothing on properties the member does not
-- manage, and admin-only transitions stay admin-only.
--
--   transition_booking         A member acts as the property partner, except on a
--                               booking where they are the guest: there they keep
--                               the guest path (cancel their own open request).
--                               The timeline labels them "(partner)".
--   transition_booking_issue   Members who manage the property may record
--                               investigation updates or escalate, like partners.
--   transition_caution_deposit Members who manage the property may submit
--                               inspection reports or flag disputes, like partners;
--                               admins keep the admin path.
--
-- In-place patches keep every other line of the live definitions (which differ
-- between environments only in stripped comments), are no-ops once applied, and
-- fail instead of skipping if the expected text is not found.

do $migration$
declare
  definition text;
  patched text;
  function_name text;
begin
  -- ── transition_booking ──────────────────────────────────────────────────────
  definition := pg_get_functiondef('public.transition_booking(text,text,text)'::regprocedure);
  if position('public.has_role(''partner'')' in definition) = 0 then
    function_name := 'transition_booking()';
    patched := definition;

    if (length(patched) - length(replace(patched, 'if actor_role = ''guest'' then', ''))) / length('if actor_role = ''guest'' then') <> 1 then
      raise exception '%: guest branch not recognised; patch it manually.', function_name;
    end if;
    patched := replace(
      patched,
      'if actor_role = ''guest'' then',
      'if actor_role = ''guest'' and (booking_row.guest_id = actor_id or not public.has_role(''partner'')) then'
    );

    if (length(patched) - length(replace(patched, 'elsif actor_role in (''partner'', ''admin'') then', ''))) / length('elsif actor_role in (''partner'', ''admin'') then') <> 1 then
      raise exception '%: partner branch not recognised; patch it manually.', function_name;
    end if;
    patched := replace(
      patched,
      'elsif actor_role in (''partner'', ''admin'') then',
      'elsif actor_role in (''partner'', ''admin'') or public.has_role(''partner'') then'
    );

    if (length(patched) - length(replace(patched, '|| '' ('' || actor_role || '')'';', ''))) / length('|| '' ('' || actor_role || '')'';') <> 1 then
      raise exception '%: operator label not recognised; patch it manually.', function_name;
    end if;
    patched := replace(
      patched,
      '|| '' ('' || actor_role || '')'';',
      '|| '' ('' || case when actor_role = ''guest'' and booking_row.guest_id <> actor_id and public.has_role(''partner'') then ''partner'' else actor_role end || '')'';'
    );

    execute patched;
  end if;

  -- ── transition_booking_issue ────────────────────────────────────────────────
  definition := pg_get_functiondef('public.transition_booking_issue(uuid,text,text,uuid,text,text)'::regprocedure);
  if position('public.has_role(''partner'')' in definition) = 0 then
    if (length(definition) - length(replace(definition, 'elsif actor_role = ''partner'' and public.can_manage_property(booking_property_id) then', '')))
         / length('elsif actor_role = ''partner'' and public.can_manage_property(booking_property_id) then') <> 1 then
      raise exception 'transition_booking_issue(): partner branch not recognised; patch it manually.';
    end if;
    execute replace(
      definition,
      'elsif actor_role = ''partner'' and public.can_manage_property(booking_property_id) then',
      'elsif (actor_role = ''partner'' or public.has_role(''partner'')) and public.can_manage_property(booking_property_id) then'
    );
  end if;

  -- ── transition_caution_deposit ──────────────────────────────────────────────
  definition := pg_get_functiondef('public.transition_caution_deposit(text,text,integer,integer,text,text,text,jsonb)'::regprocedure);
  if position('public.has_role(''partner'')' in definition) = 0 then
    if (length(definition) - length(replace(definition, 'if actor_role = ''partner'' then', ''))) / length('if actor_role = ''partner'' then') <> 1 then
      raise exception 'transition_caution_deposit(): partner branch not recognised; patch it manually.';
    end if;
    execute replace(
      definition,
      'if actor_role = ''partner'' then',
      'if actor_role = ''partner'' or (actor_role <> ''admin'' and public.has_role(''partner'')) then'
    );
  end if;
end;
$migration$;

notify pgrst, 'reload schema';
