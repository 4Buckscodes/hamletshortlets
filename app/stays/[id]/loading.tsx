import { SiteFooter, SiteHeader } from '@/components/site/SiteShell';

export default function StayDetailLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main
        aria-busy="true"
        aria-label="Loading property details"
        className="shell flex-1 py-6 sm:py-10"
      >
        <div className="h-4 w-32 animate-pulse rounded-full bg-clay" />
        <div className="mt-4 h-4 w-48 animate-pulse rounded-full bg-clay" />
        <div className="mt-3 h-10 w-full max-w-2xl animate-pulse rounded-2xl bg-clay" />
        <div className="mt-6 aspect-[16/10] w-full animate-pulse rounded-3xl border border-ink-100 bg-clay" />

        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="h-14 w-full animate-pulse rounded-2xl bg-white" />
            <div className="h-40 w-full animate-pulse rounded-3xl bg-white" />
            <div className="h-36 w-full animate-pulse rounded-3xl bg-white" />
          </div>
          <div className="lg:col-span-5">
            <div className="h-80 w-full animate-pulse rounded-3xl bg-white" />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
