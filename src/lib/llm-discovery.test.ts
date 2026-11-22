import { describe, expect, it } from 'vitest';
import {
  renderLlmFull,
  renderLlmMain,
  renderLlmStays,
} from './llm-discovery';
import type { PublicStayRecord } from './next-supabase';

const sampleStay = (overrides: Partial<PublicStayRecord> = {}): PublicStayRecord => ({
  id: 'stay-123',
  title: 'A calm Ikoyi apartment',
  property_type: 'Apartment',
  area: 'Ikoyi',
  public_address: 'Ikoyi, Lagos',
  guest_nightly_ngn: 240000,
  cleaning_fee: null,
  mandatory_charges: [],
  refundable_deposit: null,
  bedrooms: 2,
  bathrooms: 2,
  capacity: 4,
  bed_setup: 'One king bed',
  amenities: ['Wi-Fi', 'Inverter backup'],
  image_urls: ['https://images.example/stay.jpg'],
  house_rules: [],
  status: 'approved',
  verification: null,
  trust_label: 'HAMLET reviewed',
  first_available_date: null,
  availability_confirmation_status: null,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-20T00:00:00.000Z',
  ...overrides,
});

describe('HAMLET live LLM discovery documents', () => {
  it('keeps the main directory factual and points to all public discovery documents', () => {
    const text = renderLlmMain();
    expect(text).toContain('# HAMLET');
    expect(text).toContain('https://hamlet.rest/llms-stays.txt');
    expect(text).toContain('A booking request is not a confirmed reservation');
    expect(text).not.toMatch(/\b\d+(?:\.\d+)?%/);
    expect(text).not.toMatch(/payment.{0,20}reserve/i);
  });

  it('preserves the detailed public trust, booking and pricing guidance', () => {
    const text = renderLlmFull();
    expect(text).toContain('Four Verification Pillars');
    expect(text).toContain('Ownership evidence');
    expect(text).toContain('Physical property inspection');
    expect(text).toContain('No particular reward or commercial arrangement should be assumed');
    expect(text).not.toMatch(/\b\d+(?:\.\d+)?%/);
    expect(text).not.toMatch(/owner-only rates/i);
    expect(text).not.toMatch(/payment.{0,20}reserve/i);
  });

  it('renders only guest-safe, approved listing fields with canonical detail links', () => {
    const text = renderLlmStays([sampleStay()]);
    expect(text).toContain('### [A calm Ikoyi apartment](https://hamlet.rest/stays/stay-123)');
    expect(text).toContain('Guest-facing nightly price:');
    expect(text).toContain('₦240,000');
    expect(text).toContain('Wi-Fi, Inverter backup');
    expect(text).toContain('availability must be confirmed');
    expect(text).not.toContain('Ikoyi, Lagos');
    expect(text).not.toContain('One king bed');
    expect(text).not.toContain('HAMLET reviewed');
    expect(text).not.toContain('owner rate');
  });

  it('escapes untrusted listing title and text before emitting Markdown', () => {
    const text = renderLlmStays([sampleStay({
      title: 'Penthouse ](https://example.invalid) <script>alert(1)</script>',
      area: 'Ikoyi | [click](https://example.invalid)',
      amenities: ['Wi-Fi | [click](https://example.invalid)'],
    })]);
    expect(text).not.toContain('<script>');
    const injectedLinkIndex = text.indexOf('](https://example.invalid)');
    expect(injectedLinkIndex).toBeGreaterThan(-1);
    expect(text[injectedLinkIndex - 1]).toBe('\\\\');
    expect(text).toContain('\\]');
    expect(text).not.toContain('| [click]');
  });

  it('omits an invalid guest price instead of inferring or fabricating one', () => {
    const text = renderLlmStays([sampleStay({ guest_nightly_ngn: null })]);
    expect(text).not.toContain('Guest-facing nightly price:');
    expect(text).toContain('approved');
  });

  it('does not claim availability when listing data does not establish it', () => {
    const text = renderLlmStays([sampleStay()]);
    expect(text).not.toMatch(/available tonight|available now|instant booking/i);
    expect(text).toContain('availability and applicable terms must be confirmed');
  });

  it('does not create claims or data rows for an empty approved inventory', () => {
    const text = renderLlmStays([]);
    expect(text).toContain('No approved public listings were returned');
    expect(text).not.toContain('### [');
  });
});
