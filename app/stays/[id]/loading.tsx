import { SiteFooter, SiteHeader } from '@/components/site/SiteShell';

const bar = (width: string, height: number | string, background = 'var(--hm-band-raised)'): React.CSSProperties => ({ width, height, borderRadius: 10, background });

export default function StayDetailLoading() {
  return (
    <div className="hm-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <main className="hm-main" aria-busy="true" aria-label="Loading property details" style={{ flex: 1 }}>
        <section className="hm-band">
          <div className="hm-shell hm-band-inner" style={{ paddingBottom: 40 }}>
            <div className="animate-pulse" style={bar('160px', 12)} />
            <div className="animate-pulse" style={bar('min(640px, 100%)', 56)} />
            <div className="animate-pulse" style={{ ...bar('100%', 'auto'), aspectRatio: '16 / 7' }} />
          </div>
        </section>
        <div className="hm-shell hm-section-tight hm-detail-layout">
          <div style={{ display: 'grid', gap: 18 }}>
            <div className="hm-card animate-pulse" style={{ height: 64 }} />
            <div className="hm-card animate-pulse" style={{ height: 180 }} />
            <div className="hm-card animate-pulse" style={{ height: 160 }} />
          </div>
          <div className="hm-card animate-pulse" style={{ height: 380 }} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
