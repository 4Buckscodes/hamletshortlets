import type { DBState } from './store';
import type { Property } from './types';

/** All property IDs the partner currently holds (via assignment or ownership record). */
export function propertyIdsOf(state: DBState, userId: string | undefined): string[] {
  if (!userId) return [];
  const viaAssignment = state.assignments
    .filter(a => a.partnerId === userId && a.status === 'active')
    .map(a => a.propertyId);
  const viaOwnership = state.properties.filter(p => p.ownerId === userId).map(p => p.id);
  return [...new Set([...viaAssignment, ...viaOwnership])];
}

export function myPartnerProperties(state: DBState, userId: string | undefined): Property[] {
  const ids = new Set(propertyIdsOf(state, userId));
  return state.properties.filter(p => ids.has(p.id));
}
