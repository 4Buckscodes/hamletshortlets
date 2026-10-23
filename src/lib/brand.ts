import { useEffect } from 'react';

export const HAMLET_TAGLINE = 'Your stay, sorted.';
export const HAMLET_PROMISE = 'A better way to find, book, and enjoy shortlets in Lagos.';

/** Updates the browser document title and meta description for distinct, indexable views. */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    if (!description) return;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);
  }, [title, description]);
}
