/**
 * Public stay addresses. A stay has one canonical readable address, /stays/{slug}; the older
 * /stays/{id} address keeps working and redirects there with its query string intact, so shared
 * referral links (?ref=…) and prefilled dates survive.
 */
const STAY_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

/** True for a slug or an id. Rejects anything that could change a database filter (commas, dots, brackets). */
export function isValidStayRef(ref: string): boolean {
  return STAY_REF_PATTERN.test(ref);
}

/** Canonical path for a stay. Falls back to the id for records that carry no slug. */
export function stayPath(stay: { id: string; slug?: string | null }): string {
  return `/stays/${encodeURIComponent((stay.slug || '').trim() || stay.id)}`;
}

export type StaySearchParams = Record<string, string | string[] | undefined>;

/** Redirect target for a non-canonical stay address, keeping every query parameter. */
export function buildStayRedirectPath(slug: string, searchParams?: StaySearchParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (Array.isArray(value)) value.forEach(item => query.append(key, item));
    else if (typeof value === 'string') query.append(key, value);
  }
  const qs = query.toString();
  return `/stays/${encodeURIComponent(slug)}${qs ? `?${qs}` : ''}`;
}
