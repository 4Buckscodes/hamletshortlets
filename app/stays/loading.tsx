import { SiteFooter, SiteHeader } from '@/components/site/SiteShell';

export default function StaysLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main
        aria-busy="true"
        aria-label="Loading Lagos stays"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10"
      >
        <div className="mb-8 space-y-3 border-b border-ink-200/80 pb-6">
          <div className="h-3 w-44 animate-pulse rounded-full bg-clay" />
          <div className="h-9 w-full max-w-xl animate-pulse rounded-2xl bg-clay" />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded-xl bg-clay/80" />
        </div>

        <div className="mb-8 flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="h-[76px] w-[204px] shrink-0 animate-pulse rounded-2xl border border-ink-100 bg-white"
            />
          ))}
        </div>

        <div className="mb-6 h-28 w-full animate-pulse rounded-3xl border border-ink-100 bg-white" />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-3xl border border-ink-100 bg-white"
            >
              <div className="aspect-[4/3] w-full animate-pulse bg-clay" />
              <div className="space-y-3 p-5">
                <div className="h-3 w-1/2 animate-pulse rounded-full bg-clay" />
                <div className="h-5 w-4/5 animate-pulse rounded-xl bg-clay" />
                <div className="h-4 w-2/3 animate-pulse rounded-xl bg-clay/80" />
                <div className="h-8 w-full animate-pulse rounded-xl bg-clay/60" />
              </div>
            </div>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
