import { describe, expect, it } from 'vitest';
import {
  buildStayingApiSearchUrl,
  filterExternalStays,
  normaliseExternalStays,
} from './stayingapi';

const fixture = {
  data: [
    {
      id: 'stays_airbnb_123',
      platform: 'airbnb',
      platformListingId: '123',
      url: 'https://www.airbnb.com/rooms/123',
      name: 'Lekki Test Apartment',
      propertyType: 'apartment',
      location: { city: 'Lekki', region: 'Lagos', country: 'NG' },
      guestRating: 4.8,
      ratingScale: 5,
      reviewCount: 12,
      maxOccupancy: 4,
      bedrooms: 2,
      bathrooms: 2,
      amenities: ['wifi', 'pool'],
      images: ['https://images.example.com/1.jpg'],
      price: { currency: 'NGN', nightlyPrice: 150000, totalPrice: 450000 },
    },
    {
      id: 'stays_booking_456',
      platform: 'booking',
      url: 'https://www.booking.com/hotel/ng/test.html',
      name: 'Abuja Test Hotel',
      propertyType: 'hotel',
      location: { city: 'Abuja', country: 'NG' },
      maxOccupancy: 2,
      bedrooms: 1,
      price: { currency: 'NGN', nightlyPrice: 90000 },
    },
    {
      id: 'invalid',
      platform: 'unknown',
      url: 'javascript:alert(1)',
      name: 'Unsafe',
    },
  ],
  meta: { creditsCharged: 0, cached: true },
};

describe('StayingAPI external inventory adapter', () => {
  it('builds a bounded NGN search for Airbnb and Booking.com', () => {
    const url = new URL(buildStayingApiSearchUrl({
      location: 'Lekki Phase 1, Lagos, Nigeria',
      checkIn: '2026-12-10',
      checkOut: '2026-12-12',
      guests: 4,
      limit: 50,
    }));
    expect(url.pathname).toBe('/v1/search');
    expect(url.searchParams.get('location')).toBe('Lekki Phase 1, Lagos, Nigeria');
    expect(url.searchParams.get('platforms')).toBe('airbnb,booking');
    expect(url.searchParams.get('currency')).toBe('NGN');
    expect(url.searchParams.get('limit')).toBe('40');
    expect(url.searchParams.get('adults')).toBe('4');
  });

  it('normalises valid source-linked results and rejects unsafe or malformed records', () => {
    const stays = normaliseExternalStays(fixture);
    expect(stays).toHaveLength(2);
    expect(stays[0]).toMatchObject({
      source: 'stayingapi',
      platform: 'airbnb',
      title: 'Lekki Test Apartment',
      nightlyPrice: 150000,
      currency: 'NGN',
    });
    expect(stays[0].images).toEqual(['https://images.example.com/1.jpg']);
  });

  it('applies the existing guest filter dimensions without claiming external verification', () => {
    const stays = normaliseExternalStays(fixture);
    expect(filterExternalStays(stays, {
      area: 'Lekki Phase 1, Lagos, Nigeria',
      bedrooms: 2,
      guests: 3,
      minPrice: 100000,
      maxPrice: 200000,
    }).map(stay => stay.id)).toEqual(['stays_airbnb_123']);
  });

  it('does not compare non-NGN prices against HAMLET Naira filters', () => {
    const stays = normaliseExternalStays({
      data: [{ ...fixture.data[0], price: { currency: 'USD', nightlyPrice: 100 } }],
    });
    expect(filterExternalStays(stays, { minPrice: 50000 })).toHaveLength(0);
  });
});
