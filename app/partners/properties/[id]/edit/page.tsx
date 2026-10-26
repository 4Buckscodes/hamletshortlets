import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { PartnerNav } from '../../../partner-nav';
import PropertyEditPanel from './property-edit-panel';

export const metadata: Metadata = {
  title: 'Manage or Update Property Listing',
  robots: { index: false, follow: false },
};

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Partner Listing Management</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              Manage property listing
            </h1>
          </div>
          <PartnerNav current="overview" />
        </div>

        <div className="mt-8 max-w-3xl">
          <PropertyEditPanel propertyId={decodeURIComponent(id)} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
