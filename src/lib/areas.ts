import type { Property } from './types';

export const ISLAND_AND_LEKKI_AREAS = [
  'Victoria Island',
  'Ikoyi',
  'Lekki Phase 1',
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
  lekki: ['lekki', 'lekki phase 1'],
  ikeja: ['ikeja', 'ikeja gra', 'opebi', 'allen', 'adeniyi jones'],
};

export function isMainlandArea(area: string): boolean {
  const areaNorm = area.trim().toLowerCase();
  if (!areaNorm) return false;
  if (MAINLAND_AREAS.some(a => a.toLowerCase() === areaNorm)) {
    return true;
  }
  return MAINLAND_ENVIRONS_KEYWORDS.some(keyword => areaNorm.includes(keyword));
}

export function isMainlandProperty(property: Pick<Property, 'area' | 'address' | 'title'>): boolean {
  const areaNorm = property.area.trim().toLowerCase();
  if (MAINLAND_AREAS.some(a => a.toLowerCase() === areaNorm)) {
    return true;
  }
  const haystack = `${property.area} ${property.address} ${property.title}`.toLowerCase();
  return MAINLAND_ENVIRONS_KEYWORDS.some(keyword => haystack.includes(keyword));
}

export function matchesLagosAreaFilter(
  property: Pick<Property, 'area' | 'address' | 'title'>,
  selectedArea: string,
): boolean {
  const normalized = selectedArea.trim().toLowerCase();
  if (!normalized || normalized === 'all' || normalized === 'all lagos') {
    return true;
  }

  if (normalized === 'lagos mainland' || normalized === 'mainland') {
    return isMainlandProperty(property);
  }

  const areaLower = property.area.trim().toLowerCase();
  if (areaLower === normalized) {
    return true;
  }

  const haystack = `${property.area} ${property.address} ${property.title}`.toLowerCase();
  const synonyms = AREA_SYNONYMS[normalized];
  if (synonyms) {
    return synonyms.some(term => haystack.includes(term));
  }

  return haystack.includes(normalized);
}
