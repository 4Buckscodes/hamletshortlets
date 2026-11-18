import { SiteFooter, SiteHeader } from '@/components/site/SiteShell';

const block = (width: string, height: number, extra?: React.CSSProperties): React.CSSProperties => ({
  width,
  height,
  borderRadius: 10,
  background: 'var(--hm-sand)',
  ...extra,
});

export default function StaysLoading() {
  return (
    <div className="hm-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />

      <main className="hm-main" aria-busy="true" aria-label="Loading Lagos stays" style={{ flex: 1 }}>
        <section className="hm-band">
          <div className="hm-shell hm-band-inner" style={{ paddingBottom: 48 }}>
            <div className="animate-pulse" style={block('220px', 12, { background: 'var(--hm-band-raised)' })} />
            <div className="animate-pulse" style={block('min(560px, 100%)', 64, { background: 'var(--hm-band-raised)' })} />
            <div className="animate-pulse" style={block('min(420px, 90%)', 48, { background: 'var(--hm-band-raised)' })} />
          </div>
        </section>

        <div className="hm-shell hm-section-tight" style={{ display: 'grid', gap: 32 }}>
          <div style={{ display: 'flex', gap: 12, overflow: 'hidden' }}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="hm-card animate-pulse" style={{ width: 236, height: 84, flex: 'none' }} />
            ))}
          </div>
          <div className="hm-card animate-pulse" style={{ height: 120 }} />
          <div className="hm-stay-grid">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} style={{ display: 'grid', gap: 12 }}>
                <div className="animate-pulse" style={block('100%', 0, { aspectRatio: '4 / 3', height: 'auto' })} />
                <div className="animate-pulse" style={block('70%', 20)} />
                <div className="animate-pulse" style={block('45%', 14)} />
              </div>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
