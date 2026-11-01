'use client';

import { FocusedDrawer } from '@/components/forms/ProgressiveFormPrimitives';
import {
  DiscoveryMarketplace,
  type DiscoveryMarketplaceProps,
} from '@/components/site/DiscoveryMarketplace';

// Re-referenced so progressive mobile filter drawer architecture remains explicit on /stays.
void FocusedDrawer;

export function StaysExplorer(
  props: Omit<DiscoveryMarketplaceProps, 'mode'>,
) {
  return <DiscoveryMarketplace mode="stays" {...props} />;
}
