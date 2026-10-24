import { useEffect } from 'react';
import { applyDocumentSeo, type PageMetaOptions } from './seo';

export const HAMLET_TAGLINE = 'Your stay, sorted.';
export const HAMLET_PROMISE = 'A better way to find, book, and enjoy shortlets in Lagos.';
export const HAMLET_BRAND_NAME = 'HAMLET for Your Shortlets';
export const HAMLET_USP = 'Shortlets, with accountability.';
export const HAMLET_PARENT_COMPANY = 'Abundance Abodes';
export const HAMLET_POSITIONING = 'The Operating System for African Shortlets';
export const HAMLET_MANTRA = 'Make it easy. Make it trustworthy. Make it accountable.';

/**
 * Updates browser document title, description, canonical link, robots directives,
 * Open Graph / Twitter Card metadata, and optional Schema.org JSON-LD for each view.
 */
export function usePageMeta(
  title: string,
  description?: string,
  options?: PageMetaOptions,
) {
  const canonicalPath = options?.canonicalPath;
  const noindex = options?.noindex;
  const ogImage = options?.ogImage;
  const ogImageAlt = options?.ogImageAlt;
  const ogType = options?.ogType;
  const structuredData = options?.structuredData;
  const serializedSchema = structuredData ? JSON.stringify(structuredData) : '';

  useEffect(() => {
    const parsedSchema = serializedSchema
      ? (JSON.parse(serializedSchema) as Record<string, unknown>)
      : structuredData === null
        ? null
        : undefined;
    return applyDocumentSeo(title, description, {
      canonicalPath,
      noindex,
      ogImage,
      ogImageAlt,
      ogType,
      structuredData: parsedSchema,
    });
  }, [
    title,
    description,
    canonicalPath,
    noindex,
    ogImage,
    ogImageAlt,
    ogType,
    serializedSchema,
    structuredData,
  ]);
}
