'use client';

import { useId, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { LAGOS_AREAS } from '@/lib/areas';
import { cx } from './cx';

export interface SearchBarValues {
  area?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}

const GUEST_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20];

function formatShortDate(value?: string) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

/**
 * Stay search: one row above 1024px, two rows on tablets, and a single summary pill on phones
 * that expands into the full form. Submits GET /stays with the params the stays page reads.
 */
export function SearchBar({ action = '/stays', defaults = {}, submitLabel = 'Find my stay', className }: { action?: string; defaults?: SearchBarValues; submitLabel?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const dates = defaults.checkIn && defaults.checkOut ? `${formatShortDate(defaults.checkIn)} – ${formatShortDate(defaults.checkOut)}` : 'Add dates';
  const guests = defaults.guests ?? 2;

  return (
    <div className={cx('hm-search-wrap', className)} data-open={open ? 'true' : undefined}>
      <button type="button" className="hm-search-summary" aria-expanded={open} onClick={() => setOpen(true)}>
        <span className="hm-search-summary-text">
          <b>{defaults.area || 'Anywhere in Lagos'}</b>
          <span>
            {dates} · {guests} {guests === 1 ? 'guest' : 'guests'}
          </span>
        </span>
        <span className="hm-search-summary-icon" aria-hidden="true">
          <Search size={18} />
        </span>
      </button>
      <form className="hm-search" action={action} method="get" role="search">
        <label className="hm-search-field">
          <span>Destination</span>
          <input name="area" type="text" list={listId} defaultValue={defaults.area} placeholder="Lekki, Ikoyi, Yaba…" autoComplete="off" />
          <datalist id={listId}>
            {LAGOS_AREAS.map(area => (
              <option key={area} value={area} />
            ))}
          </datalist>
        </label>
        <label className="hm-search-field">
          <span>Check in</span>
          <input name="checkIn" type="date" defaultValue={defaults.checkIn} />
        </label>
        <label className="hm-search-field">
          <span>Check out</span>
          <input name="checkOut" type="date" defaultValue={defaults.checkOut} />
        </label>
        <label className="hm-search-field">
          <span>Guests</span>
          <select name="guests" defaultValue={String(guests)}>
            {GUEST_OPTIONS.map(count => (
              <option key={count} value={count}>
                {count} {count === 1 ? 'guest' : 'guests'}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="hm-btn hm-btn-primary">
          {submitLabel}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
