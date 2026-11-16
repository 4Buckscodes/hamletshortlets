import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="site-footer-global">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link href="/" className="site-footer-wordmark" aria-label="Hamlet Rest home"><span className="site-footer-mark">H</span><span>HAMLET<span>.</span>REST</span></Link>
          <p>Make yourself at home.<br />Lagos, Nigeria.</p>
        </div>
        <nav className="site-footer-links" aria-label="Footer navigation">
          <Link href="/stays">Find a stay</Link>
          <Link href="/lagos">The Lagos guide</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/partners/apply">Host with us</Link>
          <Link href="/faqs">FAQs & support</Link>
          <Link href="/safety">Trust & safety</Link>
        </nav>
        <p className="site-footer-signoff">HOME,<br /><em>but elsewhere.</em></p>
      </div>
      <div className="site-footer-legal"><span>© {new Date().getFullYear()} HAMLET.REST</span><span>06° 27&apos; N · 03° 24&apos; E</span></div>
    </footer>
  );
}
