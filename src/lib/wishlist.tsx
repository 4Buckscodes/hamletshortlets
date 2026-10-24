/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

const WISHLIST_STORAGE_KEY = 'hamlet_saved_stays_v1';

function readStoredWishlist(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

function writeStoredWishlist(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage quota errors in restricted browsing modes.
  }
}

export interface WishlistContextValue {
  savedIds: string[];
  isSaved: (propertyId: string) => boolean;
  toggleSaved: (propertyId: string) => boolean;
  clearSaved: () => void;
}

const WishlistContext = createContext<WishlistContextValue>({
  savedIds: [],
  isSaved: () => false,
  toggleSaved: () => false,
  clearSaved: () => {},
});

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [savedIds, setSavedIds] = useState<string[]>(() => readStoredWishlist());

  const isSaved = useCallback(
    (propertyId: string) => savedIds.includes(propertyId),
    [savedIds],
  );

  const toggleSaved = useCallback((propertyId: string): boolean => {
    let added = false;
    setSavedIds(prev => {
      const exists = prev.includes(propertyId);
      added = !exists;
      const next = exists ? prev.filter(id => id !== propertyId) : [propertyId, ...prev];
      writeStoredWishlist(next);
      return next;
    });
    return added;
  }, []);

  const clearSaved = useCallback(() => {
    setSavedIds([]);
    writeStoredWishlist([]);
  }, []);

  const value = useMemo<WishlistContextValue>(
    () => ({ savedIds, isSaved, toggleSaved, clearSaved }),
    [savedIds, isSaved, toggleSaved, clearSaved],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  return useContext(WishlistContext);
}
