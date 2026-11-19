-- Partner applications accept referral codes owned by active network members.
--
-- 20261118223030_restore_partner_network_referral_codes.sql made network members
-- (profiles.role stays 'guest', entitlement = active partner_network_memberships
-- row) first-class referrers for signup, OAuth and join_partner_network. Its
-- in-place patch of validate_partner_application_referral() only matched the
-- aliased `and p.role in ('partner', 'admin')` form from 20261030120000. Databases
-- still running the 20261024100000 version of the trigger function filter the
-- referrer with an unaliased `and role in ('partner', 'admin')`, so it was left
-- unchanged and partner applications kept rejecting member-owned codes with
-- "Referral code … is not a valid active HAMLET partner code."
--
-- This migration patches that unaliased form in place, keeping every other check
-- (self-referral by id/email/phone, existing direct referrer, attribution sync)
-- exactly as deployed. It is a no-op where the function is already member-aware,
-- and it fails instead of silently skipping if neither form is recognised.

do $migration$
declare
  target constant regprocedure := 'public.validate_partner_application_referral()'::regprocedure;
  function_definition text;
  updated_definition text;
begin
  function_definition := pg_get_functiondef(target);

  if position('partner_network_memberships' in function_definition) > 0 then
    return; -- already accepts network-member referrers
  end if;

  updated_definition := replace(
    function_definition,
    'and role in (''partner'', ''admin'')',
    'and (
        role in (''partner'', ''admin'')
        or exists (
          select 1 from public.partner_network_memberships m
          where m.user_id = profiles.id and m.status = ''active''
        )
      )'
  );

  if updated_definition = function_definition then
    raise exception 'validate_partner_application_referral(): referrer role filter not recognised; patch it manually to accept active partner_network_memberships.';
  end if;

  execute updated_definition;
end;
$migration$;
