import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const applicationForm = readFileSync(resolve(process.cwd(), 'app/partners/apply/partner-application-form.tsx'), 'utf8');
const partnerStart = readFileSync(resolve(process.cwd(), 'app/partners/start/page.tsx'), 'utf8');

describe('unified partner capability onboarding', () => {
  it('does not offer partner referrer as a standalone primary role', () => {
    expect(applicationForm).not.toContain("value: 'Partner referrer'");
    expect(applicationForm).toContain('One partner account. Multiple ways to earn.');
  });

  it('explains that one account supports closing bookings and introducing partners', () => {
    expect(applicationForm).toContain('does not lock your account to that role');
    expect(applicationForm).toContain('introduce new partners');
    expect(partnerStart).toContain('same account to close eligible bookings and introduce partners');
  });
});
