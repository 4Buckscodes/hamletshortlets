import { describe, expect, it } from 'vitest';
import {
  carryOverOwnerDetails,
  similarUnitStarter,
  type PropertyWizardValues,
} from './PropertyListingWizard';

const submitted: PropertyWizardValues = {
  title: 'Modern 2-Bedroom Apartment in Yaba',
  propertyType: 'Apartment',
  area: 'Yaba',
  address: '12 Herbert Macaulay Way, Yaba',
  bedrooms: 2,
  bathrooms: 2,
  capacity: 4,
  bedSetup: '1 king · 2 twin',
  imageUrls: ['https://cdn.example/a.webp', 'https://cdn.example/b.webp'],
  youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
  amenities: ['Wifi', 'Kitchen'],
  houseRulesText: 'No parties',
  nightlyRate: 150000,
  cleaningFee: 20000,
  deposit: 100000,
  firstAvailableDate: '2026-12-01',
  calendarResponsiblePerson: 'Ada',
  submittedRole: 'Property owner',
  authorityBasis: 'Registered owner, title deed on file',
  correctionNote: 'fix photos',
};

describe('batch listing carry-over', () => {
  it('carries only owner-level details into a blank next listing', () => {
    expect(carryOverOwnerDetails(submitted)).toEqual({
      submittedRole: 'Property owner',
      authorityBasis: 'Registered owner, title deed on file',
      calendarResponsiblePerson: 'Ada',
    });
  });

  it('copies unit specs for a similar unit but never identity, media or availability', () => {
    const starter = similarUnitStarter(submitted);
    expect(starter.area).toBe('Yaba');
    expect(starter.nightlyRate).toBe(150000);
    expect(starter.amenities).toEqual(['Wifi', 'Kitchen']);
    expect(starter.amenities).not.toBe(submitted.amenities);
    for (const key of ['title', 'address', 'imageUrls', 'youtubeUrl', 'firstAvailableDate', 'correctionNote'] as const) {
      expect(starter).not.toHaveProperty(key);
    }
  });
});
