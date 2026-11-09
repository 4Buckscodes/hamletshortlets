export const ISLAND_AND_LEKKI_AREAS = [
  'Victoria Island',
  'Ikoyi',
  'Lekki Phase 1',
  'Ikate',
  'Oniru',
  'Banana Island',
  'Ajah',
] as const;

export const MAINLAND_AREAS = [
  'Lagos Mainland',
  'Yaba',
  'Shomolu',
  'Surulere',
  'Ikeja GRA',
  'Gbagada',
  'Maryland',
  'Ilupeju',
  'Ebute Metta',
  'Ogudu',
  'Magodo',
] as const;

export const LAGOS_AREAS = [
  ...ISLAND_AND_LEKKI_AREAS,
  ...MAINLAND_AREAS,
] as const;

/** Sub-neighbourhoods and corridors across Lagos Mainland (Yaba, Shomolu, Surulere & environs). */
export const MAINLAND_ENVIRONS_KEYWORDS = [
  'lagos mainland',
  'mainland',
  'yaba',
  'sabo',
  'akoka',
  'alagomeji',
  'abule ijesha',
  'tejuosho',
  'jibowu',
  'shomolu',
  'somolu',
  'onipanu',
  'palmgrove',
  'palm grove',
  'pedro',
  'fadeyi',
  'bariga',
  'surulere',
  'bode thomas',
  'adeniran ogunsanya',
  'aguda',
  'eric moore',
  'kilo',
  'ojuelegba',
  'iponri',
  'ebute metta',
  'costain',
  'gbagada',
  'ifako',
  'medina',
  'maryland',
  'anthony',
  'mende',
  'ilupeju',
  'ogudu',
  'magodo',
  'ojota',
  'ikeja',
  'opebi',
  'allen',
  'adeniyi jones',
] as const;

const AREA_SYNONYMS: Record<string, readonly string[]> = {
  shomolu: ['shomolu', 'somolu', 'onipanu', 'palmgrove', 'palm grove', 'pedro', 'fadeyi', 'bariga'],
  somolu: ['shomolu', 'somolu', 'onipanu', 'palmgrove', 'palm grove', 'pedro', 'fadeyi', 'bariga'],
  yaba: ['yaba', 'sabo', 'akoka', 'alagomeji', 'abule ijesha', 'tejuosho', 'jibowu'],
  surulere: ['surulere', 'bode thomas', 'adeniran ogunsanya', 'aguda', 'eric moore', 'kilo', 'iponri'],
  gbagada: ['gbagada', 'ifako', 'medina'],
  maryland: ['maryland', 'anthony', 'mende'],
  'lekki phase 1': ['lekki phase 1'],
  lekki: ['lekki phase 1', 'lekki'],
  ikate: ['ikate', 'ikate elegushi', 'kusenla'],
  'ikeja gra': ['ikeja gra'],
  ikeja: ['ikeja', 'ikeja gra', 'opebi', 'allen', 'adeniyi jones'],
  'victoria island': ['victoria island'],
  ikoyi: ['ikoyi', 'old ikoyi', 'falomo'],
  ajah: ['ajah', 'sangotedo', 'chevron'],
};

export interface LagosLocationFields {
  area?: string | null;
  address?: string | null;
  title?: string | null;
}

export function hasReliableLocationData(property: LagosLocationFields): boolean {
  return Boolean((property.area || '').trim() || (property.address || '').trim());
}

export function isMainlandArea(area: string | null | undefined): boolean {
  const areaNorm = (area || '').trim().toLowerCase();
  if (!areaNorm) return false;
  if (MAINLAND_AREAS.some(a => a.toLowerCase() === areaNorm)) {
    return true;
  }
  return MAINLAND_ENVIRONS_KEYWORDS.some(keyword => areaNorm.includes(keyword));
}

export function isMainlandProperty(property: LagosLocationFields): boolean {
  if (!hasReliableLocationData(property)) return false;
  const areaStr = (property.area || '').trim();
  const addressStr = (property.address || '').trim();
  const areaNorm = areaStr.toLowerCase();
  if (MAINLAND_AREAS.some(a => a.toLowerCase() === areaNorm)) {
    return true;
  }
  const locationHaystack = `${areaStr} ${addressStr}`.toLowerCase();
  return MAINLAND_ENVIRONS_KEYWORDS.some(keyword => locationHaystack.includes(keyword));
}

export function matchesLagosAreaFilter(
  property: LagosLocationFields,
  selectedArea: string,
): boolean {
  const normalized = selectedArea.trim().toLowerCase();
  if (!normalized || normalized === 'all' || normalized === 'all lagos') {
    return true;
  }

  // Never silently classify a property without reliable location fields into a neighbourhood.
  if (!hasReliableLocationData(property)) {
    return false;
  }

  if (normalized === 'lagos mainland' || normalized === 'mainland') {
    return isMainlandProperty(property);
  }

  const areaStr = (property.area || '').trim();
  const addressStr = (property.address || '').trim();
  const areaLower = areaStr.toLowerCase();
  if (areaLower === normalized) {
    return true;
  }

  // When a specific area field is already recorded and contradicts the requested neighbourhood,
  // only match sub-area address synonyms when the area is an umbrella/parent corridor.
  const locationHaystack = `${areaStr} ${addressStr}`.toLowerCase();
  const synonyms = AREA_SYNONYMS[normalized];
  if (synonyms) {
    if (
      areaLower &&
      areaLower !== 'lagos' &&
      areaLower !== 'lagos mainland' &&
      areaLower !== 'lagos island' &&
      !synonyms.some(term => areaLower.includes(term))
    ) {
      // Allow known parent-suburb pairs (e.g. Ikate inside Lekki address, Sabo inside Yaba)
      return (
        synonyms.some(term => addressStr.toLowerCase().includes(term)) &&
        (areaLower === 'lekki' || areaLower === 'ikeja' || areaLower === normalized)
      );
    }
    return synonyms.some(term => locationHaystack.includes(term));
  }

  return locationHaystack.includes(normalized);
}

/**
 * Detects when a partner-supplied street/public address names a distinct Lagos neighbourhood
 * that contradicts the listing's canonical `area` (for example `public_address: "Lekki-ikate"`
 * on a listing recorded under `area: "Victoria Island"`), so structured data can omit
 * contradictory streetAddress values instead of publishing conflicting location signals.
 */
export function hasContradictoryLagosStreetAddress(
  area: string | null | undefined,
  streetAddress: string | null | undefined,
): boolean {
  const cleanArea = (area || '').trim();
  const cleanStreet = (streetAddress || '').trim();
  if (!cleanArea || !cleanStreet) return false;

  const areaLower = cleanArea.toLowerCase();
  const streetLower = cleanStreet.toLowerCase();
  if (areaLower === streetLower || streetLower.includes(areaLower)) {
    return false;
  }

  // Umbrella corridors may legitimately contain specific sub-areas in streetAddress.
  if (areaLower === 'lagos' || areaLower === 'lagos mainland' || areaLower === 'lagos island') {
    return false;
  }

  const ownSynonyms = AREA_SYNONYMS[areaLower] ?? [areaLower];
  if (ownSynonyms.some(term => streetLower.includes(term))) {
    return false;
  }

  for (const candidateArea of LAGOS_AREAS) {
    const candidateLower = candidateArea.toLowerCase();
    if (
      candidateLower === areaLower ||
      candidateLower === 'lagos mainland'
    ) {
      continue;
    }
    const candidateTerms = AREA_SYNONYMS[candidateLower] ?? [candidateLower];
    const mentionsOtherCorridor = candidateTerms.some(term => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(cleanStreet);
    });
    if (mentionsOtherCorridor) {
      return true;
    }
  }

  return false;
}
