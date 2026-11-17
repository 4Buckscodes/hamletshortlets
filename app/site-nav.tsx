'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';

const publicLinks = [
  { href: '/stays', label: 'Find a stay' },
  { href: '/lagos', label: 'Lagos, locally' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/faqs', label: 'FAQs' },
];
const partnerLinks = [
  { href: '/partners', label: 'Partner workspace' },
  { href: '/partners/availability', label: 'Availability' },
  { href: '/partners/bookings', label: 'Bookings' },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const workspace = pathname.startsWith('/partners') || pathname.startsWith('/admin') || pathname.startsWith('/account');
  const links = workspace ? [...publicLinks, ...partnerLinks] : publicLinks;
  return (
    <header className="hamlet-global-header">
      <div className="hamlet-global-inner">
        <Link href="/" className="hamlet-global-brand" onClick={() => setOpen(false)} aria-label="HAMLET home">
          <span className="hamlet-global-monogram">H</span><span>HAMLET<span className="hamlet-brand-dot">.</span>REST</span>
        </Link>
        <nav className="hamlet-global-links" aria-label="Main navigation">
          {links.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>)}
        </nav>
        <div className="hamlet-global-actions">
          <Link className="hamlet-global-partner" href="/partners/apply">Partner with us <ArrowUpRight size={15}/></Link>
          <Link className="hamlet-global-signin" href="/signin">Sign in</Link>
          <button className="hamlet-global-toggle" type="button" aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={open} onClick={() => setOpen(v => !v)}>{open ? <X size={22}/> : <Menu size={22}/>}</button>
        </div>
      </div>
      {open && <nav className="hamlet-mobile-menu" aria-label="Mobile navigation">
        {links.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>)}
        <Link href="/partners/apply" onClick={() => setOpen(false)}>Partner with us <ArrowUpRight size={15}/></Link>
        <Link href="/signin" onClick={() => setOpen(false)}>Sign in</Link>
      </nav>}
    </header>
  );
}
