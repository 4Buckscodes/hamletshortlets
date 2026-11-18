import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  AreaTicker,
  Button,
  Field,
  PageBand,
  SearchBar,
  StatTile,
  StatusPill,
  StayCard,
  TextInput,
  THEME_BOOT_SCRIPT,
  THEME_STORAGE_KEY,
  WorkspaceTabs,
  isThemeChoice,
  resolveTheme,
} from './index';

const css = readFileSync(path.resolve(__dirname, 'hamlet-ui.css'), 'utf8');

function tokens(block: string) {
  return Object.fromEntries([...block.matchAll(/(--hm-[a-z0-9-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
}
const lightBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
const darkStart = css.indexOf('html[data-hm-dark="on"][data-theme="dark"] {');
const darkBlock = css.slice(darkStart, css.indexOf('}', darkStart));
const light = tokens(lightBlock);
const dark = { ...light, ...tokens(darkBlock) };

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

describe('HAMLET UI kit — tokens and themes', () => {
  it('keeps dark mode opt-in until every route uses the kit', () => {
    expect(darkStart).toBeGreaterThan(0);
    expect(css).not.toMatch(/prefers-color-scheme:\s*dark/);
  });

  it('only overrides tokens in dark mode that exist in light mode', () => {
    for (const key of Object.keys(tokens(darkBlock))) expect(light).toHaveProperty(key);
  });

  it.each([
    ['text on page', '--hm-text', '--hm-page'],
    ['text on surface', '--hm-text', '--hm-surface'],
    ['muted on page', '--hm-muted', '--hm-page'],
    ['muted on surface', '--hm-muted', '--hm-surface'],
    ['label on page', '--hm-label', '--hm-page'],
    ['ok status', '--hm-ok', '--hm-ok-soft'],
    ['warn status', '--hm-warn', '--hm-warn-soft'],
    ['bad status', '--hm-bad', '--hm-bad-soft'],
    ['info status', '--hm-info', '--hm-info-soft'],
  ])('%s passes 4.5:1 in light and dark', (_name, fg, bg) => {
    expect(contrast(light[fg], light[bg])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark[fg], dark[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps button text readable', () => {
    expect(contrast('#ffffff', light['--hm-blue'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#172119', light['--hm-lime'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light['--hm-on-band'], light['--hm-band'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark['--hm-on-band'], dark['--hm-band'])).toBeGreaterThanOrEqual(4.5);
  });

  it('switches every animation off under reduced motion', () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{[^}]*animation: none !important;\s*transition: none !important;/);
  });
});

describe('HAMLET UI kit — theme resolution', () => {
  it('resolves choices against the device setting', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(isThemeChoice('dark')).toBe(true);
    expect(isThemeChoice('sepia')).toBe(false);
  });

  it('boot script applies the saved choice before paint and survives blocked storage', () => {
    const run = (stored: string | null, prefersDark: boolean, throwOnRead = false) => {
      const dataset: Record<string, string> = {};
      const sandbox = {
        localStorage: { getItem: (key: string) => { if (throwOnRead) throw new Error('blocked'); return key === THEME_STORAGE_KEY ? stored : null; } },
        window: { matchMedia: () => ({ matches: prefersDark }) },
        document: { documentElement: { dataset } },
      };
      new Function('localStorage', 'window', 'document', THEME_BOOT_SCRIPT)(sandbox.localStorage, sandbox.window, sandbox.document);
      return dataset;
    };
    expect(run('dark', false)).toEqual({ theme: 'dark', themeChoice: 'dark' });
    expect(run(null, true)).toEqual({ theme: 'dark', themeChoice: 'system' });
    expect(run('nonsense', false)).toEqual({ theme: 'light', themeChoice: 'system' });
    expect(run(null, true, true)).toEqual({});
  });
});

describe('HAMLET UI kit — components', () => {
  it('Button renders a link or a safe default button', () => {
    const link = renderToStaticMarkup(<Button href="/stays" arrow>Find my stay</Button>);
    expect(link).toContain('href="/stays"');
    expect(link).toContain('class="hm-btn hm-btn-primary"');
    expect(link).toContain('<svg');
    const button = renderToStaticMarkup(<Button variant="ghost" size="sm">Cancel</Button>);
    expect(button).toContain('type="button"');
    expect(button).toContain('hm-btn-ghost hm-btn-sm');
  });

  it('PageBand renders one h1 with a serif accent, kicker and tabs', () => {
    const html = renderToStaticMarkup(
      <PageBand kicker="Partner workspace" title="Good morning," accent="Ada." headingId="title">
        <WorkspaceTabs label="Partner workspace" current="/partners" tabs={[{ href: '/partners', label: 'Overview' }, { href: '/partners/bookings', label: 'Booking requests' }]} />
      </PageBand>,
    );
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('<em>Ada.</em>');
    expect(html).toContain('hm-band hm-band-arrive');
    expect(html).toContain('aria-labelledby="title"');
    expect(html).toContain('<a aria-current="page" href="/partners">Overview</a>');
    expect(html).toContain('<a href="/partners/bookings">Booking requests</a>');
  });

  it('StayCard is one link with alt text, all-in price and a staggered photo reveal', () => {
    const html = renderToStaticMarkup(
      <StayCard href="/stays/1" imageSrc="/a.jpg" imageAlt="Living room" tag="Verified · Ikate" title="Studio" meta="Studio · up to 2 guests" price="₦85,000" revealIndex={4} />,
    );
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain('alt="Living room"');
    expect(html).toContain('fees included');
    expect(html).toContain('data-hamlet-reveal=""');
    expect(html).toContain('--hm-reveal-delay:80ms');
    expect(html).toContain('aria-hidden="true"');
  });

  it('Field links label, hint and error to the control', () => {
    const html = renderToStaticMarkup(
      <Field label="Phone" hint="Include +234" error="Enter a valid number">
        <TextInput id="phone" name="phone" />
      </Field>,
    );
    expect(html).toContain('for="phone"');
    expect(html).toContain('aria-describedby="phone-hint phone-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="alert"');
  });

  it('StatTile renders the final value on the server and tone classes', () => {
    const html = renderToStaticMarkup(<StatTile label="Earnings this month" value={1250000} prefix="₦" tone="band" />);
    expect(html).toContain('₦1,250,000');
    expect(html).toContain('hm-stat-band');
  });

  it('StatusPill maps tones', () => {
    expect(renderToStaticMarkup(<StatusPill tone="warn">Awaiting partner</StatusPill>)).toContain('hm-status hm-status-warn');
  });

  it('SearchBar submits the params /stays reads and offers Lagos areas only', () => {
    const html = renderToStaticMarkup(<SearchBar defaults={{ area: 'Yaba', guests: 3 }} />);
    expect(html).toContain('action="/stays"');
    for (const name of ['area', 'checkIn', 'checkOut', 'guests']) expect(html).toContain(`name="${name}"`);
    expect(html).toContain('value="Yaba"');
    expect(html).toContain('Lekki Phase 1');
    const outOfScope = new RegExp(['Abu', 'ja|Iba', 'dan'].join(''));
    expect(html).not.toMatch(outOfScope);
    expect(html).toContain('aria-expanded="false"');
  });

  it('PageBand hero adds photography, a live kicker and a scroll cue without extra headings', () => {
    const html = renderToStaticMarkup(
      <PageBand live kicker="01 / Explore Lagos stays" title="Find a stay" accent="that feels like yours." scrollCue={{ href: '#results', label: 'Scroll to see stays' }} media={{ src: '/a.jpg', alt: 'Penthouse', caption: ['A good place to land', 'Lekki Phase 1'], inset: { src: '/b.jpg', alt: 'Bedroom' }, stamp: ['Verified', 'Your stay', 'Lagos'] }} />,
    );
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('hm-band-hero');
    expect(html).toContain('hm-live-dot');
    expect(html).toContain('href="#results"');
    expect(html).toContain('alt="Penthouse"');
    expect(html).toContain('alt="Bedroom"');
    expect(html).toMatch(/class="hm-band-stamp" aria-hidden="true"/);
  });

  it('AreaTicker links each area once for assistive tech and hides the loop copy', () => {
    const html = renderToStaticMarkup(<AreaTicker areas={['Yaba', 'Ikoyi']} />);
    expect(html).toContain('href="/stays?area=Yaba"');
    expect(html.match(/href="\/stays\?area=Yaba"/g)).toHaveLength(2);
    expect(html.match(/aria-hidden="true" tabindex="-1"|tabindex="-1" aria-hidden="true"/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});
