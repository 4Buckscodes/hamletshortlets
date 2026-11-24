import { matchesLagosAreaFilter } from './areas';

export interface LagosAreaGuide {
  slug: string;
  name: string;
  side: 'Island' | 'Mainland';
  /** Area names a listing's `area` field is matched against (see matchesLagosAreaFilter). */
  filterAreas: readonly string[];
  subareas: string;
  summary: string;
  /** Slugs of neighbouring guides to link to. */
  nearby: readonly string[];
  /** Pre-filled area for the main stays search. */
  searchArea: string;
}

/** One landing page per Lagos area guide. Copy is the same as the /lagos guide cards; nothing is invented. */
export const LAGOS_AREA_GUIDES: readonly LagosAreaGuide[] = [
  { slug: 'victoria-island', name: 'Victoria Island', side: 'Island', filterAreas: ['Victoria Island'], subareas: 'Adeola Odeku · Ahmadu Bello · Saka Tinubu', summary: 'Business districts, conferences, embassies, and city dining.', nearby: ['ikoyi', 'lekki'], searchArea: 'Victoria Island' },
  { slug: 'ikoyi', name: 'Ikoyi & Banana Island', side: 'Island', filterAreas: ['Ikoyi', 'Banana Island'], subareas: 'Old Ikoyi · Awolowo Road · Banana Island', summary: 'Quiet residential apartments and penthouses with controlled estate access.', nearby: ['victoria-island', 'lekki'], searchArea: 'Ikoyi' },
  { slug: 'lekki', name: 'Lekki Phase 1 & Oniru', side: 'Island', filterAreas: ['Lekki Phase 1', 'Oniru', 'Ikate'], subareas: 'Admiralty Way · Freedom Way · Oniru · Ikate', summary: 'Serviced apartments near dining, retail, and waterfront venues.', nearby: ['victoria-island', 'ajah'], searchArea: 'Lekki Phase 1' },
  { slug: 'ajah', name: 'Ajah', side: 'Island', filterAreas: ['Ajah'], subareas: 'Chevron · Orchid Road · Sangotedo', summary: 'Spacious duplexes and apartments suited for family and extended stays.', nearby: ['lekki'], searchArea: 'Ajah' },
  { slug: 'yaba', name: 'Yaba & Environs', side: 'Mainland', filterAreas: ['Yaba'], subareas: 'Sabo · Alagomeji · Akoka · Ebute Metta', summary: 'Tech hubs, campuses, and fast Third Mainland Bridge access to Lagos Island.', nearby: ['surulere', 'shomolu'], searchArea: 'Yaba' },
  { slug: 'surulere', name: 'Surulere & Environs', side: 'Mainland', filterAreas: ['Surulere'], subareas: 'Bode Thomas · Adeniran Ogunsanya · Eric Moore', summary: 'Tree-lined avenues, creative studios, and central Mainland–Island links.', nearby: ['yaba', 'shomolu'], searchArea: 'Surulere' },
  { slug: 'shomolu', name: 'Shomolu & Environs', side: 'Mainland', filterAreas: ['Shomolu', 'Gbagada', 'Ilupeju'], subareas: 'Palmgrove · Onipanu · Gbagada · Ilupeju', summary: 'Central Ikorodu Road and Gbagada expressway access across Lagos.', nearby: ['yaba', 'ikeja'], searchArea: 'Shomolu' },
  { slug: 'ikeja', name: 'Ikeja & Northern Mainland', side: 'Mainland', filterAreas: ['Ikeja GRA', 'Maryland', 'Ogudu', 'Magodo'], subareas: 'Ikeja GRA · Maryland · Ogudu · Magodo', summary: 'Convenient to Murtala Muhammed Airport, corporate offices, and gated GRAs.', nearby: ['shomolu', 'yaba'], searchArea: 'Ikeja GRA' },
];

export function getLagosAreaGuide(slug: string): LagosAreaGuide | undefined {
  return LAGOS_AREA_GUIDES.find(guide => guide.slug === slug);
}

/** True when a listing belongs to this guide's area. Listings without reliable location data never match. */
export function stayMatchesAreaGuide(
  stay: { area?: string | null; public_address?: string | null; title?: string | null },
  guide: LagosAreaGuide,
): boolean {
  return guide.filterAreas.some(area =>
    matchesLagosAreaFilter({ area: stay.area, address: stay.public_address, title: stay.title }, area),
  );
}
