/**
 * Builds stable, readable public property URLs.
 *
 * The short ID suffix prevents collisions between properties with identical titles
 * in the same neighbourhood while keeping the UUID out of the visible URL.
 */
export function buildPropertySlug(input: {
  id: string;
  title: string | null | undefined;
  area?: string | null;
}): string {
  const base = [input.title, input.area]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
    .replace(/-+$/g, '');

  const shortId = input.id.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(-8);
  return [base || 'lagos-shortlet', shortId].filter(Boolean).join('-');
}

export function buildPropertyPath(input: {
  id: string;
  title: string | null | undefined;
  area?: string | null;
}): string {
  return `/stays/${encodeURIComponent(buildPropertySlug(input))}`;
}
