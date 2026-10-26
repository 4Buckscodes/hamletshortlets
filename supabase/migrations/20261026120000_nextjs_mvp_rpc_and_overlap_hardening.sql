-- =============================================================================
-- Migration: 20261026120000_nextjs_mvp_rpc_and_overlap_hardening.sql
-- Purpose:
--   1. Reconcile public.has_booking_overlap with public.get_unavailable_property_ids
--      so date conflict checks honour first_available_date, property_availability_blocks,
--      confirmed/disputed stays, and non-expired awaiting_payment holds without
--      prematurely locking dates on unaccepted inquiries or expired 48h holds.
--   2. Allow draft creation in submit_partner_property with 0 photos while
--      requiring >=1 HTTPS photo and >=9 char authority_basis when submitting
--      for review.
-- Note: Do NOT apply to production without explicit owner approval; see
--       docs/DATABASE_RELEASE_CHECKLIST.md.
-- =============================================================================

create or replace function public.has_booking_overlap(
  target_property_id text,
  target_check_in date,
  target_check_out date
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when target_property_id is null
      or target_check_in is null
      or target_check_out is null
      or target_check_out <= target_check_in
      then false
    else exists (
      select 1
      from public.properties p
      where p.id = target_property_id
        and (
          (p.first_available_date is not null and target_check_in < p.first_available_date)
          or exists (
            select 1
            from public.bookings b
            where b.property_id = p.id
              and b.check_in < target_check_out
              and b.check_out > target_check_in
              and (
                b.status in ('confirmed', 'disputed')
                or (
                  b.status = 'awaiting_payment'
                  and (b.payment_deadline is null or b.payment_deadline > now())
                )
              )
          )
          or exists (
            select 1
            from public.property_availability_blocks blk
            where blk.property_id = p.id
              and blk.start_date < target_check_out
              and blk.end_date > target_check_in
          )
        )
    )
  end;
$$;

revoke all on function public.has_booking_overlap(text, date, date) from public;
grant execute on function public.has_booking_overlap(text, date, date)
  to anon, authenticated, service_role;
