-- Showcase inventory is visible in the marketplace but cannot be booked.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS preview_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preview_activation_date date;

COMMENT ON COLUMN public.properties.preview_only IS
  'When true, listing is a public showcase preview and must never accept booking requests.';
COMMENT ON COLUMN public.properties.preview_activation_date IS
  'Internal target date for review/activation; never presented as confirmed availability.';

CREATE INDEX IF NOT EXISTS properties_public_preview_idx
  ON public.properties (status, preview_only, created_at DESC);
