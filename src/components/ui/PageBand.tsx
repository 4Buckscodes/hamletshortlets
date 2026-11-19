import type { ReactNode } from 'react';
import { ArrowDown } from 'lucide-react';
import { cx } from './cx';

export interface PageBandMedia {
  src: string;
  alt: string;
  /** Caption bar along the bottom of the main photo, e.g. ["A good place to land", "Lekki Phase 1"]. */
  caption?: [string, string];
  inset?: { src: string; alt: string };
  /** Three lines on the lime stamp, e.g. ["Verified", "Your stay", "Lagos"]. */
  stamp?: [string, string, string];
}

export interface PageBandProps {
  /** Small caps kicker, e.g. "01 / Explore Lagos stays" or "Partner workspace". */
  kicker: ReactNode;
  /** Heavy statement line(s). */
  title: ReactNode;
  /** Serif feeling line, rendered in coral on a new line. Optional. */
  accent?: ReactNode;
  /** Short supporting copy on the right (desktop) or below (mobile). */
  intro?: ReactNode;
  /** Buttons shown beside the title. */
  actions?: ReactNode;
  /** Content under the title row, usually <WorkspaceTabs />. */
  children?: ReactNode;
  /** Plays the one-time arrival animation. Default true. */
  arrive?: boolean;
  /** Pulsing coral dot before the kicker, for live inventory counts. */
  live?: boolean;
  /** Hero photography on the right: a slowly drifting main photo, an optional floating inset and stamp. */
  media?: PageBandMedia;
  /** "Scroll to see more" cue that links to the content below. */
  scrollCue?: { href: string; label: string };
  /** Full-width strip under the band, e.g. <AreaTicker />. */
  footer?: ReactNode;
  headingId?: string;
  className?: string;
}

/** Forest page header band — the top of every public page and workspace. */
export function PageBand({ kicker, title, accent, intro, actions, children, arrive = true, live, media, scrollCue, footer, headingId, className }: PageBandProps) {
  const aside =
    intro || actions ? (
      <div className="hm-band-aside">
        {intro ? <p className="hm-body">{intro}</p> : null}
        {actions ? <div className="hm-band-actions">{actions}</div> : null}
      </div>
    ) : null;
  const cue = scrollCue ? (
    <a href={scrollCue.href} className="hm-scroll-cue">
      <span className="hm-scroll-cue-ring" aria-hidden="true">
        <ArrowDown size={16} />
      </span>
      {scrollCue.label}
    </a>
  ) : null;

  return (
    <section className={cx('hm-band', arrive && 'hm-band-arrive', media && 'hm-band-hero', className)} aria-labelledby={headingId}>
      <div className="hm-shell hm-band-inner">
        <div className={media ? 'hm-band-hero-grid' : 'hm-band-row'}>
          <div className="hm-band-copy">
            <p className="hm-label">
              {live ? <span className="hm-live-dot" aria-hidden="true" /> : null}
              {kicker}
            </p>
            <h1 id={headingId} className="hm-display">
              {title}
              {accent ? (
                <>
                  <br />
                  <em>{accent}</em>
                </>
              ) : null}
            </h1>
            {media ? aside : null}
            {media ? cue : null}
          </div>
          {media ? (
            <div className="hm-band-media">
              <div className="hm-media hm-band-media-main">
                <picture>
                  {/* The band image is hidden on phones; a 1px placeholder there means it never downloads. */}
                  <source media="(max-width: 760px)" srcSet="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />
                  <img src={media.src} alt={media.alt} fetchPriority="high" />
                </picture>
                <span className="hm-media-tint" aria-hidden="true" />
                {media.caption ? (
                  <span className={cx('hm-band-media-caption', media.inset && 'hm-band-media-caption-offset')}>
                    <span>{media.caption[0]}</span> <b>— {media.caption[1]}</b>
                  </span>
                ) : null}
              </div>
              {media.inset ? (
                <div className="hm-media hm-band-media-inset">
                  <img src={media.inset.src} alt={media.inset.alt} loading="lazy" />
                </div>
              ) : null}
              {media.stamp ? (
                <span className="hm-band-stamp" aria-hidden="true">
                  <span>{media.stamp[0]}</span>
                  <b>{media.stamp[1]}</b>
                  <span>{media.stamp[2]}</span>
                </span>
              ) : null}
            </div>
          ) : (
            aside
          )}
        </div>
        {media ? null : cue}
        {children}
      </div>
      {footer}
    </section>
  );
}
