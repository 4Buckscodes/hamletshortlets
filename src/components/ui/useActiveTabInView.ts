'use client';

import { useEffect, useRef } from 'react';

/**
 * On phones, workspace tabs are a horizontal swipe row; this keeps the current tab
 * (aria-current="page") visible by scrolling the row itself — never the page.
 */
export function useActiveTabInView<T extends HTMLElement>(key: string) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const row = ref.current;
    const active = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !active || row.scrollWidth <= row.clientWidth) return;
    const target = active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2;
    row.scrollLeft = Math.max(0, target);
  }, [key]);
  return ref;
}
