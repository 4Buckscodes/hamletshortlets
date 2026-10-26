'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useNextHoratio } from '@/components/site/SiteShell';

export type FaqCategory = 'all' | 'trust' | 'pricing' | 'stay';

export interface FaqEntry {
  q: string;
  a: string;
  category: Exclude<FaqCategory, 'all'>;
}

export function FaqExplorer({ items }: { items: readonly FaqEntry[] }) {
  const { openHoratio } = useNextHoratio();
  const [category, setCategory] = useState<FaqCategory>('all');
  const [openQuestion, setOpenQuestion] = useState<string | null>(items[0]?.q ?? null);

  const visibleItems =
    category === 'all' ? items : items.filter(item => item.category === category);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: 'all', label: `All (${items.length})` },
              { id: 'trust', label: 'Trust & safety' },
              { id: 'pricing', label: 'Pricing' },
              { id: 'stay', label: 'Check-in & amenities' },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id)}
              className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                category === tab.id
                  ? 'bg-ink-900 text-white'
                  : 'border border-ink-200 bg-white text-ink-600 hover:border-ink-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {visibleItems.map(item => {
          const isOpen = openQuestion === item.q;
          const numMatch = item.q.match(/^(\d+)\.\s*(.*)$/);
          const numLabel = numMatch ? numMatch[1]!.padStart(2, '0') : '';
          const cleanTitle = numMatch ? numMatch[2]! : item.q;

          return (
            <div
              key={item.q}
              className={`overflow-hidden rounded-2xl border bg-white transition ${
                isOpen ? 'border-ink-300 shadow-xs' : 'border-ink-100'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenQuestion(isOpen ? null : item.q)}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-paper/50"
              >
                <div className="flex items-baseline gap-3">
                  {numLabel && (
                    <span className="font-mono text-xs font-extrabold tracking-widest text-brass-600">
                      {numLabel}
                    </span>
                  )}
                  <span className="font-display text-base font-bold text-ink-900 sm:text-[17px]">
                    {cleanTitle}
                  </span>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-[17px] w-[17px] shrink-0 text-ink-900" />
                ) : (
                  <ChevronDown className="h-[17px] w-[17px] shrink-0 text-ink-400" />
                )}
              </button>
              {isOpen && (
                <div className="border-t border-ink-100 px-5 py-4 text-sm leading-relaxed text-ink-600 sm:pl-12">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-3xl border border-ink-200 bg-white p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-900">
            Need something else?
          </h2>
          <p className="mt-0.5 text-xs text-ink-500">
            Ask Horatio about neighbourhoods, pricing, or booking holds anytime.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => openHoratio()}
            className="btn-outline min-h-11 !rounded-full"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-brass-600" /> Ask Horatio
          </button>
          <Link href="/stays" className="btn-jade min-h-11 !rounded-full">
            Explore stays <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  );
}
