'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';

const publicLinks = [
  { href: '/stays', label: 'Find a stay' },
  { href: '/lagos', label: 'Explore Lagos' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/faqs', label: 'FAQs' },
];
const partnerLinks = [
  { href: '/partners', label: 'Overview' },
  { href: '/partners/bookings', label: 'Bookings' },
  { href: '/partners/availability', label: 'Availability' },
];
const adminLinks = [
  { href: '/admin/properties', label: 'Properties' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/partners', label: 'Partners' },
  { href: '/admin/issues', label: 'Issues' },
];
const guestLinks = [
  { href: '/account/bookings', label: 'My bookings' },
  { href: '/account/issues', label: 'Support' },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = pathname.startsWith('/admin');
  const isPartner = pathname.startsWith('/partners') && !pathname.startsWith('/partners/apply');
  const isAccount = pathname.startsWith('/account');
  const contextLinks = isAdmin ? adminLinks : isPartner ? partnerLinks : isAccount ? guestLinks : [];
  const links = isAdmin || isPartner || isAccount ? contextLinks : publicLinks;

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  return (
    <header className="hamlet-global-header">
      <div className="hamlet-global-inner">
        <Link href="/" className="hamlet-global-brand" aria-label="HAMLET home">
          <span className="hamlet-global-monogram">H</span>
          <span>HAMLET<span className="hamlet-brand-dot">.</span>REST</span>
        </Link>
        <nav className="hamlet-global-links" aria-label="Main navigation">
          {links.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>)}
        </nav>
        <div className="hamlet-global-actions">
          {isAdmin || isPartner || isAccount
            ? <Link className="hamlet-global-partner" href="/stays">Guest marketplace <ArrowUpRight size={15}/></Link>
            : <Link className="hamlet-global-partner" href="/partners/apply">Partner with us <ArrowUpRight size={15}/></Link>}
          <Link className="hamlet-global-signin" href={isAdmin || isPartner || isAccount ? '/' : '/signin'}>{isAdmin || isPartner || isAccount ? 'Exit workspace' : 'Sign in'}</Link>
          <button className="hamlet-global-toggle" type="button" aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={open} aria-controls="hamlet-mobile-navigation" onClick={() => setOpen(value => !value)}>{open ? <X size={22}/> : <Menu size={22}/>}</button>
        </div>
      </div>
      {open && <nav id="hamlet-mobile-navigation" className="hamlet-mobile-menu" aria-label="Mobile navigation">
        {links.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>)}
        {isAdmin || isPartner || isAccount
          ? <Link href="/stays">Guest marketplace <ArrowUpRight size={15}/></Link>
          : <><Link href="/partners/apply">Partner with us <ArrowUpRight size={15}/></Link><Link href="/signin">Sign in</Link></>}
      </nav>}
    </header>
  );
}
