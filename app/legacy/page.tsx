'use client';

import dynamic from 'next/dynamic';

const LegacyHamletApp = dynamic(() => import('@/App'), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen flex items-center justify-center bg-[#f8f5ef] text-[#10203d]">
      <p className="text-sm font-medium">Loading the full HAMLET experience…</p>
    </main>
  ),
});

export default function LegacyCompatibilityPage() {
  return <LegacyHamletApp />;
}
