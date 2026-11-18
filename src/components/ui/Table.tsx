import type { ReactNode, TableHTMLAttributes } from 'react';
import { cx } from './cx';

/** Data table with a sand header row. Scrolls horizontally inside its card on small screens; never animated. */
export function DataTable({ caption, children, className, ...rest }: { caption?: string; children: ReactNode; className?: string } & Omit<TableHTMLAttributes<HTMLTableElement>, 'className'>) {
  return (
    <div className="hm-table-wrap">
      <table className={cx('hm-table', className)} {...rest}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}
