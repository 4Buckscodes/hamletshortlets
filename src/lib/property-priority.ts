import type { PublicStayRecord } from './next-supabase';

/**
 * Keep the public catalogue in its existing newest-first order, while surfacing
 * Ikate inventory first. Stable sorting preserves the relative order of all
 * other approved properties.
 */
export function prioritiseIkateProperties<T extends Pick<PublicStayRecord, 'area' | 'public_address'>>(
  properties: T[],
): T[] {
  return [...properties].sort((a, b) => {
    const isIkate = (property: T) =>
      /\bikate\b/i.test([property.area, property.public_address].filter(Boolean).join(' '));
    return Number(isIkate(b)) - Number(isIkate(a));
  });
}
