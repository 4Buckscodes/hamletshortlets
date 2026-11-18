import type { ReactNode } from 'react';
import { cx } from './cx';

/** Numbered editorial section header: label, two-voice headline and an optional aside or action. */
export function SectionHeader({ label, title, accent, aside, id, className }: { label: ReactNode; title: ReactNode; accent?: ReactNode; aside?: ReactNode; id?: string; className?: string }) {
  return (
    <div className={cx('hm-section-head', className)}>
      <div>
        <p className="hm-label">{label}</p>
        <h2 id={id} className="hm-h2">
          {title}
          {accent ? (
            <>
              {' '}
              <em>{accent}</em>
            </>
          ) : null}
        </h2>
      </div>
      {typeof aside === 'string' ? <p className="hm-body">{aside}</p> : aside}
    </div>
  );
}
