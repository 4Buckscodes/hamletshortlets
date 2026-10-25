# HAMLET for Your Shortlets — Complete Code Changes

- **Repository:** `4Buckscodes/hamletshortlets`
- **Latest Merged Commit (`main`):** `20c799ad9d50965658704be3a14681396912bc28` (PR #21)
- **Companion Full Git Patch File:** `hamlet-all-code-changes-pr1-to-pr21.patch` (every code change across PR #1 – PR #21 in unified `.patch` format)

---

## 1. Summary of All Merged Pull Requests (PR #1 – PR #21)

| PR | Date | Merge Commit | Summary | Diff Stat |
| :--- | :--- | :--- | :--- | :--- |
| **#1** | 2026-10-23 | `d1b2dc1` | Add Docker-free PGlite booking lifecycle tests & fix dependency advisories | 10 files changed, 1554 insertions(+), 99 deletions(-) |
| **#2** | 2026-10-23 | `5dc2538` | Implement HAMLET MVP Spec v1.0: verified webhook payments, controlled ledger, duplicate guards & ops workflows | 16 files changed, 3300 insertions(+), 127 deletions(-) |
| **#3** | 2026-10-23 | `fbb621f` | Complete HAMLET Release 1 governance, property corrections, private pilot feedback, date search & Paystack checkout init | 19 files changed, 3068 insertions(+), 128 deletions(-) |
| **#4** | 2026-10-23 | `b43d94d` | Fix font loading, Naira glyph coverage, and dark-table typography | 10 files changed, 95 insertions(+), 21 deletions(-) |
| **#5** | 2026-10-23 | `2bc7fed` | Add guest sign-up flow on Sign In page and Navbar | 7 files changed, 355 insertions(+), 64 deletions(-) |
| **#6** | 2026-10-23 | `43b522f` | Guest signup booking redirects & full-app icon, text, and scroll responsiveness | 33 files changed, 700 insertions(+), 383 deletions(-) |
| **#7** | 2026-10-23 | `2032224` | Booking notifications, Resend Edge Function & partner availability review workflow | 20 files changed, 4192 insertions(+), 43 deletions(-) |
| **#8** | 2026-10-23 | `0205cc7` | fix(endpoints): audit and harden Edge Functions, RPC/RLS grants, and SPA routing | 17 files changed, 1215 insertions(+), 61 deletions(-) |
| **#9** | 2026-10-23 | `e743022` | feat: MVP live readiness for clients, partners, and admin management | 27 files changed, 3794 insertions(+), 475 deletions(-) |
| **#10** | 2026-10-23 | `0aa2650` | feat: Lagos website copy, supporting pages & NGN/USD/GBP stay currency switcher | 22 files changed, 1874 insertions(+), 288 deletions(-) |
| **#11** | 2026-10-23 | `5e204ec` | feat: marketplace-first landing page & move Four Pillars section to About Us | 3 files changed, 413 insertions(+), 428 deletions(-) |
| **#12** | 2026-10-23 | `4b61f4c` | feat(marketplace): add Lagos Mainland featuring Yaba, Shomolu, Surulere & environs | 9 files changed, 505 insertions(+), 130 deletions(-) |
| **#13** | 2026-10-24 | `aefaa1c` | Implement property availability, partner referrals, 20% domestic pricing & 10% USD/GBP buffer | 43 files changed, 9795 insertions(+), 479 deletions(-) |
| **#14** | 2026-10-24 | `8752b34` | fix: harden RPC/edge endpoints, add draft listing workflow, and polish guest/partner UX | 15 files changed, 1887 insertions(+), 182 deletions(-) |
| **#15** | 2026-10-24 | `97b2c6b` | Configure technical & structured SEO and spec-compliant llms.txt / llms-full.txt | 15 files changed, 1014 insertions(+), 14 deletions(-) |
| **#16** | 2026-10-24 | `963721a` | feat(wayfinder): implement HAMLET Wayfinder verified arrival guidance, RLS & workflows | 21 files changed, 8065 insertions(+), 37 deletions(-) |
| **#17** | 2026-10-24 | `0938225` | Refresh HAMLET brand palette, typography, and serif H monogram logo | 17 files changed, 219 insertions(+), 91 deletions(-) |
| **#18** | 2026-10-24 | `565e47f` | feat(ui): HAMLET editorial UI adoption & brand-preserving redesign | 28 files changed, 5311 insertions(+), 1551 deletions(-) |
| **#19** | 2026-10-24 | `f2634b7` | Declutter homepage and remove verbose explanations site-wide | 16 files changed, 656 insertions(+), 1593 deletions(-) |
| **#20** | 2026-10-24 | `562b172` | Add sample apartment interior hero slideshow on Home | 6 files changed, 140 insertions(+), 24 deletions(-) |
| **#21** | 2026-10-24 | `20c799a` | Improve hero slideshow and listing image clarity | 7 files changed, 76 insertions(+), 72 deletions(-) |

---

## 2. Recent UI, Brand, Copy & Hero Slideshow Changes (PR #17 – PR #21)

This section shows the complete file-by-file unified code diffs across:
- **PR #17 (`0938225`):** Brand palette (`#0E1F3B`, `#C9A44A`, `#F8F5EE`), Playfair Display + Inter + JetBrains Mono typography, and serif `H` monogram logo
- **PR #18 (`565e47f`):** Editorial UI adoption across guest, partner, and admin screens, `Horatio` assistant drawer, and saved stays shortlist (`wishlist.tsx`)
- **PR #19 (`f2634b7`):** Homepage declutter & removal of verbose explanations site-wide
- **PR #20 (`562b172`):** Sample apartment interior 4-room crossfading hero slideshow on `Home.tsx`
- **PR #21 (`20c799a`):** Full-clarity (`opacity-100`) hero slideshow, unobstructed floating search dock, and brighter card/gallery/panel photography

### Diff Summary (`963721a..20c799a`)

```text
index.html                            |    2 +-
 package.json                          |    4 +-
 public/favicon.svg                    |   25 +-
 public/images/hero-sample-bedroom.jpg |  Bin 0 -> 173721 bytes
 public/images/hero-sample-kitchen.jpg |  Bin 0 -> 185607 bytes
 public/images/hero-sample-living.jpg  |  Bin 0 -> 209762 bytes
 public/images/hero-sample-lounge.jpg  |  Bin 0 -> 231920 bytes
 public/site.webmanifest               |    4 +-
 src/App.tsx                           |   27 +-
 src/components/Badges.tsx             |   10 +-
 src/components/HoratioDrawer.tsx      |  507 +++++++++++++++
 src/components/Logo.tsx               |   77 ++-
 src/components/Navbar.tsx             |  347 ++++++++--
 src/components/PropertyCard.tsx       |  205 +++---
 src/components/WorkspaceShell.tsx     |   28 +-
 src/index.css                         |  117 ++--
 src/lib/brand.ts                      |    5 +
 src/lib/brandIdentity.test.ts         |   61 ++
 src/lib/redesignAdoption.test.ts      |  106 ++++
 src/lib/wishlist.tsx                  |   77 +++
 src/main.tsx                          |    8 +-
 src/pages/About.tsx                   |  223 +++----
 src/pages/Account.tsx                 | 1129 ++++++++++++++++++++++++++-------
 src/pages/Faqs.tsx                    |  172 +++--
 src/pages/Home.tsx                    |  927 ++++++++++++++++-----------
 src/pages/HowItWorks.tsx              |  221 ++++---
 src/pages/Lagos.tsx                   |  362 ++++++-----
 src/pages/Legal.tsx                   |  169 +++--
 src/pages/PartnerRegister.tsx         |  321 +++++++---
 src/pages/PropertyDetail.tsx          |  772 +++++++++++++++-------
 src/pages/Safety.tsx                  |  268 ++++----
 src/pages/SignIn.tsx                  |  174 +++--
 src/pages/Stays.tsx                   |  425 ++++++++++---
 src/pages/Wayfinder.tsx               |   33 +-
 src/pages/admin/AdminLayout.tsx       |    7 +-
 src/pages/admin/Applications.tsx      |    2 +-
 src/pages/admin/Issues.tsx            |    4 +-
 src/pages/admin/Overview.tsx          |   24 +-
 src/pages/admin/Users.tsx             |    2 +-
 src/pages/partner/NewProperty.tsx     |   21 +-
 src/pages/partner/Overview.tsx        |   21 +-
 41 files changed, 4979 insertions(+), 1908 deletions(-)
```

### `index.html` (Modified)

```diff
diff --git a/index.html b/index.html
index 6a8839e..705d00b 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
     <meta name="keywords" content="Lagos shortlets, verified shortlet Lagos, Yaba shortlets, Surulere shortlets, Shomolu shortlets, Ikeja GRA shortlets, Lekki Phase 1 shortlets, Victoria Island serviced apartments, Ikoyi shortlets, HAMLET shortlets" />
     <meta name="author" content="HAMLET Marketplace Ltd" />
     <meta name="application-name" content="HAMLET" />
-    <meta name="theme-color" content="#101D16" />
+    <meta name="theme-color" content="#0E1F3B" />
     <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
     <meta name="geo.region" content="NG-LA" />
     <meta name="geo.placename" content="Lagos, Nigeria" />
```

### `package.json` (Modified)

```diff
diff --git a/package.json b/package.json
index 9b19114..53d68a6 100644
--- a/package.json
+++ b/package.json
@@ -13,9 +13,9 @@
     "preview": "vite preview"
   },
   "dependencies": {
-    "@fontsource-variable/fraunces": "^5.3.0",
+    "@fontsource-variable/inter": "^5.3.0",
     "@fontsource-variable/jetbrains-mono": "^5.3.0",
-    "@fontsource-variable/public-sans": "^5.3.0",
+    "@fontsource-variable/playfair-display": "^5.3.0",
     "@supabase/supabase-js": "^2.118.0",
     "@tailwindcss/vite": "^4.2.1",
     "framer-motion": "^12.35.0",
```

### `public/favicon.svg` (Modified)

```diff
diff --git a/public/favicon.svg b/public/favicon.svg
index 705bd8b..e469776 100644
--- a/public/favicon.svg
+++ b/public/favicon.svg
@@ -1,7 +1,20 @@
-<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
-  <rect x="3" y="3" width="42" height="42" rx="12" fill="#101D16"/>
-  <circle cx="24" cy="13.5" r="3.1" fill="#C9A227"/>
-  <path d="M10 28.5 24 15l14 13.5" stroke="#FAF8F3" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
-  <path d="M14.5 27v9.5h19V27" stroke="#FAF8F3" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
-  <path d="M21.5 36.5v-5.2a2.5 2.5 0 0 1 5 0v5.2" stroke="#C9A227" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
+<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
+  <defs>
+    <linearGradient id="hamlet-favicon-gold" x1="12" y1="31.8" x2="52" y2="31.8" gradientUnits="userSpaceOnUse">
+      <stop offset="0%" stop-color="#946E21" />
+      <stop offset="16%" stop-color="#C9A44A" />
+      <stop offset="38%" stop-color="#E1C26E" />
+      <stop offset="52%" stop-color="#F6E5AB" />
+      <stop offset="68%" stop-color="#C9A44A" />
+      <stop offset="86%" stop-color="#B68E35" />
+      <stop offset="100%" stop-color="#8E691E" />
+    </linearGradient>
+  </defs>
+  <rect x="2" y="2" width="60" height="60" rx="14" fill="#0E1F3B" />
+  <g transform="translate(5.12 5.12) scale(0.84)">
+    <path d="M6.5 7H26.5V9.2C22.4 9.3 21 11.5 21 16.6V47.4C21 52.5 22.4 54.7 26.5 54.8V57H6.5V54.8C10.6 54.7 12 52.5 12 47.4V16.6C12 11.5 10.6 9.3 6.5 9.2V7Z" fill="#FFFFFF" />
+    <path d="M37.5 7H57.5V9.2C53.4 9.3 52 11.5 52 16.6V47.4C52 52.5 53.4 54.7 57.5 54.8V57H37.5V54.8C41.6 54.7 43 52.5 43 47.4V16.6C43 11.5 41.6 9.3 37.5 9.2V7Z" fill="#FFFFFF" />
+    <path d="M12 20.4C13.3 25.4 16.6 28.1 21 28.1V35.5C16.6 35.5 13.3 38.2 12 43.2V20.4ZM52 20.4V43.2C50.7 38.2 47.4 35.5 43 35.5V28.1C47.4 28.1 50.7 25.4 52 20.4Z" fill="#060F1E" fill-opacity="0.28" />
+    <path d="M12 21.4C13.2 26.2 16.5 28.8 21 28.8H43C47.5 28.8 50.8 26.2 52 21.4V42.2C50.8 37.4 47.5 34.8 43 34.8H21C16.5 34.8 13.2 37.4 12 42.2V21.4Z" fill="url(#hamlet-favicon-gold)" />
+  </g>
 </svg>
```

### `public/images/hero-sample-bedroom.jpg` (Added)

- Binary image asset (169.6 KB)

### `public/images/hero-sample-kitchen.jpg` (Added)

- Binary image asset (181.3 KB)

### `public/images/hero-sample-living.jpg` (Added)

- Binary image asset (204.8 KB)

### `public/images/hero-sample-lounge.jpg` (Added)

- Binary image asset (226.5 KB)

### `public/site.webmanifest` (Modified)

```diff
diff --git a/public/site.webmanifest b/public/site.webmanifest
index 8f2679f..0cefb2e 100644
--- a/public/site.webmanifest
+++ b/public/site.webmanifest
@@ -5,8 +5,8 @@
   "start_url": "/",
   "scope": "/",
   "display": "standalone",
-  "background_color": "#FAF8F3",
-  "theme_color": "#101D16",
+  "background_color": "#F8F5EE",
+  "theme_color": "#0E1F3B",
   "lang": "en-NG",
   "icons": [
     {
```

### `src/App.tsx` (Modified)

```diff
diff --git a/src/App.tsx b/src/App.tsx
index f1777f7..c9e99b2 100644
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -3,7 +3,10 @@ import { lazy, Suspense, useEffect, type ReactNode } from 'react';
 import { HamletProvider, useHamlet, captureUrlAttributionParams } from './lib/store';
 import { CurrencyProvider } from './lib/currency';
 import { ToastProvider } from './lib/toast';
+import { WishlistProvider } from './lib/wishlist';
 import { buildAuthPath } from './lib/authRedirect';
+import { HamletWordmark } from './components/Logo';
+import { HoratioProvider } from './components/HoratioDrawer';
 import Home from './pages/Home';
 import Lagos from './pages/Lagos';
 import About from './pages/About';
@@ -45,9 +48,9 @@ function WorkspaceFallback() {
   return (
     <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4 text-center">
       <div>
-        <p className="font-display text-lg font-black tracking-wide text-paper">
-          HAMLET<span className="text-brass-500">.</span>
-        </p>
+        <div className="flex justify-center">
+          <HamletWordmark light />
+        </div>
         <p role="status" className="mt-1.5 text-xs font-semibold text-ink-300">
           Loading workspace…
         </p>
@@ -80,10 +83,12 @@ export default function App() {
   return (
     <HamletProvider>
       <StoreBackedCurrencyProvider>
-        <ToastProvider>
-          <HashRouter>
-            <ScrollToTop />
-            <Suspense fallback={<WorkspaceFallback />}>
+        <WishlistProvider>
+          <ToastProvider>
+            <HashRouter>
+              <HoratioProvider>
+                <ScrollToTop />
+                <Suspense fallback={<WorkspaceFallback />}>
               <Routes>
                 {/* Guest marketplace */}
                 <Route path="/" element={<Home />} />
@@ -126,9 +131,11 @@ export default function App() {
 
                 <Route path="*" element={<Navigate to="/" replace />} />
               </Routes>
-            </Suspense>
-          </HashRouter>
-        </ToastProvider>
+                </Suspense>
+              </HoratioProvider>
+            </HashRouter>
+          </ToastProvider>
+        </WishlistProvider>
       </StoreBackedCurrencyProvider>
     </HamletProvider>
   );
```

### `src/components/Badges.tsx` (Modified)

```diff
diff --git a/src/components/Badges.tsx b/src/components/Badges.tsx
index bd83a51..4b5e2ef 100644
--- a/src/components/Badges.tsx
+++ b/src/components/Badges.tsx
@@ -8,7 +8,7 @@ export function PropertyStatusPill({ status }: { status: PropertyStatus }) {
     draft: { cls: 'bg-stone-100 text-stone-700 border-stone-300', label: 'Draft', Icon: Circle },
     submitted: { cls: 'bg-amber-50 text-amber-800 border-amber-200', label: 'Submitted · In review', Icon: Clock },
     pending_review: { cls: 'bg-amber-50 text-amber-800 border-amber-200', label: 'Pending review', Icon: Clock },
-    approved: { cls: 'bg-jade-50 text-jade-800 border-jade-200', label: 'Approved · Published', Icon: BadgeCheck },
+    approved: { cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'Approved · Published', Icon: BadgeCheck },
     paused: { cls: 'bg-stone-100 text-stone-800 border-stone-300', label: 'Paused by host', Icon: PauseCircle },
     needs_correction: { cls: 'bg-orange-50 text-orange-800 border-orange-200', label: 'Needs correction', Icon: FileWarning },
     rejected: { cls: 'bg-red-50 text-red-800 border-red-200', label: 'Rejected', Icon: XCircle },
@@ -24,7 +24,7 @@ export function BookingStatusPill({ status }: { status: BookingStatus }) {
     requested: { cls: 'bg-sky-50 text-sky-800 border-sky-200', label: 'Requested', Icon: Circle },
     checking: { cls: 'bg-violet-50 text-violet-800 border-violet-200', label: 'Checking availability & terms', Icon: Loader2 },
     awaiting_payment: { cls: 'bg-amber-50 text-amber-900 border-amber-300', label: 'Accepted · Awaiting payment', Icon: CalendarClock },
-    confirmed: { cls: 'bg-jade-50 text-jade-800 border-jade-300', label: 'Confirmed', Icon: CheckCircle2 },
+    confirmed: { cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'Confirmed', Icon: CheckCircle2 },
     completed: { cls: 'bg-ink-100 text-ink-800 border-ink-200', label: 'Completed', Icon: CheckCircle2 },
     cancelled: { cls: 'bg-red-50 text-red-800 border-red-200', label: 'Cancelled', Icon: Ban },
     expired: { cls: 'bg-stone-100 text-stone-700 border-stone-300', label: 'Expired — payment deadline passed', Icon: Clock },
@@ -62,7 +62,7 @@ export function LedgerStatusPill({ status }: { status: LedgerStatus }) {
 
 export function DocStatusBadge({ status }: { status: DocStatus }) {
   const map: Record<DocStatus, { cls: string; label: string }> = {
-    verified: { cls: 'bg-jade-50 text-jade-800 border-jade-200', label: 'Verified' },
+    verified: { cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'Verified' },
     pending_review: { cls: 'bg-amber-50 text-amber-900 border-amber-200', label: 'Pending review' },
     missing: { cls: 'bg-red-50 text-red-800 border-red-200', label: 'Missing' },
     self_reported: { cls: 'bg-violet-50 text-violet-800 border-violet-200', label: 'Self-reported' },
@@ -73,8 +73,8 @@ export function DocStatusBadge({ status }: { status: DocStatus }) {
 
 export function TrustBadge({ label }: { label: string }) {
   return (
-    <span className="inline-flex items-center gap-1.5 rounded-full border border-brass-400/50 bg-gradient-to-r from-brass-500/15 to-transparent py-1 pl-1.5 pr-3 text-[11px] font-bold text-brass-700 [&>svg]:shrink-0">
-      <ShieldCheck size={13} strokeWidth={2.5} className="shrink-0" />{label}
+    <span className="inline-flex items-center gap-1.5 rounded-full border border-brass-400/55 bg-gradient-to-r from-brass-500/18 to-brass-200/10 py-1 pl-2 pr-3 text-[11px] font-bold text-ink-900 [&>svg]:shrink-0">
+      <ShieldCheck size={13} strokeWidth={2.4} className="shrink-0 text-emerald-700" />{label}
     </span>
   );
 }
```

### `src/components/HoratioDrawer.tsx` (Added)

```diff
diff --git a/src/components/HoratioDrawer.tsx b/src/components/HoratioDrawer.tsx
new file mode 100644
index 0000000..02934cc
--- /dev/null
+++ b/src/components/HoratioDrawer.tsx
@@ -0,0 +1,507 @@
+/* eslint-disable react-refresh/only-export-components */
+import {
+  createContext,
+  useCallback,
+  useContext,
+  useEffect,
+  useMemo,
+  useState,
+  type FormEvent,
+  type ReactNode,
+} from 'react';
+import { Link } from 'react-router-dom';
+import {
+  ArrowRight,
+  Building2,
+  Compass,
+  Send,
+  ShieldCheck,
+  Sparkles,
+  X,
+} from 'lucide-react';
+import { useHamlet } from '../lib/store';
+import { useCurrency } from '../lib/currency';
+import { matchesLagosAreaFilter, LAGOS_AREAS } from '../lib/areas';
+import { formatNaira } from '../lib/pricing';
+import { myPartnerProperties, propertyIdsOf } from '../lib/partnerUtils';
+
+interface HoratioContextValue {
+  isOpen: boolean;
+  openHoratio: (initialPrompt?: string) => void;
+  closeHoratio: () => void;
+}
+
+const HoratioContext = createContext<HoratioContextValue>({
+  isOpen: false,
+  openHoratio: () => {},
+  closeHoratio: () => {},
+});
+
+export function useHoratio() {
+  return useContext(HoratioContext);
+}
+
+interface HoratioReply {
+  id: string;
+  role: 'user' | 'horatio';
+  text: string;
+  links?: { label: string; to: string; meta?: string }[];
+  note?: string;
+}
+
+export function HoratioProvider({ children }: { children: ReactNode }) {
+  const [isOpen, setIsOpen] = useState(false);
+  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
+
+  const openHoratio = useCallback((initialPrompt?: string) => {
+    if (initialPrompt) setPendingPrompt(initialPrompt);
+    setIsOpen(true);
+  }, []);
+
+  const closeHoratio = useCallback(() => {
+    setIsOpen(false);
+  }, []);
+
+  const value = useMemo(
+    () => ({ isOpen, openHoratio, closeHoratio }),
+    [isOpen, openHoratio, closeHoratio],
+  );
+
+  return (
+    <HoratioContext.Provider value={value}>
+      {children}
+      <HoratioDrawer
+        isOpen={isOpen}
+        onClose={closeHoratio}
+        pendingPrompt={pendingPrompt}
+        onConsumePrompt={() => setPendingPrompt(null)}
+      />
+    </HoratioContext.Provider>
+  );
+}
+
+function HoratioDrawer({
+  isOpen,
+  onClose,
+  pendingPrompt,
+  onConsumePrompt,
+}: {
+  isOpen: boolean;
+  onClose: () => void;
+  pendingPrompt: string | null;
+  onConsumePrompt: () => void;
+}) {
+  const { state, backendConfigured } = useHamlet();
+  const { formatStayPrice, currency } = useCurrency();
+  const [input, setInput] = useState('');
+  const [messages, setMessages] = useState<HoratioReply[]>([]);
+
+  const session = state.session;
+  const role = session?.role ?? 'public';
+
+  const approvedProperties = useMemo(
+    () => state.properties.filter(p => p.status === 'approved'),
+    [state.properties],
+  );
+
+  const partnerProps = useMemo(
+    () => (role === 'partner' ? myPartnerProperties(state, session?.userId) : []),
+    [role, state, session?.userId],
+  );
+
+  const partnerPropIds = useMemo(
+    () => (role === 'partner' ? new Set(propertyIdsOf(state, session?.userId)) : new Set<string>()),
+    [role, state, session?.userId],
+  );
+
+  const buildAnswer = useCallback(
+    (rawQuery: string): Omit<HoratioReply, 'id' | 'role'> => {
+      const q = rawQuery.trim().toLowerCase();
+
+      // 1. Admin / Elsinore operational queries (strictly gated to admin session)
+      if (role === 'admin' && /(queue|review|ops|watch|issue|ledger|pending|overview|elsinore)/.test(q)) {
+        const pendingProps = state.properties.filter(
+          p => p.status === 'submitted' || p.status === 'needs_correction',
+        ).length;
+        const actionBookings = state.bookings.filter(b =>
+          ['requested', 'checking'].includes(b.status),
+        ).length;
+        const openWatchIssues = state.issues.filter(i =>
+          ['open', 'assigned', 'investigating', 'escalated'].includes(i.status),
+        ).length;
+        const pendingApps = state.applications.filter(a => a.status === 'pending').length;
+        const flaggedLedger = state.ledger.filter(
+          l => l.status === 'flagged' || l.variance !== 0,
+        ).length;
+
+        return {
+          text: `Elsinore live operational snapshot: ${pendingProps} listing(s) awaiting property review, ${actionBookings} booking request(s) needing confirmation, ${openWatchIssues} active incident(s) on The Watch, ${pendingApps} partner application(s) pending review, and ${flaggedLedger} ledger item(s) requiring reconciliation.`,
+          links: [
+            { label: `Property Review (${pendingProps})`, to: '/admin/properties' },
+            { label: `The Watch · Issues (${openWatchIssues})`, to: '/admin/issues' },
+            { label: `Ledger & Settlement (${flaggedLedger})`, to: '/admin/ledger' },
+            { label: `Partner Applications (${pendingApps})`, to: '/admin/applications' },
+          ],
+          note: 'Suggestion only — verification decisions, refunds, caution-deposit deductions, and account governance remain strictly under human administrator control.',
+        };
+      }
+
+      // 2. Partner workspace queries (strictly scoped to partner's authorised properties)
+      if (role === 'partner' && /(my prop|earning|commission|request|booking|mandate|wayfinder)/.test(q)) {
+        const myPendingBookings = state.bookings.filter(
+          b => partnerPropIds.has(b.propertyId) && ['requested', 'checking'].includes(b.status),
+        );
+        const approvedCount = partnerProps.filter(p => p.status === 'approved').length;
+        return {
+          text: `Your Partner Workspace currently holds ${partnerProps.length} authorised listing(s) (${approvedCount} published) and ${myPendingBookings.length} booking request(s) awaiting availability confirmation.`,
+          links: [
+            { label: 'Open Booking Requests', to: '/partner/bookings' },
+            { label: 'My Properties & Availability', to: '/partner/properties' },
+            { label: 'Earnings & Commissions', to: '/partner/earnings' },
+            { label: 'Assignments & Mandates', to: '/partner/assignments' },
+          ],
+          note: 'Horatio only reads properties and bookings you are authorised to manage.',
+        };
+      }
+
+      // 3. Guest's own bookings / arrival / Wayfinder
+      if (/(my booking|arrival|wayfinder|check-in|checkin|paystack|status)/.test(q)) {
+        if (role === 'guest' && session) {
+          const myBookings = state.bookings.filter(b => b.guestId === session.userId);
+          if (myBookings.length === 0) {
+            return {
+              text: 'You do not have any recorded bookings on this guest account yet. Browse approved Lagos homes to send a booking request — zero payment is taken until the host confirms availability.',
+              links: [{ label: 'Explore Lagos stays', to: '/stays' }],
+            };
+          }
+          const awaiting = myBookings.filter(b => b.status === 'awaiting_payment').length;
+          const confirmed = myBookings.filter(b => b.status === 'confirmed');
+          return {
+            text: `You have ${myBookings.length} booking record(s): ${confirmed.length} confirmed and ${awaiting} awaiting payment within the 48-hour Paystack window.`,
+            links: [
+              { label: 'Open My Account & Bookings', to: '/account' },
+              ...confirmed.slice(0, 2).map(b => ({
+                label: `Wayfinder · ${b.ref}`,
+                to: `/wayfinder/${b.id}`,
+                meta: b.propertyTitle,
+              })),
+            ],
+            note: 'Exact entrance pins and check-in codes unlock only on confirmed bookings.',
+          };
+        }
+        return {
+          text: 'Every HAMLET booking follows four accountable steps: (1) Request dates & review house rules with zero card charge, (2) Host or HAMLET ops confirms availability, (3) 48-hour Paystack checkout window opens (confirmed only by signed server webhook), and (4) Wayfinder arrival guidance unlocks in your account.',
+          links: [
+            { label: 'How HAMLET works', to: '/how-it-works' },
+            { label: 'Sign in to view your bookings', to: '/signin' },
+          ],
+        };
+      }
+
+      // 4. Pricing, fees, FX buffer, or caution deposit questions
+      if (/(price|fee|markup|deposit|caution|usd|gbp|dollar|pound|currency|commission|owner)/.test(q)) {
+        return {
+          text: 'HAMLET uses one central pricing calculation across search, listing detail, checkout, and the ledger: Owners pay 0% and receive 100% of their listed NGN rate (B). Domestic guest accommodation is B × 1.20 (20% markup). USD ($) and GBP (£) stay quotes convert at the active configured FX rate plus a single 10% currency buffer, settling transparently in NGN via Paystack. Refundable caution deposits are itemised separately, never marked up or buffered, and refunded after post-checkout inspection review.',
+          links: [
+            { label: 'Fees & settlement policy', to: '/legal/pricing' },
+            { label: 'Partner commercial terms', to: '/partner/register' },
+          ],
+          note: 'Deposits are subject to post-checkout inspection review and are never described as instant or automatic.',
+        };
+      }
+
+      // 5. Verification, trust, safety, or refund questions
+      if (/(verif|trust|safe|pillar|refund|cancel|issue|scam)/.test(q)) {
+        return {
+          text: 'HAMLET records four verification pillars separately per listing — Ownership, Identity, Authority to list, and Physical Inspection — and labels unreviewed declarations honestly as self-reported or pending review. Refunds, cancellations, and disputes are handled by human operations reviewers against recorded booking terms.',
+          links: [
+            { label: 'Safety & guest protection', to: '/safety' },
+            { label: 'Trust & verification policy', to: '/legal/trust' },
+          ],
+        };
+      }
+
+      // 6. Property discovery by area, capacity, budget, power/Wi-Fi/workspace
+      const matchedArea =
+        LAGOS_AREAS.find(a => q.includes(a.toLowerCase())) ??
+        (q.includes('mainland')
+          ? 'Lagos Mainland'
+          : q.includes('vi ') || q.endsWith(' vi') || q === 'vi'
+            ? 'Victoria Island'
+            : q.includes('lekki')
+              ? 'Lekki Phase 1'
+              : '');
+
+      const wantsPower = /(power|inverter|generator|24\/7)/.test(q);
+      const wantsWifi = /(wifi|wi-fi|internet|work|remote|workspace)/.test(q);
+      const guestMatch = q.match(/(\d+)\s*(guest|people|person|bed)/);
+      const minCount = guestMatch ? Number(guestMatch[1]) : 1;
+      const isBedQuery = guestMatch?.[2]?.startsWith('bed') ?? false;
+
+      const matches = approvedProperties.filter(p => {
+        if (matchedArea && !matchesLagosAreaFilter(p, matchedArea)) return false;
+        if (wantsPower && !p.amenities.includes('24/7 Power') && !p.amenities.includes('Generator')) {
+          return false;
+        }
+        if (wantsWifi && !p.amenities.includes('Wifi') && !p.amenities.includes('Workspace')) {
+          return false;
+        }
+        if (isBedQuery ? p.bedrooms < minCount : p.capacity < minCount) return false;
+        return true;
+      });
+
+      if (approvedProperties.length === 0) {
+        return {
+          text: 'There are currently 0 published listings in this live environment while verified Lagos Mainland and Island homes complete manual document and inspection review. Horatio never invents availability or placeholder homes.',
+          links: [
+            { label: 'Explore Lagos neighbourhood guide', to: '/lagos' },
+            { label: 'Apply to list a Lagos property', to: '/partner/register' },
+          ],
+        };
+      }
+
+      if (matches.length > 0) {
+        const top = matches.slice(0, 3);
+        const searchParams = new URLSearchParams();
+        if (matchedArea) searchParams.set('area', matchedArea);
+        if (!isBedQuery && minCount > 1) searchParams.set('guests', String(minCount));
+
+        return {
+          text: `Found ${matches.length} approved Lagos stay${matches.length === 1 ? '' : 's'}${matchedArea ? ` matching ${matchedArea}` : ''} from live HAMLET inventory (prices shown in ${currency}):`,
+          links: [
+            ...top.map(p => ({
+              label: p.title,
+              to: `/stays/${p.id}`,
+              meta: `${p.area} · ${p.bedrooms} bd · up to ${p.capacity} guests · ${formatStayPrice(Math.round(p.nightlyRate * 1.2))}/night (+ ${formatNaira(p.deposit)} refundable deposit)`,
+            })),
+            {
+              label: `View all ${matches.length} matching stay${matches.length === 1 ? '' : 's'}`,
+              to: `/stays${searchParams.toString() ? `?${searchParams.toString()}` : ''}`,
+            },
+          ],
+          note: !backendConfigured
+            ? 'Demo seed mode active — listings above come from local seed data.'
+            : 'Live authorised inventory — final availability is confirmed by the host on request.',
+        };
+      }
+
+      return {
+        text: `No currently approved listings matched all of those criteria (${approvedProperties.length} approved home${approvedProperties.length === 1 ? '' : 's'} available across Lagos). Try broadening your area or amenity filter.`,
+        links: [
+          { label: `Browse all ${approvedProperties.length} approved stays`, to: '/stays' },
+          { label: 'Lagos Mainland & Island guide', to: '/lagos' },
+        ],
+      };
+    },
+    [
+      role,
+      session,
+      state.properties,
+      state.bookings,
+      state.issues,
+      state.applications,
+      state.ledger,
+      partnerProps,
+      partnerPropIds,
+      approvedProperties,
+      currency,
+      formatStayPrice,
+      backendConfigured,
+    ],
+  );
+
+  const submitQuery = useCallback(
+    (promptText: string) => {
+      const trimmed = promptText.trim();
+      if (!trimmed) return;
+      const reply = buildAnswer(trimmed);
+      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
+      setMessages(prev => [
+        ...prev,
+        { id: `u-${stamp}`, role: 'user', text: trimmed },
+        { id: `h-${stamp}`, role: 'horatio', ...reply },
+      ]);
+      setInput('');
+    },
+    [buildAnswer],
+  );
+
+  useEffect(() => {
+    if (isOpen && pendingPrompt) {
+      const promptToRun = pendingPrompt;
+      onConsumePrompt();
+      queueMicrotask(() => {
+        submitQuery(promptToRun);
+      });
+    }
+  }, [isOpen, pendingPrompt, onConsumePrompt, submitQuery]);
+
+  useEffect(() => {
+    if (!isOpen) return;
+    const onKey = (e: KeyboardEvent) => {
+      if (e.key === 'Escape') onClose();
+    };
+    window.addEventListener('keydown', onKey);
+    return () => window.removeEventListener('keydown', onKey);
+  }, [isOpen, onClose]);
+
+  if (!isOpen) return null;
+
+  const quickPrompts =
+    role === 'admin'
+      ? [
+          'Show Elsinore & The Watch queues',
+          'How do pricing & caution deposits work?',
+          'Show approved Lagos Mainland stays',
+        ]
+      : role === 'partner'
+        ? [
+            'Summarise my properties & booking requests',
+            'Explain partner commissions & 0% owner fee',
+            'How does verification work?',
+          ]
+        : [
+            'Stays in Lagos Mainland with 24/7 power',
+            'Stays in Victoria Island or Lekki',
+            'How do pricing, USD/GBP & deposits work?',
+            'How does the 48h booking hold work?',
+          ];
+
+  const onSubmit = (e: FormEvent) => {
+    e.preventDefault();
+    submitQuery(input);
+  };
+
+  return (
+    <div
+      className="fixed inset-0 z-50 flex justify-end"
+      role="dialog"
+      aria-modal="true"
+      aria-label="Horatio — HAMLET intelligent assistant"
+    >
+      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-xs" onClick={onClose} />
+      <aside className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden border-l border-ink-200 bg-paper shadow-2xl">
+        {/* Header */}
+        <div className="flex items-start justify-between gap-3 border-b border-ink-800 bg-ink-950 px-5 py-4 text-paper">
+          <div className="min-w-0">
+            <div className="flex items-center gap-2">
+              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brass-500 text-ink-950">
+                <Sparkles size={14} />
+              </span>
+              <span className="font-display text-lg font-bold tracking-wide text-white">
+                Horatio
+              </span>
+              <span className="rounded-full border border-brass-400/40 bg-brass-500/15 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-widest text-brass-300">
+                HAMLET Guide
+              </span>
+            </div>
+            <p className="mt-1 text-[11.5px] font-medium text-ink-300">
+              Live HAMLET stays, pricing &amp; booking help.
+            </p>
+          </div>
+          <button
+            type="button"
+            onClick={onClose}
+            aria-label="Close Horatio"
+            className="rounded-lg p-1.5 text-ink-300 transition hover:bg-ink-800 hover:text-white"
+          >
+            <X size={18} />
+          </button>
+        </div>
+
+        {/* Body */}
+        <div className="flex-1 space-y-4 overflow-y-auto overscroll-y-contain p-4 sm:p-5">
+          <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-2xs">
+            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink-500">
+              <ShieldCheck size={14} className="shrink-0 text-emerald-600" />
+              <span>Quick questions</span>
+            </div>
+            <div className="mt-2.5 flex flex-wrap gap-1.5">
+              {quickPrompts.map(prompt => (
+                <button
+                  key={prompt}
+                  type="button"
+                  onClick={() => submitQuery(prompt)}
+                  className="rounded-full border border-ink-200 bg-paper px-3 py-1.5 text-left text-[11px] font-bold text-ink-800 transition hover:border-brass-500 hover:bg-brass-200/30"
+                >
+                  {prompt}
+                </button>
+              ))}
+            </div>
+          </div>
+
+          {messages.map(msg =>
+            msg.role === 'user' ? (
+              <div key={msg.id} className="ml-8 rounded-2xl rounded-br-sm bg-ink-900 px-4 py-2.5 text-[13px] font-semibold text-white">
+                {msg.text}
+              </div>
+            ) : (
+              <div key={msg.id} className="mr-4 space-y-2.5 rounded-2xl rounded-bl-sm border border-ink-200 bg-white p-4 shadow-2xs">
+                <p className="text-[13px] leading-relaxed text-ink-800">{msg.text}</p>
+                {msg.links && msg.links.length > 0 && (
+                  <div className="space-y-1.5 pt-1">
+                    {msg.links.map(link => (
+                      <Link
+                        key={`${link.to}-${link.label}`}
+                        to={link.to}
+                        onClick={onClose}
+                        className="group flex items-center justify-between gap-2 rounded-xl border border-ink-100 bg-paper/70 px-3 py-2.5 transition hover:border-brass-500 hover:bg-white"
+                      >
+                        <div className="min-w-0">
+                          <p className="truncate text-[12.5px] font-bold text-ink-900 group-hover:text-ink-950">
+                            {link.label}
+                          </p>
+                          {link.meta && (
+                            <p className="mt-0.5 truncate text-[11px] font-medium text-ink-500">
+                              {link.meta}
+                            </p>
+                          )}
+                        </div>
+                        <ArrowRight size={14} className="shrink-0 text-brass-600 transition group-hover:translate-x-0.5" />
+                      </Link>
+                    ))}
+                  </div>
+                )}
+                {msg.note && (
+                  <p className="border-t border-ink-100 pt-2 text-[10.5px] font-medium text-ink-500">
+                    {msg.note}
+                  </p>
+                )}
+              </div>
+            ),
+          )}
+        </div>
+
+        {/* Footer input */}
+        <form onSubmit={onSubmit} className="border-t border-ink-200 bg-white p-3.5">
+          <div className="flex items-center gap-2">
+            <input
+              type="text"
+              value={input}
+              onChange={e => setInput(e.target.value)}
+              placeholder="Ask Horatio about stays, areas, pricing…"
+              aria-label="Ask Horatio"
+              className="input !py-2.5 text-[13px]"
+            />
+            <button
+              type="submit"
+              disabled={!input.trim()}
+              aria-label="Send question to Horatio"
+              className="btn-dark !px-3.5 !py-2.5"
+            >
+              <Send size={15} />
+            </button>
+          </div>
+          <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-ink-400">
+            <span className="inline-flex items-center gap-1">
+              <Compass size={11} className="shrink-0" /> Suggestion & discovery only
+            </span>
+            <span className="inline-flex items-center gap-1">
+              <Building2 size={11} className="shrink-0" /> HAMLET · Abundance Abodes
+            </span>
+          </div>
+        </form>
+      </aside>
+    </div>
+  );
+}
```

### `src/components/Logo.tsx` (Modified)

```diff
diff --git a/src/components/Logo.tsx b/src/components/Logo.tsx
index 62e763c..08a6e85 100644
--- a/src/components/Logo.tsx
+++ b/src/components/Logo.tsx
@@ -1,12 +1,67 @@
-export function HamletMark({ size = 34, light = false }: { size?: number; light?: boolean }) {
+import { useId } from 'react';
+
+export function HamletMark({
+  size = 34,
+  light = false,
+  contained = false,
+}: {
+  size?: number;
+  light?: boolean;
+  contained?: boolean;
+}) {
+  const rawId = useId();
+  const gradId = `hamlet-gold-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
+  const stemFill = contained || light ? '#FFFFFF' : '#0E1F3B';
+
   return (
-    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" className="shrink-0">
-      {/* Stylised gabled shortlet residence under the Lagos sun */}
-      <rect x="3" y="3" width="42" height="42" rx="12" fill={light ? '#C9A227' : '#101D16'} />
-      <circle cx="24" cy="13.5" r="3.1" fill={light ? '#101D16' : '#C9A227'} />
-      <path d="M10 28.5 24 15l14 13.5" stroke="#FAF8F3" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
-      <path d="M14.5 27v9.5h19V27" stroke="#FAF8F3" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
-      <path d="M21.5 36.5v-5.2a2.5 2.5 0 0 1 5 0v5.2" stroke="#C9A227" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
+    <svg
+      width={size}
+      height={size}
+      viewBox="0 0 64 64"
+      fill="none"
+      aria-hidden="true"
+      className="shrink-0"
+    >
+      <defs>
+        <linearGradient id={gradId} x1="12" y1="31.8" x2="52" y2="31.8" gradientUnits="userSpaceOnUse">
+          <stop offset="0%" stopColor="#946E21" />
+          <stop offset="16%" stopColor="#C9A44A" />
+          <stop offset="38%" stopColor="#E1C26E" />
+          <stop offset="52%" stopColor="#F6E5AB" />
+          <stop offset="68%" stopColor="#C9A44A" />
+          <stop offset="86%" stopColor="#B68E35" />
+          <stop offset="100%" stopColor="#8E691E" />
+        </linearGradient>
+      </defs>
+
+      {contained && <rect x="2" y="2" width="60" height="60" rx="14" fill="#0E1F3B" />}
+
+      <g transform={contained ? 'translate(5.12 5.12) scale(0.84)' : undefined}>
+        {/* Left bracketed serif pillar */}
+        <path
+          d="M6.5 7H26.5V9.2C22.4 9.3 21 11.5 21 16.6V47.4C21 52.5 22.4 54.7 26.5 54.8V57H6.5V54.8C10.6 54.7 12 52.5 12 47.4V16.6C12 11.5 10.6 9.3 6.5 9.2V7Z"
+          fill={stemFill}
+        />
+
+        {/* Right bracketed serif pillar */}
+        <path
+          d="M37.5 7H57.5V9.2C53.4 9.3 52 11.5 52 16.6V47.4C52 52.5 53.4 54.7 57.5 54.8V57H37.5V54.8C41.6 54.7 43 52.5 43 47.4V16.6C43 11.5 41.6 9.3 37.5 9.2V7Z"
+          fill={stemFill}
+        />
+
+        {/* Subtle sculptural shadow where the gold clasp embraces the vertical pillars */}
+        <path
+          d="M12 20.4C13.3 25.4 16.6 28.1 21 28.1V35.5C16.6 35.5 13.3 38.2 12 43.2V20.4ZM52 20.4V43.2C50.7 38.2 47.4 35.5 43 35.5V28.1C47.4 28.1 50.7 25.4 52 20.4Z"
+          fill="#060F1E"
+          fillOpacity={contained || light ? '0.28' : '0.36'}
+        />
+
+        {/* Signature Champagne Gold curved-clasp crossbar */}
+        <path
+          d="M12 21.4C13.2 26.2 16.5 28.8 21 28.8H43C47.5 28.8 50.8 26.2 52 21.4V42.2C50.8 37.4 47.5 34.8 43 34.8H21C16.5 34.8 13.2 37.4 12 42.2V21.4Z"
+          fill={`url(#${gradId})`}
+        />
+      </g>
     </svg>
   );
 }
@@ -15,7 +70,11 @@ export function HamletWordmark({ light = false }: { light?: boolean }) {
   return (
     <span className="inline-flex shrink-0 items-center gap-2">
       <HamletMark size={30} light={light} />
-      <span className={`font-display text-[20px] font-black tracking-tight sm:text-[22px] ${light ? 'text-ink-50' : 'text-ink-900'}`}>
+      <span
+        className={`font-display text-[20px] font-bold tracking-[0.06em] sm:text-[22px] ${
+          light ? 'text-white' : 'text-ink-900'
+        }`}
+      >
         HAMLET<span className="text-brass-500">.</span>
       </span>
     </span>
```

### `src/components/Navbar.tsx` (Modified)

```diff
diff --git a/src/components/Navbar.tsx b/src/components/Navbar.tsx
index e338f86..4f8c6ed 100644
--- a/src/components/Navbar.tsx
+++ b/src/components/Navbar.tsx
@@ -1,28 +1,52 @@
 import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
-import { useState } from 'react';
-import { Menu, X, User, LogOut, LayoutDashboard, ChevronDown } from 'lucide-react';
+import { useState, type ReactNode } from 'react';
+import {
+  Menu,
+  X,
+  User,
+  LogOut,
+  LayoutDashboard,
+  ChevronDown,
+  Heart,
+  Sparkles,
+} from 'lucide-react';
 import { HamletWordmark } from './Logo';
 import { CurrencyToggle } from './CurrencyToggle';
+import { useHoratio } from './HoratioDrawer';
 import { useHamlet } from '../lib/store';
 import { useToast } from '../lib/toast';
-import { HAMLET_TAGLINE } from '../lib/brand';
+import { useWishlist } from '../lib/wishlist';
+import {
+  HAMLET_BRAND_NAME,
+  HAMLET_PARENT_COMPANY,
+  HAMLET_TAGLINE,
+  HAMLET_USP,
+} from '../lib/brand';
 import { buildAuthPath } from '../lib/authRedirect';
 
 export function GuestNavbar() {
   const { state, signOut } = useHamlet();
   const { toast } = useToast();
+  const { savedIds } = useWishlist();
+  const { openHoratio } = useHoratio();
   const [open, setOpen] = useState(false);
   const [menu, setMenu] = useState(false);
   const navigate = useNavigate();
   const location = useLocation();
   const s = state.session;
-  const dashboardPath = s?.role === 'admin' ? '/admin' : s?.role === 'partner' ? '/partner' : '/account';
+  const dashboardPath =
+    s?.role === 'admin' ? '/admin' : s?.role === 'partner' ? '/partner' : '/account';
   const propertyRedirect = location.pathname.startsWith('/stays/')
     ? `${location.pathname}${location.search}`
     : null;
   const signUpHref = buildAuthPath({ signup: true, redirect: propertyRedirect });
   const signInHref = buildAuthPath({ signup: false, redirect: propertyRedirect });
 
+  const approvedIdSet = new Set(
+    state.properties.filter(p => p.status === 'approved').map(p => p.id),
+  );
+  const savedCount = savedIds.filter(id => approvedIdSet.has(id)).length;
+
   const nav = [
     { to: '/stays', label: 'Explore stays' },
     { to: '/lagos', label: 'Lagos' },
@@ -32,26 +56,83 @@ export function GuestNavbar() {
   ];
 
   return (
-    <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-paper/90 backdrop-blur-xl">
-      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
-        <Link to="/" aria-label="HAMLET home" className="shrink-0"><HamletWordmark /></Link>
-        <nav className="hidden items-center gap-6 lg:flex">
-          {nav.map(n => (
-            <NavLink key={n.to} to={n.to} className={({ isActive }) => `text-[13px] font-semibold transition hover:text-jade-700 ${isActive ? 'text-jade-700' : 'text-ink-600'}`}>{n.label}</NavLink>
-          ))}
-        </nav>
+    <header className="sticky top-0 z-40 border-b border-ink-100/90 bg-paper/92 backdrop-blur-xl">
+      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2.5 px-4 sm:px-6">
+        <div className="flex items-center gap-6">
+          <Link to="/" aria-label="HAMLET home" className="shrink-0">
+            <HamletWordmark />
+          </Link>
+          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
+            {nav.map(n => (
+              <NavLink
+                key={n.to}
+                to={n.to}
+                className={({ isActive }) =>
+                  `rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
+                    isActive
+                      ? 'bg-ink-900 text-white shadow-2xs'
+                      : 'text-ink-600 hover:bg-white/80 hover:text-ink-900'
+                  }`
+                }
+              >
+                {n.label}
+              </NavLink>
+            ))}
+          </nav>
+        </div>
+
         <div className="flex items-center gap-2">
           <CurrencyToggle className="hidden sm:inline-flex" />
           <CurrencyToggle variant="compact" className="sm:hidden" />
 
-          <Link to="/partner/register" className="hidden items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-[12px] font-bold text-ink-800 transition hover:border-jade-400 hover:text-jade-800 xl:inline-flex">
-            <LayoutDashboard size={14} className="shrink-0" /> Join as a partner
+          <button
+            type="button"
+            onClick={() => openHoratio()}
+            aria-label="Ask Horatio — HAMLET assistant"
+            className="hidden items-center gap-1.5 rounded-full border border-brass-400/60 bg-white px-3 py-1.5 text-[12px] font-bold text-ink-900 shadow-2xs transition hover:border-brass-500 hover:bg-brass-200/25 md:inline-flex [&>svg]:shrink-0"
+          >
+            <Sparkles size={13} className="text-brass-600" />
+            <span>Horatio</span>
+          </button>
+
+          <Link
+            to={savedCount > 0 ? '/stays?saved=1' : '/stays'}
+            aria-label={`Saved stays (${savedCount})`}
+            title="Saved stays"
+            className="hidden items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[12px] font-bold text-ink-800 transition hover:border-ink-400 sm:inline-flex [&>svg]:shrink-0"
+          >
+            <Heart
+              size={13}
+              className={savedCount > 0 ? 'fill-brass-500 text-brass-600' : 'text-ink-500'}
+            />
+            <span className="tabular-nums">{savedCount}</span>
           </Link>
+
+          <Link
+            to="/partner/register"
+            className="hidden items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-[12px] font-bold text-ink-800 transition hover:border-brass-500 hover:text-ink-950 xl:inline-flex [&>svg]:shrink-0"
+          >
+            <LayoutDashboard size={13} className="text-brass-600" />
+            <span>Partner with us</span>
+          </Link>
+
           {s ? (
             <div className="relative">
-              <button onClick={() => setMenu(v => !v)} className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white py-1.5 pl-1.5 pr-2 transition hover:border-ink-400">
-                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-jade-700 text-[11px] font-black text-white">{s.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
-                <span className="hidden max-w-28 truncate text-[12px] font-bold text-ink-800 sm:block">{s.name.split(' ')[0]}</span>
+              <button
+                type="button"
+                onClick={() => setMenu(v => !v)}
+                className="flex items-center gap-2 rounded-full border border-ink-200 bg-white py-1 pl-1 pr-2.5 transition hover:border-ink-400"
+              >
+                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-black text-white">
+                  {s.name
+                    .split(' ')
+                    .map(w => w[0])
+                    .slice(0, 2)
+                    .join('')}
+                </span>
+                <span className="hidden max-w-28 truncate text-[12px] font-bold text-ink-800 sm:block">
+                  {s.name.split(' ')[0]}
+                </span>
                 <ChevronDown size={14} className="shrink-0 text-ink-400" />
               </button>
               {menu && (
@@ -60,49 +141,162 @@ export function GuestNavbar() {
                   <div className="absolute right-0 z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-xl">
                     <div className="border-b border-ink-50 px-4 py-3">
                       <p className="truncate text-sm font-bold text-ink-900">{s.name}</p>
-                      <p className="truncate text-[11px] text-ink-500">{s.email} · {s.role}</p>
+                      <p className="truncate text-[11px] text-ink-500">
+                        {s.email} · {s.role}
+                      </p>
                     </div>
-                    <button onClick={() => { setMenu(false); navigate(dashboardPath); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-ink-800 hover:bg-ink-50"><LayoutDashboard size={15} className="shrink-0" />{s.role === 'admin' ? 'Admin console' : s.role === 'partner' ? 'Open partner workspace' : 'My bookings'}</button>
-                    {s.role === 'guest' && <button onClick={() => { setMenu(false); navigate('/account'); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-ink-800 hover:bg-ink-50"><User size={15} className="shrink-0" />Account & support</button>}
-                    <button onClick={async () => {
-                      setMenu(false);
-                      try {
-                        await signOut();
-                        toast('Signed out', 'info');
-                        navigate('/');
-                      } catch (error) {
-                        toast(error instanceof Error ? error.message : 'Could not sign out.', 'error');
-                      }
-                    }} className="flex w-full items-center gap-2.5 border-t border-ink-50 px-4 py-2.5 text-[13px] font-semibold text-red-700 hover:bg-red-50"><LogOut size={15} className="shrink-0" />Sign out</button>
+                    <button
+                      type="button"
+                      onClick={() => {
+                        setMenu(false);
+                        navigate(dashboardPath);
+                      }}
+                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-ink-800 hover:bg-ink-50"
+                    >
+                      <LayoutDashboard size={15} className="shrink-0" />
+                      {s.role === 'admin'
+                        ? 'Admin console (Elsinore)'
+                        : s.role === 'partner'
+                          ? 'Open partner workspace'
+                          : 'My bookings'}
+                    </button>
+                    {s.role === 'guest' && (
+                      <button
+                        type="button"
+                        onClick={() => {
+                          setMenu(false);
+                          navigate('/account');
+                        }}
+                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-ink-800 hover:bg-ink-50"
+                      >
+                        <User size={15} className="shrink-0" />
+                        Account & support
+                      </button>
+                    )}
+                    <button
+                      type="button"
+                      onClick={async () => {
+                        setMenu(false);
+                        try {
+                          await signOut();
+                          toast('Signed out', 'info');
+                          navigate('/');
+                        } catch (error) {
+                          toast(
+                            error instanceof Error ? error.message : 'Could not sign out.',
+                            'error',
+                          );
+                        }
+                      }}
+                      className="flex w-full items-center gap-2.5 border-t border-ink-50 px-4 py-2.5 text-[13px] font-semibold text-red-700 hover:bg-red-50"
+                    >
+                      <LogOut size={15} className="shrink-0" />
+                      Sign out
+                    </button>
                   </div>
                 </>
               )}
             </div>
           ) : (
-            <div className="flex items-center gap-2">
-              <Link to={signUpHref} className="hidden rounded-xl border border-jade-200 bg-jade-50 px-3.5 py-2 text-[12px] font-bold text-jade-800 transition hover:border-jade-400 hover:bg-jade-100 sm:inline-flex">
+            <div className="flex items-center gap-1.5">
+              <Link
+                to={signUpHref}
+                className="hidden rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-[12px] font-bold text-ink-900 transition hover:border-ink-400 hover:bg-ink-50 sm:inline-flex"
+              >
                 Create account
               </Link>
-              <Link to={signInHref} className="btn-dark !px-3.5 !py-2 text-[12px] sm:!px-4">Sign in</Link>
+              <Link to={signInHref} className="btn-dark !rounded-full !px-3.5 !py-2 text-[12px] sm:!px-4">
+                Sign in
+              </Link>
             </div>
           )}
-          <button className="shrink-0 rounded-xl border border-ink-200 p-2 lg:hidden" onClick={() => setOpen(v => !v)} aria-label="Menu">
+
+          <button
+            type="button"
+            className="shrink-0 rounded-xl border border-ink-200 bg-white p-2 text-ink-900 lg:hidden"
+            onClick={() => setOpen(v => !v)}
+            aria-label="Menu"
+            aria-expanded={open}
+          >
             {open ? <X size={18} /> : <Menu size={18} />}
           </button>
         </div>
       </div>
+
       {open && (
-        <div className="border-t border-ink-100 bg-paper px-4 py-4 lg:hidden">
-          <div className="mb-3 flex items-center justify-between rounded-xl border border-ink-100 bg-white px-3 py-2 sm:hidden">
+        <div className="border-t border-ink-100 bg-paper px-4 py-4 shadow-lg lg:hidden">
+          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink-100 bg-white px-3.5 py-2.5">
             <span className="text-[11.5px] font-bold text-ink-600">Stay currency</span>
             <CurrencyToggle />
           </div>
+          <div className="mb-3 grid grid-cols-2 gap-2">
+            <button
+              type="button"
+              onClick={() => {
+                setOpen(false);
+                openHoratio();
+              }}
+              className="flex items-center justify-center gap-1.5 rounded-xl border border-brass-400/60 bg-white px-3 py-2.5 text-xs font-bold text-ink-900"
+            >
+              <Sparkles size={14} className="shrink-0 text-brass-600" />
+              Ask Horatio
+            </button>
+            <Link
+              to={savedCount > 0 ? '/stays?saved=1' : '/stays'}
+              onClick={() => setOpen(false)}
+              className="flex items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-xs font-bold text-ink-800"
+            >
+              <Heart
+                size={14}
+                className={`shrink-0 ${savedCount > 0 ? 'fill-brass-500 text-brass-600' : 'text-ink-500'}`}
+              />
+              Saved ({savedCount})
+            </Link>
+          </div>
           <div className="flex flex-col gap-1">
-            {nav.map(n => <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">{n.label}</Link>)}
-            <Link to="/about" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">About HAMLET</Link>
-            <Link to="/partner/register" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-jade-800 hover:bg-jade-50"><LayoutDashboard size={15} className="shrink-0" /> Join HAMLET as a partner</Link>
-            {!s && <Link to={signUpHref} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-jade-800 hover:bg-jade-50">Create guest account</Link>}
-            {!s && <Link to={signInHref} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">Sign in</Link>}
+            {nav.map(n => (
+              <Link
+                key={n.to}
+                to={n.to}
+                onClick={() => setOpen(false)}
+                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-800 hover:bg-white"
+              >
+                {n.label}
+              </Link>
+            ))}
+            <Link
+              to="/about"
+              onClick={() => setOpen(false)}
+              className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-800 hover:bg-white"
+            >
+              About HAMLET
+            </Link>
+            <Link
+              to="/partner/register"
+              onClick={() => setOpen(false)}
+              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-900 hover:bg-white"
+            >
+              <LayoutDashboard size={15} className="shrink-0 text-brass-600" />
+              Join HAMLET as a partner
+            </Link>
+            {!s && (
+              <Link
+                to={signUpHref}
+                onClick={() => setOpen(false)}
+                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-900 hover:bg-white"
+              >
+                Create guest account
+              </Link>
+            )}
+            {!s && (
+              <Link
+                to={signInHref}
+                onClick={() => setOpen(false)}
+                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-white"
+              >
+                Sign in
+              </Link>
+            )}
           </div>
         </div>
       )}
@@ -112,53 +306,66 @@ export function GuestNavbar() {
 
 export function Footer() {
   return (
-    <footer className="border-t border-ink-100 bg-ink-950 text-ink-200">
-      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
-        <div className="grid gap-10 md:grid-cols-12">
+    <footer className="border-t border-ink-800 bg-ink-950 text-ink-200">
+      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
+        <div className="grid gap-8 md:grid-cols-12">
           <div className="md:col-span-4">
             <HamletWordmark light />
-            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-ink-300">
-              <strong className="text-paper">{HAMLET_TAGLINE}</strong> You have plans to make. We help you find a place to stay in Lagos, understand what you’re booking, and arrive with fewer unanswered questions.
+            <p className="mt-3 max-w-xs text-[13px] font-medium leading-relaxed text-ink-300">
+              {HAMLET_BRAND_NAME} — {HAMLET_USP}
+            </p>
+            <p className="mt-2 text-[11px] font-semibold text-ink-400">
+              By {HAMLET_PARENT_COMPANY} · Lagos
             </p>
-            <p className="mt-3 text-[11px] font-semibold text-ink-400">HAMLET · By Abundance Abodes</p>
           </div>
+
           <div className="md:col-span-3">
-            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brass-400">Discover & book</p>
+            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brass-400">
+              Lagos stays
+            </p>
             <ul className="mt-3 space-y-2 text-[13px] font-medium">
-              <li><Link to="/stays" className="hover:text-white">Explore available stays</Link></li>
-              <li><Link to="/stays?area=Lagos+Mainland" className="hover:text-white">Lagos Mainland (Yaba, Surulere, Shomolu)</Link></li>
-              <li><Link to="/lagos" className="hover:text-white">Lagos neighbourhood guide</Link></li>
-              <li><Link to="/how-it-works" className="hover:text-white">How HAMLET works</Link></li>
-              <li><Link to="/account" className="hover:text-white">Get help with your stay</Link></li>
+              <li><Link to="/stays" className="transition hover:text-white">All stays</Link></li>
+              <li><Link to="/stays?area=Lagos+Mainland" className="transition hover:text-white">Lagos Mainland</Link></li>
+              <li><Link to="/stays?area=Victoria+Island" className="transition hover:text-white">Victoria Island & Ikoyi</Link></li>
+              <li><Link to="/stays?area=Lekki+Phase+1" className="transition hover:text-white">Lekki & Ajah</Link></li>
+              <li><Link to="/lagos" className="transition hover:text-white">Area guide</Link></li>
             </ul>
           </div>
+
           <div className="md:col-span-2">
-            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brass-400">Company & trust</p>
+            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brass-400">
+              Guests
+            </p>
             <ul className="mt-3 space-y-2 text-[13px] font-medium">
-              <li><Link to="/about" className="hover:text-white">About HAMLET</Link></li>
-              <li><Link to="/safety" className="hover:text-white">Safety & protection</Link></li>
-              <li><Link to="/faqs" className="hover:text-white">Booking FAQs</Link></li>
-              <li><Link to="/legal/trust" className="hover:text-white">Verification policy</Link></li>
+              <li><Link to="/how-it-works" className="transition hover:text-white">How it works</Link></li>
+              <li><Link to="/safety" className="transition hover:text-white">Safety</Link></li>
+              <li><Link to="/about" className="transition hover:text-white">About</Link></li>
+              <li><Link to="/faqs" className="transition hover:text-white">FAQs</Link></li>
+              <li><Link to="/account" className="transition hover:text-white">My bookings</Link></li>
             </ul>
           </div>
+
           <div className="md:col-span-3">
-            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brass-400">Property partners</p>
+            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brass-400">
+              Partners
+            </p>
             <ul className="mt-3 space-y-2 text-[13px] font-medium">
-              <li><Link to="/partner/register" className="hover:text-white">Join HAMLET as a partner</Link></li>
-              <li><Link to="/signin" className="hover:text-white">Open partner workspace</Link></li>
-              <li><Link to="/legal/pricing" className="hover:text-white">Fees & settlement</Link></li>
+              <li><Link to="/partner/register" className="transition hover:text-white">List a property (0% fee)</Link></li>
+              <li><Link to="/signin" className="transition hover:text-white">Partner sign in</Link></li>
+              <li><Link to="/legal/pricing" className="transition hover:text-white">Pricing & fees</Link></li>
+              <li><Link to="/legal/trust" className="transition hover:text-white">Verification rules</Link></li>
             </ul>
           </div>
         </div>
-        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-ink-800 pt-6 text-[11.5px] text-ink-400 sm:flex-row sm:items-center">
+
+        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-ink-800 pt-5 text-[11.5px] text-ink-400 sm:flex-row sm:items-center">
           <p>© 2026 HAMLET Marketplace Ltd · {HAMLET_TAGLINE}</p>
           <div className="flex flex-wrap items-center gap-4">
-            <Link to="/legal/privacy" className="hover:text-white">Privacy & data</Link>
-            <Link to="/legal/terms" className="hover:text-white">Booking terms</Link>
-            <Link to="/safety" className="hover:text-white">Guest protection</Link>
-            <Link to="/faqs" className="hover:text-white">FAQs</Link>
-            <a href="/llms.txt" className="hover:text-white">LLMs.txt</a>
-            <a href="/sitemap.xml" className="hover:text-white">Sitemap</a>
+            <Link to="/legal/privacy" className="transition hover:text-white">Privacy</Link>
+            <Link to="/legal/terms" className="transition hover:text-white">Terms</Link>
+            <Link to="/legal/pricing" className="transition hover:text-white">Fees</Link>
+            <a href="/llms.txt" className="transition hover:text-white">LLMs.txt</a>
+            <a href="/sitemap.xml" className="transition hover:text-white">Sitemap</a>
           </div>
         </div>
       </div>
@@ -166,7 +373,7 @@ export function Footer() {
   );
 }
 
-export function GuestLayout({ children }: { children: React.ReactNode }) {
+export function GuestLayout({ children }: { children: ReactNode }) {
   return (
     <div className="flex min-h-screen flex-col bg-paper">
       <GuestNavbar />
```

### `src/components/PropertyCard.tsx` (Modified)

```diff
diff --git a/src/components/PropertyCard.tsx b/src/components/PropertyCard.tsx
index 705c92f..9ac1975 100644
--- a/src/components/PropertyCard.tsx
+++ b/src/components/PropertyCard.tsx
@@ -1,14 +1,30 @@
 import { Link } from 'react-router-dom';
-import { Users, BedDouble, Bath, ShieldCheck, Wifi, Zap, ArrowRight, CalendarClock, Compass, MapPin } from 'lucide-react';
+import {
+  Users,
+  BedDouble,
+  Bath,
+  ShieldCheck,
+  Zap,
+  ArrowUpRight,
+  CalendarClock,
+  Heart,
+} from 'lucide-react';
 import type { Property } from '../lib/types';
 import { estimateAllInclusiveNightly } from '../lib/pricing';
 import { computePropertyAvailabilitySummary } from '../lib/availability';
+import { isMainlandProperty } from '../lib/areas';
 import { useCurrency } from '../lib/currency';
 import { useHamlet } from '../lib/store';
+import { useWishlist } from '../lib/wishlist';
+import { useToast } from '../lib/toast';
 
 export function PropertyCard({ p, searchQuery }: { p: Property; searchQuery?: string }) {
   const { state } = useHamlet();
   const { formatStayPrice, currency, activeRateIsAvailable } = useCurrency();
+  const { isSaved, toggleSaved } = useWishlist();
+  const { toast } = useToast();
+
+  const saved = isSaved(p.id);
   const guestNightlyNgn = Math.round(p.nightlyRate * 1.2);
   const est = estimateAllInclusiveNightly(p);
 
@@ -32,125 +48,148 @@ export function PropertyCard({ p, searchQuery }: { p: Property; searchQuery?: st
 
   const verificationLabel =
     p.verification.inspection === 'verified'
-      ? 'HAMLET verified · Inspected'
+      ? 'Verified'
       : hasVerifiedPillar
-        ? 'HAMLET verified · Docs reviewed'
+        ? 'Docs reviewed'
         : null;
 
+  const corridorLabel = isMainlandProperty(p) ? 'Mainland' : 'Island';
   const hasPowerBackup = p.amenities.includes('24/7 Power') || p.amenities.includes('Generator');
-  const hasWifi = p.amenities.includes('Wifi');
-  const checkInRule = p.houseRules.find(r => r.toLowerCase().includes('check-in'));
-  const hasVerifiedEntrance = p.locationAccuracy === 'verified_entrance';
-  const publicLandmark = p.publicLandmarks?.[0];
+  const powerLabel = p.amenities.includes('24/7 Power')
+    ? '24/7 Power'
+    : p.amenities.includes('Generator')
+      ? 'Backup Power'
+      : null;
 
-  const badgeTone =
+  const availabilityPillTone =
     availability.selectedDatesStatus === 'unavailable'
-      ? 'border-red-200 bg-red-50 text-red-800'
-      : availability.currentStatus === 'currently_booked' || availability.currentStatus === 'currently_unavailable'
-        ? 'border-amber-200 bg-amber-50 text-amber-900'
-        : availability.selectedDatesStatus === 'needs_confirmation'
-          ? 'border-ink-200 bg-ink-50 text-ink-700'
-          : 'border-jade-200 bg-jade-50 text-jade-900';
+      ? 'border-red-200/90 bg-red-50/95 text-red-900'
+      : availability.currentStatus === 'currently_booked' ||
+          availability.currentStatus === 'currently_unavailable'
+        ? 'border-amber-200/90 bg-amber-50/95 text-amber-950'
+        : 'border-emerald-200/90 bg-emerald-50/95 text-emerald-900';
 
   return (
     <Link
       to={`/stays/${p.id}${searchQuery ? `?${searchQuery}` : ''}`}
-      className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-16px_rgba(16,29,22,0.35)]"
+      className="group flex flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-[0_1px_2px_rgba(14,31,59,0.05),0_12px_28px_-14px_rgba(14,31,59,0.16)] transition duration-300 hover:-translate-y-1 hover:border-ink-200 hover:shadow-[0_24px_48px_-18px_rgba(14,31,59,0.28)]"
     >
-      <div className="relative h-52 overflow-hidden">
+      {/* Image Header */}
+      <div className="relative aspect-[16/11] w-full overflow-hidden bg-clay">
         <img
           src={p.images[0]}
           alt={p.title}
           className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
           loading="lazy"
         />
-        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/75 via-transparent to-transparent" />
-        {verificationLabel && (
-          <span className="absolute left-3 top-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full bg-ink-950/75 py-1 pl-1.5 pr-2.5 text-[10.5px] font-bold text-brass-300 backdrop-blur">
-            <ShieldCheck size={12} className="shrink-0" />
-            <span className="truncate">{verificationLabel}</span>
+        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink-950/65 to-transparent" />
+
+        {/* Top badges + Save toggle */}
+        <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
+          <span
+            className={`inline-flex max-w-[calc(100%-3rem)] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-extrabold shadow-xs backdrop-blur-md ${availabilityPillTone}`}
+          >
+            <CalendarClock size={11} className="shrink-0" />
+            <span className="truncate">{availability.primaryBadgeLabel}</span>
+          </span>
+
+          <button
+            type="button"
+            aria-label={saved ? `Remove ${p.title} from saved stays` : `Save ${p.title}`}
+            onClick={event => {
+              event.preventDefault();
+              event.stopPropagation();
+              const nowSaved = toggleSaved(p.id);
+              toast(nowSaved ? 'Saved to your shortlist.' : 'Removed from saved stays.', 'info');
+            }}
+            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/30 bg-ink-950/55 text-white backdrop-blur-md transition hover:bg-ink-950/80"
+          >
+            <Heart
+              size={14}
+              className={saved ? 'fill-brass-400 text-brass-400' : 'text-white'}
+            />
+          </button>
+        </div>
+
+        {/* Bottom overlay: Verification + Corridor */}
+        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-1.5">
+          {verificationLabel ? (
+            <span className="inline-flex items-center gap-1.5 rounded-full border border-brass-400/45 bg-ink-950/80 py-1 pl-2 pr-2.5 text-[10.5px] font-bold text-brass-300 backdrop-blur-md">
+              <ShieldCheck size={12} className="shrink-0 text-brass-400" />
+              <span className="truncate">{verificationLabel}</span>
+            </span>
+          ) : (
+            <span className="inline-flex items-center gap-1 rounded-full bg-ink-950/75 px-2.5 py-1 text-[10px] font-semibold text-ink-200 backdrop-blur-md">
+              {p.trustLabel}
+            </span>
+          )}
+          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-900 backdrop-blur-md">
+            {p.type}
           </span>
-        )}
-        <span className="absolute bottom-3 left-3 right-3 truncate text-[11px] font-bold uppercase tracking-[0.14em] text-white/95">
-          {p.area} · Lagos
-        </span>
+        </div>
       </div>
 
-      <div className="flex flex-1 flex-col p-4">
-        <div className="mb-2 flex flex-wrap items-center gap-1.5">
-          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold ${badgeTone}`}>
-            <CalendarClock size={11} className="shrink-0" />
-            <span>{availability.primaryBadgeLabel}</span>
+      {/* Card Body */}
+      <div className="flex flex-1 flex-col p-4 sm:p-5">
+        <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.13em] text-ink-500">
+          <span className="truncate">
+            {p.area} · {corridorLabel}
           </span>
-          {(availability.currentStatus === 'currently_booked' || availability.currentStatus === 'currently_unavailable') &&
+          {(availability.currentStatus === 'currently_booked' ||
+            availability.currentStatus === 'currently_unavailable') &&
             availability.nextAvailableLabel &&
             availability.primaryBadgeLabel !== availability.nextAvailableLabel && (
-              <span className="inline-flex items-center rounded-full border border-jade-200 bg-jade-50/70 px-2.5 py-0.5 text-[10px] font-bold text-jade-800">
+              <span className="shrink-0 font-semibold normal-case tracking-normal text-emerald-700">
                 {availability.nextAvailableLabel}
               </span>
             )}
         </div>
 
-        <h3 className="min-h-[2.6rem] line-clamp-2 font-display text-[16px] font-bold leading-snug text-ink-900">
+        <h3 className="mt-1.5 line-clamp-2 min-h-[2.7rem] font-display text-[17px] font-bold leading-snug text-ink-900 transition group-hover:text-jade-800">
           {p.title}
         </h3>
 
-        {publicLandmark && (
-          <p className="mt-1 flex items-center gap-1 truncate text-[11px] font-medium text-ink-500">
-            <MapPin size={11} className="shrink-0 text-jade-700" />
-            <span className="truncate">{publicLandmark}</span>
-          </p>
-        )}
-
-        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-medium text-ink-500">
-          <span className="inline-flex items-center gap-1"><BedDouble size={13} className="shrink-0" />{p.bedrooms} bd</span>
-          <span className="inline-flex items-center gap-1"><Bath size={13} className="shrink-0" />{p.bathrooms} ba</span>
-          <span className="inline-flex items-center gap-1"><Users size={13} className="shrink-0" />{p.capacity} guests</span>
-        </div>
-
-        <div className="mt-2 flex flex-wrap items-center gap-1.5">
-          {hasVerifiedEntrance && (
-            <span className="inline-flex items-center gap-1 rounded-md border border-jade-200 bg-jade-50/70 px-2 py-0.5 text-[10.5px] font-bold text-jade-800">
-              <Compass size={11} className="shrink-0 text-jade-700" />
-              {p.wayfinderStatus === 'guide_ready' ? 'Wayfinder ready' : 'Entrance verified'}
-            </span>
-          )}
-          {hasPowerBackup && (
-            <span className="inline-flex items-center gap-1 rounded-md border border-ink-100 bg-ink-50/70 px-2 py-0.5 text-[10.5px] font-semibold text-ink-700">
-              <Zap size={11} className="shrink-0 text-amber-600" />
-              {p.amenities.includes('24/7 Power') && p.amenities.includes('Generator')
-                ? '24/7 Power · Generator'
-                : p.amenities.includes('24/7 Power')
-                  ? '24/7 Power'
-                  : 'Generator backup'}
-            </span>
-          )}
-          {hasWifi && (
-            <span className="inline-flex items-center gap-1 rounded-md border border-ink-100 bg-ink-50/70 px-2 py-0.5 text-[10.5px] font-semibold text-ink-700">
-              <Wifi size={11} className="shrink-0 text-jade-700" /> Wi-Fi
-            </span>
-          )}
-          {checkInRule && (
-            <span className="truncate rounded-md border border-ink-100 bg-ink-50/70 px-2 py-0.5 text-[10.5px] font-medium text-ink-500">
-              {checkInRule}
+        {/* Spec Strip */}
+        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-ink-700">
+          <span className="inline-flex items-center gap-1 rounded-full border border-ink-100 bg-paper/80 px-2.5 py-1">
+            <BedDouble size={12} className="shrink-0 text-ink-500" />
+            {p.bedrooms} {p.bedrooms === 1 ? 'bed' : 'beds'}
+          </span>
+          <span className="inline-flex items-center gap-1 rounded-full border border-ink-100 bg-paper/80 px-2.5 py-1">
+            <Bath size={12} className="shrink-0 text-ink-500" />
+            {p.bathrooms} {p.bathrooms === 1 ? 'bath' : 'baths'}
+          </span>
+          <span className="inline-flex items-center gap-1 rounded-full border border-ink-100 bg-paper/80 px-2.5 py-1">
+            <Users size={12} className="shrink-0 text-ink-500" />
+            {p.capacity} guests
+          </span>
+          {hasPowerBackup && powerLabel && (
+            <span className="inline-flex items-center gap-1 rounded-full border border-brass-300/60 bg-brass-200/25 px-2.5 py-1 font-bold text-ink-900">
+              <Zap size={11} className="shrink-0 text-brass-700" />
+              {powerLabel}
             </span>
           )}
         </div>
 
-        <div className="mt-auto pt-3">
-          <div className="flex flex-wrap items-end justify-between gap-2 border-t border-ink-50 pt-3">
+        {/* Price & Action Footer */}
+        <div className="mt-auto pt-4">
+          <div className="flex items-end justify-between gap-3 border-t border-ink-100 pt-3.5">
             <div className="min-w-0">
-              <span className="font-display text-[19px] font-black tabular-nums text-ink-900">
-                {formatStayPrice(guestNightlyNgn)}
-              </span>
-              <span className="text-[11.5px] font-semibold text-ink-500"> /night</span>
-              <p className="text-[10px] font-medium text-ink-400">
-                Est. {formatStayPrice(est)}/night incl. charges
-                {currency !== 'NGN' && activeRateIsAvailable ? ' · incl. 10% FX buffer · settled in ₦' : ''}
-              </p>
+              <div className="flex flex-wrap items-baseline gap-1">
+                <span className="font-display text-[20px] font-bold tabular-nums text-ink-900">
+                  {formatStayPrice(guestNightlyNgn)}
+                </span>
+                <span className="text-[11.5px] font-semibold text-ink-500">/ night</span>
+              </div>
+              {(est > guestNightlyNgn || (currency !== 'NGN' && activeRateIsAvailable)) && (
+                <p className="mt-0.5 truncate text-[10.5px] font-medium text-ink-500">
+                  {est > guestNightlyNgn ? `~${formatStayPrice(est)}/nt with fees` : 'Quoted stay rate'}
+                  {currency !== 'NGN' && activeRateIsAvailable ? ' · incl. 10% FX buffer' : ''}
+                </p>
+              )}
             </div>
-            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-jade-50 px-2.5 py-1.5 text-[11px] font-extrabold text-jade-800 transition group-hover:bg-jade-700 group-hover:text-white">
-              View apartment <ArrowRight size={12} className="shrink-0" />
+            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-200 bg-paper text-ink-900 transition group-hover:border-ink-900 group-hover:bg-ink-900 group-hover:text-white">
+              <ArrowUpRight size={15} className="shrink-0" />
             </span>
           </div>
         </div>
```

### `src/components/WorkspaceShell.tsx` (Modified)

```diff
diff --git a/src/components/WorkspaceShell.tsx b/src/components/WorkspaceShell.tsx
index 05c7606..bd508cd 100644
--- a/src/components/WorkspaceShell.tsx
+++ b/src/components/WorkspaceShell.tsx
@@ -1,7 +1,8 @@
 import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
 import { useState, type ReactNode } from 'react';
-import { Menu, X, LogOut, RotateCcw, ExternalLink } from 'lucide-react';
+import { Menu, X, LogOut, RotateCcw, ExternalLink, Sparkles } from 'lucide-react';
 import { HamletMark } from './Logo';
+import { useHoratio } from './HoratioDrawer';
 import { useHamlet } from '../lib/store';
 import { useToast } from '../lib/toast';
 import { formatLagosHeadlineDate } from '../lib/pricing';
@@ -26,6 +27,7 @@ export function WorkspaceShell({
 }) {
   const { state, signOut, resetDemo, backendConfigured } = useHamlet();
   const { toast } = useToast();
+  const { openHoratio } = useHoratio();
   const navigate = useNavigate();
   const location = useLocation();
   const [open, setOpen] = useState(false);
@@ -47,7 +49,7 @@ export function WorkspaceShell({
       <div className="border-b border-ink-800 px-5 py-4">
         <Link to="/" className="flex items-center gap-2.5">
           <HamletMark size={28} light />
-          <span className="font-display text-xl font-black text-ink-50">HAMLET<span className="text-brass-500">.</span></span>
+          <span className="font-display text-xl font-bold tracking-[0.06em] text-white">HAMLET<span className="text-brass-500">.</span></span>
         </Link>
         <p className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.18em] ${accent}`}>{title}</p>
       </div>
@@ -106,11 +108,23 @@ export function WorkspaceShell({
       )}
       <div className="flex min-h-0 min-w-0 flex-1 flex-col">
         <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-ink-800 bg-ink-950 px-4 lg:px-6">
-          <button className="shrink-0 rounded-lg p-2 text-ink-300 hover:bg-ink-800 lg:hidden" onClick={() => setOpen(v => !v)} aria-label="Toggle menu">
-            {open ? <X size={20} /> : <Menu size={20} />}
-          </button>
-          <p className="hidden truncate text-[11px] font-extrabold uppercase tracking-[0.2em] text-ink-500 lg:block">HAMLET · {title} · Lagos pilot</p>
-          <p className="truncate text-[10.5px] font-semibold text-ink-500">{formatLagosHeadlineDate()} · WAT</p>
+          <div className="flex min-w-0 items-center gap-3">
+            <button className="shrink-0 rounded-lg p-2 text-ink-300 hover:bg-ink-800 lg:hidden" onClick={() => setOpen(v => !v)} aria-label="Toggle menu">
+              {open ? <X size={20} /> : <Menu size={20} />}
+            </button>
+            <p className="hidden truncate text-[11px] font-extrabold uppercase tracking-[0.2em] text-ink-400 lg:block">HAMLET · {title} · Lagos operations</p>
+          </div>
+          <div className="flex items-center gap-3">
+            <button
+              type="button"
+              onClick={() => openHoratio()}
+              className="inline-flex items-center gap-1.5 rounded-full border border-brass-500/40 bg-ink-900 px-3 py-1 text-[11px] font-bold text-brass-300 transition hover:border-brass-400 hover:text-white [&>svg]:shrink-0"
+            >
+              <Sparkles size={12} className="text-brass-400" />
+              <span>Horatio</span>
+            </button>
+            <p className="truncate text-[10.5px] font-semibold text-ink-400">{formatLagosHeadlineDate()} · WAT</p>
+          </div>
         </div>
         <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain dark-scroll">{children}</main>
       </div>
```

### `src/index.css` (Modified)

```diff
diff --git a/src/index.css b/src/index.css
index 97f53b3..f526341 100644
--- a/src/index.css
+++ b/src/index.css
@@ -1,47 +1,56 @@
 @import "tailwindcss";
 
 @theme {
-  --font-display: "Fraunces Variable", "Fraunces", Georgia, Cambria, "Times New Roman", Times, serif;
-  --font-sans: "Public Sans Variable", "Public Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
-  --font-mono: "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Public Sans Variable", monospace;
+  --font-display: "Playfair Display Variable", "Playfair Display", Georgia, Cambria, "Times New Roman", Times, serif;
+  --font-sans: "Inter Variable", "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
+  --font-mono: "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Inter Variable", monospace;
 
-  /* Deep botanical ink (partner/admin surfaces) */
-  --color-ink-950: #0B1410;
-  --color-ink-900: #101D16;
-  --color-ink-850: #15241C;
-  --color-ink-800: #1C2F24;
-  --color-ink-700: #274133;
-  --color-ink-600: #38544A;
-  --color-ink-500: #4E6B5E;
-  --color-ink-400: #6F8B7D;
-  --color-ink-300: #97AC9F;
-  --color-ink-200: #C2D0C7;
-  --color-ink-100: #DFE7E1;
-  --color-ink-50:  #F2F5F1;
+  /* Midnight Navy & Slate Grey scale (primary #0E1F3B, secondary text #64748B) */
+  --color-ink-950: #091528;
+  --color-ink-900: #0E1F3B;
+  --color-ink-850: #13284C;
+  --color-ink-800: #1B3560;
+  --color-ink-700: #2B4875;
+  --color-ink-600: #475569;
+  --color-ink-500: #64748B;
+  --color-ink-400: #8595AB;
+  --color-ink-300: #CBD5E1;
+  --color-ink-200: #DCE2EC;
+  --color-ink-100: #E8E4DA;
+  --color-ink-50:  #F4F6F9;
 
-  /* Brass accent */
-  --color-brass-200: #F1E3B2;
-  --color-brass-300: #E7D08A;
-  --color-brass-400: #D9B651;
-  --color-brass-500: #C9A227;
-  --color-brass-600: #A8811F;
-  --color-brass-700: #856617;
+  /* Champagne Gold accent (#C9A44A) */
+  --color-brass-200: #F5E8C4;
+  --color-brass-300: #E8D192;
+  --color-brass-400: #D8B968;
+  --color-brass-500: #C9A44A;
+  --color-brass-600: #AD8832;
+  --color-brass-700: #8A6A22;
 
-  /* Jade — guest-facing primary */
-  --color-jade-50:  #EFF7F1;
-  --color-jade-100: #DCEFE3;
-  --color-jade-200: #B9DFC9;
-  --color-jade-300: #8FCDAB;
-  --color-jade-400: #5FB884;
-  --color-jade-500: #3D9E63;
-  --color-jade-600: #2F7F4E;
-  --color-jade-700: #27643F;
-  --color-jade-800: #1F4F33;
-  --color-jade-900: #173A27;
+  /* Midnight Navy guest-facing primary ramp (anchored on #0E1F3B) */
+  --color-jade-50:  #F0F4FA;
+  --color-jade-100: #E0E8F5;
+  --color-jade-200: #C3D2EA;
+  --color-jade-300: #93B0DB;
+  --color-jade-400: #648EC9;
+  --color-jade-500: #2C528C;
+  --color-jade-600: #1B3B6F;
+  --color-jade-700: #0E1F3B;
+  --color-jade-800: #162D54;
+  --color-jade-900: #091528;
 
-  /* Warm paper — guest surfaces */
-  --color-paper: #FAF8F3;
-  --color-clay: #F3EFE6;
+  /* Warm Ivory & secondary warm surface (#F8F5EE) */
+  --color-paper: #F8F5EE;
+  --color-clay: #EFEADE;
+
+  /* Restrained Emerald — semantic verification & inspection accents */
+  --color-emerald-50:  #ECFDF3;
+  --color-emerald-100: #D1FADF;
+  --color-emerald-200: #A6F4C5;
+  --color-emerald-600: #0F6E43;
+  --color-emerald-700: #0B5534;
+  --color-emerald-800: #083F27;
+  --color-emerald-900: #062C1B;
 }
 
 @layer base {
@@ -65,13 +74,7 @@
 
   .font-display {
     font-optical-sizing: auto;
-    font-variation-settings: "SOFT" 30, "WONK" 0;
-  }
-
-  .font-display.italic,
-  .font-display .italic,
-  .font-display em {
-    font-variation-settings: "SOFT" 50, "WONK" 1;
+    font-feature-settings: "kern" 1, "liga" 1;
   }
 
   .font-mono {
@@ -97,7 +100,7 @@
   .label-dark {
     @apply mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-300;
   }
-  .card { @apply rounded-2xl border border-ink-100 bg-white shadow-[0_1px_2px_rgba(16,29,22,0.06),0_8px_24px_-12px_rgba(16,29,22,0.18)]; }
+  .card { @apply rounded-2xl border border-ink-100 bg-white shadow-[0_1px_2px_rgba(14,31,59,0.06),0_8px_24px_-12px_rgba(14,31,59,0.16)]; }
   .btn { @apply inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:shrink-0; }
   .btn-jade { @apply inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-jade-500 disabled:cursor-not-allowed disabled:opacity-50 bg-jade-700 text-white hover:bg-jade-800 px-5 py-3 [&>svg]:shrink-0; }
   .btn-brass { @apply inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brass-400 disabled:cursor-not-allowed disabled:opacity-50 bg-brass-500 text-ink-950 hover:bg-brass-400 px-5 py-3 [&>svg]:shrink-0; }
@@ -107,14 +110,34 @@
   .chip { @apply inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold [&>svg]:shrink-0; }
   .th { @apply px-4 py-3 text-left text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-ink-400; }
   .td { @apply px-4 py-3 align-middle text-sm; }
+  .eyebrow { @apply inline-flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-brass-600; }
+  .eyebrow-light { @apply inline-flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-brass-300; }
 }
 
 ::selection { background: var(--color-brass-300); color: var(--color-ink-950); }
 
 ::-webkit-scrollbar { width: 9px; height: 9px; }
 ::-webkit-scrollbar-track { background: transparent; }
-::-webkit-scrollbar-thumb { background: rgba(16,29,22,0.25); border-radius: 99px; }
-.dark-scroll::-webkit-scrollbar-thumb { background: rgba(242,245,241,0.2); }
+::-webkit-scrollbar-thumb { background: rgba(14,31,59,0.24); border-radius: 99px; }
+.dark-scroll::-webkit-scrollbar-thumb { background: rgba(248,245,238,0.22); }
 
 @keyframes pulse-dot { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }
 .live-dot { animation: pulse-dot 1.6s ease-in-out infinite; }
+
+@keyframes hamlet-marquee {
+  0% { transform: translateX(0); }
+  100% { transform: translateX(-50%); }
+}
+.hamlet-marquee-track {
+  display: flex;
+  width: max-content;
+  animation: hamlet-marquee 38s linear infinite;
+}
+.hamlet-marquee-track:hover {
+  animation-play-state: paused;
+}
+@media (prefers-reduced-motion: reduce) {
+  .hamlet-marquee-track {
+    animation: none;
+  }
+}
```

### `src/lib/brand.ts` (Modified)

```diff
diff --git a/src/lib/brand.ts b/src/lib/brand.ts
index 178ab6f..04d4b97 100644
--- a/src/lib/brand.ts
+++ b/src/lib/brand.ts
@@ -3,6 +3,11 @@ import { applyDocumentSeo, type PageMetaOptions } from './seo';
 
 export const HAMLET_TAGLINE = 'Your stay, sorted.';
 export const HAMLET_PROMISE = 'A better way to find, book, and enjoy shortlets in Lagos.';
+export const HAMLET_BRAND_NAME = 'HAMLET for Your Shortlets';
+export const HAMLET_USP = 'Shortlets, with accountability.';
+export const HAMLET_PARENT_COMPANY = 'Abundance Abodes';
+export const HAMLET_POSITIONING = 'The Operating System for African Shortlets';
+export const HAMLET_MANTRA = 'Make it easy. Make it trustworthy. Make it accountable.';
 
 /**
  * Updates browser document title, description, canonical link, robots directives,
```

### `src/lib/brandIdentity.test.ts` (Added)

```diff
diff --git a/src/lib/brandIdentity.test.ts b/src/lib/brandIdentity.test.ts
new file mode 100644
index 0000000..92e679d
--- /dev/null
+++ b/src/lib/brandIdentity.test.ts
@@ -0,0 +1,61 @@
+import { readFileSync } from 'node:fs';
+import { join, resolve } from 'node:path';
+import { describe, expect, it } from 'vitest';
+import { HAMLET_PROMISE, HAMLET_TAGLINE } from './brand';
+
+const ROOT = resolve(process.cwd());
+
+describe('HAMLET Brand Identity (Palette, Typography & Monogram Logo)', () => {
+  it('defines Midnight Navy, Champagne Gold, Warm Ivory, and Slate Grey tokens in index.css', () => {
+    const css = readFileSync(join(ROOT, 'src/index.css'), 'utf8');
+
+    // Primary Midnight Navy (#0E1F3B), Champagne Gold (#C9A44A), Warm Ivory (#F8F5EE), Slate Grey (#64748B)
+    expect(css).toContain('--color-ink-900: #0E1F3B;');
+    expect(css).toContain('--color-brass-500: #C9A44A;');
+    expect(css).toContain('--color-paper: #F8F5EE;');
+    expect(css).toContain('--color-ink-500: #64748B;');
+    expect(css).toContain('--color-jade-700: #0E1F3B;');
+
+    // Typography: Playfair Display for headlines/serif & Inter for body/UI sans-serif
+    expect(css).toContain('"Playfair Display Variable"');
+    expect(css).toContain('"Playfair Display"');
+    expect(css).toContain('"Inter Variable"');
+    expect(css).toContain('"Inter"');
+    expect(css).not.toMatch(/Fraunces|Public Sans/i);
+  });
+
+  it('loads Playfair Display and Inter variable fonts in main.tsx', () => {
+    const mainSrc = readFileSync(join(ROOT, 'src/main.tsx'), 'utf8');
+    expect(mainSrc).toContain('@fontsource-variable/playfair-display');
+    expect(mainSrc).toContain('@fontsource-variable/inter');
+    expect(mainSrc).not.toMatch(/fraunces|public-sans/i);
+  });
+
+  it('uses the HAMLET serif H monogram with Champagne Gold crossbar in Logo.tsx and favicon.svg', () => {
+    const logoSrc = readFileSync(join(ROOT, 'src/components/Logo.tsx'), 'utf8');
+    const faviconSvg = readFileSync(join(ROOT, 'public/favicon.svg'), 'utf8');
+    const manifest = JSON.parse(readFileSync(join(ROOT, 'public/site.webmanifest'), 'utf8')) as {
+      background_color: string;
+      theme_color: string;
+    };
+    const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');
+
+    expect(logoSrc).toContain('#0E1F3B');
+    expect(logoSrc).toContain('#FFFFFF');
+    expect(logoSrc).toContain('#C9A44A');
+    expect(logoSrc).toContain('linearGradient');
+
+    expect(faviconSvg).toContain('#0E1F3B');
+    expect(faviconSvg).toContain('#FFFFFF');
+    expect(faviconSvg).toContain('#C9A44A');
+
+    expect(manifest.background_color).toBe('#F8F5EE');
+    expect(manifest.theme_color).toBe('#0E1F3B');
+    expect(indexHtml).toContain('<meta name="theme-color" content="#0E1F3B" />');
+  });
+
+  it('preserves existing HAMLET website wording and tagline unchanged', () => {
+    expect(HAMLET_TAGLINE).toBe('Your stay, sorted.');
+    expect(HAMLET_PROMISE).toBe('A better way to find, book, and enjoy shortlets in Lagos.');
+  });
+});
```

### `src/lib/redesignAdoption.test.ts` (Added)

```diff
diff --git a/src/lib/redesignAdoption.test.ts b/src/lib/redesignAdoption.test.ts
new file mode 100644
index 0000000..c0960c7
--- /dev/null
+++ b/src/lib/redesignAdoption.test.ts
@@ -0,0 +1,106 @@
+import { readFileSync } from 'node:fs';
+import { join, resolve } from 'node:path';
+import { describe, expect, it } from 'vitest';
+import {
+  HAMLET_BRAND_NAME,
+  HAMLET_MANTRA,
+  HAMLET_PARENT_COMPANY,
+  HAMLET_POSITIONING,
+  HAMLET_USP,
+} from './brand';
+import { calculateGuestPricing, calculateMarkupAllocation } from './pricing';
+
+const ROOT = resolve(process.cwd());
+
+describe('HAMLET UI Adoption & Brand-Preserving Redesign', () => {
+  it('preserves canonical HAMLET brand identity constants', () => {
+    expect(HAMLET_BRAND_NAME).toBe('HAMLET for Your Shortlets');
+    expect(HAMLET_USP).toBe('Shortlets, with accountability.');
+    expect(HAMLET_PARENT_COMPANY).toBe('Abundance Abodes');
+    expect(HAMLET_POSITIONING).toBe('The Operating System for African Shortlets');
+    expect(HAMLET_MANTRA).toBe('Make it easy. Make it trustworthy. Make it accountable.');
+  });
+
+  it('keeps Home concise and marketplace-focused while preserving central pricing engine', () => {
+    const homeSrc = readFileSync(join(ROOT, 'src/pages/Home.tsx'), 'utf8');
+    const detailSrc = readFileSync(join(ROOT, 'src/pages/PropertyDetail.tsx'), 'utf8');
+
+    expect(homeSrc).toContain('Available stays');
+    expect(homeSrc).toContain('Browse by area');
+    expect(homeSrc).toContain('HERO_SLIDES');
+    expect(homeSrc).toContain('opacity-100');
+    expect(homeSrc).toContain('/images/hero-sample-living.jpg');
+    expect(homeSrc).toContain('/images/hero-sample-bedroom.jpg');
+    expect(homeSrc).toContain('/images/hero-sample-kitchen.jpg');
+    expect(homeSrc).toContain('/images/hero-sample-lounge.jpg');
+    expect(homeSrc).toContain('Sample interior');
+    expect(homeSrc).not.toContain('Booking ceremony walkthrough');
+    expect(homeSrc).not.toContain('Every naira, accounted for');
+    expect(detailSrc).toContain('priceStay');
+    expect(detailSrc).toContain('calculateBookingCurrencyQuote');
+
+    const allocation = calculateMarkupAllocation({
+      ownerListedPriceNgn: 200_000,
+      hasEligibleReferrer: true,
+    });
+    const guest = calculateGuestPricing({
+      accommodationSubtotal: 200_000,
+      mandatoryCharges: [],
+      refundableDeposit: 150_000,
+    });
+    expect(guest.domesticGuestPriceNgn).toBe(240_000);
+    expect(allocation.totalMarkupNgn).toBe(40_000);
+    expect(allocation.closingAgentCommissionNgn).toBe(20_000);
+    expect(allocation.directReferrerRewardNgn).toBe(5_000);
+    expect(allocation.hamletAllocationNgn).toBe(10_000);
+    expect(allocation.paymentReserveNgn).toBe(5_000);
+    expect(guest.refundableDeposit).toBe(150_000);
+  });
+
+  it('integrates Horatio assistant, Wishlist shortlist, Elsinore, and The Watch while keeping plain-language primary navigation', () => {
+    const appSrc = readFileSync(join(ROOT, 'src/App.tsx'), 'utf8');
+    const navbarSrc = readFileSync(join(ROOT, 'src/components/Navbar.tsx'), 'utf8');
+    const horatioSrc = readFileSync(join(ROOT, 'src/components/HoratioDrawer.tsx'), 'utf8');
+    const adminLayoutSrc = readFileSync(join(ROOT, 'src/pages/admin/AdminLayout.tsx'), 'utf8');
+    const adminIssuesSrc = readFileSync(join(ROOT, 'src/pages/admin/Issues.tsx'), 'utf8');
+
+    expect(appSrc).toContain('WishlistProvider');
+    expect(appSrc).toContain('HoratioProvider');
+    expect(appSrc).toContain('HoratioDrawer');
+
+    // Plain-language primary nav labels preserved
+    expect(navbarSrc).toContain("'Explore stays'");
+    expect(navbarSrc).toContain("'Lagos'");
+    expect(navbarSrc).toContain("'How it works'");
+    expect(navbarSrc).toContain("'Safety'");
+    expect(navbarSrc).toContain("'FAQs'");
+
+    // Shakespeare-inspired internal naming where appropriate
+    expect(horatioSrc).toContain('Horatio');
+    expect(horatioSrc).toContain('human administrator control');
+    expect(horatioSrc).toContain('Suggestion & discovery only');
+    expect(adminLayoutSrc).toContain('Elsinore');
+    expect(adminLayoutSrc).toContain("'Property Review'");
+    expect(adminLayoutSrc).toContain("'Ledger & Settlement'");
+    expect(adminIssuesSrc).toContain('The Watch');
+  });
+
+  it('never fabricates star ratings or reviews on PropertyCard or PropertyDetail', () => {
+    const cardSrc = readFileSync(join(ROOT, 'src/components/PropertyCard.tsx'), 'utf8');
+    const detailSrc = readFileSync(join(ROOT, 'src/pages/PropertyDetail.tsx'), 'utf8');
+
+    expect(cardSrc).not.toMatch(/4\.9[0-9]|4\.8[0-9]|★\s*4\./);
+    expect(detailSrc).not.toMatch(/4\.9[0-9]|4\.8[0-9]|★\s*4\./);
+  });
+
+  it('keeps duplicate-address screening and separate caution deposit messaging visible', () => {
+    const newPropSrc = readFileSync(join(ROOT, 'src/pages/partner/NewProperty.tsx'), 'utf8');
+    const partnerRegSrc = readFileSync(join(ROOT, 'src/pages/PartnerRegister.tsx'), 'utf8');
+    const detailSrc = readFileSync(join(ROOT, 'src/pages/PropertyDetail.tsx'), 'utf8');
+
+    expect(newPropSrc).toContain('potentialAddressMatch');
+    expect(partnerRegSrc).toContain('The economics, plainly');
+    expect(detailSrc).toContain('Refundable caution deposit');
+    expect(detailSrc).toContain('post-checkout inspection');
+  });
+});
```

### `src/lib/wishlist.tsx` (Added)

```diff
diff --git a/src/lib/wishlist.tsx b/src/lib/wishlist.tsx
new file mode 100644
index 0000000..24a1862
--- /dev/null
+++ b/src/lib/wishlist.tsx
@@ -0,0 +1,77 @@
+/* eslint-disable react-refresh/only-export-components */
+import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
+
+const WISHLIST_STORAGE_KEY = 'hamlet_saved_stays_v1';
+
+function readStoredWishlist(): string[] {
+  if (typeof window === 'undefined') return [];
+  try {
+    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
+    if (!raw) return [];
+    const parsed = JSON.parse(raw) as unknown;
+    if (!Array.isArray(parsed)) return [];
+    return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
+  } catch {
+    return [];
+  }
+}
+
+function writeStoredWishlist(ids: string[]) {
+  if (typeof window === 'undefined') return;
+  try {
+    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
+  } catch {
+    // Ignore storage quota errors in restricted browsing modes.
+  }
+}
+
+export interface WishlistContextValue {
+  savedIds: string[];
+  isSaved: (propertyId: string) => boolean;
+  toggleSaved: (propertyId: string) => boolean;
+  clearSaved: () => void;
+}
+
+const WishlistContext = createContext<WishlistContextValue>({
+  savedIds: [],
+  isSaved: () => false,
+  toggleSaved: () => false,
+  clearSaved: () => {},
+});
+
+export function WishlistProvider({ children }: { children: ReactNode }) {
+  const [savedIds, setSavedIds] = useState<string[]>(() => readStoredWishlist());
+
+  const isSaved = useCallback(
+    (propertyId: string) => savedIds.includes(propertyId),
+    [savedIds],
+  );
+
+  const toggleSaved = useCallback((propertyId: string): boolean => {
+    let added = false;
+    setSavedIds(prev => {
+      const exists = prev.includes(propertyId);
+      added = !exists;
+      const next = exists ? prev.filter(id => id !== propertyId) : [propertyId, ...prev];
+      writeStoredWishlist(next);
+      return next;
+    });
+    return added;
+  }, []);
+
+  const clearSaved = useCallback(() => {
+    setSavedIds([]);
+    writeStoredWishlist([]);
+  }, []);
+
+  const value = useMemo<WishlistContextValue>(
+    () => ({ savedIds, isSaved, toggleSaved, clearSaved }),
+    [savedIds, isSaved, toggleSaved, clearSaved],
+  );
+
+  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
+}
+
+export function useWishlist(): WishlistContextValue {
+  return useContext(WishlistContext);
+}
```

### `src/main.tsx` (Modified)

```diff
diff --git a/src/main.tsx b/src/main.tsx
index 9f3e280..55fbb64 100644
--- a/src/main.tsx
+++ b/src/main.tsx
@@ -1,9 +1,9 @@
 import { StrictMode } from 'react'
 import { createRoot } from 'react-dom/client'
-import '@fontsource-variable/fraunces/full.css'
-import '@fontsource-variable/fraunces/full-italic.css'
-import '@fontsource-variable/public-sans/wght.css'
-import '@fontsource-variable/public-sans/wght-italic.css'
+import '@fontsource-variable/playfair-display'
+import '@fontsource-variable/playfair-display/wght-italic.css'
+import '@fontsource-variable/inter'
+import '@fontsource-variable/inter/wght-italic.css'
 import '@fontsource-variable/jetbrains-mono/wght.css'
 import '@fontsource-variable/jetbrains-mono/wght-italic.css'
 import './index.css'
```

### `src/pages/About.tsx` (Modified)

```diff
diff --git a/src/pages/About.tsx b/src/pages/About.tsx
index 13c4568..9c54ce6 100644
--- a/src/pages/About.tsx
+++ b/src/pages/About.tsx
@@ -1,47 +1,54 @@
 import { Link } from 'react-router-dom';
 import {
-  ArrowRight, BedDouble, Building2, CheckCircle2, Compass, KeyRound, LifeBuoy, ShieldCheck, Wifi,
+  ArrowRight,
+  BedDouble,
+  Building2,
+  KeyRound,
+  LifeBuoy,
+  ShieldCheck,
+  Wifi,
 } from 'lucide-react';
 import { GuestLayout } from '../components/Navbar';
-import { HAMLET_TAGLINE, usePageMeta } from '../lib/brand';
+import {
+  HAMLET_BRAND_NAME,
+  HAMLET_MANTRA,
+  HAMLET_PARENT_COMPANY,
+  HAMLET_POSITIONING,
+  HAMLET_USP,
+  usePageMeta,
+} from '../lib/brand';
 
 const FOUR_PILLARS = [
   {
     num: '01',
     Icon: BedDouble,
     title: 'Know what you’re booking',
-    lead: 'The details matter. We make them count.',
-    body: 'Explore property information, photos, amenities, location details, and house rules before you commit. Where a property has been verified by HAMLET, we make that clear so you can make a more informed choice.',
-    cta: 'Explore available stays',
+    body: 'Clear photos, amenities, house rules, and four-pillar verification status upfront.',
+    cta: 'Explore stays',
     to: '/stays',
   },
   {
     num: '02',
     Icon: Wifi,
     title: 'Power and Wi-Fi, explained',
-    lead: 'Stay connected. Know what to expect.',
-    body: 'Working remotely? Streaming your favourite show? Getting ready for a full day out? Reliable power and internet can make or break a stay. Review the amenities and backup arrangements provided for each property before booking.',
-    extra: 'No guessing about the essentials that matter to you.',
-    cta: 'Find a stay that fits your needs',
+    body: 'Check 24/7 power, inverter/generator backup, and internet setup before booking.',
+    cta: 'Filter amenities',
     to: '/stays',
   },
   {
     num: '03',
     Icon: KeyRound,
-    title: 'Booking without the back-and-forth',
-    lead: 'Less chasing. More settling in.',
-    body: 'Find a place, review the terms, submit your booking request, and follow the next steps clearly. Your host or property partner can confirm the details before your stay is finalised.',
-    extra: 'You should know where you stand at every step.',
-    cta: 'How booking works',
+    title: 'Clear booking steps',
+    body: 'Request dates first, pay via Paystack once confirmed, and arrive with Wayfinder.',
+    cta: 'How it works',
     to: '/how-it-works',
   },
   {
     num: '04',
     Icon: LifeBuoy,
     title: 'Help when you need it',
-    lead: 'You should never be left wondering who to call.',
-    body: 'Questions before arrival? Need clarification about check-in? Something not going as agreed? HAMLET provides a clear support route for guests who need assistance with their booking.',
-    cta: 'Guest safety & support',
+    body: 'Log and track stay issues directly from your booking record.',
+    cta: 'Safety & support',
     to: '/safety',
   },
 ];
@@ -49,65 +56,56 @@ const FOUR_PILLARS = [
 export default function About() {
   usePageMeta(
     'About HAMLET | A Better Way to Book Shortlets',
-    'HAMLET was created around a simple idea: choosing where you stay should feel more straightforward, more transparent, and less stressful.',
+    'HAMLET for Your Shortlets — a Nigerian shortlet marketplace and property operating platform by Abundance Abodes. Shortlets, with accountability.',
   );
 
   return (
     <GuestLayout>
-      <section className="border-b border-ink-100 bg-ink-950 text-paper">
-        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
-          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brass-300">About HAMLET</p>
-          <h1 className="mt-3 max-w-3xl font-display text-3xl font-black leading-tight sm:text-5xl">
-            We believe a good stay should begin before you arrive.
-          </h1>
-          <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-ink-100">
-            Finding an apartment should be the easy part of your trip.
-          </p>
-          <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-ink-200">
-            Yet anyone who has booked a shortlet knows how quickly the excitement can turn into uncertainty. The photos look promising, but are they current? The location sounds convenient, but how far is it really? Is the power backup adequate? What will you pay in total? And when you arrive, will someone be there to let you in?
+      {/* Hero */}
+      <section className="border-b border-ink-800 bg-ink-950 text-paper">
+        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
+          <p className="eyebrow-light">
+            {HAMLET_BRAND_NAME} · By {HAMLET_PARENT_COMPANY}
           </p>
-          <p className="mt-3 max-w-3xl text-sm font-bold text-brass-200">
-            These are not small details. They shape the entire experience.
-          </p>
-          <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-ink-200">
-            HAMLET was created around a simple idea: choosing where you stay should feel more straightforward, more transparent, and less stressful.
+          <h1 className="mt-2.5 max-w-2xl font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
+            Shortlet stays,{' '}
+            <span className="italic text-brass-300">with accountability.</span>
+          </h1>
+          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-ink-200 sm:text-base">
+            Built under <strong className="text-white">{HAMLET_PARENT_COMPANY}</strong> as{' '}
+            <strong className="text-white">{HAMLET_POSITIONING}</strong> — starting in Lagos with honest verification, upfront pricing, and reliable arrival guidance.
           </p>
         </div>
       </section>
 
-      {/* Four Pillars of a Better Stay (moved from homepage to About Us) */}
-      <section id="four-pillars" className="border-b border-ink-100 bg-clay/70 py-14 sm:py-16">
+      {/* Four Pillars of a Better Stay */}
+      <section id="four-pillars" className="border-b border-ink-100 bg-clay/60 py-12 sm:py-16">
         <div className="mx-auto max-w-6xl px-4 sm:px-6">
-          <div className="max-w-3xl">
-            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">
-              Four pillars of a better stay
-            </p>
-            <h2 className="mt-2 font-display text-3xl font-black text-ink-900 sm:text-4xl">
+          <div className="max-w-2xl">
+            <p className="eyebrow">Four pillars of a better stay</p>
+            <h2 className="mt-1.5 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
               A good stay is about more than beautiful pictures.
             </h2>
-            <p className="mt-3 text-sm font-medium leading-relaxed text-ink-600">
-              You want the apartment to look as good in person as it did online. You want the power situation explained before you arrive. You want to know what you’re paying, how you’ll get in, and who to contact if something goes wrong.
-            </p>
-            <p className="mt-2 text-sm font-bold text-ink-800">
-              Fair enough. Those things should never be left to chance.
-            </p>
-            <p className="mt-2 text-sm font-medium leading-relaxed text-ink-600">
-              HAMLET is built around the details that make the difference between simply booking a place and actually enjoying your stay.
-            </p>
           </div>
 
-          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
-            {FOUR_PILLARS.map(({ num, Icon, title, lead, body, extra, cta, to }) => (
-              <article key={num} className="flex flex-col rounded-2xl border border-ink-100 bg-white p-5 shadow-2xs">
+          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
+            {FOUR_PILLARS.map(({ num, Icon, title, body, cta, to }) => (
+              <article
+                key={num}
+                className="flex flex-col rounded-3xl border border-ink-100 bg-white p-5 shadow-2xs"
+              >
                 <div className="flex items-center justify-between">
-                  <span className="font-mono text-xs font-extrabold text-jade-700">{num}</span>
-                  <Icon size={20} className="shrink-0 text-jade-700" strokeWidth={1.8} />
+                  <span className="font-mono text-xs font-extrabold tracking-widest text-brass-600">
+                    {num}
+                  </span>
+                  <Icon size={19} className="shrink-0 text-ink-900" strokeWidth={1.8} />
                 </div>
-                <h3 className="mt-3 font-display text-lg font-black text-ink-900">{title}</h3>
-                <p className="mt-1 text-[12.5px] font-bold text-ink-800">{lead}</p>
-                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">{body}</p>
-                {extra && <p className="mt-2 text-[12px] font-semibold text-ink-700">{extra}</p>}
-                <Link to={to} className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[12px] font-extrabold text-jade-800 hover:text-jade-900">
+                <h3 className="mt-3 font-display text-xl font-bold text-ink-900">{title}</h3>
+                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{body}</p>
+                <Link
+                  to={to}
+                  className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[12px] font-extrabold text-ink-900 hover:text-brass-700"
+                >
                   {cta} <ArrowRight size={13} className="shrink-0" />
                 </Link>
               </article>
@@ -116,95 +114,26 @@ export default function About() {
         </div>
       </section>
 
-      <div className="mx-auto max-w-6xl space-y-8 px-4 py-14 sm:px-6 sm:py-16">
-        <div className="grid gap-6 md:grid-cols-2">
-          <section className="card p-6 sm:p-8">
-            <div className="flex items-center gap-2 text-jade-700">
-              <Compass size={19} className="shrink-0" />
-              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]">Marketplace clarity</span>
+      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
+        <section className="rounded-3xl bg-ink-950 p-7 text-paper sm:p-9">
+          <div className="flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-center">
+            <div>
+              <p className="eyebrow-light">{HAMLET_USP}</p>
+              <h2 className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">
+                {HAMLET_MANTRA}
+              </h2>
             </div>
-            <h2 className="mt-2 font-display text-2xl font-black text-ink-900">
-              More than a listing. A better way to choose.
-            </h2>
-            <p className="mt-3 text-sm leading-relaxed text-ink-600">
-              We’re building a shortlet marketplace that brings guests and property owners, managers, and hospitality partners together.
-            </p>
-            <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
-              For guests, that means a place to discover accommodation, compare options, review important details, and understand the booking process. For partners, it means a platform to present their properties, manage their listings, and connect with people looking for a place to stay.
-            </p>
-            <p className="mt-2.5 text-sm font-bold text-ink-900">
-              Our goal is not simply to show you more apartments. It is to help you make a better-informed choice.
-            </p>
-          </section>
-
-          <section className="card p-6 sm:p-8">
-            <div className="flex items-center gap-2 text-jade-700">
-              <CheckCircle2 size={19} className="shrink-0" />
-              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]">Real traveller needs</span>
+            <div className="flex flex-wrap gap-3">
+              <Link to="/stays" className="btn-brass !rounded-full !px-6">
+                <ShieldCheck size={15} /> Explore stays
+              </Link>
+              <Link
+                to="/partner/register"
+                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/8 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15 [&>svg]:shrink-0"
+              >
+                <Building2 size={15} /> Partner with us
+              </Link>
             </div>
-            <h2 className="mt-2 font-display text-2xl font-black text-ink-900">
-              Built for the way you actually travel in Lagos.
-            </h2>
-            <p className="mt-3 text-sm leading-relaxed text-ink-600">
-              From the corporate pulse of Victoria Island and Ikoyi to the energy of Lekki and the central convenience of Lagos Mainland — Yaba, Surulere, Shomolu, Ikeja, and surrounding neighbourhoods — every trip comes with different expectations.
-            </p>
-            <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
-              A business traveller may need dependable internet and a convenient location. A family may prioritise space, security arrangements, and a kitchen. A couple planning a weekend away may care about privacy, atmosphere, and a comfortable setting.
-            </p>
-            <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
-              Useful property information matters — amenities, power arrangements, house rules, access procedures, and upfront pricing help you decide whether a space fits your plans.
-            </p>
-          </section>
-
-          <section className="card p-6 sm:p-8">
-            <div className="flex items-center gap-2 text-jade-700">
-              <ShieldCheck size={19} className="shrink-0" />
-              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]">Earned accountability</span>
-            </div>
-            <h2 className="mt-2 font-display text-2xl font-black text-ink-900">
-              Trust is something we have to earn.
-            </h2>
-            <p className="mt-3 text-sm leading-relaxed text-ink-600">
-              We don’t believe trust comes from putting the word verified on a page or making promises that sound good in an advert.
-            </p>
-            <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
-              Trust comes from clear information, responsible partners, honest communication, consistent processes, and taking concerns seriously when something goes wrong.
-            </p>
-          </section>
-
-          <section className="card p-6 sm:p-8">
-            <div className="flex items-center gap-2 text-jade-700">
-              <Building2 size={19} className="shrink-0" />
-              <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]">Guests & partners</span>
-            </div>
-            <h2 className="mt-2 font-display text-2xl font-black text-ink-900">
-              A better experience on both sides.
-            </h2>
-            <p className="mt-3 text-sm leading-relaxed text-ink-600">
-              Guests need clarity and confidence. Property owners and hospitality partners need a practical way to present their spaces, reach serious guests, and manage booking activity.
-            </p>
-            <p className="mt-2.5 text-sm font-semibold text-ink-800">
-              HAMLET brings both sides together around making stays easier to discover, understand, and manage.
-            </p>
-          </section>
-        </div>
-
-        <section className="rounded-3xl bg-ink-950 p-7 text-center text-paper sm:p-10">
-          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-brass-300">HAMLET. {HAMLET_TAGLINE}</p>
-          <h2 className="mt-2 font-display text-3xl font-black">{HAMLET_TAGLINE}</h2>
-          <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-relaxed text-ink-200">
-            Find your space. Understand the details. Make your plans with greater confidence.
-          </p>
-          <div className="mt-6 flex flex-wrap justify-center gap-3">
-            <Link to="/stays" className="btn-brass min-h-12">
-              Find your stay <ArrowRight size={15} />
-            </Link>
-            <Link
-              to="/partner/register"
-              className="inline-flex min-h-12 items-center rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-bold text-paper transition hover:bg-white/10"
-            >
-              Join our partner network
-            </Link>
           </div>
         </section>
       </div>
```

### `src/pages/Account.tsx` (Modified)

```diff
diff --git a/src/pages/Account.tsx b/src/pages/Account.tsx
index 70bf46d..4c13030 100644
--- a/src/pages/Account.tsx
+++ b/src/pages/Account.tsx
@@ -2,13 +2,43 @@ import { useEffect, useMemo, useState } from 'react';
 import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
 import { AnimatePresence, motion } from 'framer-motion';
 import {
-  CreditCard, X, ChevronDown, ChevronUp, MessageSquarePlus, ShieldCheck,
-  Star, BedDouble, CalendarDays, AlertCircle, Loader2, Lock, Receipt, LifeBuoy, RefreshCcw,
-  UserCog, Building2, Printer, Paperclip, CheckCircle2, Compass, Navigation, ExternalLink,
+  CreditCard,
+  X,
+  ChevronDown,
+  ChevronUp,
+  MessageSquarePlus,
+  ShieldCheck,
+  Star,
+  BedDouble,
+  CalendarDays,
+  AlertCircle,
+  Loader2,
+  Lock,
+  Receipt,
+  LifeBuoy,
+  RefreshCcw,
+  UserCog,
+  Building2,
+  Printer,
+  Paperclip,
+  CheckCircle2,
+  Compass,
+  Navigation,
+  ExternalLink,
+  Heart,
+  Sparkles,
 } from 'lucide-react';
 import { GuestLayout } from '../components/Navbar';
 import { CurrencyToggle } from '../components/CurrencyToggle';
-import { BookingStatusPill, IssueStatusPill, SeverityPill, ApplicationStatusPill } from '../components/Badges';
+import { PropertyCard } from '../components/PropertyCard';
+import { useHoratio } from '../components/HoratioDrawer';
+import {
+  BookingStatusPill,
+  IssueStatusPill,
+  SeverityPill,
+  ApplicationStatusPill,
+} from '../components/Badges';
+import { useWishlist } from '../lib/wishlist';
 import { useHamlet } from '../lib/store';
 import { useCurrency, formatMinorCurrency } from '../lib/currency';
 import { usePageMeta } from '../lib/brand';
@@ -20,14 +50,18 @@ import { buildGoogleMapsDirectionsUrl, computeWayfinderReadiness } from '../lib/
 
 const STAGES = ['Requested', 'Checking', 'Accepted', 'Confirmed', 'Completed'] as const;
 const STAGE_STATUS: Record<string, number> = {
-  requested: 0, checking: 1, awaiting_payment: 2, confirmed: 3, completed: 4,
+  requested: 0,
+  checking: 1,
+  awaiting_payment: 2,
+  confirmed: 3,
+  completed: 4,
 };
 
 function BookingStepper({ status }: { status: Booking['status'] }) {
   const negative = ['cancelled', 'declined', 'expired', 'no_show', 'refunded', 'disputed'].includes(status);
   const current = STAGE_STATUS[status] ?? -1;
   return (
-    <div className="mt-3">
+    <div className="mt-3.5">
       <div className="flex items-center">
         {STAGES.map((label, i) => {
           const done = !negative && current >= i;
@@ -35,22 +69,44 @@ function BookingStepper({ status }: { status: Booking['status'] }) {
           return (
             <div key={label} className="flex flex-1 items-center last:flex-none">
               <div className="flex flex-col items-center">
-                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-black transition ${done ? 'border-jade-600 bg-jade-600 text-white' : 'border-ink-200 bg-white text-ink-400'} ${active ? 'ring-4 ring-jade-100' : ''}`}>
+                <div
+                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-extrabold transition ${
+                    done
+                      ? 'border-emerald-600 bg-emerald-600 text-white'
+                      : 'border-ink-200 bg-white text-ink-400'
+                  } ${active ? 'ring-4 ring-emerald-100' : ''}`}
+                >
                   {done && current > i ? '✓' : i + 1}
                 </div>
-                <span className={`mt-1 hidden text-[9px] font-extrabold uppercase tracking-wide sm:block ${done ? 'text-jade-800' : 'text-ink-400'}`}>{label}</span>
+                <span
+                  className={`mt-1 hidden text-[9px] font-extrabold uppercase tracking-wide sm:block ${
+                    done ? 'text-ink-900' : 'text-ink-400'
+                  }`}
+                >
+                  {label}
+                </span>
               </div>
-              {i < STAGES.length - 1 && <div className={`mx-1 h-0.5 flex-1 rounded ${!negative && current > i ? 'bg-jade-600' : 'bg-ink-100'}`} />}
+              {i < STAGES.length - 1 && (
+                <div
+                  className={`mx-1 h-0.5 flex-1 rounded ${
+                    !negative && current > i ? 'bg-emerald-600' : 'bg-ink-100'
+                  }`}
+                />
+              )}
             </div>
           );
         })}
       </div>
       {!negative && current >= 0 && (
-        <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-wide text-jade-800 sm:hidden">
+        <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-wide text-ink-800 sm:hidden">
           Stage {current + 1} of {STAGES.length} · {STAGES[current]}
         </p>
       )}
-      {negative && <p className="mt-2 text-[11px] font-bold text-red-700">This booking closed as: {status.replace('_', ' ')}</p>}
+      {negative && (
+        <p className="mt-2 text-[11px] font-bold text-red-700">
+          This booking closed as: {status.replace('_', ' ')}
+        </p>
+      )}
     </div>
   );
 }
@@ -72,61 +128,129 @@ function PaymentModal({ booking, onClose }: { booking: Booking; onClose: () => v
   };
 
   return (
-    <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
-      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={stage === 'idle' ? onClose : undefined} />
-      <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60, opacity: 0 }} className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-y-contain rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
+    <motion.div
+      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
+      initial={{ opacity: 0 }}
+      animate={{ opacity: 1 }}
+      exit={{ opacity: 0 }}
+    >
+      <div
+        className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
+        onClick={stage === 'idle' ? onClose : undefined}
+      />
+      <motion.div
+        initial={{ y: 60 }}
+        animate={{ y: 0 }}
+        exit={{ y: 60, opacity: 0 }}
+        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-y-contain rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
+      >
         <div className="bg-[#0BA4DB] px-5 py-4 sm:px-6">
           <div className="flex items-center justify-between gap-3">
             <div className="flex min-w-0 items-center gap-2">
-              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 font-display text-sm font-black text-white">P</span>
+              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 font-display text-sm font-bold text-white">
+                P
+              </span>
               <div className="min-w-0">
-                <p className="text-[13px] font-black text-white">Paystack Checkout</p>
-                <p className="truncate text-[9.5px] font-semibold text-white/80">Demo simulation · webhook-verified · {session.email}</p>
+                <p className="text-[13px] font-bold text-white">Paystack Checkout</p>
+                <p className="truncate text-[9.5px] font-semibold text-white/80">
+                  Demo simulation · webhook-verified · {session.email}
+                </p>
               </div>
             </div>
-            {stage === 'idle' && <button onClick={onClose} aria-label="Close" className="shrink-0"><X size={20} className="text-white/80" /></button>}
+            {stage === 'idle' && (
+              <button onClick={onClose} aria-label="Close" className="shrink-0">
+                <X size={20} className="text-white/80" />
+              </button>
+            )}
           </div>
         </div>
-        <div className="p-4 sm:p-6">
+        <div className="p-5 sm:p-6">
           {stage === 'idle' && (
             <>
               <div className="flex flex-wrap items-baseline justify-between gap-2">
-                <span className="text-[12px] font-bold text-ink-500">Paying HAMLET for booking</span>
-                <span className="shrink-0 rounded-md bg-ink-100 px-2 py-0.5 font-mono text-[10px] font-bold text-ink-600">{booking.ref}</span>
+                <span className="text-xs font-bold text-ink-500">Paying HAMLET for booking</span>
+                <span className="shrink-0 rounded-md bg-ink-100 px-2 py-0.5 font-mono text-[10px] font-bold text-ink-600">
+                  {booking.ref}
+                </span>
               </div>
-              <p className="mt-2 font-display text-3xl font-black tracking-tight tabular-nums text-ink-900 sm:text-4xl">{formatNaira(booking.settlementTotalNgn ?? booking.guestTotal)}</p>
+              <p className="mt-2 font-display text-3xl font-bold tracking-tight tabular-nums text-ink-900 sm:text-4xl">
+                {formatNaira(booking.settlementTotalNgn ?? booking.guestTotal)}
+              </p>
               {booking.quoteCurrency && booking.quoteCurrency !== 'NGN' && booking.quotedStayTotalMinor && (
                 <p className="mt-1 text-[11.5px] font-semibold text-sky-900">
                   Quoted stay: {formatMinorCurrency(booking.quotedStayTotalMinor, booking.quoteCurrency)} (incl. 10% buffer @ ₦{booking.fxRate?.toLocaleString('en-NG')}) · Settled in NGN
                 </p>
               )}
-              <dl className="mt-4 space-y-1.5 rounded-2xl border border-ink-100 p-4 text-[12px] font-medium text-ink-700">
-                <div className="flex justify-between gap-3"><dt className="min-w-0">Owner accommodation ({booking.nights} nights)</dt><dd className="shrink-0 tabular-nums">{formatNaira(booking.accommodationSubtotal)}</dd></div>
-                <div className="flex justify-between gap-3"><dt className="min-w-0">HAMLET domestic markup (20%)</dt><dd className="shrink-0 tabular-nums">{formatNaira(booking.hamletGuestFee)}</dd></div>
-                {booking.mandatoryCharges.map(c => <div key={c.label} className="flex justify-between gap-3"><dt className="min-w-0">{c.label}</dt><dd className="shrink-0 tabular-nums">{formatNaira(c.amount)}</dd></div>)}
+              <dl className="mt-4 space-y-1.5 rounded-2xl border border-ink-100 p-4 text-xs font-medium text-ink-700">
+                <div className="flex justify-between gap-3">
+                  <dt className="min-w-0">Owner accommodation ({booking.nights} nights)</dt>
+                  <dd className="shrink-0 font-mono tabular-nums">{formatNaira(booking.accommodationSubtotal)}</dd>
+                </div>
+                <div className="flex justify-between gap-3">
+                  <dt className="min-w-0">HAMLET domestic markup (20%)</dt>
+                  <dd className="shrink-0 font-mono tabular-nums">{formatNaira(booking.hamletGuestFee)}</dd>
+                </div>
+                {booking.mandatoryCharges.map(c => (
+                  <div key={c.label} className="flex justify-between gap-3">
+                    <dt className="min-w-0">{c.label}</dt>
+                    <dd className="shrink-0 font-mono tabular-nums">{formatNaira(c.amount)}</dd>
+                  </div>
+                ))}
                 {(booking.internationalBufferNgnEquiv ?? 0) > 0 && (
-                  <div className="flex justify-between gap-3"><dt className="min-w-0">International currency buffer (10%)</dt><dd className="shrink-0 tabular-nums">{formatNaira(booking.internationalBufferNgnEquiv ?? 0)}</dd></div>
+                  <div className="flex justify-between gap-3">
+                    <dt className="min-w-0">International currency buffer (10%)</dt>
+                    <dd className="shrink-0 font-mono tabular-nums">
+                      {formatNaira(booking.internationalBufferNgnEquiv ?? 0)}
+                    </dd>
+                  </div>
                 )}
-                <div className="flex justify-between gap-3 border-t border-ink-100 pt-1.5 font-bold text-ink-900"><dt>Paystack NGN Stay Settlement Total</dt><dd className="shrink-0 tabular-nums">{formatNaira(booking.settlementTotalNgn ?? booking.guestTotal)}</dd></div>
+                <div className="flex justify-between gap-3 border-t border-ink-100 pt-1.5 font-bold text-ink-900">
+                  <dt>Paystack NGN Stay Settlement Total</dt>
+                  <dd className="shrink-0 font-mono tabular-nums">
+                    {formatNaira(booking.settlementTotalNgn ?? booking.guestTotal)}
+                  </dd>
+                </div>
                 {booking.deposit > 0 && (
-                  <div className="flex justify-between gap-3 pt-1 text-[11px] text-ink-500"><dt className="min-w-0">Separate refundable caution deposit (tracked post-inspection)</dt><dd className="shrink-0 tabular-nums">{formatNaira(booking.deposit)}</dd></div>
+                  <div className="flex justify-between gap-3 pt-1 text-[11px] text-ink-500">
+                    <dt className="min-w-0">Separate refundable caution deposit (tracked post-inspection)</dt>
+                    <dd className="shrink-0 font-mono tabular-nums">{formatNaira(booking.deposit)}</dd>
+                  </div>
                 )}
               </dl>
               <div className="mt-4 grid grid-cols-2 gap-2">
-                <div className="rounded-xl border-2 border-[#0BA4DB] bg-sky-50 p-3 text-center"><CreditCard size={18} className="mx-auto shrink-0 text-[#0BA4DB]" /><p className="mt-1 text-[11px] font-black text-ink-800">Card</p><p className="text-[9px] font-semibold text-ink-400">4084 •••• 4081</p></div>
-                <div className="rounded-xl border border-ink-200 p-3 text-center"><Receipt size={18} className="mx-auto shrink-0 text-ink-500" /><p className="mt-1 text-[11px] font-black text-ink-800">Bank transfer</p><p className="text-[9px] font-semibold text-ink-400">pay with your bank app</p></div>
+                <div className="rounded-xl border-2 border-[#0BA4DB] bg-sky-50 p-3 text-center">
+                  <CreditCard size={18} className="mx-auto shrink-0 text-[#0BA4DB]" />
+                  <p className="mt-1 text-[11px] font-bold text-ink-800">Card</p>
+                  <p className="text-[9px] font-semibold text-ink-400">4084 •••• 4081</p>
+                </div>
+                <div className="rounded-xl border border-ink-200 p-3 text-center">
+                  <Receipt size={18} className="mx-auto shrink-0 text-ink-500" />
+                  <p className="mt-1 text-[11px] font-bold text-ink-800">Bank transfer</p>
+                  <p className="text-[9px] font-semibold text-ink-400">pay with your bank app</p>
+                </div>
               </div>
-              <button onClick={pay} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0BA4DB] py-4 font-display text-[15px] font-black text-white transition hover:bg-[#0993c3] [&>svg]:shrink-0">
+              <button
+                onClick={pay}
+                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#0BA4DB] py-4 font-display text-[15px] font-bold text-white transition hover:bg-[#0993c3] [&>svg]:shrink-0"
+              >
                 <Lock size={15} /> Pay {formatNaira(booking.settlementTotalNgn ?? booking.guestTotal)}
               </button>
-              <p className="mt-2 text-center text-[10px] font-medium leading-snug text-ink-400">Confirmation is issued only after Paystack's webhook is verified server-side. A redirect or screenshot is never accepted as proof of payment.</p>
+              <p className="mt-2 text-center text-[10px] font-medium leading-snug text-ink-400">
+                Confirmation is issued only after Paystack’s webhook is verified server-side. A redirect or screenshot is never accepted as proof of payment.
+              </p>
             </>
           )}
           {stage !== 'idle' && (
             <div className="flex flex-col items-center py-8 text-center">
               <Loader2 size={44} className="animate-spin text-[#0BA4DB]" />
-              <p className="mt-4 font-display text-lg font-black text-ink-900">{stage === 'processing' ? 'Contacting your bank…' : 'Verifying webhook signature…'}</p>
-              <p className="mt-1 max-w-[240px] text-[12px] font-medium text-ink-500">{stage === 'processing' ? 'Approve the transaction to continue' : 'Server-side verification · idempotency key checked'}</p>
+              <p className="mt-4 font-display text-lg font-bold text-ink-900">
+                {stage === 'processing' ? 'Contacting your bank…' : 'Verifying webhook signature…'}
+              </p>
+              <p className="mt-1 max-w-[240px] text-xs font-medium text-ink-500">
+                {stage === 'processing'
+                  ? 'Approve the transaction to continue'
+                  : 'Server-side verification · idempotency key checked'}
+              </p>
             </div>
           )}
         </div>
@@ -173,30 +297,99 @@ function IssueModal({ booking, onClose }: { booking: Booking; onClose: () => voi
   };
 
   return (
-    <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
+    <motion.div
+      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
+      initial={{ opacity: 0 }}
+      animate={{ opacity: 1 }}
+      exit={{ opacity: 0 }}
+    >
       <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
-      <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60, opacity: 0 }} className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-y-contain rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-3xl sm:p-6">
+      <motion.div
+        initial={{ y: 60 }}
+        animate={{ y: 0 }}
+        exit={{ y: 60, opacity: 0 }}
+        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-y-contain rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
+      >
         <div className="flex items-start justify-between gap-3">
-          <h2 className="font-display text-xl font-black text-ink-900">Report an issue</h2>
-          <button onClick={onClose} className="shrink-0" aria-label="Close"><X size={20} className="text-ink-400" /></button>
+          <h2 className="font-display text-xl font-bold text-ink-900">Report an issue</h2>
+          <button onClick={onClose} className="shrink-0" aria-label="Close">
+            <X size={20} className="text-ink-400" />
+          </button>
         </div>
-        <p className="mt-1 break-words text-[11px] font-semibold text-ink-500">Booking {booking.ref} · {booking.propertyTitle}</p>
+        <p className="mt-1 break-words text-[11px] font-semibold text-ink-500">
+          Booking {booking.ref} · {booking.propertyTitle}
+        </p>
         <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
-          <label className="block"><span className="label">Category</span>
-            <select className="input" value={category} onChange={e => setCategory(e.target.value as typeof category)}>
-              {['Property condition', 'Access & check-in', 'Payment & billing', 'Booking conflict', 'Safety & security', 'Host conduct', 'Damages', 'Other'].map(c => <option key={c}>{c}</option>)}
+          <label className="block">
+            <span className="label">Category</span>
+            <select
+              className="input"
+              value={category}
+              onChange={e => setCategory(e.target.value as typeof category)}
+            >
+              {[
+                'Property condition',
+                'Access & check-in',
+                'Payment & billing',
+                'Booking conflict',
+                'Safety & security',
+                'Host conduct',
+                'Damages',
+                'Other',
+              ].map(c => (
+                <option key={c}>{c}</option>
+              ))}
             </select>
           </label>
-          <label className="block"><span className="label">Urgency</span>
-            <select className="input" value={severity} onChange={e => setSeverity(e.target.value as typeof severity)}>
-              {(['low', 'medium', 'high', 'critical'] as const).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
+          <label className="block">
+            <span className="label">Urgency</span>
+            <select
+              className="input"
+              value={severity}
+              onChange={e => setSeverity(e.target.value as typeof severity)}
+            >
+              {(['low', 'medium', 'high', 'critical'] as const).map(s => (
+                <option key={s} value={s}>
+                  {s.toUpperCase()}
+                </option>
+              ))}
             </select>
           </label>
         </div>
-        <label className="mt-3 block"><span className="label">Subject</span><input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. AC not cooling on arrival" /></label>
-        <label className="mt-3 block"><span className="label">What happened?</span><textarea className="input min-h-[80px] resize-none" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue, when it happened and what support you need…" /></label>
-        <label className="mt-3 block"><span className="label">Initial evidence reference (optional)</span><input className="input" value={evidenceNote} onChange={e => setEvidenceNote(e.target.value)} placeholder="e.g. Arrival video taken 3:15 PM / gate pass ref…" /></label>
-        <button disabled={submitting} onClick={() => void submit()} className="btn-jade mt-4 w-full disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit issue to HAMLET support'}</button>
+        <label className="mt-3 block">
+          <span className="label">Subject</span>
+          <input
+            className="input"
+            value={subject}
+            onChange={e => setSubject(e.target.value)}
+            placeholder="e.g. AC not cooling on arrival"
+          />
+        </label>
+        <label className="mt-3 block">
+          <span className="label">What happened?</span>
+          <textarea
+            className="input min-h-[80px] resize-none"
+            value={description}
+            onChange={e => setDescription(e.target.value)}
+            placeholder="Describe the issue, when it happened and what support you need…"
+          />
+        </label>
+        <label className="mt-3 block">
+          <span className="label">Initial evidence reference (optional)</span>
+          <input
+            className="input"
+            value={evidenceNote}
+            onChange={e => setEvidenceNote(e.target.value)}
+            placeholder="e.g. Arrival video taken 3:15 PM / gate pass ref…"
+          />
+        </label>
+        <button
+          disabled={submitting}
+          onClick={() => void submit()}
+          className="btn-jade mt-4 w-full !rounded-full disabled:opacity-50"
+        >
+          {submitting ? 'Submitting…' : 'Submit issue to HAMLET support'}
+        </button>
       </motion.div>
     </motion.div>
   );
@@ -224,13 +417,17 @@ export default function Account() {
     backendError,
   } = useHamlet();
   const { currency, formatMoney } = useCurrency();
+  const { savedIds, clearSaved } = useWishlist();
+  const { openHoratio } = useHoratio();
   const { toast } = useToast();
   const [searchParams, setSearchParams] = useSearchParams();
   const location = useLocation();
   const session = state.session;
   const focusedBookingParam = searchParams.get('booking')?.trim() || null;
 
-  const [activeTab, setActiveTab] = useState<'bookings' | 'issues' | 'profile'>('bookings');
+  const [activeTab, setActiveTab] = useState<'bookings' | 'saved' | 'issues' | 'profile'>(() =>
+    searchParams.get('tab') === 'saved' ? 'saved' : 'bookings',
+  );
   const [expanded, setExpanded] = useState<string | null>(focusedBookingParam);
   const [payFor, setPayFor] = useState<Booking | null>(null);
   const [issueFor, setIssueFor] = useState<Booking | null>(null);
@@ -263,20 +460,40 @@ export default function Account() {
 
   useEffect(() => {
     if (!returnedFromPayment || !backendConfigured) return;
-    void refreshState().catch(() => { /* surfaced via manual refresh if needed */ });
+    void refreshState().catch(() => {
+      /* surfaced via manual refresh if needed */
+    });
   }, [returnedFromPayment, backendConfigured, refreshState]);
 
   const myBookings = useMemo(
-    () => state.bookings.filter(b => b.guestId === session?.userId).sort((a, b) => +new Date(b.requestedAt) - +new Date(a.requestedAt)),
+    () =>
+      state.bookings
+        .filter(b => b.guestId === session?.userId)
+        .sort((a, b) => +new Date(b.requestedAt) - +new Date(a.requestedAt)),
     [state.bookings, session],
   );
 
+  const savedProperties = useMemo(
+    () =>
+      state.properties.filter(
+        p => p.status === 'approved' && savedIds.includes(p.id),
+      ),
+    [state.properties, savedIds],
+  );
+
   const myBookingRefs = useMemo(() => new Set(myBookings.map(b => b.ref)), [myBookings]);
   const myIssues = useMemo(
     () => state.issues.filter(i => i.bookingRef && myBookingRefs.has(i.bookingRef)),
     [state.issues, myBookingRefs],
   );
 
+  const heldCautionTotalNgn = useMemo(() => {
+    const myIds = new Set(myBookings.map(b => b.id));
+    return state.cautionDeposits
+      .filter(cd => myIds.has(cd.bookingId) && ['held', 'pending_inspection'].includes(cd.status))
+      .reduce((sum, cd) => sum + cd.amountNgn, 0);
+  }, [state.cautionDeposits, myBookings]);
+
   const myPartnerApplication = useMemo(() => {
     if (!session) return undefined;
     return state.applications.find(
@@ -295,22 +512,46 @@ export default function Account() {
   }, [expanded, myBookings]);
 
   if (!backendReady) {
-    return <GuestLayout><div className="mx-auto max-w-md px-4 py-24 text-center"><p className="text-sm font-semibold text-ink-600">Connecting to your account…</p></div></GuestLayout>;
+    return (
+      <GuestLayout>
+        <div className="mx-auto max-w-md px-4 py-24 text-center">
+          <p className="text-sm font-semibold text-ink-600">Connecting to your account…</p>
+        </div>
+      </GuestLayout>
+    );
   }
   if (backendError) {
-    return <GuestLayout><div className="mx-auto max-w-md px-4 py-24 text-center"><h1 className="font-display text-2xl font-black text-ink-900">Couldn't load your account</h1><p role="alert" className="mt-2 text-sm text-red-700">{backendError}</p><button onClick={() => window.location.reload()} className="btn-jade mt-6">Try again</button></div></GuestLayout>;
+    return (
+      <GuestLayout>
+        <div className="mx-auto max-w-md px-4 py-24 text-center">
+          <h1 className="font-display text-2xl font-bold text-ink-900">Couldn’t load your account</h1>
+          <p role="alert" className="mt-2 text-sm text-red-700">{backendError}</p>
+          <button onClick={() => window.location.reload()} className="btn-jade mt-6">
+            Try again
+          </button>
+        </div>
+      </GuestLayout>
+    );
   }
   if (!session) {
     const signInReturnPath = buildWorkspaceSignInPath(`${location.pathname}${location.search}`);
     return (
       <GuestLayout>
         <div className="mx-auto max-w-md px-4 py-24 text-center">
-          <ShieldCheck size={40} className="mx-auto text-jade-600" />
-          <h1 className="mt-4 font-display text-2xl font-black text-ink-900">Sign in to see your bookings</h1>
-          <p className="mt-2 text-sm text-ink-500">Track requests, complete payment and report issues from one place.</p>
+          <ShieldCheck size={40} className="mx-auto text-brass-600" />
+          <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">
+            Sign in to see your bookings
+          </h1>
+          <p className="mt-2 text-sm text-ink-500">
+            Track requests, complete verified Paystack payment, open Wayfinder, and report issues from one place.
+          </p>
           <div className="mt-6 flex flex-wrap justify-center gap-2.5">
-            <Link to={signInReturnPath} className="btn-jade">Sign in</Link>
-            <Link to="/signin?mode=signup" className="btn-outline">Create account</Link>
+            <Link to={signInReturnPath} className="btn-jade !rounded-full">
+              Sign in
+            </Link>
+            <Link to="/signin?mode=signup" className="btn-outline !rounded-full">
+              Create account
+            </Link>
           </div>
         </div>
       </GuestLayout>
@@ -320,16 +561,35 @@ export default function Account() {
     return (
       <GuestLayout>
         <div className="mx-auto max-w-md px-4 py-24 text-center">
-          <h1 className="font-display text-2xl font-black text-ink-900">Your {session.role} workspace is active</h1>
-          <p className="mt-2 text-sm text-ink-500">Open your {session.role === 'admin' ? 'Admin Console' : 'Partner Workspace'} directly.</p>
-          <Link to={session.role === 'admin' ? '/admin' : '/partner'} className="btn-jade mt-6">Go to workspace</Link>
+          <h1 className="font-display text-2xl font-bold text-ink-900">
+            Your {session.role} workspace is active
+          </h1>
+          <p className="mt-2 text-sm text-ink-500">
+            Open your {session.role === 'admin' ? 'Admin Console' : 'Partner Workspace'} directly.
+          </p>
+          <Link
+            to={session.role === 'admin' ? '/admin' : '/partner'}
+            className="btn-jade mt-6 !rounded-full"
+          >
+            Go to workspace
+          </Link>
         </div>
       </GuestLayout>
     );
   }
 
+  const initials = session.name
+    .split(' ')
+    .filter(Boolean)
+    .slice(0, 2)
+    .map(p => p[0]?.toUpperCase() ?? '')
+    .join('');
+
   const submitFeedback = async (booking: Booking) => {
-    if (fbText.trim().length < 5) { toast('Please write at least 5 characters.', 'error'); return; }
+    if (fbText.trim().length < 5) {
+      toast('Please write at least 5 characters.', 'error');
+      return;
+    }
     setSubmittingFbId(booking.id);
     try {
       await submitBookingFeedback({
@@ -418,43 +678,109 @@ export default function Account() {
 
   return (
     <GuestLayout>
-      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
-        <div className="flex flex-wrap items-end justify-between gap-4">
-          <div>
-            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Client account</p>
-            <h1 className="mt-1 font-display text-3xl font-black text-ink-900">Good to see you, {session.name.split(' ')[0]}</h1>
-            <p className="mt-1 text-[12px] font-medium text-ink-500">
-              {session.email}{session.phone ? ` · ${session.phone}` : ''} · Bookings, support & profile managed in one place
-            </p>
-          </div>
-          <div className="flex flex-wrap items-center gap-2">
-            <CurrencyToggle />
-            {backendConfigured && (
+      {/* Midnight Navy Profile Banner */}
+      <section className="border-b border-ink-800 bg-ink-950 text-paper">
+        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
+          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
+            <div className="flex items-start gap-4">
+              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-brass-500/40 bg-brass-500/15 font-display text-xl font-bold text-brass-300">
+                {initials || 'HM'}
+              </div>
+              <div>
+                <div className="flex flex-wrap items-center gap-2">
+                  <span className="eyebrow-light">Guest account</span>
+                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
+                    <ShieldCheck size={11} /> NDPR protected
+                  </span>
+                </div>
+                <h1 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
+                  Good to see you, {session.name.split(' ')[0]}
+                </h1>
+                <p className="mt-1 text-xs font-medium text-ink-300">
+                  {session.email}
+                  {session.phone ? ` · ${session.phone}` : ''}
+                </p>
+              </div>
+            </div>
+
+            <div className="flex flex-wrap items-center gap-2">
+              <CurrencyToggle variant="dark" />
               <button
                 type="button"
-                disabled={refreshing}
-                onClick={() => void handleRefresh()}
-                className="btn-outline !px-3.5 !py-2.5 text-[12px] disabled:opacity-50"
+                onClick={() => openHoratio()}
+                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/8 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/15"
               >
-                <RefreshCcw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
+                <Sparkles size={13} className="text-brass-400" /> Ask Horatio
               </button>
-            )}
-            <Link to="/stays" className="btn-jade !py-2.5 text-[12px]">Explore stays</Link>
+              {backendConfigured && (
+                <button
+                  type="button"
+                  disabled={refreshing}
+                  onClick={() => void handleRefresh()}
+                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/8 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/15 disabled:opacity-50"
+                >
+                  <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
+                </button>
+              )}
+              <Link to="/stays" className="btn-brass !rounded-full !px-4 !py-2 text-xs">
+                Explore stays
+              </Link>
+            </div>
+          </div>
+
+          {/* Account Summary Metrics (Real Authorised Data Only) */}
+          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
+            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
+              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-300">
+                Bookings
+              </p>
+              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-white">
+                {myBookings.length}
+              </p>
+            </div>
+            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
+              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-300">
+                Saved stays
+              </p>
+              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-white">
+                {savedProperties.length}
+              </p>
+            </div>
+            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
+              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-300">
+                Caution held
+              </p>
+              <p className="mt-1 font-display text-xl font-bold tabular-nums text-brass-300 sm:text-2xl">
+                {formatNaira(heldCautionTotalNgn)}
+              </p>
+            </div>
+            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
+              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-300">
+                Support issues
+              </p>
+              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-white">
+                {myIssues.length}
+              </p>
+            </div>
           </div>
         </div>
+      </section>
 
-        {/* Partner Application Status Banner (if this guest applied to become a HAMLET partner) */}
+      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
+        {/* Partner Application Status Banner */}
         {myPartnerApplication && (
-          <div className="mt-5 rounded-2xl border border-ink-200 bg-white p-4 shadow-xs sm:p-5">
+          <div className="mb-6 rounded-3xl border border-ink-200 bg-white p-5 shadow-2xs">
             <div className="flex flex-wrap items-center justify-between gap-3">
               <div className="flex flex-wrap items-center gap-2">
-                <Building2 size={17} className="shrink-0 text-jade-700" />
-                <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-500">Partner application</span>
+                <Building2 size={17} className="shrink-0 text-brass-600" />
+                <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
+                  Partner application
+                </span>
                 <ApplicationStatusPill status={myPartnerApplication.status} />
               </div>
               {myPartnerApplication.status === 'needs_correction' && (
-                <Link to="/partner/register" className="btn-jade !px-3.5 !py-2 text-[11.5px]">
-                  Fix & resubmit application
+                <Link to="/partner/register" className="btn-jade !rounded-full !px-4 !py-2 text-xs">
+                  Fix &amp; resubmit application
                 </Link>
               )}
             </div>
@@ -465,7 +791,7 @@ export default function Account() {
               Submitted {formatDateTime(myPartnerApplication.submittedAt)} · {myPartnerApplication.areas.join(', ')}
             </p>
             {myPartnerApplication.reviewNote && (
-              <p className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12px] font-semibold text-amber-950">
+              <p className="mt-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-950">
                 Reviewer note: {myPartnerApplication.reviewNote}
               </p>
             )}
@@ -473,42 +799,73 @@ export default function Account() {
         )}
 
         {returnedFromPayment && (
-          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-300 bg-sky-50 px-4 py-3.5 text-[12px] font-semibold text-sky-950">
+          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-sky-300 bg-sky-50 px-5 py-4 text-xs font-semibold text-sky-950">
             <div className="max-w-2xl">
               <p className="font-bold">Returned from Paystack checkout</p>
               <p className="mt-0.5 text-[11.5px] font-medium text-sky-900">
-                A browser redirect is never proof of payment. Your booking transitions to <strong>Confirmed</strong> automatically as soon as Paystack's signed server webhook is verified.
+                A browser redirect is never proof of payment. Your booking transitions to <strong>Confirmed</strong> automatically as soon as Paystack’s signed server webhook is verified.
               </p>
             </div>
             <div className="flex items-center gap-2">
-              <button disabled={refreshing} onClick={() => void handleRefresh()} className="btn-outline !px-3 !py-1.5 text-[11px]">
+              <button
+                disabled={refreshing}
+                onClick={() => void handleRefresh()}
+                className="btn-outline !rounded-full !px-3.5 !py-1.5 text-[11px]"
+              >
                 <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh status
               </button>
-              <button onClick={() => setSearchParams({}, { replace: true })} className="text-[11px] font-bold text-sky-800 hover:underline">Dismiss</button>
+              <button
+                onClick={() => setSearchParams({}, { replace: true })}
+                className="text-[11px] font-bold text-sky-800 hover:underline"
+              >
+                Dismiss
+              </button>
             </div>
           </div>
         )}
 
-        {/* Navigation tabs */}
-        <div role="tablist" aria-label="Account sections" className="mt-6 flex flex-wrap gap-2 border-b border-ink-200 pb-3">
+        {/* Navigation Tabs */}
+        <div
+          role="tablist"
+          aria-label="Account sections"
+          className="flex flex-wrap gap-2 border-b border-ink-200 pb-4"
+        >
           <button
             type="button"
             role="tab"
             aria-selected={activeTab === 'bookings'}
             onClick={() => setActiveTab('bookings')}
-            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold transition ${
-              activeTab === 'bookings' ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 hover:bg-ink-100'
+            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
+              activeTab === 'bookings'
+                ? 'bg-ink-900 text-white'
+                : 'border border-ink-200 bg-white text-ink-600 hover:border-ink-400'
             }`}
           >
             <BedDouble size={14} /> My bookings ({myBookings.length})
           </button>
+          <button
+            type="button"
+            role="tab"
+            aria-selected={activeTab === 'saved'}
+            onClick={() => setActiveTab('saved')}
+            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
+              activeTab === 'saved'
+                ? 'bg-ink-900 text-white'
+                : 'border border-ink-200 bg-white text-ink-600 hover:border-ink-400'
+            }`}
+          >
+            <Heart size={14} className={savedProperties.length > 0 ? 'fill-brass-500 text-brass-500' : ''} />
+            Saved stays ({savedProperties.length})
+          </button>
           <button
             type="button"
             role="tab"
             aria-selected={activeTab === 'issues'}
             onClick={() => setActiveTab('issues')}
-            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold transition ${
-              activeTab === 'issues' ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 hover:bg-ink-100'
+            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
+              activeTab === 'issues'
+                ? 'bg-ink-900 text-white'
+                : 'border border-ink-200 bg-white text-ink-600 hover:border-ink-400'
             }`}
           >
             <LifeBuoy size={14} /> Support issues ({myIssues.length})
@@ -518,32 +875,44 @@ export default function Account() {
             role="tab"
             aria-selected={activeTab === 'profile'}
             onClick={() => setActiveTab('profile')}
-            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold transition ${
-              activeTab === 'profile' ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 hover:bg-ink-100'
+            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
+              activeTab === 'profile'
+                ? 'bg-ink-900 text-white'
+                : 'border border-ink-200 bg-white text-ink-600 hover:border-ink-400'
             }`}
           >
-            <UserCog size={14} /> Profile & security
+            <UserCog size={14} /> Profile &amp; security
           </button>
         </div>
 
         {/* ── TAB 1: BOOKINGS ── */}
         {activeTab === 'bookings' && (
           <>
-            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-brass-400/40 bg-brass-200/30 px-4 py-3 text-[12px] font-semibold leading-relaxed text-ink-800">
+            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-brass-400/40 bg-brass-200/30 px-4 py-3 text-xs font-semibold leading-relaxed text-ink-800">
               <AlertCircle size={17} className="mt-0.5 shrink-0 text-brass-700" />
-              <span><strong>Pilot phase:</strong> Public reviews are not live yet. Feedback you leave after a stay is private and reviewed by HAMLET operations only — it shapes listings, never public ratings.</span>
+              <span>
+                <strong>Operational feedback:</strong> Public reviews are not enabled yet. Feedback you leave after a stay is private and reviewed by HAMLET operations only — shaping listing accuracy without fabricated ratings.
+              </span>
             </div>
 
             <div className="mt-5 grid gap-5">
               {myBookings.length === 0 && (
                 <div className="card px-6 py-16 text-center">
                   <BedDouble size={36} className="mx-auto text-ink-300" />
-                  <h2 className="mt-3 font-display text-xl font-black text-ink-900">No bookings yet</h2>
-                  <p className="mt-1 text-sm text-ink-500">Explore approved Lagos homes and send your first request.</p>
+                  <h2 className="mt-3 font-display text-xl font-bold text-ink-900">
+                    No bookings yet
+                  </h2>
+                  <p className="mt-1 text-sm text-ink-500">
+                    Explore verified Lagos homes and send your first booking request.
+                  </p>
                   <div className="mt-5 flex flex-wrap justify-center gap-2.5">
-                    <Link to="/stays" className="btn-jade">Explore stays</Link>
+                    <Link to="/stays" className="btn-jade !rounded-full">
+                      Explore stays
+                    </Link>
                     {!myPartnerApplication && (
-                      <Link to="/partner/register" className="btn-outline">Own a property? Apply as partner</Link>
+                      <Link to="/partner/register" className="btn-outline !rounded-full">
+                        Own a property? Apply as partner
+                      </Link>
                     )}
                   </div>
                 </div>
@@ -573,16 +942,21 @@ export default function Account() {
                 );
                 const recordedEase =
                   arrivalEaseRecorded[b.id] ??
-                  (existingEaseEvent?.metadata?.ease === 'easy' || existingEaseEvent?.metadata?.ease === 'difficult'
+                  (existingEaseEvent?.metadata?.ease === 'easy' ||
+                  existingEaseEvent?.metadata?.ease === 'difficult'
                     ? (existingEaseEvent.metadata.ease as 'easy' | 'difficult')
                     : undefined);
                 const cautionRecord = state.cautionDeposits.find(cd => cd.bookingId === b.id);
-                const quoteExpired = b.status === 'awaiting_payment' && b.quoteCurrency && b.quoteCurrency !== 'NGN' && isQuoteExpired(b.quoteExpiresAt ?? null);
+                const quoteExpired =
+                  b.status === 'awaiting_payment' &&
+                  b.quoteCurrency &&
+                  b.quoteCurrency !== 'NGN' &&
+                  isQuoteExpired(b.quoteExpiresAt ?? null);
                 const payableTotalNgn = b.settlementTotalNgn ?? b.guestTotal;
 
                 return (
                   <article key={b.id} className="card overflow-hidden">
-                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
+                    <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                       <div className="min-w-0 flex-1">
                         <div className="flex flex-wrap items-center gap-2">
                           <span className="font-mono text-[10.5px] font-bold text-ink-400">{b.ref}</span>
@@ -593,44 +967,62 @@ export default function Account() {
                             </span>
                           )}
                           {cautionRecord && (
-                            <span className="rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-[10px] font-bold text-ink-700">
+                            <span className="rounded-full border border-ink-200 bg-paper px-2 py-0.5 text-[10px] font-bold text-ink-700">
                               Caution: {cautionRecord.status.replace(/_/g, ' ')}
                             </span>
                           )}
                         </div>
-                        <h2 className="mt-1.5 break-words font-display text-[17px] font-bold leading-snug text-ink-900">
-                          <Link to={`/stays/${b.propertyId}`} className="hover:underline">{b.propertyTitle}</Link>
+                        <h2 className="mt-1.5 break-words font-display text-lg font-bold leading-snug text-ink-900 sm:text-xl">
+                          <Link to={`/stays/${b.propertyId}`} className="hover:underline">
+                            {b.propertyTitle}
+                          </Link>
                         </h2>
-                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] font-semibold text-ink-500">
-                          <span className="inline-flex items-center gap-1"><CalendarDays size={12} className="shrink-0" />{formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {b.nights} nights</span>
-                          <span>{b.guests} guest{b.guests > 1 ? 's' : ''}</span>
+                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-semibold text-ink-500">
+                          <span className="inline-flex items-center gap-1">
+                            <CalendarDays size={12} className="shrink-0" />
+                            {formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {b.nights} nights
+                          </span>
+                          <span>
+                            {b.guests} guest{b.guests > 1 ? 's' : ''}
+                          </span>
                           {b.area && <span>{b.area}, Lagos</span>}
                         </p>
                         <BookingStepper status={b.status} />
                       </div>
-                      <div className="flex items-baseline justify-between gap-2 border-t border-ink-50 pt-2.5 sm:shrink-0 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
+                      <div className="flex items-baseline justify-between gap-2 border-t border-ink-100 pt-3 sm:shrink-0 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                         <div>
-                          <p className="font-display text-xl font-black tabular-nums text-ink-900 sm:text-right">{formatMoney(b.guestTotal)}</p>
+                          <p className="font-display text-xl font-bold tabular-nums text-ink-900 sm:text-right">
+                            {formatMoney(b.guestTotal)}
+                          </p>
                           <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 sm:text-right">
-                            stay total incl. 20% markup{currency !== 'NGN' ? ` · ${formatNaira(b.guestTotal)}` : ''}
+                            stay total incl. 20% markup
+                            {currency !== 'NGN' ? ` · ${formatNaira(b.guestTotal)}` : ''}
                           </p>
                         </div>
-                        <button onClick={() => setExpanded(open ? null : b.id)} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide text-jade-700 hover:text-jade-900">
-                          Details {open ? <ChevronUp size={13} className="shrink-0" /> : <ChevronDown size={13} className="shrink-0" />}
+                        <button
+                          onClick={() => setExpanded(open ? null : b.id)}
+                          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide text-ink-900 hover:text-brass-700"
+                        >
+                          Details{' '}
+                          {open ? (
+                            <ChevronUp size={13} className="shrink-0" />
+                          ) : (
+                            <ChevronDown size={13} className="shrink-0" />
+                          )}
                         </button>
                       </div>
                     </div>
 
                     {(b.status === 'requested' || b.status === 'checking') && (
-                      <div className="border-t border-ink-100 bg-clay/50 px-5 py-2.5 text-[11.5px] font-medium text-ink-700">
-                        <strong className="text-ink-900">Your request is on its way.</strong> We’ve shared your booking request for confirmation. Keep an eye on your email and booking page for the next update.
+                      <div className="border-t border-ink-100 bg-clay/50 px-5 py-2.5 text-xs font-medium text-ink-700">
+                        <strong className="text-ink-900">Your request is on its way.</strong> Availability and terms are being checked before any payment link opens.
                       </div>
                     )}
 
                     {b.status === 'awaiting_payment' && (
-                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-200 bg-amber-50 px-5 py-3">
+                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-200 bg-amber-50 px-5 py-3.5">
                         <div className="max-w-xl">
-                          <p className="text-[12px] font-bold text-amber-900">
+                          <p className="text-xs font-bold text-amber-900">
                             Payment deadline: {b.paymentDeadline ? formatDateTime(b.paymentDeadline) : '48h from acceptance'} — pay only via verified HAMLET Paystack checkout (NGN settlement).
                           </p>
                           {quoteExpired && (
@@ -651,7 +1043,7 @@ export default function Account() {
                                   toast(err instanceof Error ? err.message : 'Could not refresh quote.', 'error');
                                 }
                               }}
-                              className="btn-outline !px-3.5 !py-2 text-[12px]"
+                              className="btn-outline !rounded-full !px-3.5 !py-2 text-xs"
                             >
                               <RefreshCcw size={14} /> Refresh {b.quoteCurrency} quote
                             </button>
@@ -659,30 +1051,38 @@ export default function Account() {
                             <button
                               disabled={checkoutBusyId === b.id}
                               onClick={() => void startConnectedCheckout(b)}
-                              className="btn-brass !px-4 !py-2.5 text-[12px] disabled:opacity-50"
+                              className="btn-brass !rounded-full !px-4 !py-2.5 text-xs disabled:opacity-50"
                             >
-                              <CreditCard size={15} /> {checkoutBusyId === b.id ? 'Starting checkout…' : `Pay ${formatNaira(payableTotalNgn)}`}
+                              <CreditCard size={15} />{' '}
+                              {checkoutBusyId === b.id
+                                ? 'Starting checkout…'
+                                : `Pay via Paystack · ${formatNaira(payableTotalNgn)}`}
                             </button>
                           ) : (
-                            <button onClick={() => setPayFor(b)} className="btn-brass !px-4 !py-2.5 text-[12px]"><CreditCard size={15} /> Pay {formatNaira(payableTotalNgn)}</button>
+                            <button
+                              onClick={() => setPayFor(b)}
+                              className="btn-brass !rounded-full !px-4 !py-2.5 text-xs"
+                            >
+                              <CreditCard size={15} /> Pay via Paystack · {formatNaira(payableTotalNgn)}
+                            </button>
                           )}
                         </div>
                       </div>
                     )}
 
                     {isConfirmed && (
-                      <div className="border-t border-jade-200 bg-gradient-to-r from-jade-50/90 to-white px-4 py-4 sm:px-5">
+                      <div className="border-t border-emerald-200 bg-gradient-to-r from-emerald-50/90 to-white px-4 py-4 sm:px-6">
                         <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                           <div className="min-w-0">
                             <div className="flex flex-wrap items-center gap-2">
-                              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.15em] text-jade-800">
-                                <Compass size={13} className="shrink-0 text-jade-700" /> Find your stay
+                              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.15em] text-emerald-800">
+                                <Compass size={13} className="shrink-0 text-emerald-700" /> HAMLET Wayfinder
                               </span>
                               {wayfinderReadiness && (
                                 <span
                                   className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                     wayfinderReadiness.tone === 'jade'
-                                      ? 'border-jade-200 bg-white text-jade-800'
+                                      ? 'border-emerald-200 bg-white text-emerald-800'
                                       : wayfinderReadiness.tone === 'sky'
                                         ? 'border-sky-200 bg-sky-50 text-sky-900'
                                         : 'border-amber-200 bg-amber-50 text-amber-900'
@@ -695,13 +1095,13 @@ export default function Account() {
                             <p className="mt-1 text-[12.5px] font-semibold text-ink-800">
                               {wayfinderReadiness && !wayfinderReadiness.hasValidCoordinates
                                 ? 'Your arrival guide is being prepared. Contact support if you need help planning your arrival.'
-                                : 'Get directions to your property and follow your arrival guide to the apartment door.'}
+                                : 'Get directions to your property and follow your door-to-door arrival guide.'}
                             </p>
                           </div>
                           <div className="flex flex-wrap items-center gap-2">
                             <Link
                               to={`/wayfinder/${b.id}`}
-                              className="btn-jade !px-4 !py-2.5 text-[12px]"
+                              className="btn-jade !rounded-full !px-4 !py-2.5 text-xs"
                             >
                               <Compass size={14} /> Open Wayfinder
                             </Link>
@@ -710,8 +1110,10 @@ export default function Account() {
                                 href={bookingDirectionsUrl}
                                 target="_blank"
                                 rel="noopener noreferrer"
-                                onClick={() => void recordWayfinderEvent(b.id, 'directions_clicked', { source: 'account_card' })}
-                                className="btn-outline !px-3.5 !py-2.5 text-[12px]"
+                                onClick={() =>
+                                  void recordWayfinderEvent(b.id, 'directions_clicked', { source: 'account_card' })
+                                }
+                                className="btn-outline !rounded-full !px-3.5 !py-2.5 text-xs"
                               >
                                 <Navigation size={13} /> Get Directions <ExternalLink size={11} />
                               </a>
@@ -719,20 +1121,22 @@ export default function Account() {
                             <button
                               type="button"
                               onClick={() => setExpanded(open ? null : b.id)}
-                              className="btn-outline !px-3 !py-2.5 text-[11.5px]"
+                              className="btn-outline !rounded-full !px-3 !py-2.5 text-[11.5px]"
                             >
-                              {open ? 'Hide details' : 'View booking details'}
+                              {open ? 'Hide details' : 'View details'}
                             </button>
                           </div>
                         </div>
-                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-jade-100 pt-2 text-[11px] font-semibold text-jade-900">
+                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-100 pt-2 text-[11px] font-semibold text-emerald-900">
                           <span>
-                            {linkedProperty ? `${linkedProperty.address}, ${linkedProperty.area}` : `${b.area ?? 'Lagos'}`}
+                            {linkedProperty
+                              ? `${linkedProperty.address}, ${linkedProperty.area}`
+                              : `${b.area ?? 'Lagos'}`}
                           </span>
                           <button
                             type="button"
                             onClick={() => window.print()}
-                            className="inline-flex items-center gap-1 font-extrabold text-jade-800 hover:underline"
+                            className="inline-flex items-center gap-1 font-extrabold text-emerald-800 hover:underline"
                           >
                             <Printer size={12} /> Print booking summary
                           </button>
@@ -741,10 +1145,10 @@ export default function Account() {
                     )}
 
                     {isCompleted && (
-                      <div className="border-t border-ink-100 bg-ink-50/70 px-4 py-3 sm:px-5">
-                        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] font-semibold text-ink-800">
+                      <div className="border-t border-ink-100 bg-paper/70 px-4 py-3 sm:px-6">
+                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-ink-800">
                           <span className="inline-flex items-center gap-1.5">
-                            <CheckCircle2 size={15} className="shrink-0 text-jade-700" />
+                            <CheckCircle2 size={15} className="shrink-0 text-emerald-700" />
                             <span>
                               <strong>Stay completed.</strong> Active entry codes are retired after check-out.
                             </span>
@@ -752,7 +1156,7 @@ export default function Account() {
                           <div className="flex flex-wrap items-center gap-3">
                             <Link
                               to={`/wayfinder/${b.id}`}
-                              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-jade-800 hover:underline"
+                              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-ink-900 hover:underline"
                             >
                               <Compass size={12} /> Archived arrival summary
                             </Link>
@@ -765,13 +1169,12 @@ export default function Account() {
                             </button>
                           </div>
                         </div>
-                        {/* Lightweight operational arrival learning */}
                         <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-ink-200/70 pt-2.5 text-[11.5px]">
                           <span className="font-semibold text-ink-700">
                             Did you find the apartment easily with HAMLET Wayfinder?
                           </span>
                           {recordedEase ? (
-                            <span className="rounded-full border border-jade-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-jade-800">
+                            <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                               Recorded: {recordedEase === 'easy' ? 'Straight to the door' : 'Reported difficulty'} · Thank you
                             </span>
                           ) : (
@@ -783,7 +1186,7 @@ export default function Account() {
                                   await recordWayfinderEvent(b.id, 'ease_of_arrival_feedback', { ease: 'easy' });
                                   toast('Arrival feedback recorded — thank you.');
                                 }}
-                                className="rounded-lg border border-jade-200 bg-white px-2.5 py-1 text-[11px] font-bold text-jade-800 hover:bg-jade-50"
+                                className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50"
                               >
                                 Yes, straight to the door
                               </button>
@@ -794,7 +1197,7 @@ export default function Account() {
                                   await recordWayfinderEvent(b.id, 'ease_of_arrival_feedback', { ease: 'difficult' });
                                   toast('Logged for operations review — you can also report details via Report issue.');
                                 }}
-                                className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-50"
+                                className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-50"
                               >
                                 Had some difficulty
                               </button>
@@ -806,67 +1209,153 @@ export default function Account() {
 
                     <AnimatePresence>
                       {open && (
-                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-ink-100">
-                          <div className="grid gap-6 p-5 md:grid-cols-2">
+                        <motion.div
+                          initial={{ height: 0, opacity: 0 }}
+                          animate={{ height: 'auto', opacity: 1 }}
+                          exit={{ height: 0, opacity: 0 }}
+                          className="overflow-hidden border-t border-ink-100"
+                        >
+                          <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-2">
                             <div>
-                              <h3 className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink-400">Price & settlement breakdown</h3>
-                              <dl className="mt-2 space-y-1 text-[12px] font-medium text-ink-700">
-                                <div className="flex justify-between gap-3"><dt className="min-w-0">Owner accommodation ({b.nights} nights)</dt><dd className="shrink-0 tabular-nums">{formatNaira(b.accommodationSubtotal)}</dd></div>
-                                <div className="flex justify-between gap-3"><dt className="min-w-0">HAMLET domestic markup (20%)</dt><dd className="shrink-0 tabular-nums">{formatNaira(b.hamletGuestFee)}</dd></div>
-                                {b.mandatoryCharges.map(c => <div key={c.label} className="flex justify-between gap-3"><dt className="min-w-0">{c.label}</dt><dd className="shrink-0 tabular-nums">{formatNaira(c.amount)}</dd></div>)}
+                              <h3 className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink-400">
+                                Price &amp; settlement breakdown
+                              </h3>
+                              <dl className="mt-2 space-y-1 text-xs font-medium text-ink-700">
+                                <div className="flex justify-between gap-3">
+                                  <dt className="min-w-0">Owner accommodation ({b.nights} nights)</dt>
+                                  <dd className="shrink-0 font-mono tabular-nums">{formatNaira(b.accommodationSubtotal)}</dd>
+                                </div>
+                                <div className="flex justify-between gap-3">
+                                  <dt className="min-w-0">HAMLET domestic markup (20%)</dt>
+                                  <dd className="shrink-0 font-mono tabular-nums">{formatNaira(b.hamletGuestFee)}</dd>
+                                </div>
+                                {b.mandatoryCharges.map(c => (
+                                  <div key={c.label} className="flex justify-between gap-3">
+                                    <dt className="min-w-0">{c.label}</dt>
+                                    <dd className="shrink-0 font-mono tabular-nums">{formatNaira(c.amount)}</dd>
+                                  </div>
+                                ))}
                                 {b.quoteCurrency && b.quoteCurrency !== 'NGN' && b.quotedStayTotalMinor && (
-                                  <div className="flex justify-between gap-3 text-sky-900"><dt className="min-w-0">Quoted international stay ({b.quoteCurrency} incl. 10% buffer)</dt><dd className="shrink-0 tabular-nums font-bold">{formatMinorCurrency(b.quotedStayTotalMinor, b.quoteCurrency)}</dd></div>
+                                  <div className="flex justify-between gap-3 text-sky-900">
+                                    <dt className="min-w-0">
+                                      Quoted international stay ({b.quoteCurrency} incl. 10% buffer)
+                                    </dt>
+                                    <dd className="shrink-0 font-mono font-bold tabular-nums">
+                                      {formatMinorCurrency(b.quotedStayTotalMinor, b.quoteCurrency)}
+                                    </dd>
+                                  </div>
                                 )}
-                                <div className="flex justify-between gap-3 border-t border-ink-100 pt-1 font-bold text-ink-900"><dt>Domestic stay base (NGN)</dt><dd className="shrink-0 tabular-nums">{formatNaira(b.guestTotal)}</dd></div>
-                                <div className="flex justify-between gap-3 border-t border-ink-100 pt-1 font-bold text-jade-800"><dt>Paystack NGN stay settlement</dt><dd className="shrink-0 tabular-nums">{formatNaira(payableTotalNgn)}</dd></div>
+                                <div className="flex justify-between gap-3 border-t border-ink-100 pt-1 font-bold text-ink-900">
+                                  <dt>Domestic stay base (NGN)</dt>
+                                  <dd className="shrink-0 font-mono tabular-nums">{formatNaira(b.guestTotal)}</dd>
+                                </div>
+                                <div className="flex justify-between gap-3 border-t border-ink-100 pt-1 font-bold text-ink-900">
+                                  <dt>Paystack NGN stay settlement</dt>
+                                  <dd className="shrink-0 font-mono tabular-nums">{formatNaira(payableTotalNgn)}</dd>
+                                </div>
                                 {b.deposit > 0 && (
-                                  <div className="flex justify-between gap-3 pt-1 text-[11.5px] text-ink-500"><dt className="min-w-0">Separate refundable caution deposit (tracked post-inspection)</dt><dd className="shrink-0 tabular-nums">{formatNaira(b.deposit)}</dd></div>
+                                  <div className="flex justify-between gap-3 pt-1 text-[11.5px] text-ink-500">
+                                    <dt className="min-w-0">
+                                      Separate refundable caution deposit (tracked post-inspection)
+                                    </dt>
+                                    <dd className="shrink-0 font-mono tabular-nums">{formatNaira(b.deposit)}</dd>
+                                  </div>
                                 )}
                               </dl>
                               {cautionRecord && (
-                                <div className="mt-3 rounded-xl border border-ink-200 bg-ink-50/70 p-3 text-[11.5px]">
+                                <div className="mt-3 rounded-2xl border border-ink-200 bg-paper p-3 text-[11.5px]">
                                   <p className="font-bold text-ink-900">
-                                    Caution deposit status: <span className="uppercase text-jade-800">{cautionRecord.status.replace(/_/g, ' ')}</span>
+                                    Caution deposit status:{' '}
+                                    <span className="uppercase text-emerald-800">
+                                      {cautionRecord.status.replace(/_/g, ' ')}
+                                    </span>
                                   </p>
                                   <p className="mt-0.5 text-ink-600">
                                     Amount: {formatNaira(cautionRecord.amountNgn)}
-                                    {cautionRecord.deductedAmountNgn > 0 ? ` · Deducted: ${formatNaira(cautionRecord.deductedAmountNgn)}` : ''}
-                                    {cautionRecord.refundedAmountNgn > 0 ? ` · Refunded: ${formatNaira(cautionRecord.refundedAmountNgn)}` : ''}
+                                    {cautionRecord.deductedAmountNgn > 0
+                                      ? ` · Deducted: ${formatNaira(cautionRecord.deductedAmountNgn)}`
+                                      : ''}
+                                    {cautionRecord.refundedAmountNgn > 0
+                                      ? ` · Refunded: ${formatNaira(cautionRecord.refundedAmountNgn)}`
+                                      : ''}
                                   </p>
-                                  {cautionRecord.inspectionNotes && <p className="mt-1 text-ink-500">Inspection note: {cautionRecord.inspectionNotes}</p>}
-                                  {cautionRecord.deductionReason && <p className="mt-0.5 font-semibold text-amber-900">Deduction reason: {cautionRecord.deductionReason}</p>}
+                                  {cautionRecord.inspectionNotes && (
+                                    <p className="mt-1 text-ink-500">
+                                      Inspection note: {cautionRecord.inspectionNotes}
+                                    </p>
+                                  )}
+                                  {cautionRecord.deductionReason && (
+                                    <p className="mt-0.5 font-semibold text-amber-900">
+                                      Deduction reason: {cautionRecord.deductionReason}
+                                    </p>
+                                  )}
                                 </div>
                               )}
-                              {b.paymentRef && <p className="mt-3 break-all font-mono text-[10px] font-bold text-ink-400">Provider ref: {b.paymentRef} · {b.paymentProvider}</p>}
-                              {b.cancelReason && <p className="mt-2 break-words text-[11.5px] font-semibold text-red-700">Reason: {b.cancelReason}</p>}
-                              {b.refundStatus === 'processed' && <p className="mt-1 text-[11.5px] font-bold text-teal-800">Refund processed: {formatNaira(b.refundAmount ?? b.guestTotal)}</p>}
+                              {b.paymentRef && (
+                                <p className="mt-3 break-all font-mono text-[10px] font-bold text-ink-400">
+                                  Provider ref: {b.paymentRef} · {b.paymentProvider}
+                                </p>
+                              )}
+                              {b.cancelReason && (
+                                <p className="mt-2 break-words text-[11.5px] font-semibold text-red-700">
+                                  Reason: {b.cancelReason}
+                                </p>
+                              )}
+                              {b.refundStatus === 'processed' && (
+                                <p className="mt-1 text-[11.5px] font-bold text-teal-800">
+                                  Refund processed: {formatNaira(b.refundAmount ?? b.guestTotal)}
+                                </p>
+                              )}
                               <div className="mt-4 flex flex-wrap gap-2">
-                                {canCancel && <button
-                                  disabled={cancelingId === b.id}
-                                  onClick={async () => {
-                                    setCancelingId(b.id);
-                                    try {
-                                      await bookingTransition(b.id, 'cancelled', { reason: 'Cancelled by guest before confirmation' });
-                                      toast('Booking cancelled.', 'info');
-                                    } catch (error) {
-                                      toast(error instanceof Error ? error.message : 'Could not cancel this booking.', 'error');
-                                    } finally {
-                                      setCancelingId(null);
-                                    }
-                                  }}
-                                  className="btn-outline !px-3.5 !py-2 text-[11px] text-red-700 hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
-                                ><X size={13} />{cancelingId === b.id ? 'Cancelling…' : 'Cancel booking'}</button>}
-                                {canReport && <button onClick={() => setIssueFor(b)} className="btn-outline !px-3.5 !py-2 text-[11px]"><LifeBuoy size={13} />Report issue</button>}
+                                {canCancel && (
+                                  <button
+                                    disabled={cancelingId === b.id}
+                                    onClick={async () => {
+                                      setCancelingId(b.id);
+                                      try {
+                                        await bookingTransition(b.id, 'cancelled', {
+                                          reason: 'Cancelled by guest before confirmation',
+                                        });
+                                        toast('Booking cancelled.', 'info');
+                                      } catch (error) {
+                                        toast(
+                                          error instanceof Error ? error.message : 'Could not cancel this booking.',
+                                          'error',
+                                        );
+                                      } finally {
+                                        setCancelingId(null);
+                                      }
+                                    }}
+                                    className="btn-outline !rounded-full !px-3.5 !py-2 text-[11px] text-red-700 hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
+                                  >
+                                    <X size={13} />
+                                    {cancelingId === b.id ? 'Cancelling…' : 'Cancel booking'}
+                                  </button>
+                                )}
+                                {canReport && (
+                                  <button
+                                    onClick={() => setIssueFor(b)}
+                                    className="btn-outline !rounded-full !px-3.5 !py-2 text-[11px]"
+                                  >
+                                    <LifeBuoy size={13} />
+                                    Report issue
+                                  </button>
+                                )}
                               </div>
                             </div>
                             <div>
-                              <h3 className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink-400">Timeline</h3>
+                              <h3 className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink-400">
+                                Timeline
+                              </h3>
                               <ol className="mt-2 space-y-0 border-l-2 border-ink-100 pl-4">
                                 {b.timeline.map((t, i) => (
                                   <li key={i} className="relative pb-3 text-[11.5px]">
-                                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-jade-600" />
+                                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-600" />
                                     <p className="font-bold text-ink-800">{t.label}</p>
-                                    <p className="text-[10.5px] font-medium text-ink-400">{formatDateTime(t.at)} · {t.actor}{t.detail ? ` · ${t.detail}` : ''}</p>
+                                    <p className="text-[10.5px] font-medium text-ink-400">
+                                      {formatDateTime(t.at)} · {t.actor}
+                                      {t.detail ? ` · ${t.detail}` : ''}
+                                    </p>
                                   </li>
                                 ))}
                               </ol>
@@ -874,28 +1363,68 @@ export default function Account() {
                           </div>
                           {canFeedback && (
                             <div className="border-t border-ink-100 bg-clay/50 p-4 sm:p-5">
-                              <h3 className="flex items-start gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink-500"><MessageSquarePlus size={14} className="mt-0.5 shrink-0" /> Private pilot feedback — reviewed by HAMLET operations only</h3>
+                              <h3 className="flex items-start gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink-500">
+                                <MessageSquarePlus size={14} className="mt-0.5 shrink-0" /> Private stay feedback — reviewed by HAMLET operations only
+                              </h3>
                               {existingFeedback ? (
-                                <div className="mt-2 rounded-xl border border-ink-200 bg-white px-4 py-3 text-[12px] font-medium text-ink-800">
-                                  <p className="font-bold text-jade-800">{existingFeedback.rating}/5 · {existingFeedback.category}</p>
+                                <div className="mt-2 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-xs font-medium text-ink-800">
+                                  <p className="font-bold text-ink-900">
+                                    {existingFeedback.rating}/5 · {existingFeedback.category}
+                                  </p>
                                   <p className="mt-1 break-words">“{existingFeedback.text}”</p>
-                                  <p className="mt-1 text-[10px] font-semibold text-ink-400">Submitted privately on {formatDateTime(existingFeedback.at)}</p>
+                                  <p className="mt-1 text-[10px] font-semibold text-ink-400">
+                                    Submitted privately on {formatDateTime(existingFeedback.at)}
+                                  </p>
                                 </div>
                               ) : (
                                 <>
                                   <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                     {[1, 2, 3, 4, 5].map(n => (
-                                      <button key={n} type="button" onClick={() => setFbRating(n)} aria-label={`${n} stars`}>
-                                        <Star size={22} className={`shrink-0 ${n <= fbRating ? 'fill-brass-400 text-brass-500' : 'text-ink-200'}`} strokeWidth={1.5} />
+                                      <button
+                                        key={n}
+                                        type="button"
+                                        onClick={() => setFbRating(n)}
+                                        aria-label={`${n} stars`}
+                                      >
+                                        <Star
+                                          size={22}
+                                          className={`shrink-0 ${
+                                            n <= fbRating
+                                              ? 'fill-brass-400 text-brass-500'
+                                              : 'text-ink-200'
+                                          }`}
+                                          strokeWidth={1.5}
+                                        />
                                       </button>
                                     ))}
-                                    <select className="input w-full !py-1.5 text-[11px] sm:ml-3 sm:!w-auto" value={fbCategory} onChange={e => setFbCategory(e.target.value)}>
-                                      {['Stay experience', 'Property condition', 'Check-in & access', 'Value for money', 'Host communication'].map(c => <option key={c}>{c}</option>)}
+                                    <select
+                                      className="input w-full !py-1.5 text-[11px] sm:ml-3 sm:!w-auto"
+                                      value={fbCategory}
+                                      onChange={e => setFbCategory(e.target.value)}
+                                    >
+                                      {[
+                                        'Stay experience',
+                                        'Property condition',
+                                        'Check-in & access',
+                                        'Value for money',
+                                        'Host communication',
+                                      ].map(c => (
+                                        <option key={c}>{c}</option>
+                                      ))}
                                     </select>
                                   </div>
                                   <div className="mt-2 flex flex-col gap-2 sm:flex-row">
-                                    <input className="input flex-1" placeholder="How was your stay? (private, reviewed by HAMLET only)" value={fbText} onChange={e => setFbText(e.target.value)} />
-                                    <button disabled={submittingFbId === b.id} className="btn-dark shrink-0 !px-4 !py-2 text-[12px] disabled:opacity-50" onClick={() => void submitFeedback(b)}>
+                                    <input
+                                      className="input flex-1"
+                                      placeholder="How was your stay? (private, reviewed by HAMLET only)"
+                                      value={fbText}
+                                      onChange={e => setFbText(e.target.value)}
+                                    />
+                                    <button
+                                      disabled={submittingFbId === b.id}
+                                      className="btn-dark shrink-0 !rounded-full !px-4 !py-2 text-xs disabled:opacity-50"
+                                      onClick={() => void submitFeedback(b)}
+                                    >
                                       {submittingFbId === b.id ? 'Sending…' : 'Send'}
                                     </button>
                                   </div>
@@ -913,57 +1442,120 @@ export default function Account() {
           </>
         )}
 
-        {/* ── TAB 2: SUPPORT ISSUES ── */}
+        {/* ── TAB 2: SAVED STAYS (WISHLIST) ── */}
+        {activeTab === 'saved' && (
+          <div className="mt-6">
+            {savedProperties.length === 0 ? (
+              <div className="card px-6 py-16 text-center">
+                <Heart size={36} className="mx-auto text-ink-300" />
+                <h2 className="mt-3 font-display text-xl font-bold text-ink-900">
+                  No saved stays yet
+                </h2>
+                <p className="mt-1 text-sm text-ink-500">
+                  Tap the heart icon on any HAMLET apartment to shortlist stays for comparison.
+                </p>
+                <Link to="/stays" className="btn-jade mt-5 !rounded-full">
+                  Browse verified stays
+                </Link>
+              </div>
+            ) : (
+              <>
+                <div className="mb-4 flex items-center justify-between gap-3">
+                  <p className="text-xs font-semibold text-ink-600">
+                    {savedProperties.length} shortlisted Lagos home{savedProperties.length === 1 ? '' : 's'}
+                  </p>
+                  <button
+                    type="button"
+                    onClick={clearSaved}
+                    className="text-xs font-bold text-ink-500 hover:text-ink-900 hover:underline"
+                  >
+                    Clear shortlist
+                  </button>
+                </div>
+                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
+                  {savedProperties.map(p => (
+                    <PropertyCard key={p.id} p={p} />
+                  ))}
+                </div>
+              </>
+            )}
+          </div>
+        )}
+
+        {/* ── TAB 3: SUPPORT ISSUES ── */}
         {activeTab === 'issues' && (
-          <div className="mt-5 grid gap-4">
+          <div className="mt-6 grid gap-4">
             {myIssues.length === 0 ? (
               <div className="card px-6 py-14 text-center">
                 <LifeBuoy size={36} className="mx-auto text-ink-300" />
-                <h2 className="mt-3 font-display text-xl font-black text-ink-900">No support issues reported</h2>
-                <p className="mt-1 text-sm text-ink-500">If anything needs attention during a confirmed stay, open the booking card and click “Report issue”.</p>
+                <h2 className="mt-3 font-display text-xl font-bold text-ink-900">
+                  No support issues reported
+                </h2>
+                <p className="mt-1 text-sm text-ink-500">
+                  If anything needs attention during a confirmed stay, open the booking card and click “Report issue”.
+                </p>
               </div>
             ) : (
               myIssues.map(issue => (
-                <article key={issue.id} className="card p-5">
+                <article key={issue.id} className="card p-5 sm:p-6">
                   <div className="flex flex-wrap items-center gap-2">
                     <span className="font-mono text-[10.5px] font-bold text-ink-500">{issue.ref}</span>
                     <SeverityPill severity={issue.severity} />
                     <IssueStatusPill status={issue.status} />
-                    <span className="chip border border-ink-200 bg-ink-50 text-ink-700">{issue.category}</span>
-                    {issue.bookingRef && <span className="font-mono text-[10.5px] font-semibold text-jade-800">Booking {issue.bookingRef}</span>}
+                    <span className="chip border border-ink-200 bg-paper text-ink-700">
+                      {issue.category}
+                    </span>
+                    {issue.bookingRef && (
+                      <span className="font-mono text-[10.5px] font-semibold text-ink-900">
+                        Booking {issue.bookingRef}
+                      </span>
+                    )}
                   </div>
-                  <h3 className="mt-2 font-display text-lg font-black text-ink-900">{issue.subject}</h3>
-                  <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-ink-600">{issue.description}</p>
+                  <h3 className="mt-2 font-display text-lg font-bold text-ink-900">{issue.subject}</h3>
+                  <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-ink-600">
+                    {issue.description}
+                  </p>
                   {issue.assignee && (
-                    <p className="mt-2 text-[11px] font-semibold text-ink-500">Assigned operator: <strong className="text-ink-800">{issue.assignee}</strong></p>
+                    <p className="mt-2 text-[11px] font-semibold text-ink-500">
+                      Assigned operator: <strong className="text-ink-800">{issue.assignee}</strong>
+                    </p>
                   )}
                   {issue.evidence.length > 0 && (
-                    <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50/70 p-3">
-                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">Recorded evidence ({issue.evidence.length})</p>
+                    <div className="mt-3 rounded-2xl border border-ink-100 bg-paper p-3">
+                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
+                        Recorded evidence ({issue.evidence.length})
+                      </p>
                       <ul className="mt-1 space-y-1 text-[11.5px] font-medium text-ink-700">
-                        {issue.evidence.map((ev, idx) => <li key={idx}>• {ev}</li>)}
+                        {issue.evidence.map((ev, idx) => (
+                          <li key={idx}>• {ev}</li>
+                        ))}
                       </ul>
                     </div>
                   )}
                   {issue.resolution && (
-                    <div className="mt-3 rounded-xl border border-jade-200 bg-jade-50 px-3.5 py-2.5 text-[12px] font-semibold text-jade-900">
+                    <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-900">
                       Resolution summary: {issue.resolution}
                     </div>
                   )}
                   {!['resolved', 'closed'].includes(issue.status) && (
                     <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                       <input
-                        className="input flex-1 !py-2 text-[12px]"
+                        className="input flex-1 !py-2 text-xs"
                         placeholder="Add supporting detail, timestamp or photo/receipt reference…"
                         value={evidenceDrafts[issue.id] ?? ''}
-                        onChange={e => setEvidenceDrafts(prev => ({ ...prev, [issue.id]: e.target.value }))}
+                        onChange={e =>
+                          setEvidenceDrafts(prev => ({ ...prev, [issue.id]: e.target.value }))
+                        }
                       />
                       <button
                         type="button"
                         disabled={savingEvidenceId === issue.id}
                         onClick={async () => {
                           const draft = (evidenceDrafts[issue.id] ?? '').trim();
-                          if (draft.length < 4) { toast('Enter at least 4 characters.', 'error'); return; }
+                          if (draft.length < 4) {
+                            toast('Enter at least 4 characters.', 'error');
+                            return;
+                          }
                           setSavingEvidenceId(issue.id);
                           try {
                             await appendIssueEvidence(issue.id, draft);
@@ -975,7 +1567,7 @@ export default function Account() {
                             setSavingEvidenceId(null);
                           }
                         }}
-                        className="btn-outline shrink-0 !px-3.5 !py-2 text-[11.5px] disabled:opacity-50"
+                        className="btn-outline shrink-0 !rounded-full !px-3.5 !py-2 text-[11.5px] disabled:opacity-50"
                       >
                         <Paperclip size={13} /> {savingEvidenceId === issue.id ? 'Saving…' : 'Add evidence'}
                       </button>
@@ -987,41 +1579,85 @@ export default function Account() {
           </div>
         )}
 
-        {/* ── TAB 3: PROFILE & SECURITY ── */}
+        {/* ── TAB 4: PROFILE & SECURITY ── */}
         {activeTab === 'profile' && (
-          <div className="mt-5 grid gap-5 md:grid-cols-2">
+          <div className="mt-6 grid gap-5 md:grid-cols-2">
             <form onSubmit={handleSaveProfile} className="card p-5 sm:p-6">
-              <h2 className="font-display text-lg font-black text-ink-900">Contact & profile details</h2>
-              <p className="mt-1 text-[12px] font-medium text-ink-500">Keep your full name and reachable Nigerian/international mobile number updated for estate gate passes and check-in coordination.</p>
+              <h2 className="font-display text-lg font-bold text-ink-900">
+                Contact &amp; profile details
+              </h2>
+              <p className="mt-1 text-xs font-medium text-ink-500">
+                Keep your full name and reachable Nigerian/international mobile number updated for estate gate passes and check-in coordination.
+              </p>
               <label className="mt-4 block">
                 <span className="label">Email (verified sign-in address)</span>
-                <input className="input bg-ink-50 text-ink-500" value={session.email} disabled />
+                <input className="input bg-paper text-ink-500" value={session.email} disabled />
               </label>
               <label className="mt-3 block">
                 <span className="label">Full name</span>
-                <input className="input" required minLength={2} value={profileName} onChange={e => setProfileName(e.target.value)} />
+                <input
+                  className="input"
+                  required
+                  minLength={2}
+                  value={profileName}
+                  onChange={e => setProfileName(e.target.value)}
+                />
               </label>
               <label className="mt-3 block">
                 <span className="label">Phone number</span>
-                <input className="input" type="tel" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="+234 800 000 0000" />
+                <input
+                  className="input"
+                  type="tel"
+                  value={profilePhone}
+                  onChange={e => setProfilePhone(e.target.value)}
+                  placeholder="+234 800 000 0000"
+                />
               </label>
-              <button type="submit" disabled={savingProfile} className="btn-jade mt-4 w-full !py-2.5 text-[12.5px] disabled:opacity-50">
+              <button
+                type="submit"
+                disabled={savingProfile}
+                className="btn-jade mt-4 w-full !rounded-full !py-2.5 text-[12.5px] disabled:opacity-50"
+              >
                 {savingProfile ? 'Saving…' : 'Save profile changes'}
               </button>
             </form>
 
             <form onSubmit={handleChangePassword} className="card p-5 sm:p-6">
-              <h2 className="font-display text-lg font-black text-ink-900">Account password</h2>
-              <p className="mt-1 text-[12px] font-medium text-ink-500">Update the password used to sign in to HAMLET.</p>
+              <h2 className="font-display text-lg font-bold text-ink-900">Account password</h2>
+              <p className="mt-1 text-xs font-medium text-ink-500">
+                Update the password used to sign in to HAMLET.
+              </p>
               <label className="mt-4 block">
                 <span className="label">New password</span>
-                <input type="password" required minLength={6} className="input" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" placeholder="At least 6 characters" />
+                <input
+                  type="password"
+                  required
+                  minLength={6}
+                  className="input"
+                  value={newPassword}
+                  onChange={e => setNewPassword(e.target.value)}
+                  autoComplete="new-password"
+                  placeholder="At least 6 characters"
+                />
               </label>
               <label className="mt-3 block">
                 <span className="label">Confirm new password</span>
-                <input type="password" required minLength={6} className="input" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} autoComplete="new-password" placeholder="Re-enter new password" />
+                <input
+                  type="password"
+                  required
+                  minLength={6}
+                  className="input"
+                  value={confirmNewPassword}
+                  onChange={e => setConfirmNewPassword(e.target.value)}
+                  autoComplete="new-password"
+                  placeholder="Re-enter new password"
+                />
               </label>
-              <button type="submit" disabled={savingPassword} className="btn-dark mt-4 w-full !py-2.5 text-[12.5px] disabled:opacity-50">
+              <button
+                type="submit"
+                disabled={savingPassword}
+                className="btn-dark mt-4 w-full !rounded-full !py-2.5 text-[12.5px] disabled:opacity-50"
+              >
                 {savingPassword ? 'Updating…' : 'Update password'}
               </button>
             </form>
@@ -1029,13 +1665,25 @@ export default function Account() {
         )}
       </div>
 
-      <AnimatePresence>{payFor && !backendConfigured && <PaymentModal booking={payFor} onClose={() => setPayFor(null)} />}</AnimatePresence>
-      <AnimatePresence>{issueFor && <IssueModal booking={issueFor} onClose={() => setIssueFor(null)} />}</AnimatePresence>
+      <AnimatePresence>
+        {payFor && !backendConfigured && (
+          <PaymentModal booking={payFor} onClose={() => setPayFor(null)} />
+        )}
+      </AnimatePresence>
+      <AnimatePresence>
+        {issueFor && <IssueModal booking={issueFor} onClose={() => setIssueFor(null)} />}
+      </AnimatePresence>
     </GuestLayout>
   );
 }
 
-export function WorkspaceGuard({ expected, children }: { expected: 'partner' | 'admin'; children: React.ReactNode }) {
+export function WorkspaceGuard({
+  expected,
+  children,
+}: {
+  expected: 'partner' | 'admin';
+  children: React.ReactNode;
+}) {
   const { state, backendReady, signOut } = useHamlet();
   const navigate = useNavigate();
   const location = useLocation();
@@ -1047,7 +1695,9 @@ export function WorkspaceGuard({ expected, children }: { expected: 'partner' | '
   if (!backendReady) {
     return (
       <div className="flex min-h-screen items-center justify-center bg-ink-950 p-6">
-        <p className="text-[13px] font-semibold text-ink-300">Restoring your secure workspace session…</p>
+        <p className="text-[13px] font-semibold text-ink-300">
+          Restoring your secure workspace session…
+        </p>
       </div>
     );
   }
@@ -1074,7 +1724,7 @@ export function WorkspaceGuard({ expected, children }: { expected: 'partner' | '
       <div className="flex min-h-screen items-center justify-center bg-ink-950 p-6">
         <div className="max-w-md text-center">
           <ShieldCheck size={44} className="mx-auto text-brass-400" />
-          <h1 className="mt-4 font-display text-2xl font-black text-ink-50">
+          <h1 className="mt-4 font-display text-2xl font-bold text-white">
             {s
               ? 'Access denied for current account'
               : expected === 'admin'
@@ -1090,12 +1740,15 @@ export function WorkspaceGuard({ expected, children }: { expected: 'partner' | '
             <button
               disabled={switchingAccount}
               onClick={() => void switchToAuthorizedAccount()}
-              className="btn-brass !py-2.5 text-[12px] disabled:opacity-50"
+              className="btn-brass !rounded-full !py-2.5 text-xs disabled:opacity-50"
             >
               {s ? `Sign in with ${expected} account` : 'Sign in'}
             </button>
             {expected === 'partner' && !s && (
-              <button onClick={() => navigate('/partner/register')} className="btn-ghost-dark !py-2.5 text-[12px]">
+              <button
+                onClick={() => navigate('/partner/register')}
+                className="btn-ghost-dark !rounded-full !py-2.5 text-xs"
+              >
                 Apply as partner
               </button>
             )}
```

### `src/pages/Faqs.tsx` (Modified)

```diff
diff --git a/src/pages/Faqs.tsx b/src/pages/Faqs.tsx
index 850b78d..3351b45 100644
--- a/src/pages/Faqs.tsx
+++ b/src/pages/Faqs.tsx
@@ -1,58 +1,73 @@
 import { useState } from 'react';
 import { Link } from 'react-router-dom';
-import { ArrowRight, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
+import { ArrowRight, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
 import { GuestLayout } from '../components/Navbar';
+import { useHoratio } from '../components/HoratioDrawer';
 import { usePageMeta } from '../lib/brand';
 import { buildFaqStructuredData } from '../lib/seo';
 
-const FAQ_ITEMS = [
+type FaqCategory = 'all' | 'trust' | 'pricing' | 'stay';
+
+const FAQ_ITEMS: { q: string; a: string; category: Exclude<FaqCategory, 'all'> }[] = [
   {
     q: '1. Are the pictures on HAMLET real?',
-    a: 'Property photos should represent the accommodation being offered. Review the photos alongside the property description, amenities, and location details. Where a listing has been verified, look for the verification information provided. If you notice a significant difference between the listing and what was presented, contact HAMLET through your booking support route and share the relevant evidence.',
+    a: 'Check the four verification pillars on each listing to see whether on-site physical inspection has been completed. Report any material mismatch from your booking page.',
+    category: 'trust',
   },
   {
     q: '2. What happens if there is a power outage?',
-    a: 'Power arrangements differ between properties. Some may have an inverter, a generator, or 24/7 estate power, while others may rely on local supply. Check the listing for details about the available backup, what it powers, and any limitations. If a material power arrangement was explicitly promised and is not available during your stay, document the issue and report it through your booking support route.',
+    a: 'Backup arrangements (24/7 power, inverter, or generator) are listed per property. Check the amenities section before booking.',
+    category: 'stay',
   },
   {
     q: '3. How do I know if a shortlet is safe?',
-    a: 'Start by reviewing the property information, access arrangements, house rules, and the four verification pillars shown on the listing. No listing can guarantee that every situation will be risk-free — choose a property whose arrangements meet your needs, keep your access information private, and report concerns through the official support channel.',
+    a: 'Review the four verification pillars, house rules, and security amenities on the listing, and keep your check-in codes private.',
+    category: 'trust',
   },
   {
     q: '4. Are there hidden fees?',
-    a: 'No — review the full price breakdown before submitting a booking request. Charges clearly show the owner’s listed accommodation rate, HAMLET’s 20% domestic accommodation markup, any disclosed mandatory charges (such as cleaning), and any refundable caution deposit itemised separately. International USD ($) and GBP (£) quotes include a single 10% currency buffer on stay pricing (never on the refundable caution deposit) and display the exact Naira settlement total upfront.',
+    a: 'No. Every quote itemises the owner rate, 20% domestic markup, mandatory charges, and any separate refundable caution deposit upfront. USD/GBP quotes include a single 10% stay buffer and settle in NGN.',
+    category: 'pricing',
   },
   {
     q: '5. How does check-in work?',
-    a: 'Check-in arrangements depend on the property. Some stays involve a host or property manager meeting you; others use a key collection process or a smart lock. Your confirmed booking record explains the arrival window and house rules. If you expect to arrive late or your plans change, add a note on your booking or notify support.',
+    a: 'Once confirmed, HAMLET Wayfinder unlocks entrance coordinates and check-in instructions inside your account.',
+    category: 'stay',
   },
   {
-    q: '6. Is my booking confirmed as soon as I submit a request?',
-    a: 'No. A booking request and a confirmed reservation are different. On HAMLET, the host or authorised partner first checks availability and terms; once accepted, a 48-hour payment window opens, and the reservation is confirmed only after verified provider payment.',
+    q: '6. Is my booking confirmed when I send a request?',
+    a: 'No. The host confirms availability first, opening a 48-hour Paystack payment window. Confirmation happens after verified payment.',
+    category: 'pricing',
   },
   {
-    q: '7. Can I cancel my reservation and get a refund?',
-    a: 'Refund eligibility depends on the cancellation terms shown for your booking and the stage of the reservation. Requests can be cancelled before confirmation from your guest account. If a confirmed property becomes unavailable or a material discrepancy arises, report it promptly so HAMLET operations can review and process any applicable refund.',
+    q: '7. Can I cancel and get a refund?',
+    a: 'Requests can be cancelled free before confirmation. Confirmed bookings follow the cancellation terms shown on your reservation.',
+    category: 'pricing',
   },
   {
-    q: '8. What if I arrive and the apartment is not as described?',
-    a: 'Document the issue with photos, screenshots, or messages where appropriate, and report it from your HAMLET guest account as soon as possible. Explain what differs from the listing and how it affects your stay. If you feel physically unsafe, prioritise your safety and contact local emergency services first.',
+    q: '8. What if the apartment is not as described?',
+    a: 'Report the issue with photos immediately from My Bookings so HAMLET operations can investigate.',
+    category: 'trust',
   },
   {
     q: '9. Are Wi-Fi and air conditioning included?',
-    a: 'Amenities vary by property. Check each listing’s amenities list to confirm whether Wi-Fi, air conditioning, workspace, kitchen facilities, parking, generator backup, and other features are included before booking.',
+    a: 'Check each listing’s amenities strip for Wi-Fi, workspace, air conditioning, kitchen, and parking.',
+    category: 'stay',
   },
   {
-    q: '10. Can I book a shortlet for a family or group?',
-    a: 'Yes, where the property permits your intended occupancy. Check the maximum guest capacity, bedroom configuration, and house rules (for example, HAMLET properties prohibit unauthorised parties or events). Make sure the guest count in your booking matches the people who will be staying.',
+    q: '10. Can I book for a family or group?',
+    a: 'Yes, within the stated guest capacity. Unauthorised parties and events are prohibited.',
+    category: 'stay',
   },
   {
-    q: '11. Can I pay the property owner directly?',
-    a: 'No — always follow the official payment checkout presented inside your HAMLET account for your reservation. Never transfer funds to an unrelated personal account or off-platform contact. Keeping payments within the verified process preserves your booking record and protection.',
+    q: '11. Can I pay the owner directly?',
+    a: 'No. Always pay through the Paystack checkout inside your HAMLET account so your booking and deposit remain protected.',
+    category: 'pricing',
   },
   {
-    q: '12. What if I need help during my stay?',
-    a: 'Open your HAMLET guest account, select your booking, and use the Report an Issue / Support workflow with your booking reference and a concise description of the problem (plus any supporting evidence). For an urgent physical safety emergency, contact local emergency services first.',
+    q: '12. How do I get help during my stay?',
+    a: 'Open My Account → My Bookings → Report Issue. For any physical safety emergency, contact local emergency services first.',
+    category: 'trust',
   },
 ];
 
@@ -65,45 +80,90 @@ export default function Faqs() {
     { canonicalPath: '/faqs', structuredData: FAQ_SCHEMA },
   );
 
-  const [openIndex, setOpenIndex] = useState<number | null>(0);
+  const { openHoratio } = useHoratio();
+  const [category, setCategory] = useState<FaqCategory>('all');
+  const [openQuestion, setOpenQuestion] = useState<string | null>(FAQ_ITEMS[0]!.q);
+
+  const visibleItems =
+    category === 'all' ? FAQ_ITEMS : FAQ_ITEMS.filter(item => item.category === category);
 
   return (
     <GuestLayout>
-      <section className="border-b border-ink-100 bg-ink-950 text-paper">
-        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
-          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brass-300">
-            Frequently asked questions
-          </p>
-          <h1 className="mt-3 font-display text-3xl font-black leading-tight sm:text-5xl">
-            Before you book, let’s clear a few things up.
+      {/* Hero */}
+      <section className="border-b border-ink-800 bg-ink-950 text-paper">
+        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
+          <p className="eyebrow-light">FAQs</p>
+          <h1 className="mt-2.5 font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
+            Straight answers.
           </h1>
-          <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-ink-200">
-            Straightforward answers on how property verification, power arrangements, pricing, check-in, payments, and support work on HAMLET.
-          </p>
         </div>
       </section>
 
-      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-16">
-        <div className="space-y-3">
-          {FAQ_ITEMS.map((item, idx) => {
-            const isOpen = openIndex === idx;
+      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
+        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
+          <div className="flex flex-wrap gap-1.5">
+            {(
+              [
+                { id: 'all', label: `All (${FAQ_ITEMS.length})` },
+                { id: 'trust', label: 'Trust & safety' },
+                { id: 'pricing', label: 'Pricing' },
+                { id: 'stay', label: 'Check-in & amenities' },
+              ] as const
+            ).map(tab => (
+              <button
+                key={tab.id}
+                type="button"
+                onClick={() => setCategory(tab.id)}
+                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
+                  category === tab.id
+                    ? 'bg-ink-900 text-white'
+                    : 'border border-ink-200 bg-white text-ink-600 hover:border-ink-400'
+                }`}
+              >
+                {tab.label}
+              </button>
+            ))}
+          </div>
+        </div>
+
+        <div className="space-y-2.5">
+          {visibleItems.map(item => {
+            const isOpen = openQuestion === item.q;
+            const numMatch = item.q.match(/^(\d+)\.\s*(.*)$/);
+            const numLabel = numMatch ? numMatch[1]!.padStart(2, '0') : '';
+            const cleanTitle = numMatch ? numMatch[2]! : item.q;
+
             return (
-              <div key={item.q} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
+              <div
+                key={item.q}
+                className={`overflow-hidden rounded-2xl border bg-white transition ${
+                  isOpen ? 'border-ink-300 shadow-xs' : 'border-ink-100'
+                }`}
+              >
                 <button
                   type="button"
-                  onClick={() => setOpenIndex(isOpen ? null : idx)}
+                  onClick={() => setOpenQuestion(isOpen ? null : item.q)}
                   aria-expanded={isOpen}
-                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-ink-50/60 sm:px-6"
+                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-paper/50"
                 >
-                  <span className="font-display text-base font-black text-ink-900 sm:text-[17px]">{item.q}</span>
+                  <div className="flex items-baseline gap-3">
+                    {numLabel && (
+                      <span className="font-mono text-xs font-extrabold tracking-widest text-brass-600">
+                        {numLabel}
+                      </span>
+                    )}
+                    <span className="font-display text-base font-bold text-ink-900 sm:text-[17px]">
+                      {cleanTitle}
+                    </span>
+                  </div>
                   {isOpen ? (
-                    <ChevronUp size={18} className="shrink-0 text-jade-700" />
+                    <ChevronUp size={17} className="shrink-0 text-ink-900" />
                   ) : (
-                    <ChevronDown size={18} className="shrink-0 text-ink-400" />
+                    <ChevronDown size={17} className="shrink-0 text-ink-400" />
                   )}
                 </button>
                 {isOpen && (
-                  <div className="border-t border-ink-50 px-5 py-4 text-sm leading-relaxed text-ink-600 sm:px-6">
+                  <div className="border-t border-ink-100 px-5 py-4 text-sm leading-relaxed text-ink-600 sm:pl-12">
                     {item.a}
                   </div>
                 )}
@@ -112,22 +172,22 @@ export default function Faqs() {
           })}
         </div>
 
-        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-3xl border border-ink-100 bg-clay/70 p-6 sm:flex-row sm:items-center sm:p-8">
-          <div className="flex items-start gap-3">
-            <HelpCircle size={22} className="mt-0.5 shrink-0 text-jade-700" />
-            <div>
-              <h2 className="font-display text-lg font-black text-ink-900">Ready to explore available stays?</h2>
-              <p className="mt-1 text-xs font-medium text-ink-600">
-                Compare verified Lagos apartments, review house rules, and see total stay prices upfront.
-              </p>
-            </div>
+        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-3xl border border-ink-200 bg-white p-6 sm:flex-row sm:items-center">
+          <div>
+            <h2 className="font-display text-xl font-bold text-ink-900">
+              Need something else?
+            </h2>
           </div>
           <div className="flex flex-wrap gap-2.5">
-            <Link to="/stays" className="btn-jade min-h-11">
-              Find my stay <ArrowRight size={15} />
-            </Link>
-            <Link to="/safety" className="btn-outline min-h-11 !bg-white">
-              Safety & protection
+            <button
+              type="button"
+              onClick={() => openHoratio()}
+              className="btn-outline min-h-11 !rounded-full"
+            >
+              <Sparkles size={15} className="text-brass-600" /> Ask Horatio
+            </button>
+            <Link to="/stays" className="btn-jade min-h-11 !rounded-full">
+              Explore stays <ArrowRight size={15} />
             </Link>
           </div>
         </div>
```

### `src/pages/Home.tsx` (Modified)

```diff
diff --git a/src/pages/Home.tsx b/src/pages/Home.tsx
index f8bf89c..9cf3919 100644
--- a/src/pages/Home.tsx
+++ b/src/pages/Home.tsx
@@ -1,436 +1,657 @@
-import { useMemo, useState } from 'react';
+import { useEffect, useState, type FormEvent } from 'react';
 import { Link, useNavigate } from 'react-router-dom';
 import {
-  ArrowRight, Banknote, Building2, CalendarDays, ChevronRight,
-  MapPin, Search, ShieldCheck, SlidersHorizontal, Users, Zap,
+  ArrowRight,
+  ArrowUpRight,
+  Building2,
+  Calendar,
+  ChevronLeft,
+  ChevronRight,
+  MapPin,
+  Search,
+  ShieldCheck,
+  Sparkles,
+  Users,
 } from 'lucide-react';
 import { GuestLayout } from '../components/Navbar';
 import { PropertyCard } from '../components/PropertyCard';
 import { CurrencyToggle } from '../components/CurrencyToggle';
+import { useHoratio } from '../components/HoratioDrawer';
 import { useHamlet } from '../lib/store';
+import { useCurrency } from '../lib/currency';
 import {
   ISLAND_AND_LEKKI_AREAS,
+  isMainlandProperty,
   MAINLAND_AREAS,
   matchesLagosAreaFilter,
 } from '../lib/areas';
+import { HAMLET_BRAND_NAME, HAMLET_USP, usePageMeta } from '../lib/brand';
 import { addDaysToIsoDate, lagosIsoDateOffset } from '../lib/pricing';
-import { HAMLET_TAGLINE, usePageMeta } from '../lib/brand';
 
 const QUICK_AREAS = [
-  { label: 'All Lagos', match: '' },
-  { label: 'Lagos Mainland', match: 'Lagos Mainland' },
-  { label: 'Yaba', match: 'Yaba' },
-  { label: 'Surulere', match: 'Surulere' },
-  { label: 'Shomolu', match: 'Shomolu' },
-  { label: 'Ikeja', match: 'Ikeja' },
-  { label: 'Gbagada', match: 'Gbagada' },
-  { label: 'Lekki', match: 'Lekki' },
-  { label: 'Victoria Island', match: 'Victoria Island' },
-  { label: 'Ikoyi', match: 'Ikoyi' },
-  { label: 'Ajah', match: 'Ajah' },
-  { label: 'Oniru', match: 'Oniru' },
-  { label: 'Banana Island', match: 'Banana Island' },
-];
-
-const QUICK_AMENITIES = ['24/7 Power', 'Wifi', 'Pool', 'Workspace'] as const;
+  'Lagos Mainland',
+  'Yaba',
+  'Surulere',
+  'Shomolu',
+  'Ikeja GRA',
+  'Victoria Island',
+  'Ikoyi',
+  'Lekki Phase 1',
+] as const;
+
+const HERO_SLIDES = [
+  {
+    src: '/images/hero-sample-living.jpg',
+    room: 'Living room',
+    alt: 'Thoughtfully furnished sample apartment living room with bouclé sofa, warm brass floor lamp, and balcony palms',
+  },
+  {
+    src: '/images/hero-sample-bedroom.jpg',
+    room: 'Primary bedroom',
+    alt: 'Thoughtfully furnished sample apartment primary bedroom with upholstered linen king bed and walnut joinery',
+  },
+  {
+    src: '/images/hero-sample-kitchen.jpg',
+    room: 'Kitchen & dining',
+    alt: 'Thoughtfully furnished sample apartment open-plan marble kitchen island and walnut dining table',
+  },
+  {
+    src: '/images/hero-sample-lounge.jpg',
+    room: 'Study & terrace',
+    alt: 'Thoughtfully furnished sample apartment walnut workspace and twilight terrace lounge',
+  },
+] as const;
 
 const NEIGHBOURHOOD_CARDS = [
-  { name: 'Lagos Mainland', tag: 'Yaba, Shomolu, Surulere & environs', href: '/stays?area=Lagos+Mainland', featured: true },
-  { name: 'Yaba', tag: 'Sabo, Alagomeji, Akoka & tech hub', href: '/stays?area=Yaba' },
-  { name: 'Surulere', tag: 'Bode Thomas, Adeniran Ogunsanya & Aguda', href: '/stays?area=Surulere' },
-  { name: 'Shomolu', tag: 'Palmgrove, Onipanu, Pedro & Fadeyi', href: '/stays?area=Shomolu' },
-  { name: 'Ikeja & Environs', tag: 'Ikeja GRA, Maryland, Gbagada & Magodo', href: '/stays?q=Ikeja' },
-  { name: 'Lekki', tag: 'Dining, lifestyle & coastal stays', href: '/stays?q=Lekki' },
-  { name: 'Victoria Island', tag: 'Business districts & city access', href: '/stays?area=Victoria+Island' },
-  { name: 'Ikoyi & Ajah', tag: 'Residential Island & Lekki–Ajah corridor', href: '/lagos' },
-];
+  {
+    name: 'Yaba',
+    corridor: 'Mainland',
+    sub: 'Sabo · Alagomeji · Akoka',
+    matchArea: 'Yaba',
+    to: '/stays?area=Yaba',
+    img: '/images/prop/studio-1.jpg',
+  },
+  {
+    name: 'Surulere',
+    corridor: 'Mainland',
+    sub: 'Bode Thomas · Adeniran Ogunsanya',
+    matchArea: 'Surulere',
+    to: '/stays?area=Surulere',
+    img: '/images/prop/bed-1.jpg',
+  },
+  {
+    name: 'Shomolu',
+    corridor: 'Mainland',
+    sub: 'Palmgrove · Onipanu · Gbagada',
+    matchArea: 'Shomolu',
+    to: '/stays?area=Shomolu',
+    img: '/images/prop/kitchen-1.jpg',
+  },
+  {
+    name: 'Ikeja GRA',
+    corridor: 'Mainland',
+    sub: 'Airport axis · Maryland · Magodo',
+    matchArea: 'Ikeja GRA',
+    to: '/stays?area=Ikeja+GRA',
+    img: '/images/prop/duplex.jpg',
+  },
+  {
+    name: 'Victoria Island',
+    corridor: 'Island',
+    sub: 'Adeola Odeku · Ahmadu Bello',
+    matchArea: 'Victoria Island',
+    to: '/stays?area=Victoria+Island',
+    img: '/images/prop/living-1.jpg',
+  },
+  {
+    name: 'Ikoyi',
+    corridor: 'Island',
+    sub: 'Old Ikoyi · Banana Island · Falomo',
+    matchArea: 'Ikoyi',
+    to: '/stays?area=Ikoyi',
+    img: '/images/prop/penthouse.jpg',
+  },
+  {
+    name: 'Lekki Phase 1',
+    corridor: 'Island',
+    sub: 'Admiralty Way · Oniru',
+    matchArea: 'Lekki Phase 1',
+    to: '/stays?area=Lekki+Phase+1',
+    img: '/images/prop/pool-1.jpg',
+  },
+  {
+    name: 'Ajah',
+    corridor: 'Island',
+    sub: 'Chevron · Orchid Road · Sangotedo',
+    matchArea: 'Ajah',
+    to: '/stays?area=Ajah',
+    img: '/images/prop/exterior-1.jpg',
+  },
+] as const;
+
+type BoardFilter = 'all' | 'mainland' | 'island';
 
 export default function Home() {
   usePageMeta(
-    'HAMLET Shortlets | Find Your Next Stay in Lagos',
-    'Explore shortlets across Lagos Mainland (Yaba, Shomolu, Surulere, Ikeja & environs) and Lagos Island (Lekki, Victoria Island, Ikoyi & Ajah) on HAMLET.',
+    'HAMLET for Your Shortlets | Shortlets in Lagos — Mainland & Island',
+    'Find verified shortlets across Lagos Mainland (Yaba, Shomolu, Surulere, Ikeja & environs) and Lagos Island (Lekki, Victoria Island, Ikoyi, Ajah) with transparent Naira, USD & GBP pricing.',
+    { canonicalPath: '/' },
   );
 
   const { state, backendReady, backendError } = useHamlet();
+  const { formatStayPrice } = useCurrency();
+  const { openHoratio } = useHoratio();
   const navigate = useNavigate();
 
-  const today = lagosIsoDateOffset(0);
   const [area, setArea] = useState('');
-  const [checkIn, setCheckIn] = useState(() => lagosIsoDateOffset(1));
-  const [checkOut, setCheckOut] = useState(() => lagosIsoDateOffset(3));
+  const [searchSide, setSearchSide] = useState<'all' | 'mainland' | 'island'>('all');
+  const [checkIn, setCheckIn] = useState('');
+  const [checkOut, setCheckOut] = useState('');
   const [guests, setGuests] = useState(2);
+  const [boardFilter, setBoardFilter] = useState<BoardFilter>('all');
+  const [heroSlide, setHeroSlide] = useState(0);
+  const [slideshowPaused, setSlideshowPaused] = useState(false);
 
-  // Instant marketplace filters right on the landing page
-  const [activeAreaFilter, setActiveAreaFilter] = useState('');
-  const [activeAmenity, setActiveAmenity] = useState('');
+  useEffect(() => {
+    if (slideshowPaused) return;
+    const timer = window.setInterval(() => {
+      setHeroSlide(prev => (prev + 1) % HERO_SLIDES.length);
+    }, 5500);
+    return () => window.clearInterval(timer);
+  }, [heroSlide, slideshowPaused]);
 
-  const approved = useMemo(
-    () => state.properties.filter(property => property.status === 'approved'),
-    [state.properties],
-  );
+  const minDate = lagosIsoDateOffset(0);
+  const approved = state.properties.filter(p => p.status === 'approved');
 
-  const filteredMarketplace = useMemo(() => {
-    return approved.filter(p => {
-      if (activeAreaFilter && !matchesLagosAreaFilter(p, activeAreaFilter)) {
-        return false;
-      }
-      if (activeAmenity && !p.amenities.includes(activeAmenity)) return false;
+  const boardProperties = approved
+    .filter(p => {
+      if (boardFilter === 'mainland') return isMainlandProperty(p);
+      if (boardFilter === 'island') return !isMainlandProperty(p);
       return true;
-    });
-  }, [approved, activeAreaFilter, activeAmenity]);
+    })
+    .slice(0, 6);
 
-  const displayedStays = filteredMarketplace.slice(0, 9);
-  const minCheckOut = addDaysToIsoDate(checkIn, 1);
+  const floorPriceFor = (matchArea: string): string | null => {
+    const matches = approved.filter(p => matchesLagosAreaFilter(p, matchArea));
+    if (matches.length === 0) return null;
+    const minRate = Math.min(...matches.map(p => p.nightlyRate));
+    return formatStayPrice(Math.round(minRate * 1.2));
+  };
 
-  const search = (event: React.FormEvent<HTMLFormElement>) => {
+  const onSearch = (event: FormEvent) => {
     event.preventDefault();
-    const query = new URLSearchParams();
-    if (area) query.set('area', area);
-    query.set('checkIn', checkIn);
-    query.set('checkOut', checkOut);
-    query.set('guests', String(guests));
-    navigate(`/stays?${query.toString()}`);
+    const params = new URLSearchParams();
+    if (area) params.set('area', area);
+    else if (searchSide !== 'all') params.set('side', searchSide);
+    if (checkIn) params.set('checkIn', checkIn);
+    if (checkOut) params.set('checkOut', checkOut);
+    if (guests > 1) params.set('guests', String(guests));
+    navigate(`/stays${params.toString() ? `?${params.toString()}` : ''}`);
   };
 
   return (
     <GuestLayout>
-      {/* ── 1. Compact Search Hero ───────────────────────────────────────── */}
-      <section className="relative overflow-hidden bg-ink-950">
-        <img
-          src="/images/prop/penthouse.jpg"
-          alt="Lagos shortlet apartment interior"
-          className="absolute inset-0 h-full w-full object-cover opacity-40"
-        />
-        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/80 to-ink-950/45" />
-        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
-          <div className="max-w-2xl">
-            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brass-300">
-              Lagos Mainland & Island · {HAMLET_TAGLINE}
-            </p>
-            <h1 className="mt-2 font-display text-3xl font-black leading-[1.06] tracking-tight text-paper sm:text-5xl">
-              Come in. Settle down. Feel at home.
-            </h1>
-            <p className="mt-2.5 max-w-xl text-sm font-medium text-ink-200 sm:text-[15px]">
-              Browse verified Lagos apartments — from Yaba, Shomolu & Surulere to Lekki, VI & Ikoyi — with upfront pricing and confirmed amenities.
-            </p>
-          </div>
+      {/* ── Full-Clarity Sample Interior Hero Slideshow ────────────── */}
+      <section
+        className="relative flex min-h-[430px] flex-col justify-end overflow-hidden bg-ink-950 text-paper sm:min-h-[530px] lg:min-h-[610px]"
+        onMouseEnter={() => setSlideshowPaused(true)}
+        onMouseLeave={() => setSlideshowPaused(false)}
+      >
+        {/* Crossfading sample apartment interior slides — 100% full brightness */}
+        <div className="absolute inset-0" aria-hidden="true">
+          {HERO_SLIDES.map((slide, index) => {
+            const isCurrent = index === heroSlide;
+            return (
+              <img
+                key={slide.src}
+                src={slide.src}
+                alt={slide.alt}
+                loading="eager"
+                decoding="async"
+                className={`absolute inset-0 h-full w-full object-cover object-center brightness-[1.03] contrast-[1.02] transition-all duration-1000 ease-out ${
+                  isCurrent ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
+                }`}
+              />
+            );
+          })}
+        </div>
 
-          <form
-            id="stay-search"
-            onSubmit={search}
-            className="mt-6 grid scroll-mt-24 grid-cols-1 gap-2 rounded-2xl border border-white/15 bg-ink-900/95 p-2.5 shadow-2xl backdrop-blur-md sm:grid-cols-2 lg:max-w-5xl lg:grid-cols-5"
-          >
-            <label className="flex min-h-13 items-center gap-2 rounded-xl bg-ink-800/80 px-3 py-2">
-              <MapPin size={16} className="shrink-0 text-brass-400" />
-              <span className="min-w-0 flex-1">
-                <span className="block text-[9.5px] font-extrabold uppercase tracking-widest text-ink-300">Location</span>
-                <select
-                  value={area}
-                  onChange={event => setArea(event.target.value)}
-                  aria-label="Where would you like to stay?"
-                  className="w-full bg-transparent text-[13px] font-bold text-white outline-none [&>option]:text-ink-900 [&>optgroup]:text-ink-900"
+        {/* Localized bottom/left vignette only — leaves the furnished room bright & unobstructed */}
+        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink-950/80 via-ink-950/25 to-transparent" />
+        <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-ink-950/55 via-ink-950/15 to-transparent lg:w-3/5" />
+
+        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-14 pt-24 sm:px-6 sm:pb-20 sm:pt-32">
+          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
+            <div className="max-w-xl">
+              <div className="inline-flex items-center gap-2 rounded-full border border-brass-400/50 bg-ink-950/70 px-3.5 py-1 text-[11px] font-bold tracking-wide text-brass-300 backdrop-blur-md">
+                <ShieldCheck size={13} className="shrink-0 text-brass-400" />
+                <span>
+                  {HAMLET_BRAND_NAME} · {HAMLET_USP}
+                </span>
+              </div>
+
+              <h1 className="mt-3.5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_18px_rgba(8,15,30,0.65)] sm:text-5xl lg:text-6xl">
+                Lagos is big.{' '}
+                <span className="italic text-brass-300">Your stay, sorted.</span>
+              </h1>
+
+              <p className="mt-2.5 max-w-lg text-sm font-semibold text-white/95 drop-shadow-[0_1px_10px_rgba(8,15,30,0.7)] sm:text-base">
+                Verified shortlets across Lagos Mainland &amp; Island. Pay only after availability is confirmed.
+              </p>
+            </div>
+
+            {/* Sample interior room switcher + prev/next controls */}
+            <div className="flex flex-wrap items-center gap-2 self-start lg:self-end">
+              <div
+                className="flex flex-wrap items-center gap-1 rounded-2xl border border-white/25 bg-ink-950/65 p-1 backdrop-blur-md sm:rounded-full"
+                role="tablist"
+                aria-label="Sample apartment rooms"
+              >
+                <span className="px-2.5 text-[10.5px] font-bold uppercase tracking-wider text-brass-300">
+                  Sample interior
+                </span>
+                {HERO_SLIDES.map((slide, index) => {
+                  const active = index === heroSlide;
+                  return (
+                    <button
+                      key={slide.src}
+                      type="button"
+                      role="tab"
+                      aria-selected={active}
+                      aria-label={`Show ${slide.room}`}
+                      onClick={() => setHeroSlide(index)}
+                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
+                        active
+                          ? 'bg-brass-400 text-ink-950 shadow-2xs'
+                          : 'text-white/85 hover:bg-white/15 hover:text-white'
+                      }`}
+                    >
+                      {slide.room}
+                    </button>
+                  );
+                })}
+              </div>
+
+              <div className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-ink-950/65 p-1 backdrop-blur-md">
+                <button
+                  type="button"
+                  aria-label="Previous interior photo"
+                  onClick={() =>
+                    setHeroSlide(prev => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
+                  }
+                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white [&>svg]:shrink-0"
                 >
-                  <option value="">All Lagos areas</option>
-                  <optgroup label="Lagos Mainland & Environs">
-                    {MAINLAND_AREAS.map(destination => (
-                      <option key={destination} value={destination}>
-                        {destination === 'Lagos Mainland' ? 'Lagos Mainland (Yaba, Shomolu, Surulere & environs)' : destination}
-                      </option>
-                    ))}
-                  </optgroup>
-                  <optgroup label="Lagos Island & Lekki Corridor">
-                    {ISLAND_AND_LEKKI_AREAS.map(destination => (
-                      <option key={destination} value={destination}>{destination}</option>
-                    ))}
-                  </optgroup>
-                </select>
-              </span>
-            </label>
-            <label className="flex min-h-13 min-w-0 items-center gap-2 rounded-xl bg-ink-800/80 px-3 py-2">
-              <CalendarDays size={16} className="shrink-0 text-brass-400" />
-              <span className="min-w-0 flex-1">
-                <span className="block text-[9.5px] font-extrabold uppercase tracking-widest text-ink-300">Check-in</span>
-                <input
-                  type="date"
-                  required
-                  value={checkIn}
-                  min={today}
-                  aria-label="Check-in date"
-                  onChange={event => {
-                    const nextCheckIn = event.target.value;
-                    setCheckIn(nextCheckIn);
-                    if (checkOut <= nextCheckIn) setCheckOut(addDaysToIsoDate(nextCheckIn, 2));
-                  }}
-                  className="w-full min-w-0 bg-transparent text-[12px] font-bold text-white outline-none [color-scheme:dark]"
-                />
-              </span>
-            </label>
-            <label className="flex min-h-13 min-w-0 items-center gap-2 rounded-xl bg-ink-800/80 px-3 py-2">
-              <CalendarDays size={16} className="shrink-0 text-brass-400" />
-              <span className="min-w-0 flex-1">
-                <span className="block text-[9.5px] font-extrabold uppercase tracking-widest text-ink-300">Check-out</span>
-                <input
-                  type="date"
-                  required
-                  value={checkOut}
-                  min={minCheckOut}
-                  aria-label="Check-out date"
-                  onChange={event => setCheckOut(event.target.value)}
-                  className="w-full min-w-0 bg-transparent text-[12px] font-bold text-white outline-none [color-scheme:dark]"
-                />
-              </span>
-            </label>
-            <label className="flex min-h-13 items-center gap-2 rounded-xl bg-ink-800/80 px-3 py-2">
-              <Users size={16} className="shrink-0 text-brass-400" />
-              <span className="min-w-0 flex-1">
-                <span className="block text-[9.5px] font-extrabold uppercase tracking-widest text-ink-300">Guests</span>
-                <select
-                  value={guests}
-                  onChange={event => setGuests(Number(event.target.value))}
-                  aria-label="Guests"
-                  className="w-full bg-transparent text-[13px] font-bold text-white outline-none [&>option]:text-ink-900"
+                  <ChevronLeft size={15} />
+                </button>
+                <button
+                  type="button"
+                  aria-label="Next interior photo"
+                  onClick={() => setHeroSlide(prev => (prev + 1) % HERO_SLIDES.length)}
+                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white [&>svg]:shrink-0"
                 >
-                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(count => (
-                    <option key={count} value={count}>{count} guest{count === 1 ? '' : 's'}</option>
-                  ))}
-                </select>
-              </span>
-            </label>
-            <button type="submit" className="btn-brass min-h-13 w-full lg:px-3">
-              <Search size={16} /> Search stays
-            </button>
-          </form>
+                  <ChevronRight size={15} />
+                </button>
+              </div>
+            </div>
+          </div>
         </div>
       </section>
 
-      {/* ── 2. Primary Marketplace Section (Front & Center) ──────────────── */}
-      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-11">
-        <div className="flex flex-wrap items-center justify-between gap-3">
+      {/* ── Search Dock (below hero so interior photos stay unobstructed) ── */}
+      <div className="relative z-20 mx-auto -mt-8 max-w-6xl px-4 sm:-mt-11 sm:px-6">
+        <form
+          onSubmit={onSearch}
+          className="rounded-3xl border border-ink-100 bg-white p-3.5 text-ink-900 shadow-[0_24px_60px_-20px_rgba(14,31,59,0.28)] sm:p-5"
+        >
+            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-3">
+              <div className="flex flex-wrap items-center gap-1.5">
+                {(
+                  [
+                    { id: 'all', label: 'All Lagos' },
+                    { id: 'mainland', label: 'Lagos Mainland' },
+                    { id: 'island', label: 'Lagos Island' },
+                  ] as const
+                ).map(tab => (
+                  <button
+                    key={tab.id}
+                    type="button"
+                    onClick={() => {
+                      setSearchSide(tab.id);
+                      if (tab.id === 'mainland') setArea('Lagos Mainland');
+                      else if (tab.id === 'all' && area === 'Lagos Mainland') setArea('');
+                      else if (tab.id === 'island' && area === 'Lagos Mainland') setArea('');
+                    }}
+                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
+                      searchSide === tab.id
+                        ? 'bg-ink-900 text-white'
+                        : 'bg-paper text-ink-600 hover:bg-clay hover:text-ink-900'
+                    }`}
+                  >
+                    {tab.label}
+                  </button>
+                ))}
+              </div>
+              <CurrencyToggle />
+            </div>
+
+            {/* Quick area chips */}
+            <div className="mb-3.5 flex items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-1">
+              {QUICK_AREAS.map(hub => {
+                const selected = area === hub;
+                return (
+                  <button
+                    key={hub}
+                    type="button"
+                    onClick={() => setArea(selected ? '' : hub)}
+                    className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold transition ${
+                      selected
+                        ? 'border-brass-600 bg-brass-500 text-ink-950'
+                        : 'border-ink-200 bg-paper/75 text-ink-700 hover:border-ink-400'
+                    }`}
+                  >
+                    {hub}
+                  </button>
+                );
+              })}
+            </div>
+
+            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12">
+              <label className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-ink-100 bg-paper/65 px-3.5 py-2.5 lg:col-span-4">
+                <MapPin size={17} className="shrink-0 text-brass-600" />
+                <div className="min-w-0 flex-1">
+                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
+                    Where
+                  </span>
+                  <select
+                    aria-label="Neighbourhood"
+                    value={area}
+                    onChange={e => setArea(e.target.value)}
+                    className="w-full truncate bg-transparent text-[13.5px] font-bold text-ink-900 focus:outline-none"
+                  >
+                    <option value="">All Lagos areas</option>
+                    <optgroup label="Lagos Mainland">
+                      {MAINLAND_AREAS.map(a => (
+                        <option key={a} value={a}>
+                          {a === 'Lagos Mainland' ? 'Lagos Mainland (All)' : a}
+                        </option>
+                      ))}
+                    </optgroup>
+                    <optgroup label="Lagos Island & Lekki">
+                      {ISLAND_AND_LEKKI_AREAS.map(a => (
+                        <option key={a} value={a}>
+                          {a}
+                        </option>
+                      ))}
+                    </optgroup>
+                  </select>
+                </div>
+              </label>
+
+              <label className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-ink-100 bg-paper/65 px-3.5 py-2.5 lg:col-span-3">
+                <Calendar size={17} className="shrink-0 text-brass-600" />
+                <div className="min-w-0 flex-1">
+                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
+                    Check in
+                  </span>
+                  <input
+                    type="date"
+                    min={minDate}
+                    value={checkIn}
+                    onChange={e => {
+                      const nextIn = e.target.value;
+                      setCheckIn(nextIn);
+                      if (nextIn && checkOut && checkOut <= nextIn) {
+                        setCheckOut(addDaysToIsoDate(nextIn, 2));
+                      }
+                    }}
+                    className="w-full min-w-0 bg-transparent text-[13px] font-bold text-ink-900 focus:outline-none"
+                  />
+                </div>
+              </label>
+
+              <label className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-ink-100 bg-paper/65 px-3.5 py-2.5 lg:col-span-3">
+                <Calendar size={17} className="shrink-0 text-brass-600" />
+                <div className="min-w-0 flex-1">
+                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
+                    Check out
+                  </span>
+                  <input
+                    type="date"
+                    min={checkIn ? addDaysToIsoDate(checkIn, 1) : addDaysToIsoDate(minDate, 1)}
+                    value={checkOut}
+                    onChange={e => setCheckOut(e.target.value)}
+                    className="w-full min-w-0 bg-transparent text-[13px] font-bold text-ink-900 focus:outline-none"
+                  />
+                </div>
+              </label>
+
+              <div className="flex items-stretch gap-2 lg:col-span-2">
+                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-ink-100 bg-paper/65 px-3 py-2.5">
+                  <Users size={16} className="shrink-0 text-brass-600" />
+                  <div className="min-w-0 flex-1">
+                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
+                      Guests
+                    </span>
+                    <select
+                      aria-label="Guests"
+                      value={guests}
+                      onChange={e => setGuests(Number(e.target.value))}
+                      className="w-full bg-transparent text-[13px] font-bold text-ink-900 focus:outline-none"
+                    >
+                      {[1, 2, 3, 4, 6, 8, 10].map(n => (
+                        <option key={n} value={n}>
+                          {n}
+                        </option>
+                      ))}
+                    </select>
+                  </div>
+                </label>
+
+                <button
+                  type="submit"
+                  className="btn-jade min-h-12 shrink-0 !rounded-2xl !px-5 text-sm shadow-sm"
+                >
+                  <Search size={16} />
+                  <span className="sm:inline">Search</span>
+                </button>
+              </div>
+            </div>
+          </form>
+      </div>
+
+      {/* ── Available Stays ────────────────────────────────────────── */}
+      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
+        <div className="flex flex-wrap items-end justify-between gap-4">
           <div>
-            <h2 className="font-display text-2xl font-black text-ink-900 sm:text-3xl">
-              Explore shortlets in Lagos
+            <p className="eyebrow">Lagos marketplace</p>
+            <h2 className="mt-1 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
+              Available stays
             </h2>
-            <p className="mt-0.5 text-xs font-medium text-ink-500">
-              {!backendReady
-                ? 'Finding spaces that fit your plans…'
-                : approved.length > 0
-                  ? `${filteredMarketplace.length} approved stay${filteredMarketplace.length === 1 ? '' : 's'}${activeAreaFilter ? ` in ${activeAreaFilter}` : ''} · upfront guest pricing (0% owner fee)`
-                  : 'Verified Lagos Mainland & Island apartments · manual review before listing'}
-            </p>
           </div>
+
           <div className="flex flex-wrap items-center gap-2">
-            <CurrencyToggle />
-            <Link to="/stays" className="btn-outline !py-2 text-[12px]">
-              <SlidersHorizontal size={14} /> All filters
+            <div className="inline-flex rounded-full border border-ink-200 bg-white p-1">
+              {(
+                [
+                  { id: 'all', label: 'All' },
+                  { id: 'mainland', label: 'Mainland' },
+                  { id: 'island', label: 'Island' },
+                ] as const
+              ).map(tab => (
+                <button
+                  key={tab.id}
+                  type="button"
+                  onClick={() => setBoardFilter(tab.id)}
+                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
+                    boardFilter === tab.id
+                      ? 'bg-ink-900 text-white'
+                      : 'text-ink-600 hover:text-ink-900'
+                  }`}
+                >
+                  {tab.label}
+                </button>
+              ))}
+            </div>
+            <Link to="/stays" className="btn-outline !rounded-full !px-4 !py-2 text-xs">
+              View all <ArrowRight size={14} />
             </Link>
           </div>
         </div>
 
-        {/* Quick horizontal neighbourhood & amenity filter bar */}
-        <div className="mt-4 flex items-center gap-2 overflow-x-auto overscroll-x-contain pb-2">
-          {QUICK_AREAS.map(item => {
-            const active = activeAreaFilter === item.match;
-            return (
-              <button
-                key={item.label}
-                type="button"
-                onClick={() => setActiveAreaFilter(item.match)}
-                className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-xs font-bold transition ${
-                  active
-                    ? 'border-ink-900 bg-ink-900 text-white'
-                    : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400'
-                }`}
-              >
-                {item.label}
-              </button>
-            );
-          })}
-          <span className="mx-1 h-4 w-px shrink-0 bg-ink-200" aria-hidden="true" />
-          {QUICK_AMENITIES.map(amenity => {
-            const active = activeAmenity === amenity;
-            return (
-              <button
-                key={amenity}
-                type="button"
-                onClick={() => setActiveAmenity(active ? '' : amenity)}
-                className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-xs font-semibold transition ${
-                  active
-                    ? 'border-jade-700 bg-jade-700 text-white'
-                    : 'border-ink-200 bg-clay/70 text-ink-700 hover:border-jade-500'
-                }`}
-              >
-                {amenity === 'Wifi' ? 'Wi-Fi' : amenity}
-              </button>
-            );
-          })}
+        {/* Area jump links */}
+        <div className="mt-5 flex items-center gap-2 overflow-x-auto overscroll-x-contain pb-2">
+          {[
+            { label: 'Lagos Mainland', to: '/stays?area=Lagos+Mainland' },
+            { label: 'Yaba', to: '/stays?area=Yaba' },
+            { label: 'Surulere', to: '/stays?area=Surulere' },
+            { label: 'Shomolu', to: '/stays?area=Shomolu' },
+            { label: 'Ikeja GRA', to: '/stays?area=Ikeja+GRA' },
+            { label: 'Victoria Island', to: '/stays?area=Victoria+Island' },
+            { label: 'Ikoyi', to: '/stays?area=Ikoyi' },
+            { label: 'Lekki Phase 1', to: '/stays?area=Lekki+Phase+1' },
+            { label: 'Ajah', to: '/stays?area=Ajah' },
+          ].map(chip => (
+            <Link
+              key={chip.label}
+              to={chip.to}
+              className="shrink-0 rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-xs font-bold text-ink-700 transition hover:border-ink-900 hover:bg-ink-900 hover:text-white"
+            >
+              {chip.label}
+            </Link>
+          ))}
         </div>
 
-        {/* Marketplace Grid */}
         {backendError ? (
-          <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm font-semibold text-red-800">
-            Something didn’t go as planned loading stays: {backendError}
+          <div
+            role="alert"
+            className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-6 py-5 text-sm font-semibold text-red-900"
+          >
+            Could not load stays ({backendError}). Please refresh the page.
           </div>
         ) : !backendReady ? (
-          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
-            {[1, 2, 3].map(n => (
-              <div key={n} className="h-80 animate-pulse rounded-2xl border border-ink-100 bg-white p-4">
-                <div className="h-44 rounded-xl bg-ink-100" />
-                <div className="mt-4 h-4 w-3/4 rounded bg-ink-100" />
-                <div className="mt-2 h-3 w-1/2 rounded bg-ink-100" />
-              </div>
+          <div
+            role="status"
+            className="mt-6 rounded-3xl border border-ink-100 bg-white px-6 py-14 text-center text-sm font-semibold text-ink-500"
+          >
+            Loading stays…
+          </div>
+        ) : boardProperties.length > 0 ? (
+          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
+            {boardProperties.map(p => (
+              <PropertyCard key={p.id} p={p} />
             ))}
           </div>
-        ) : displayedStays.length > 0 ? (
-          <>
-            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
-              {displayedStays.map(property => (
-                <PropertyCard key={property.id} p={property} />
-              ))}
-            </div>
-            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-5">
-              <p className="text-xs font-medium text-ink-500">
-                Showing {displayedStays.length} of {filteredMarketplace.length} matching Lagos stay{filteredMarketplace.length === 1 ? '' : 's'}.
-              </p>
-              <Link to="/stays" className="btn-jade !py-2.5 text-xs">
-                View all stays & availability <ArrowRight size={14} />
-              </Link>
-            </div>
-          </>
-        ) : approved.length > 0 ? (
-          <div className="mt-5 rounded-2xl border border-ink-100 bg-white px-6 py-10 text-center">
-            <p className="font-display text-lg font-bold text-ink-900">No stays match that quick filter.</p>
-            <p className="mt-1 text-xs font-medium text-ink-500">Reset quick filters or open the full search to explore all available homes.</p>
-            <div className="mt-4 flex flex-wrap justify-center gap-2.5">
+        ) : (
+          <div className="mt-6 rounded-3xl border border-ink-200 bg-white px-6 py-12 text-center">
+            <h3 className="font-display text-2xl font-bold text-ink-900">
+              {approved.length === 0 ? 'New verified stays arriving soon.' : 'No stays in this corridor yet.'}
+            </h3>
+            <div className="mt-5 flex flex-wrap justify-center gap-3">
+              {boardFilter !== 'all' ? (
+                <button
+                  type="button"
+                  onClick={() => setBoardFilter('all')}
+                  className="btn-jade !rounded-full"
+                >
+                  Show all Lagos
+                </button>
+              ) : (
+                <Link to="/partner/register" className="btn-jade !rounded-full">
+                  <Building2 size={15} /> List a property
+                </Link>
+              )}
               <button
                 type="button"
-                onClick={() => {
-                  setActiveAreaFilter('');
-                  setActiveAmenity('');
-                }}
-                className="btn-jade !py-2 text-xs"
+                onClick={() => openHoratio()}
+                className="btn-outline !rounded-full"
               >
-                Show all stays ({approved.length})
+                <Sparkles size={15} className="text-brass-600" /> Ask Horatio
               </button>
-              <Link to="/stays" className="btn-outline !py-2 text-xs">Full search</Link>
-            </div>
-          </div>
-        ) : (
-          <div className="mt-5 rounded-3xl border border-ink-100 bg-white px-6 py-11 text-center shadow-2xs sm:px-10">
-            <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-jade-200 bg-jade-50 px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-jade-800">
-              <ShieldCheck size={13} className="shrink-0" /> Verified Lagos supply onboarding
-            </span>
-            <h3 className="mt-3 font-display text-xl font-black text-ink-900 sm:text-2xl">
-              We’re onboarding verified Lagos Mainland & Island stays now.
-            </h3>
-            <p className="mx-auto mt-1.5 max-w-md text-xs font-medium leading-relaxed text-ink-500 sm:text-[13px]">
-              Every apartment across Yaba, Shomolu, Surulere, Ikeja, Lekki, VI & Ikoyi completes manual document and inspection review before appearing in the marketplace.
-            </p>
-            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
-              <Link to="/stays" className="btn-jade !py-2.5 text-xs">
-                Open marketplace search <ArrowRight size={14} />
-              </Link>
-              <Link to="/partner/register" className="btn-outline !py-2.5 text-xs">
-                List your Lagos property
-              </Link>
             </div>
           </div>
         )}
       </section>
 
-      {/* ── 3. Compact Neighbourhood Shortcuts (Mainland + Island) ───────── */}
-      <section className="border-t border-ink-100 bg-clay/50 py-10 sm:py-12">
+      {/* ── Browse by Area ─────────────────────────────────────────── */}
+      <section className="border-t border-ink-100 bg-clay/45 py-12 sm:py-16">
         <div className="mx-auto max-w-7xl px-4 sm:px-6">
-          <div className="flex flex-wrap items-end justify-between gap-2">
+          <div className="flex flex-wrap items-end justify-between gap-4">
             <div>
-              <h2 className="font-display text-xl font-black text-ink-900 sm:text-2xl">
-                Browse by Lagos neighbourhood
+              <p className="eyebrow">Mainland &amp; Island</p>
+              <h2 className="mt-1 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
+                Browse by area
               </h2>
-              <p className="mt-0.5 text-xs font-medium text-ink-500">
-                Lagos Mainland (Yaba, Shomolu, Surulere & environs) · Lagos Island & Lekki
-              </p>
             </div>
-            <Link to="/lagos" className="inline-flex items-center gap-1 text-xs font-extrabold text-jade-800 hover:underline">
-              Lagos neighbourhood guide <ChevronRight size={14} className="shrink-0" />
+            <Link to="/lagos" className="btn-outline !rounded-full !px-5 !py-2 text-xs">
+              Lagos guide <ArrowRight size={14} />
             </Link>
           </div>
 
-          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
-            {NEIGHBOURHOOD_CARDS.map(item => (
-              <Link
-                key={item.name}
-                to={item.href}
-                className={`group flex items-center justify-between gap-2 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${
-                  item.featured
-                    ? 'border-jade-300 bg-jade-50/70 hover:border-jade-600'
-                    : 'border-ink-100 bg-white hover:border-jade-400'
-                }`}
-              >
-                <div className="min-w-0">
-                  <p className="font-display text-base font-black text-ink-900 group-hover:text-jade-800">{item.name}</p>
-                  <p className="mt-0.5 truncate text-[11.5px] font-medium text-ink-600">{item.tag}</p>
-                </div>
-                <ChevronRight size={16} className="shrink-0 text-ink-400 transition group-hover:translate-x-0.5 group-hover:text-jade-700" />
-              </Link>
-            ))}
+          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
+            {NEIGHBOURHOOD_CARDS.map(card => {
+              const floor = floorPriceFor(card.matchArea);
+              return (
+                <Link
+                  key={card.name}
+                  to={card.to}
+                  className="group flex flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-2xs transition duration-300 hover:-translate-y-1 hover:border-ink-300 hover:shadow-md"
+                >
+                  <div className="relative h-44 overflow-hidden bg-clay">
+                    <img
+                      src={card.img}
+                      alt={card.name}
+                      loading="lazy"
+                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
+                    />
+                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink-950/70 to-transparent" />
+                    <span className="absolute left-3 top-3 rounded-full bg-ink-950/75 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brass-300 backdrop-blur-md">
+                      {card.corridor}
+                    </span>
+                    <h3 className="absolute bottom-2.5 left-3.5 right-3.5 font-display text-xl font-bold text-white drop-shadow-xs">
+                      {card.name}
+                    </h3>
+                  </div>
+                  <div className="flex items-center justify-between gap-2 px-4 py-3">
+                    <div className="min-w-0">
+                      <p className="truncate text-[11.5px] font-medium text-ink-500">{card.sub}</p>
+                      <p className="mt-0.5 text-xs font-extrabold text-ink-900">
+                        {floor ? `From ${floor} / night` : 'Browse stays'}
+                      </p>
+                    </div>
+                    <ArrowUpRight
+                      size={15}
+                      className="shrink-0 text-ink-400 transition group-hover:text-ink-900"
+                    />
+                  </div>
+                </Link>
+              );
+            })}
           </div>
         </div>
       </section>
 
-      {/* ── 4. Concise Trust Strip + Partner Callout ─────────────────────── */}
-      <section className="border-t border-ink-100 bg-paper py-10 sm:py-12">
-        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6">
-          <div className="grid gap-3 rounded-2xl border border-ink-100 bg-white p-4 sm:grid-cols-3 sm:p-5">
-            <div className="flex items-center gap-3">
-              <ShieldCheck size={20} className="shrink-0 text-jade-700" />
-              <div className="min-w-0">
-                <p className="text-xs font-extrabold text-ink-900">Reviewed listings</p>
-                <p className="text-[11.5px] text-ink-500">Ownership, authority & inspection status shown</p>
-              </div>
-            </div>
-            <div className="flex items-center gap-3">
-              <Zap size={20} className="shrink-0 text-jade-700" />
-              <div className="min-w-0">
-                <p className="text-xs font-extrabold text-ink-900">Power & Wi-Fi stated</p>
-                <p className="text-[11.5px] text-ink-500">Check backup & check-in rules before booking</p>
-              </div>
-            </div>
-            <div className="flex items-center justify-between gap-3">
-              <div className="flex items-center gap-3 min-w-0">
-                <Banknote size={20} className="shrink-0 text-jade-700" />
-                <div className="min-w-0">
-                  <p className="text-xs font-extrabold text-ink-900">Upfront total pricing</p>
-                  <p className="text-[11.5px] text-ink-500">Compare in ₦, $ or £ · webhook-verified checkout</p>
-                </div>
-              </div>
-              <Link to="/about" className="shrink-0 text-[11.5px] font-extrabold text-jade-800 hover:underline">
-                About us →
-              </Link>
-            </div>
+      {/* ── Compact Partner Callout ────────────────────────────────── */}
+      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
+        <div className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-ink-950 px-6 py-8 text-paper sm:flex-row sm:items-center sm:px-10">
+          <div>
+            <p className="eyebrow-light">0% owner fee</p>
+            <h2 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
+              Own or manage a shortlet in Lagos?
+            </h2>
+            <p className="mt-1 text-sm font-medium text-ink-300">
+              Keep 100% of your listed rate. Closing agents and referrers earn recorded commissions.
+            </p>
           </div>
-
-          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-ink-950 px-5 py-5 text-paper sm:flex-row sm:items-center sm:px-7">
-            <div className="flex items-center gap-3">
-              <Building2 size={22} className="shrink-0 text-brass-400" />
-              <div>
-                <p className="font-display text-base font-black sm:text-lg">
-                  Own or manage a shortlet on Lagos Mainland or Island?
-                </p>
-                <p className="text-xs font-medium text-ink-300">
-                  0% owner fee · List apartments in Yaba, Surulere, Shomolu, Ikeja, Lekki, VI & Ikoyi.
-                </p>
-              </div>
-            </div>
-            <div className="flex flex-wrap gap-2.5">
-              <Link to="/partner/register" className="btn-brass !py-2.5 text-xs">
-                List your property <ArrowRight size={14} />
-              </Link>
-              <Link
-                to="/signin"
-                className="inline-flex items-center rounded-xl border border-white/20 bg-white/5 px-3.5 py-2.5 text-xs font-bold text-paper transition hover:bg-white/10"
-              >
-                Partner sign in
-              </Link>
-            </div>
+          <div className="flex flex-wrap items-center gap-3">
+            <Link to="/partner/register" className="btn-brass !rounded-full !px-6">
+              List a property <ArrowRight size={15} />
+            </Link>
+            <Link
+              to="/how-it-works"
+              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-white/15 [&>svg]:shrink-0"
+            >
+              How it works
+            </Link>
           </div>
         </div>
       </section>
```

### `src/pages/HowItWorks.tsx` (Modified)

```diff
diff --git a/src/pages/HowItWorks.tsx b/src/pages/HowItWorks.tsx
index 7440308..ff6276e 100644
--- a/src/pages/HowItWorks.tsx
+++ b/src/pages/HowItWorks.tsx
@@ -1,101 +1,164 @@
+import { useState } from 'react';
 import { Link } from 'react-router-dom';
-import { ArrowRight, CheckCircle2, ClipboardCheck, KeyRound, Search } from 'lucide-react';
+import {
+  ArrowRight,
+  ClipboardCheck,
+  CreditCard,
+  KeyRound,
+  Search,
+} from 'lucide-react';
 import { GuestLayout } from '../components/Navbar';
 import { usePageMeta } from '../lib/brand';
 
+const CEREMONY_STEPS = [
+  {
+    num: '01',
+    badge: 'Step 01 · Guest',
+    Icon: Search,
+    title: 'Request the stay',
+    body: 'Choose your dates, guest count, and currency (₦, $, or £). Review house rules and total pricing — zero card charge on request.',
+    cta: { label: 'Explore stays', to: '/stays' },
+  },
+  {
+    num: '02',
+    badge: 'Step 02 · Host',
+    Icon: ClipboardCheck,
+    title: 'Host confirms dates',
+    body: 'The owner or authorised partner confirms availability and locks your dates under a 48-hour payment hold.',
+  },
+  {
+    num: '03',
+    badge: 'Step 03 · Checkout',
+    Icon: CreditCard,
+    title: 'Pay via Paystack (48h)',
+    body: 'Pay inside your HAMLET account. Bookings confirm exclusively via Paystack’s signed server-side webhook — never screenshots.',
+  },
+  {
+    num: '04',
+    badge: 'Step 04 · Arrival',
+    Icon: KeyRound,
+    title: 'Arrive with Wayfinder',
+    body: 'Confirmed stays unlock Wayfinder gate pins and check-in instructions. Refundable caution deposits are inspected post-checkout.',
+    cta: { label: 'Find a stay', to: '/stays' },
+  },
+];
+
+const LIFECYCLE_STATES = [
+  { step: '1', code: 'requested', sub: 'Dates reviewed' },
+  { step: '2', code: 'awaiting_payment', sub: '48h Paystack hold' },
+  { step: '3', code: 'confirmed', sub: 'Webhook + Wayfinder' },
+  { step: '4', code: 'completed', sub: 'Deposit inspected' },
+];
+
 export default function HowItWorks() {
   usePageMeta(
     'How HAMLET Works | Booking Shortlets Made Clear',
-    'Three simple steps to find, review, and request a shortlet stay in Lagos on HAMLET — with clear pricing and arrival details.',
+    'Four clear steps to find, request, confirm, and check into a verified Lagos shortlet on HAMLET — with upfront pricing and server-verified Paystack checkout.',
   );
 
-  const steps = [
-    {
-      step: 'Step 1',
-      Icon: Search,
-      title: 'Find a space that fits.',
-      body: 'Start with your destination, dates, and number of guests. Explore available apartments and compare their location, photos, amenities, prices (in Naira, US Dollars, or British Pounds), and house rules.',
-      extra: 'Need strong Wi-Fi for work? A kitchen for family meals? A particular Lagos neighbourhood? Start with the things that matter most.',
-      cta: { label: 'Explore available stays', to: '/stays' },
-    },
-    {
-      step: 'Step 2',
-      Icon: ClipboardCheck,
-      title: 'Review the details and request your booking.',
-      body: 'Found somewhere you like? Check the property information, total applicable charges, cancellation terms, and check-in arrangements.',
-      extra: 'Submit your booking request and follow the instructions provided. Your reservation is subject to availability confirmation by the host or authorised partner and verified payment.',
-    },
-    {
-      step: 'Step 3',
-      Icon: KeyRound,
-      title: 'Get ready to settle in.',
-      body: 'Once your booking is confirmed after verified payment, follow the arrival instructions provided for your stay. Review the check-in time, access process, host or partner contact details, and any property-specific requirements.',
-      extra: 'Arrive knowing what to expect, get comfortable, and make the most of your time.',
-      cta: { label: 'Find your next stay', to: '/stays' },
-    },
-  ];
-
-  const checklist = [
-    'Confirm the dates and number of guests.',
-    'Review the total price and payment instructions.',
-    'Check the amenities you rely on.',
-    'Read the house rules and cancellation policy.',
-    'Save your arrival instructions and support contact details.',
-  ];
+  const [activeIdx, setActiveIdx] = useState(0);
 
   return (
     <GuestLayout>
-      <section className="border-b border-ink-100 bg-ink-950 text-paper">
-        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
-          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brass-300">How HAMLET works</p>
-          <h1 className="mt-3 max-w-2xl font-display text-3xl font-black leading-tight sm:text-5xl">
-            Three simple steps to your next stay.
+      {/* Hero */}
+      <section className="border-b border-ink-800 bg-ink-950 text-paper">
+        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
+          <p className="eyebrow-light">How it works</p>
+          <h1 className="mt-2.5 max-w-2xl font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
+            Booked clearly.{' '}
+            <span className="italic text-brass-300">Paid only when confirmed.</span>
           </h1>
-          <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-ink-200">
-            You have enough to organise before a trip. Finding a place to stay shouldn’t become another full-time job. Here’s how to get started with HAMLET.
-          </p>
         </div>
       </section>
 
-      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
-        <div className="grid gap-6">
-          {steps.map(({ step, Icon, title, body, extra, cta }) => (
-            <article key={step} className="card p-6 sm:p-8">
-              <div className="flex items-center gap-2.5 text-jade-700">
-                <Icon size={20} className="shrink-0" />
-                <span className="font-mono text-xs font-extrabold uppercase tracking-widest">{step}</span>
-              </div>
-              <h2 className="mt-2 font-display text-2xl font-black text-ink-900">{title}</h2>
-              <p className="mt-3 text-sm leading-relaxed text-ink-600">{body}</p>
-              <p className="mt-2.5 text-sm font-medium leading-relaxed text-ink-700">{extra}</p>
-              {cta && (
-                <Link to={cta.to} className="btn-jade mt-5 min-h-11">
-                  {cta.label} <ArrowRight size={15} />
-                </Link>
-              )}
-            </article>
-          ))}
+      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
+        <div className="grid gap-6 lg:grid-cols-12">
+          <div className="space-y-2.5 lg:col-span-5">
+            {CEREMONY_STEPS.map((item, idx) => {
+              const selected = activeIdx === idx;
+              return (
+                <button
+                  key={item.num}
+                  type="button"
+                  onClick={() => setActiveIdx(idx)}
+                  className={`flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition ${
+                    selected
+                      ? 'border-ink-900 bg-ink-900 text-white shadow-md'
+                      : 'border-ink-100 bg-white text-ink-900 hover:border-ink-300'
+                  }`}
+                >
+                  <span
+                    className={`font-mono text-xs font-extrabold tracking-widest ${
+                      selected ? 'text-brass-300' : 'text-brass-600'
+                    }`}
+                  >
+                    {item.num}
+                  </span>
+                  <div className="min-w-0 flex-1">
+                    <p
+                      className={`text-[10.5px] font-bold uppercase tracking-wider ${
+                        selected ? 'text-ink-300' : 'text-ink-400'
+                      }`}
+                    >
+                      {item.badge}
+                    </p>
+                    <p className="mt-0.5 font-display text-lg font-bold">{item.title}</p>
+                  </div>
+                </button>
+              );
+            })}
+          </div>
+
+          <div className="lg:col-span-7">
+            {(() => {
+              const step = CEREMONY_STEPS[activeIdx]!;
+              const StepIcon = step.Icon;
+              return (
+                <article className="card flex h-full flex-col justify-between p-6 sm:p-8">
+                  <div>
+                    <div className="flex items-center justify-between gap-3">
+                      <span className="inline-flex items-center gap-2 rounded-full border border-brass-400/50 bg-brass-200/25 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-900">
+                        <StepIcon size={14} className="shrink-0 text-brass-700" />
+                        {step.badge}
+                      </span>
+                      <span className="font-mono text-2xl font-black text-ink-200">{step.num}</span>
+                    </div>
+                    <h2 className="mt-4 font-display text-2xl font-bold text-ink-900 sm:text-3xl">
+                      {step.title}
+                    </h2>
+                    <p className="mt-3 text-sm leading-relaxed text-ink-700 sm:text-[15px]">
+                      {step.body}
+                    </p>
+                  </div>
+                  {step.cta && (
+                    <div className="mt-6 pt-2">
+                      <Link to={step.cta.to} className="btn-jade min-h-11 !rounded-full !px-6">
+                        {step.cta.label} <ArrowRight size={15} />
+                      </Link>
+                    </div>
+                  )}
+                </article>
+              );
+            })()}
+          </div>
         </div>
 
-        <section className="mt-10 rounded-3xl border border-jade-200 bg-jade-50/60 p-6 sm:p-8">
-          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-800">Before you book</p>
-          <h2 className="mt-1.5 font-display text-2xl font-black text-ink-900">
-            A few minutes of checking can make a big difference.
-          </h2>
-          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
-            {checklist.map(item => (
-              <li key={item} className="flex items-start gap-2.5 rounded-xl border border-jade-100 bg-white px-4 py-3 text-sm font-semibold text-ink-800">
-                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-jade-700" />
-                <span>{item}</span>
-              </li>
+        {/* Booking Lifecycle Strip */}
+        <section className="mt-10 rounded-3xl bg-ink-950 p-6 text-paper sm:p-8">
+          <p className="eyebrow-light">Booking lifecycle</p>
+          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
+            {LIFECYCLE_STATES.map(s => (
+              <div
+                key={s.step}
+                className="rounded-2xl border border-white/12 bg-ink-900/90 p-4"
+              >
+                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brass-500 font-mono text-xs font-black text-ink-950">
+                  {s.step}
+                </span>
+                <p className="mt-2.5 font-mono text-xs font-bold text-brass-300">{s.code}</p>
+                <p className="mt-1 text-xs font-medium text-ink-300">{s.sub}</p>
+              </div>
             ))}
-          </ul>
-          <p className="mt-4 text-sm font-semibold text-jade-900">
-            A little clarity now makes for a smoother arrival later.
-          </p>
-          <div className="mt-5 flex flex-wrap gap-3">
-            <Link to="/safety" className="btn-outline !bg-white">Read guest safety & protection</Link>
-            <Link to="/faqs" className="btn-outline !bg-white">Browse booking FAQs</Link>
           </div>
         </section>
       </div>
```

### `src/pages/Lagos.tsx` (Modified)

```diff
diff --git a/src/pages/Lagos.tsx b/src/pages/Lagos.tsx
index 066223a..abf0500 100644
--- a/src/pages/Lagos.tsx
+++ b/src/pages/Lagos.tsx
@@ -1,67 +1,81 @@
 import { Link } from 'react-router-dom';
-import { ArrowRight, Banknote, KeyRound, Lock, MapPin, ShieldCheck, Wifi, Zap } from 'lucide-react';
+import { ArrowRight, ArrowUpRight, Building2, ShieldCheck } from 'lucide-react';
 import { GuestLayout } from '../components/Navbar';
 import { PropertyCard } from '../components/PropertyCard';
 import { CurrencyToggle } from '../components/CurrencyToggle';
 import { useHamlet } from '../lib/store';
+import { useCurrency } from '../lib/currency';
+import { matchesLagosAreaFilter } from '../lib/areas';
 import { usePageMeta } from '../lib/brand';
 import { buildLagosGuideStructuredData } from '../lib/seo';
 
 const MAINLAND_GUIDES = [
   {
     name: 'Yaba & Environs',
-    subareas: 'Sabo · Alagomeji · Akoka · Ebute Metta · Jibowu',
-    tagline: 'For tech hubs, campuses & central Mainland access',
-    body: 'Searching for shortlets in Yaba? Stay close to Lagos’s technology corridor, universities, medical centres, and quick Third Mainland Bridge links to Lagos Island.',
+    matchArea: 'Yaba',
+    subareas: 'Sabo · Alagomeji · Akoka · Ebute Metta',
+    body: 'Tech hubs, campuses, and fast Third Mainland Bridge access to Lagos Island.',
     href: '/stays?area=Yaba',
+    img: '/images/prop/studio-1.jpg',
   },
   {
     name: 'Surulere & Environs',
-    subareas: 'Bode Thomas · Adeniran Ogunsanya · Eric Moore · Aguda · Iponri',
-    tagline: 'For vibrant residential streets, studios & family visits',
-    body: 'Explore serviced apartments in Surulere with easy access to shopping, dining, stadiums, creative studios, and central routes connecting both Mainland and Island.',
+    matchArea: 'Surulere',
+    subareas: 'Bode Thomas · Adeniran Ogunsanya · Eric Moore',
+    body: 'Tree-lined streets, creative studios, and central Mainland–Island links.',
     href: '/stays?area=Surulere',
+    img: '/images/prop/bed-1.jpg',
   },
   {
     name: 'Shomolu & Environs',
-    subareas: 'Palmgrove · Onipanu · Pedro · Fadeyi · Gbagada · Anthony · Ilupeju',
-    tagline: 'For central Ikorodu Road & Gbagada expressway links',
-    body: 'Need a practical Mainland base around Shomolu, Palmgrove, Onipanu, or nearby Gbagada and Ilupeju? Compare power arrangements, gated parking, and proximity to commercial hubs.',
+    matchArea: 'Shomolu',
+    subareas: 'Palmgrove · Onipanu · Gbagada · Ilupeju',
+    body: 'Central Ikorodu Road and Gbagada expressway access.',
     href: '/stays?area=Shomolu',
+    img: '/images/prop/kitchen-1.jpg',
   },
   {
     name: 'Ikeja & Northern Mainland',
-    subareas: 'Ikeja GRA · Maryland · Opebi · Ogudu · Magodo',
-    tagline: 'For airport proximity, corporate offices & quiet GRAs',
-    body: 'Consider apartments in Ikeja GRA, Maryland, Ogudu, and Magodo for seamless Murtala Muhammed Airport transfers, mainland business districts, and family stays.',
-    href: '/stays?q=Ikeja',
+    matchArea: 'Ikeja GRA',
+    subareas: 'Ikeja GRA · Maryland · Ogudu · Magodo',
+    body: 'Close to Murtala Muhammed Airport, corporate offices, and gated GRAs.',
+    href: '/stays?area=Ikeja+GRA',
+    img: '/images/prop/duplex.jpg',
   },
 ];
 
 const ISLAND_GUIDES = [
-  {
-    name: 'Lekki',
-    tagline: 'For the lifestyle and the plans around it',
-    body: 'Explore apartments close to dining spots, shopping, entertainment, and social destinations across Lekki Phase 1 and Oniru.',
-    href: '/stays?q=Lekki',
-  },
   {
     name: 'Victoria Island',
-    tagline: 'For business and city convenience',
-    body: 'Explore accommodation suited to corporate visits, meetings, conferences, and stays close to Lagos Island’s business districts.',
+    matchArea: 'Victoria Island',
+    subareas: 'Adeola Odeku · Ahmadu Bello · Saka Tinubu',
+    body: 'Business districts, conferences, embassies, and city dining.',
     href: '/stays?area=Victoria+Island',
+    img: '/images/prop/living-1.jpg',
   },
   {
-    name: 'Ikoyi',
-    tagline: 'For a more private city stay',
-    body: 'Compare quieter residential apartments across Ikoyi and Banana Island with clear building access, security, and parking.',
+    name: 'Ikoyi & Banana Island',
+    matchArea: 'Ikoyi',
+    subareas: 'Old Ikoyi · Awolowo Road · Banana Island',
+    body: 'Quiet residential apartments and penthouses with controlled access.',
     href: '/stays?area=Ikoyi',
+    img: '/images/prop/penthouse.jpg',
   },
   {
-    name: 'Ajah',
-    tagline: 'For residential stays and room to settle in',
-    body: 'Explore shortlets in Ajah for family visits, longer stays, and plans centred around the Lekki–Ajah corridor.',
+    name: 'Lekki Phase 1 & Oniru',
+    matchArea: 'Lekki Phase 1',
+    subareas: 'Admiralty Way · Freedom Way · Oniru',
+    body: 'Serviced apartments near dining, retail, and waterfront venues.',
+    href: '/stays?area=Lekki+Phase+1',
+    img: '/images/prop/pool-1.jpg',
+  },
+  {
+    name: 'Ajah Corridor',
+    matchArea: 'Ajah',
+    subareas: 'Chevron · Orchid Road · Sangotedo',
+    body: 'Spacious duplexes and apartments suited for longer stays.',
     href: '/stays?area=Ajah',
+    img: '/images/prop/exterior-1.jpg',
   },
 ];
 
@@ -92,8 +106,16 @@ export default function Lagos() {
   );
 
   const { state, backendReady, backendError } = useHamlet();
+  const { formatStayPrice } = useCurrency();
   const approved = state.properties.filter(p => p.status === 'approved');
 
+  const floorPriceFor = (matchArea: string): string | null => {
+    const matches = approved.filter(p => matchesLagosAreaFilter(p, matchArea));
+    if (matches.length === 0) return null;
+    const minRate = Math.min(...matches.map(p => p.nightlyRate));
+    return formatStayPrice(Math.round(minRate * 1.2));
+  };
+
   return (
     <GuestLayout>
       {/* Hero */}
@@ -101,58 +123,53 @@ export default function Lagos() {
         <img
           src="/images/lagos-hero.jpg"
           alt="Lagos cityscape"
-          className="absolute inset-0 h-full w-full object-cover opacity-40"
+          className="absolute inset-0 h-full w-full object-cover opacity-90"
         />
-        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/75 to-ink-950/35" />
-        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18">
-          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brass-300">
-            Lagos Mainland & Island shortlets
-          </p>
-          <h1 className="mt-3 max-w-2xl font-display text-4xl font-black leading-tight sm:text-5xl">
-            Find your place in Lagos.
+        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-950/82 via-ink-950/45 to-ink-950/10" />
+        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
+          <p className="eyebrow-light">Lagos area guide</p>
+          <h1 className="mt-2.5 max-w-2xl font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
+            Lagos Mainland &amp; Island.
           </h1>
-          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-ink-100 sm:text-base">
-            Whether your plans are centred around <strong className="text-brass-200">Lagos Mainland</strong> — Yaba, Shomolu, Surulere, Gbagada, Maryland, and Ikeja — or <strong className="text-brass-200">Lagos Island & Lekki</strong>, explore apartments with upfront pricing and confirmed arrival details.
+          <p className="mt-3 max-w-xl text-sm font-medium text-ink-200 sm:text-base">
+            Compare verified stays across <strong className="text-brass-300">Lagos Mainland</strong> (Yaba, Shomolu, Surulere &amp; Ikeja) and <strong className="text-brass-300">Lagos Island</strong> in ₦, $, or £.
           </p>
           <div className="mt-6 flex flex-wrap items-center gap-3">
-            <Link to="/stays?area=Lagos+Mainland" className="btn-brass min-h-12">
-              Explore Lagos Mainland <ArrowRight size={15} />
+            <Link to="/stays?area=Lagos+Mainland" className="btn-brass !rounded-full !px-6">
+              Lagos Mainland <ArrowRight size={15} />
             </Link>
-            <Link to="/stays" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-4 py-3 text-sm font-bold text-paper transition hover:bg-white/10">
-              Browse all Lagos stays
+            <Link
+              to="/stays?side=Island"
+              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/8 px-5 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/15 [&>svg]:shrink-0"
+            >
+              Lagos Island
             </Link>
             <CurrencyToggle variant="dark" />
           </div>
         </div>
       </section>
 
-      {/* Lagos Mainland Spotlight: Yaba, Shomolu, Surulere & Environs */}
+      {/* Lagos Mainland */}
       <section id="lagos-mainland" className="border-b border-ink-100 bg-paper py-12 sm:py-14">
         <div className="mx-auto max-w-7xl px-4 sm:px-6">
           <div className="flex flex-wrap items-end justify-between gap-4">
-            <div className="max-w-2xl">
-              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">
-                Lagos Mainland & Environs
-              </p>
-              <h2 className="mt-1.5 font-display text-2xl font-black text-ink-900 sm:text-3xl">
-                Yaba, Shomolu, Surulere & surrounding hubs
+            <div>
+              <p className="eyebrow">Mainland</p>
+              <h2 className="mt-1 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
+                Lagos Mainland &amp; environs
               </h2>
-              <p className="mt-1.5 text-sm font-medium text-ink-600">
-                Stay close to Mainland business corridors, universities, family addresses, Murtala Muhammed Airport, and fast bridge connections to the Island.
-              </p>
             </div>
-            <Link to="/stays?area=Lagos+Mainland" className="btn-jade !py-2.5 text-xs">
-              View all Mainland stays <ArrowRight size={14} />
+            <Link to="/stays?area=Lagos+Mainland" className="btn-jade !rounded-full !px-5 !py-2.5 text-xs">
+              All Mainland stays <ArrowRight size={14} />
             </Link>
           </div>
 
-          {/* Quick Environs Chips */}
-          <div className="mt-5 flex flex-wrap gap-2">
+          <div className="mt-4 flex flex-wrap gap-2">
             {MAINLAND_ENVIRONS_CHIPS.map(chip => (
               <Link
                 key={chip.label}
                 to={chip.to}
-                className="rounded-full border border-jade-200 bg-jade-50/70 px-3.5 py-1.5 text-xs font-bold text-jade-900 transition hover:border-jade-600 hover:bg-jade-700 hover:text-white"
+                className="rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-xs font-bold text-ink-800 transition hover:border-ink-900 hover:bg-ink-900 hover:text-white"
               >
                 {chip.label}
               </Link>
@@ -160,136 +177,145 @@ export default function Lagos() {
           </div>
 
           <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
-            {MAINLAND_GUIDES.map(n => (
-              <article key={n.name} className="flex flex-col rounded-2xl border border-ink-100 bg-white p-5 shadow-2xs">
-                <div className="flex items-center gap-2 text-jade-700">
-                  <MapPin size={16} className="shrink-0" />
-                  <span className="text-[10.5px] font-extrabold uppercase tracking-[0.16em]">Lagos Mainland</span>
-                </div>
-                <h3 className="mt-2 font-display text-lg font-black text-ink-900">{n.name}</h3>
-                <p className="mt-0.5 text-[11px] font-bold text-jade-800">{n.subareas}</p>
-                <p className="mt-2 text-[12px] font-bold text-ink-800">{n.tagline}</p>
-                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">{n.body}</p>
-                <Link
-                  to={n.href}
-                  className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[12px] font-extrabold text-jade-800 hover:text-jade-900"
+            {MAINLAND_GUIDES.map(n => {
+              const floor = floorPriceFor(n.matchArea);
+              return (
+                <article
+                  key={n.name}
+                  className="group flex flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-2xs transition hover:-translate-y-1 hover:shadow-md"
                 >
-                  Explore {n.name.split(' ')[0]} stays <ArrowRight size={13} className="shrink-0" />
-                </Link>
-              </article>
-            ))}
+                  <div className="relative h-44 overflow-hidden bg-clay">
+                    <img
+                      src={n.img}
+                      alt={n.name}
+                      loading="lazy"
+                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
+                    />
+                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink-950/65 to-transparent" />
+                    <span className="absolute bottom-3 left-3 rounded-full bg-ink-950/80 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-brass-300 backdrop-blur-md">
+                      Mainland
+                    </span>
+                  </div>
+                  <div className="flex flex-1 flex-col p-5">
+                    <h3 className="font-display text-xl font-bold text-ink-900">{n.name}</h3>
+                    <p className="mt-1 text-[11px] font-bold text-brass-700">{n.subareas}</p>
+                    <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">{n.body}</p>
+                    <Link
+                      to={n.href}
+                      className="mt-auto inline-flex items-center justify-between border-t border-ink-100 pt-3.5 text-xs font-extrabold text-ink-900 group-hover:text-brass-700"
+                    >
+                      <span>{floor ? `From ${floor} / night` : `Browse ${n.matchArea}`}</span>
+                      <ArrowUpRight size={14} className="shrink-0" />
+                    </Link>
+                  </div>
+                </article>
+              );
+            })}
           </div>
         </div>
       </section>
 
-      {/* Lagos Island & Lekki Corridor */}
-      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
-        <div className="max-w-2xl">
-          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Lagos Island & Lekki Corridor</p>
-          <h2 className="mt-1.5 font-display text-2xl font-black text-ink-900 sm:text-3xl">
-            Victoria Island, Ikoyi, Lekki & Ajah
-          </h2>
-        </div>
-
-        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
-          {ISLAND_GUIDES.map(n => (
-            <article key={n.name} className="flex flex-col rounded-2xl border border-ink-100 bg-white p-5 shadow-2xs">
-              <div className="flex items-center gap-2 text-jade-700">
-                <MapPin size={16} className="shrink-0" />
-                <span className="text-[10.5px] font-extrabold uppercase tracking-[0.16em]">Lagos Island / Lekki</span>
-              </div>
-              <h3 className="mt-2 font-display text-lg font-black text-ink-900">{n.name}</h3>
-              <p className="mt-0.5 text-[12px] font-bold text-ink-700">{n.tagline}</p>
-              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">{n.body}</p>
-              <Link
-                to={n.href}
-                className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[12px] font-extrabold text-jade-800 hover:text-jade-900"
-              >
-                Explore {n.name} stays <ArrowRight size={13} className="shrink-0" />
-              </Link>
-            </article>
-          ))}
-        </div>
-      </section>
-
-      {/* Available Lagos stays */}
-      <section className="border-y border-ink-100 bg-clay/60 py-12 sm:py-14">
+      {/* Lagos Island */}
+      <section className="border-b border-ink-100 bg-white py-12 sm:py-14">
         <div className="mx-auto max-w-7xl px-4 sm:px-6">
           <div className="flex flex-wrap items-end justify-between gap-4">
             <div>
-              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Available inventory</p>
-              <h2 className="mt-1.5 font-display text-3xl font-black text-ink-900 sm:text-4xl">
-                Shortlets across Lagos
+              <p className="eyebrow">Island</p>
+              <h2 className="mt-1 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
+                Lagos Island &amp; Lekki
               </h2>
-              <p className="mt-1.5 text-sm font-medium text-ink-600">
-                Compare prices in Naira (₦), US Dollars ($), or British Pounds (£) and inspect full property details before requesting to book.
-              </p>
-            </div>
-            <div className="flex flex-wrap items-center gap-2.5">
-              <CurrencyToggle />
-              <Link to="/stays" className="btn-dark !py-2.5 text-[12px]">
-                Filter by area & dates <ArrowRight size={14} />
-              </Link>
             </div>
+            <Link to="/stays?side=Island" className="btn-outline !rounded-full !px-5 !py-2.5 text-xs">
+              All Island stays <ArrowRight size={14} />
+            </Link>
           </div>
 
-          {backendError ? (
-            <div role="alert" className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm font-semibold text-red-800">
-              Something didn’t go as planned loading Lagos stays: {backendError}
-            </div>
-          ) : !backendReady ? (
-            <div className="mt-7 rounded-2xl border border-ink-100 bg-white px-6 py-10 text-center text-sm font-semibold text-ink-500">
-              Finding spaces that fit your plans…
-            </div>
-          ) : approved.length > 0 ? (
-            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
-              {approved.slice(0, 6).map(p => (
-                <PropertyCard key={p.id} p={p} />
-              ))}
-            </div>
-          ) : (
-            <div className="mt-7 rounded-3xl border border-ink-100 bg-white px-6 py-12 text-center sm:px-10">
-              <ShieldCheck size={30} className="mx-auto text-jade-700" />
-              <h3 className="mt-3 font-display text-2xl font-black text-ink-900">
-                We’re still adding stays in this area.
-              </h3>
-              <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-relaxed text-ink-500">
-                Try another neighbourhood or check back as more properties across Lagos Mainland and Island become available.
-              </p>
-              <div className="mt-6 flex flex-wrap justify-center gap-3">
-                <Link to="/partner/register" className="btn-jade">List your Lagos property</Link>
-                <Link to="/how-it-works" className="btn-outline">How HAMLET works</Link>
-              </div>
-            </div>
-          )}
+          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
+            {ISLAND_GUIDES.map(n => {
+              const floor = floorPriceFor(n.matchArea);
+              return (
+                <article
+                  key={n.name}
+                  className="group flex flex-col overflow-hidden rounded-3xl border border-ink-100 bg-paper/55 shadow-2xs transition hover:-translate-y-1 hover:bg-white hover:shadow-md"
+                >
+                  <div className="relative h-44 overflow-hidden bg-clay">
+                    <img
+                      src={n.img}
+                      alt={n.name}
+                      loading="lazy"
+                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
+                    />
+                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink-950/65 to-transparent" />
+                    <span className="absolute bottom-3 left-3 rounded-full bg-ink-950/80 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-brass-300 backdrop-blur-md">
+                      Island
+                    </span>
+                  </div>
+                  <div className="flex flex-1 flex-col p-5">
+                    <h3 className="font-display text-xl font-bold text-ink-900">{n.name}</h3>
+                    <p className="mt-1 text-[11px] font-bold text-brass-700">{n.subareas}</p>
+                    <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">{n.body}</p>
+                    <Link
+                      to={n.href}
+                      className="mt-auto inline-flex items-center justify-between border-t border-ink-100 pt-3.5 text-xs font-extrabold text-ink-900 group-hover:text-brass-700"
+                    >
+                      <span>{floor ? `From ${floor} / night` : `Browse ${n.matchArea}`}</span>
+                      <ArrowUpRight size={14} className="shrink-0" />
+                    </Link>
+                  </div>
+                </article>
+              );
+            })}
+          </div>
         </div>
       </section>
 
-      {/* What to look for when booking a Lagos shortlet */}
+      {/* Live Inventory Preview */}
       <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
-        <div className="max-w-3xl">
-          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Practical booking checklist</p>
-          <h2 className="mt-2 font-display text-2xl font-black text-ink-900 sm:text-3xl">
-            What to check before booking in Lagos
-          </h2>
+        <div className="flex flex-wrap items-end justify-between gap-4">
+          <div>
+            <p className="eyebrow">Available now</p>
+            <h2 className="mt-1 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
+              Shortlets across Lagos
+            </h2>
+          </div>
+          <div className="flex flex-wrap items-center gap-2.5">
+            <CurrencyToggle />
+            <Link to="/stays" className="btn-dark !rounded-full !px-5 !py-2.5 text-xs">
+              Filter all stays <ArrowRight size={14} />
+            </Link>
+          </div>
         </div>
 
-        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
-          {[
-            { Icon: MapPin, title: 'Location & bridge routes', body: 'Check proximity to your Mainland or Island meetings, events, or family.' },
-            { Icon: Zap, title: 'Power backup', body: 'Confirm whether 24/7 estate power, inverter, or generator backup is included.' },
-            { Icon: Wifi, title: 'Internet', body: 'Check whether Wi-Fi or workspace arrangements suit remote work.' },
-            { Icon: Lock, title: 'Access & security', body: 'Review gated street/estate entry procedures and security.' },
-            { Icon: Banknote, title: 'Total price', body: 'Review cleaning charges, the 20% domestic stay markup, and refundable caution deposit upfront.' },
-            { Icon: KeyRound, title: 'Check-in window', body: 'Confirm arrival hours and host or manager contact arrangements.' },
-          ].map(({ Icon, title, body }) => (
-            <div key={title} className="rounded-2xl border border-ink-100 bg-white p-5">
-              <Icon size={20} className="shrink-0 text-jade-700" />
-              <h3 className="mt-3 font-display text-base font-black text-ink-900">{title}</h3>
-              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{body}</p>
+        {backendError ? (
+          <div
+            role="alert"
+            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm font-semibold text-red-800"
+          >
+            Could not load stays ({backendError}).
+          </div>
+        ) : !backendReady ? (
+          <div className="mt-6 rounded-3xl border border-ink-100 bg-white px-6 py-10 text-center text-sm font-semibold text-ink-500">
+            Loading stays…
+          </div>
+        ) : approved.length > 0 ? (
+          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
+            {approved.slice(0, 6).map(p => (
+              <PropertyCard key={p.id} p={p} />
+            ))}
+          </div>
+        ) : (
+          <div className="mt-6 rounded-3xl border border-ink-100 bg-white px-6 py-10 text-center">
+            <ShieldCheck size={28} className="mx-auto text-emerald-700" />
+            <h3 className="mt-3 font-display text-2xl font-bold text-ink-900">
+              More stays arriving soon.
+            </h3>
+            <div className="mt-5 flex flex-wrap justify-center gap-3">
+              <Link to="/partner/register" className="btn-jade !rounded-full">
+                <Building2 size={15} /> List a property
+              </Link>
             </div>
-          ))}
-        </div>
+          </div>
+        )}
       </section>
     </GuestLayout>
   );
```

### `src/pages/Legal.tsx` (Modified)

```diff
diff --git a/src/pages/Legal.tsx b/src/pages/Legal.tsx
index ffff24c..0cd9e4c 100644
--- a/src/pages/Legal.tsx
+++ b/src/pages/Legal.tsx
@@ -1,10 +1,10 @@
 import { Link, useParams, NavLink } from 'react-router-dom';
 import { GuestLayout } from '../components/Navbar';
-import { usePageMeta } from '../lib/brand';
+import { HAMLET_PARENT_COMPANY, usePageMeta } from '../lib/brand';
 import { ShieldCheck, ScrollText, Banknote, FileCheck } from 'lucide-react';
 
 const TABS = [
-  { to: '/legal/privacy', label: 'Privacy & data', Icon: ShieldCheck },
+  { to: '/legal/privacy', label: 'Privacy & NDPR', Icon: ShieldCheck },
   { to: '/legal/terms', label: 'Booking terms', Icon: ScrollText },
   { to: '/legal/trust', label: 'Trust & verification', Icon: FileCheck },
   { to: '/legal/pricing', label: 'Fees & settlement', Icon: Banknote },
@@ -13,42 +13,94 @@ const TABS = [
 const CONTENT: Record<string, { title: string; intro: string; sections: { h: string; b: string }[] }> = {
   privacy: {
     title: 'Privacy & data protection',
-    intro: 'HAMLET handles personal data under the Nigeria Data Protection Regulation (NDPR) principles: minimisation, purpose limitation, access control, retention discipline and breach readiness.',
+    intro:
+      'HAMLET handles personal data under the Nigeria Data Protection Regulation (NDPR) principles: minimisation, purpose limitation, access control, retention discipline and breach readiness.',
     sections: [
-      { h: 'What we collect', b: 'Guests: identity, contact details, booking records, payment references (never card data — that lives with the provider), and private pilot feedback. Partners and owners: identity documents, proof of authority and listing evidence. HAMLET operations: full ledger, audit and incident records.' },
-      { h: 'What we never collect', b: 'Card numbers, CVVs or full bank credentials. HAMLET does not hold customer funds and operates no wallet. Provider references only.' },
-      { h: 'Access control', b: 'Permissions are enforced server-side and at the data layer, not just in the UI. Sensitive guest, identity and incident data is restricted to authorised operations roles. Public registration never grants admin or partner-privileged access.' },
-      { h: 'Retention & breach procedure', b: 'Booking, ledger and incident records are retained per the pilot retention schedule. A documented incident and breach-response procedure is in place; affected users and the NDPC are notified as required. A formal privacy notice and data-protection assessment is a launch dependency and is being completed before full launch.' },
+      {
+        h: 'What we collect',
+        b: 'Guests: identity, contact details, booking records, payment references (never card data — that lives with the provider), and private pilot feedback. Partners and owners: identity documents, proof of authority and listing evidence. HAMLET operations: full ledger, audit and incident records.',
+      },
+      {
+        h: 'What we never collect',
+        b: 'Card numbers, CVVs or full bank credentials. HAMLET does not hold customer funds and operates no wallet. Provider references only.',
+      },
+      {
+        h: 'Access control',
+        b: 'Permissions are enforced server-side and at the data layer, not just in the UI. Sensitive guest, identity and incident data is restricted to authorised operations roles. Public registration never grants admin or partner-privileged access.',
+      },
+      {
+        h: 'Retention & breach procedure',
+        b: 'Booking, ledger and incident records are retained per the pilot retention schedule. A documented incident and breach-response procedure is in place; affected users and the NDPC are notified as required.',
+      },
     ],
   },
   terms: {
     title: 'Booking terms of service',
-    intro: 'HAMLET is a marketplace, not the property owner. The agreement for your stay is between you and the owner/authorised partner, facilitated and accounted for by HAMLET.',
+    intro:
+      'HAMLET is a marketplace, not the property owner. The agreement for your stay is between you and the owner or authorised partner, facilitated and accounted for by HAMLET.',
     sections: [
-      { h: 'Request to book — the only flow', b: 'Every booking is a request. The owner or authorised partner checks availability and terms. Acceptance sets a payment deadline (48h in the pilot). Your booking is confirmed only after our payment provider verifies your payment server-side AND final availability is rechecked.' },
-      { h: 'Payment & proof', b: 'Pay only through the provider checkout shown to you. A browser redirect, screenshot or uploaded receipt is never proof of payment and will not confirm a booking. Deposits are refundable and held separately; they are never part of the HAMLET fee base.' },
-      { h: 'Cancellation & refunds', b: 'Cancellation outcomes (guest before acceptance, owner cancellation, expired payment deadline, dispute resolution, force majeure) are recorded on the booking. Refunds follow the recorded outcome and are processed via the provider. Controlled ledger entries are reconciled against provider records.' },
-      { h: 'Issues & disputes', b: 'Report any issue from your account. HAMLET operations assigns, investigates, escalates and closes issues with recorded evidence and decisions. Critical safety issues result in immediate listing suspension pending investigation.' },
+      {
+        h: 'Request to book — the only flow',
+        b: 'Every booking is a request. The owner or authorised partner checks availability and terms. Acceptance sets a payment deadline (48h in the pilot). Your booking is confirmed only after our payment provider verifies your payment server-side AND final availability is rechecked.',
+      },
+      {
+        h: 'Payment & proof',
+        b: 'Pay only through the provider checkout shown to you. A browser redirect, screenshot or uploaded receipt is never proof of payment and will not confirm a booking. Caution deposits are held separately, excluded from HAMLET markup and FX buffers, and reviewed after post-checkout inspection.',
+      },
+      {
+        h: 'Cancellation & refunds',
+        b: 'Cancellation outcomes (guest before acceptance, owner cancellation, expired payment deadline, dispute resolution, force majeure) are recorded on the booking. Refunds follow the recorded outcome and are processed via the provider. Controlled ledger entries are reconciled against provider records.',
+      },
+      {
+        h: 'Issues & disputes',
+        b: 'Report any issue from your account. HAMLET operations assigns, investigates, escalates and closes issues with recorded evidence and decisions. Critical safety issues result in immediate listing suspension pending investigation.',
+      },
     ],
   },
   trust: {
     title: 'Trust & verification',
-    intro: 'HAMLET verification is manual and evidence-based. We record outcomes honestly instead of printing blanket trust badges.',
+    intro:
+      'HAMLET verification is manual and evidence-based. We record outcomes honestly instead of printing blanket trust badges.',
     sections: [
-      { h: 'What “verified” means', b: 'Ownership, identity, authority to list and (where completed) physical inspection were reviewed by a named HAMLET reviewer against documentary evidence. Each verification pillar is recorded separately per listing.' },
-      { h: '“Self-reported” means exactly that', b: 'A checked box on a submission is an attestation until a reviewer examines the evidence. Self-reported items are labelled as such on the listing and in the partner portal.' },
-      { h: 'Duplicate & integrity checks', b: 'Submissions are screened for duplicate listings and inconsistent evidence before approval. Suspensions are used when justified — safety incidents, undisclosed works, misrepresentation.' },
-      { h: 'Who lists on HAMLET', b: 'Owners, authorised agents, property managers, shortlet operators, co-hosts and referral partners. Each listing records who submitted it, in what role, and the basis of their authority to list it.' },
+      {
+        h: 'What “verified” means',
+        b: 'Ownership, identity, authority to list and (where completed) physical inspection were reviewed by a named HAMLET reviewer against documentary evidence. Each verification pillar is recorded separately per listing.',
+      },
+      {
+        h: '“Self-reported” means exactly that',
+        b: 'A checked box on a submission is an attestation until a reviewer examines the evidence. Self-reported items are labelled as such on the listing and in the partner portal.',
+      },
+      {
+        h: 'Duplicate & integrity checks',
+        b: 'Submissions are screened for duplicate listings and inconsistent evidence before approval so multiple authorised partners never accidentally publish duplicate public listings for the same physical unit.',
+      },
+      {
+        h: 'Who lists on HAMLET',
+        b: 'Owners, authorised agents, property managers, shortlet operators, co-hosts and referral partners. Each listing records who submitted it, in what role, and the basis of their authority to list it.',
+      },
     ],
   },
   pricing: {
     title: 'Fees & settlement',
-    intro: 'One shared pricing engine computes every guest-facing total on HAMLET — the same number on the listing, in your booking request, at payment and in the ledger.',
+    intro:
+      'One shared pricing engine computes every guest-facing total on HAMLET — the same number on the listing, in your booking request, at payment and in the ledger.',
     sections: [
-      { h: '20% domestic accommodation markup & allocation', b: 'Owners pay 0% — owners receive 100% of their listed NGN accommodation rate (B). Domestic guest accommodation price is B × 1.20. The 20% markup on B is allocated across closing agent commission (10%), direct partner referral reward during an active 90-day window (2.5%, when eligible), HAMLET allocation (5% with referrer or 7.5% without), and an internal payment & settlement cost reserve (2.5%).' },
-      { h: 'Worked example (B = ₦200,000)', b: 'Owner listed accommodation rate: ₦200,000 → Domestic guest accommodation price: ₦240,000 (₦40,000 markup: ₦20,000 closing agent, ₦5,000 direct referrer when eligible, ₦10,000 or ₦15,000 HAMLET allocation, and ₦5,000 internal payment reserve).' },
-      { h: 'International USD & GBP quotes (10% currency buffer)', b: 'When quoted in USD or GBP using an active configured FX rate, the domestic guest price is converted at the quoted rate and a single 10% international currency buffer is added to cover cross-border FX and card conversion costs (e.g., $200 converted base → $220 international quote). Paystack checkout settles transparently in NGN.' },
-      { h: 'Refundable caution deposit & settlement ledger', b: 'Refundable caution deposits are itemised and tracked separately from accommodation revenue, are never included in HAMLET’s 20% markup or 10% FX buffer, and follow an auditable post-checkout inspection and refund lifecycle. Actual Paystack processing fees are recorded separately in the ledger.' },
+      {
+        h: '20% domestic accommodation markup & commercial mandates',
+        b: 'Owners pay 0% — owners receive 100% of their listed NGN accommodation rate (B). Domestic guest accommodation price is B × 1.20. Standard markup allocation covers closing agent commission (10%), direct partner referral reward during an active 90-day window (2.5%, when eligible), HAMLET allocation (5% with referrer or 7.5% without), and an internal payment & settlement cost reserve (2.5%). Owners and authorised partners may also agree recorded property-specific mandates prior to booking.',
+      },
+      {
+        h: 'Worked example (B = ₦200,000)',
+        b: 'Owner listed accommodation rate: ₦200,000 → Domestic guest accommodation price: ₦240,000 (₦40,000 markup: ₦20,000 closing agent, ₦5,000 direct referrer when eligible, ₦10,000 or ₦15,000 HAMLET allocation, and ₦5,000 internal payment reserve).',
+      },
+      {
+        h: 'International USD & GBP quotes (10% currency buffer)',
+        b: 'When quoted in USD or GBP using an active configured FX rate, the domestic guest price is converted at the quoted rate and a single 10% international currency buffer is added to cover cross-border FX and card conversion costs. Paystack checkout settles transparently in NGN.',
+      },
+      {
+        h: 'Refundable caution deposit & settlement ledger',
+        b: 'Refundable caution deposits are itemised and tracked separately from accommodation revenue, are never included in HAMLET’s 20% markup or 10% FX buffer, and are refunded only after post-checkout inspection review (never automatically or instantly). Actual Paystack processing fees are recorded separately in the ledger.',
+      },
     ],
   },
 };
@@ -60,34 +112,69 @@ export default function Legal() {
 
   return (
     <GuestLayout>
-      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
-        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">HAMLET · Legal & policy</p>
-        <h1 className="mt-1.5 font-display text-3xl font-black text-ink-900">{c.title}</h1>
-        <p className="mt-2 max-w-2xl text-[13.5px] font-medium leading-relaxed text-ink-600">{c.intro}</p>
+      <section className="border-b border-ink-800 bg-ink-950 text-paper">
+        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
+          <p className="eyebrow-light">HAMLET · Legal &amp; policy</p>
+          <h1 className="mt-2.5 font-display text-3xl font-bold text-white sm:text-5xl">
+            {c.title}
+          </h1>
+          <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-ink-200 sm:text-base">
+            {c.intro}
+          </p>
+        </div>
+      </section>
 
-        <div className="mt-6 flex flex-wrap gap-1.5 border-b border-ink-100 pb-4">
+      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
+        <div className="flex flex-wrap gap-2 border-b border-ink-200 pb-5">
           {TABS.map(t => (
-            <NavLink key={t.to} to={t.to} className={({ isActive }) => `inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[11.5px] font-bold transition ${isActive ? 'border-jade-600 bg-jade-700 text-white' : 'border-ink-200 text-ink-600 hover:border-ink-400'}`}>
-              <t.Icon size={14} className="shrink-0" />{t.label}
+            <NavLink
+              key={t.to}
+              to={t.to}
+              className={({ isActive }) =>
+                `inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition [&>svg]:shrink-0 ${
+                  isActive
+                    ? 'border-ink-900 bg-ink-900 text-white'
+                    : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400'
+                }`
+              }
+            >
+              <t.Icon size={14} />
+              {t.label}
             </NavLink>
           ))}
         </div>
 
-        <div className="mt-6 grid gap-4">
-          {c.sections.map(s => (
-            <section key={s.h} className="card p-4 sm:p-6">
-              <h2 className="font-display text-[17px] font-black text-ink-900">{s.h}</h2>
-              <p className="mt-1.5 max-w-4xl text-[13.5px] font-medium leading-relaxed text-ink-700">{s.b}</p>
+        <div className="mt-7 grid gap-4">
+          {c.sections.map((s, idx) => (
+            <section key={s.h} className="card p-5 sm:p-7">
+              <div className="flex items-baseline gap-3">
+                <span className="font-mono text-xs font-extrabold tracking-widest text-brass-600">
+                  {String(idx + 1).padStart(2, '0')}
+                </span>
+                <h2 className="font-display text-xl font-bold text-ink-900">{s.h}</h2>
+              </div>
+              <p className="mt-2.5 max-w-4xl text-sm leading-relaxed text-ink-600 sm:pl-7">
+                {s.b}
+              </p>
             </section>
           ))}
         </div>
-        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-5 text-[11.5px] font-semibold text-ink-500">
-          <p className="text-[10.5px] text-ink-400">HAMLET v1.0 · Lagos · Last updated Oct 2026.</p>
-          <div className="flex flex-wrap gap-3 text-jade-800">
-            <Link to="/how-it-works" className="hover:underline">How HAMLET works</Link>
-            <Link to="/safety" className="hover:underline">Safety & guest protection</Link>
-            <Link to="/faqs" className="hover:underline">FAQs</Link>
-            <Link to="/about" className="hover:underline">About HAMLET</Link>
+
+        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 pt-6 text-xs font-semibold text-ink-500">
+          <p>HAMLET Marketplace Ltd · {HAMLET_PARENT_COMPANY} · Lagos · Oct 2026</p>
+          <div className="flex flex-wrap gap-4 text-ink-900">
+            <Link to="/how-it-works" className="hover:underline">
+              How HAMLET works
+            </Link>
+            <Link to="/safety" className="hover:underline">
+              Safety &amp; guest protection
+            </Link>
+            <Link to="/faqs" className="hover:underline">
+              FAQs
+            </Link>
+            <Link to="/about" className="hover:underline">
+              About HAMLET
+            </Link>
           </div>
         </div>
       </div>
```

### `src/pages/PartnerRegister.tsx` (Modified)

```diff
diff --git a/src/pages/PartnerRegister.tsx b/src/pages/PartnerRegister.tsx
index f48017d..06ee13b 100644
--- a/src/pages/PartnerRegister.tsx
+++ b/src/pages/PartnerRegister.tsx
@@ -2,12 +2,25 @@ import { useEffect, useMemo, useState } from 'react';
 import { Link, useNavigate, useSearchParams } from 'react-router-dom';
 import { motion, AnimatePresence } from 'framer-motion';
 import {
-  Building2, Users, BadgePercent, ShieldCheck, ArrowRight, CheckCircle2, ChevronLeft, CircleAlert,
-  RefreshCcw, Eye, EyeOff, LogIn, AlertTriangle, Clock3, Gift,
+  Building2,
+  Users,
+  BadgePercent,
+  ShieldCheck,
+  ArrowRight,
+  CheckCircle2,
+  ChevronLeft,
+  CircleAlert,
+  RefreshCcw,
+  Eye,
+  EyeOff,
+  LogIn,
+  AlertTriangle,
+  Clock3,
+  Gift,
 } from 'lucide-react';
 import { HamletMark } from '../components/Logo';
 import { useHamlet, getPersistedPartnerRefCode } from '../lib/store';
-import { usePageMeta } from '../lib/brand';
+import { HAMLET_PARENT_COMPANY, usePageMeta } from '../lib/brand';
 import { useToast } from '../lib/toast';
 import { AREAS } from '../lib/seed';
 import { formatDateTime } from '../lib/pricing';
@@ -22,6 +35,13 @@ const ROLES = [
   { value: 'Referral Partner', blurb: 'Refer partners — earn 2.5% for 90 days after activation' },
 ];
 
+const ECONOMICS_STATS = [
+  { stat: '100%', label: 'Owner share of listed B', detail: 'Owners receive 100% of their NGN accommodation rate' },
+  { stat: '0%', label: 'Owner listing fee', detail: 'HAMLET adds 20% domestic guest markup on top of B' },
+  { stat: '10% of B', label: 'Closing agent share', detail: 'Standard closing agent commission (or agreed mandate)' },
+  { stat: '2.5% of B', label: '90-day referral reward', detail: 'Direct partner referrer share during active window' },
+];
+
 export default function PartnerRegister() {
   usePageMeta(
     'List Your Lagos Shortlet Property | HAMLET Partners',
@@ -90,8 +110,10 @@ export default function PartnerRegister() {
     return () => { active = false; };
   }, [referralCode, resolveReferralCode]);
 
-  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
-    setForm(f => ({ ...f, [k]: k === 'propertiesCount' ? Number(e.target.value) : e.target.value }));
+  const set =
+    (k: keyof typeof form) =>
+    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
+      setForm(f => ({ ...f, [k]: k === 'propertiesCount' ? Number(e.target.value) : e.target.value }));
 
   const toggleArea = (a: string) =>
     setAreas(prev => (prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]));
@@ -188,42 +210,92 @@ export default function PartnerRegister() {
   };
 
   return (
-    <div className="grid min-h-screen bg-ink-950 lg:grid-cols-5">
-      {/* Value panel */}
-      <div className="relative hidden overflow-hidden lg:col-span-2 lg:block">
-        <img src="/images/prop/penthouse.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
-        <div className="absolute inset-0 bg-gradient-to-br from-ink-950/85 via-ink-950/60 to-ink-950" />
-        <div className="relative flex h-full flex-col justify-between p-10">
-          <Link to="/" className="flex items-center gap-2.5"><HamletMark size={30} light /><span className="font-display text-xl font-black text-paper">HAMLET<span className="text-brass-500">.</span></span></Link>
+    <div className="grid min-h-screen bg-ink-950 lg:grid-cols-12">
+      {/* Value & Economics Panel */}
+      <div className="relative overflow-hidden border-b border-ink-800 p-6 sm:p-10 lg:col-span-5 lg:border-b-0 lg:border-r">
+        <img
+          src="/images/hero-sample-kitchen.jpg"
+          alt=""
+          className="absolute inset-0 h-full w-full object-cover opacity-85"
+        />
+        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/60 to-ink-950/65" />
+        <div className="relative flex h-full flex-col justify-between gap-10">
+          <div className="flex items-center justify-between">
+            <Link to="/" className="flex items-center gap-2.5">
+              <HamletMark size={32} light />
+              <span className="font-display text-xl font-bold tracking-[0.06em] text-white">
+                HAMLET<span className="text-brass-500">.</span>
+              </span>
+            </Link>
+            <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-brass-300">
+              Partner Network
+            </span>
+          </div>
+
           <div>
-            <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-brass-400">HAMLET Partner Network</p>
-            <h1 className="mt-3 font-display text-4xl font-black leading-[1.06] text-paper">Bring your property<br />to the right guests.</h1>
-            <p className="mt-4 max-w-sm text-[13px] font-medium leading-relaxed text-ink-100">Own or manage a shortlet in Lagos? HAMLET helps property owners, managers, and hospitality partners showcase their spaces clearly, connect with serious guests, and manage bookings in one organised place.</p>
-            <ul className="mt-6 space-y-3 text-[12px] font-semibold text-ink-100">
+            <p className="eyebrow-light">Owners · Managers · Agents · Referrers</p>
+            <h1 className="mt-2.5 font-display text-3xl font-bold leading-[1.08] text-white sm:text-4xl">
+              List free. Keep{' '}
+              <span className="italic text-brass-300">100% of your rate.</span>
+            </h1>
+
+            {/* The economics, plainly */}
+            <div className="mt-6">
+              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brass-300">
+                The economics, plainly
+              </p>
+              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
+                {ECONOMICS_STATS.map(item => (
+                  <div
+                    key={item.label}
+                    className="rounded-2xl border border-white/12 bg-white/[0.05] p-3.5 backdrop-blur-sm"
+                  >
+                    <p className="font-display text-xl font-bold text-brass-300 sm:text-2xl">
+                      {item.stat}
+                    </p>
+                    <p className="mt-0.5 text-[11px] font-bold text-white">{item.label}</p>
+                    <p className="mt-1 text-[10.5px] leading-snug text-ink-300">{item.detail}</p>
+                  </div>
+                ))}
+              </div>
+            </div>
+
+            <ul className="mt-6 space-y-2 text-xs font-semibold text-ink-100">
               {[
-                { Icon: BadgePercent, t: '0% owner fee — owners receive 100% of their listed rate; guests pay HAMLET’s 20% domestic markup' },
-                { Icon: ShieldCheck, t: 'List even if currently occupied — publish now for future available dates' },
-                { Icon: Users, t: 'Closing agents earn 10% · Direct partner referrers earn 2.5% for 90 days after activation' },
-                { Icon: Building2, t: 'All attributions & commissions recorded independently in the controlled ledger' },
+                { Icon: BadgePercent, t: 'Recorded owner & agent-sharing mandates' },
+                { Icon: ShieldCheck, t: 'One canonical listing per apartment' },
+                { Icon: Users, t: 'List now for current or future open dates' },
+                { Icon: Building2, t: 'Caution deposits held & inspected separately' },
               ].map(({ Icon, t }) => (
-                <li key={t} className="flex items-start gap-2.5"><Icon size={16} className="mt-0.5 shrink-0 text-brass-400" />{t}</li>
+                <li key={t} className="flex items-start gap-2.5">
+                  <Icon size={15} className="mt-0.5 shrink-0 text-brass-400" />
+                  {t}
+                </li>
               ))}
             </ul>
           </div>
-          <p className="text-[10.5px] font-semibold text-ink-500">Lagos pilot · Applications reviewed manually · No admin access is ever granted publicly</p>
+
+          <p className="text-[10.5px] font-semibold text-ink-400">
+            {HAMLET_PARENT_COMPANY} · Applications reviewed manually · No admin access is ever granted publicly
+          </p>
         </div>
       </div>
 
-      {/* Form / Status panel */}
-      <div className="flex items-center justify-center overflow-y-auto p-4 py-10 sm:p-8 lg:col-span-3">
+      {/* Form / Status Panel */}
+      <div className="flex items-center justify-center overflow-y-auto p-4 py-10 sm:p-8 lg:col-span-7">
         <AnimatePresence mode="wait">
           {session && (session.role === 'partner' || session.role === 'admin') ? (
-            <motion.div key="already-partner" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-3xl border border-ink-800 bg-ink-900 p-6 text-center sm:p-8">
-              <CheckCircle2 size={52} className="mx-auto text-jade-400" />
+            <motion.div
+              key="already-partner"
+              initial={{ opacity: 0, scale: 0.96 }}
+              animate={{ opacity: 1, scale: 1 }}
+              className="w-full max-w-md rounded-3xl border border-ink-800 bg-ink-900 p-6 text-center sm:p-8"
+            >
+              <CheckCircle2 size={52} className="mx-auto text-emerald-400" />
               <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">
                 {session.role === 'admin' ? 'Administrator active' : 'Approved partner active'}
               </p>
-              <h2 className="mt-1.5 font-display text-2xl font-black text-paper">
+              <h2 className="mt-1.5 font-display text-2xl font-bold text-paper">
                 {session.role === 'admin' ? 'Your Admin Console is ready' : 'Your Partner Workspace is active'}
               </h2>
               <p className="mt-2 text-[13px] font-medium leading-relaxed text-ink-300">
@@ -233,17 +305,24 @@ export default function PartnerRegister() {
                 <button
                   type="button"
                   onClick={() => navigate(session.role === 'admin' ? '/admin' : '/partner')}
-                  className="btn-brass"
+                  className="btn-brass !rounded-full"
                 >
                   Open {session.role === 'admin' ? 'Admin Console' : 'Partner Workspace'} <ArrowRight size={16} />
                 </button>
-                <Link to="/" className="btn-ghost-dark">Back to site</Link>
+                <Link to="/" className="btn-ghost-dark !rounded-full">
+                  Back to site
+                </Link>
               </div>
             </motion.div>
           ) : done ? (
-            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
-              <CheckCircle2 size={56} className="mx-auto text-jade-400" />
-              <h2 className="mt-5 font-display text-3xl font-black text-paper">
+            <motion.div
+              key="done"
+              initial={{ opacity: 0, scale: 0.96 }}
+              animate={{ opacity: 1, scale: 1 }}
+              className="w-full max-w-md text-center"
+            >
+              <CheckCircle2 size={56} className="mx-auto text-emerald-400" />
+              <h2 className="mt-5 font-display text-3xl font-bold text-paper">
                 {needsEmailConfirm ? 'Confirm your email' : 'Application in review.'}
               </h2>
               <p className="mt-3 text-[13px] font-medium leading-relaxed text-ink-200">
@@ -252,23 +331,48 @@ export default function PartnerRegister() {
                   : `Thank you, ${form.name.split(' ')[0]}. Your partner application for ${form.company} is in the HAMLET operations review queue.`}
               </p>
               <p className="mt-4 rounded-2xl border border-ink-800 bg-ink-900 px-5 py-3.5 text-[11.5px] font-semibold text-ink-300">
-                {backendConfigured
-                  ? 'You can track your application review status anytime from your HAMLET account. As soon as HAMLET operations approves your application, your Partner Workspace unlocks automatically.'
-                  : <>You are signed in to your demo partner workspace. Properties you submit will enter <span className="text-brass-300">submitted</span> status until reviewed.</>}
+                {backendConfigured ? (
+                  'You can track your application review status anytime from your HAMLET account. As soon as HAMLET operations approves your application, your Partner Workspace unlocks automatically.'
+                ) : (
+                  <>
+                    You are signed in to your demo partner workspace. Properties you submit will enter{' '}
+                    <span className="text-brass-300">submitted</span> status until reviewed.
+                  </>
+                )}
               </p>
               <div className="mt-6 flex flex-wrap justify-center gap-3">
                 <button
                   type="button"
-                  onClick={() => navigate(needsEmailConfirm ? '/signin?redirect=%2Fpartner%2Fregister' : backendConfigured ? '/account' : '/partner')}
-                  className="btn-brass"
+                  onClick={() =>
+                    navigate(
+                      needsEmailConfirm
+                        ? '/signin?redirect=%2Fpartner%2Fregister'
+                        : backendConfigured
+                          ? '/account'
+                          : '/partner',
+                    )
+                  }
+                  className="btn-brass !rounded-full"
                 >
-                  {needsEmailConfirm ? 'Go to sign in' : backendConfigured ? 'Track status in my account' : 'Go to workspace'} <ArrowRight size={16} />
+                  {needsEmailConfirm
+                    ? 'Go to sign in'
+                    : backendConfigured
+                      ? 'Track status in my account'
+                      : 'Go to workspace'}{' '}
+                  <ArrowRight size={16} />
                 </button>
-                <Link to="/" className="btn-ghost-dark">Back to site</Link>
+                <Link to="/" className="btn-ghost-dark !rounded-full">
+                  Back to site
+                </Link>
               </div>
             </motion.div>
           ) : existingApplication && existingApplication.status === 'pending' ? (
-            <motion.div key="pending-tracker" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg rounded-3xl border border-ink-800 bg-ink-900 p-6 sm:p-8">
+            <motion.div
+              key="pending-tracker"
+              initial={{ opacity: 0, scale: 0.98 }}
+              animate={{ opacity: 1, scale: 1 }}
+              className="w-full max-w-lg rounded-3xl border border-ink-800 bg-ink-900 p-6 sm:p-8"
+            >
               <div className="flex flex-wrap items-center justify-between gap-2">
                 <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-wider text-amber-300">
                   <Clock3 size={13} /> Pending manual review
@@ -278,35 +382,52 @@ export default function PartnerRegister() {
                     type="button"
                     disabled={refreshing}
                     onClick={() => void handleRefreshStatus()}
-                    className="btn-ghost-dark !border !border-ink-700 !px-3 !py-1.5 text-[11px] disabled:opacity-50"
+                    className="btn-ghost-dark !rounded-full !border !border-ink-700 !px-3 !py-1.5 text-[11px] disabled:opacity-50"
                   >
                     <RefreshCcw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh status
                   </button>
                 )}
               </div>
-              <h2 className="mt-4 font-display text-2xl font-black text-paper">{existingApplication.company}</h2>
-              <p className="mt-1 text-[12px] font-medium text-ink-300">
-                {existingApplication.role} · {existingApplication.propertiesCount} propert{existingApplication.propertiesCount === 1 ? 'y' : 'ies'} · {existingApplication.areas.join(', ')}
+              <h2 className="mt-4 font-display text-2xl font-bold text-paper">
+                {existingApplication.company}
+              </h2>
+              <p className="mt-1 text-xs font-medium text-ink-300">
+                {existingApplication.role} · {existingApplication.propertiesCount} propert
+                {existingApplication.propertiesCount === 1 ? 'y' : 'ies'} · {existingApplication.areas.join(', ')}
               </p>
               <p className="mt-1 text-[11px] font-semibold text-ink-500">
                 Submitted {formatDateTime(existingApplication.submittedAt)}
               </p>
-              <p className="mt-4 rounded-2xl border border-ink-800 bg-ink-950/70 p-4 text-[12px] font-medium leading-relaxed text-ink-200">
+              <p className="mt-4 rounded-2xl border border-ink-800 bg-ink-950/70 p-4 text-xs font-medium leading-relaxed text-ink-200">
                 HAMLET operations is reviewing your identity, company details and authority scope. Once approved, refreshing this page or signing in will take you straight into the Partner Workspace.
               </p>
               <div className="mt-6 flex flex-wrap gap-3">
-                <Link to="/account" className="btn-brass !py-2.5 text-[12px]">Go to my account <ArrowRight size={14} /></Link>
-                <Link to="/" className="btn-ghost-dark !py-2.5 text-[12px]">Back to site</Link>
+                <Link to="/account" className="btn-brass !rounded-full !py-2.5 text-xs">
+                  Go to my account <ArrowRight size={14} />
+                </Link>
+                <Link to="/" className="btn-ghost-dark !rounded-full !py-2.5 text-xs">
+                  Back to site
+                </Link>
               </div>
             </motion.div>
           ) : (
-            <motion.form key="form" exit={{ opacity: 0, y: -12 }} onSubmit={submit} className="w-full max-w-xl">
+            <motion.form
+              key="form"
+              exit={{ opacity: 0, y: -12 }}
+              onSubmit={submit}
+              className="w-full max-w-xl"
+            >
               <div className="flex flex-wrap items-center justify-between gap-3">
-                <Link to="/" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-ink-400 hover:text-ink-100"><ChevronLeft size={13} /> Back to HAMLET</Link>
+                <Link
+                  to="/"
+                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-ink-400 hover:text-ink-100"
+                >
+                  <ChevronLeft size={13} /> Back to HAMLET
+                </Link>
                 {!session && (
                   <Link
                     to="/signin?redirect=%2Fpartner%2Fregister"
-                    className="inline-flex items-center gap-1.5 rounded-xl border border-ink-800 bg-ink-900 px-3 py-1.5 text-[11px] font-bold text-brass-300 hover:border-brass-500/40"
+                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-800 bg-ink-900 px-3.5 py-1.5 text-[11px] font-bold text-brass-300 hover:border-brass-500/40"
                   >
                     <LogIn size={13} /> Already have an account? Sign in
                   </Link>
@@ -316,10 +437,12 @@ export default function PartnerRegister() {
               <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.24em] text-brass-400">
                 {isCorrectionMode ? 'Respond to reviewer feedback' : 'Apply to join'}
               </p>
-              <h2 className="mt-1.5 font-display text-3xl font-black text-paper">
-                {isCorrectionMode ? 'Update & resubmit partner application' : 'Partner registration & application'}
+              <h2 className="mt-1.5 font-display text-3xl font-bold text-white">
+                {isCorrectionMode
+                  ? 'Update & resubmit partner application'
+                  : 'Partner registration & application'}
               </h2>
-              <p className="mt-1 text-[12px] font-medium text-ink-300">
+              <p className="mt-1 text-xs font-medium text-ink-300">
                 {isCorrectionMode
                   ? 'Address the correction note from HAMLET operations below and resubmit your application for review.'
                   : !session && backendConfigured
@@ -328,10 +451,15 @@ export default function PartnerRegister() {
               </p>
 
               {isCorrectionMode && existingApplication?.reviewNote && (
-                <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-2xl border border-orange-500/45 bg-orange-950/35 p-4 text-[12px] font-semibold text-orange-200">
+                <div
+                  role="alert"
+                  className="mt-4 flex items-start gap-2.5 rounded-2xl border border-orange-500/45 bg-orange-950/35 p-4 text-xs font-semibold text-orange-200"
+                >
                   <AlertTriangle size={17} className="mt-0.5 shrink-0 text-orange-400" />
                   <div>
-                    <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-orange-300">Correction requested by HAMLET operations</p>
+                    <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-orange-300">
+                      Correction requested by HAMLET operations
+                    </p>
                     <p className="mt-1 leading-relaxed">{existingApplication.reviewNote}</p>
                   </div>
                 </div>
@@ -344,17 +472,29 @@ export default function PartnerRegister() {
               )}
 
               {session?.role === 'guest' && !isCorrectionMode && (
-                <p className="mt-3 rounded-xl border border-jade-700 bg-jade-900/40 p-3 text-[11px] font-semibold text-jade-100">
+                <p className="mt-3 rounded-2xl border border-emerald-700 bg-emerald-900/35 p-3 text-[11px] font-semibold text-emerald-100">
                   Signed in as <strong>{session.email}</strong> — your partner application will be linked directly to this account.
                 </p>
               )}
 
-              {errors.account && <p role="alert" className="mt-3 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-[11px] font-semibold text-red-200">{errors.account}</p>}
+              {errors.account && (
+                <p
+                  role="alert"
+                  className="mt-3 rounded-2xl border border-red-500/40 bg-red-950/40 p-3 text-[11px] font-semibold text-red-200"
+                >
+                  {errors.account}
+                </p>
+              )}
 
               <div className="mt-6 grid gap-3.5 sm:grid-cols-2">
                 <label className="sm:col-span-2">
                   <span className="label-dark">Full name</span>
-                  <input className={`input-dark ${errors.name ? '!border-red-500' : ''}`} value={form.name} onChange={set('name')} placeholder="Tunde Adeyemi" />
+                  <input
+                    className={`input-dark ${errors.name ? '!border-red-500' : ''}`}
+                    value={form.name}
+                    onChange={set('name')}
+                    placeholder="Tunde Adeyemi"
+                  />
                   {errors.name && <Err msg={errors.name} />}
                 </label>
 
@@ -373,7 +513,12 @@ export default function PartnerRegister() {
 
                 <label>
                   <span className="label-dark">Phone (reachable WhatsApp / mobile)</span>
-                  <input className={`input-dark ${errors.phone ? '!border-red-500' : ''}`} value={form.phone} onChange={set('phone')} placeholder="+234 800 000 0000" />
+                  <input
+                    className={`input-dark ${errors.phone ? '!border-red-500' : ''}`}
+                    value={form.phone}
+                    onChange={set('phone')}
+                    placeholder="+234 800 000 0000"
+                  />
                   {errors.phone && <Err msg={errors.phone} />}
                 </label>
 
@@ -419,12 +564,17 @@ export default function PartnerRegister() {
 
                 <label className="sm:col-span-2">
                   <span className="label-dark">Company / trading name (or private owner name)</span>
-                  <input className={`input-dark ${errors.company ? '!border-red-500' : ''}`} value={form.company} onChange={set('company')} placeholder="e.g. Adeyemi Estates Ltd / Private Deeded Owner" />
+                  <input
+                    className={`input-dark ${errors.company ? '!border-red-500' : ''}`}
+                    value={form.company}
+                    onChange={set('company')}
+                    placeholder="e.g. Adeyemi Estates Ltd / Private Deeded Owner"
+                  />
                   {errors.company && <Err msg={errors.company} />}
                 </label>
 
                 <div className="sm:col-span-2">
-                  <span className="label-dark">Your partner role</span>
+                  <span className="label-dark">Select your partner lane</span>
                   <div className="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2 sm:grid-cols-3">
                     {ROLES.map(r => {
                       const nonInventory = r.value === 'Closing Agent' || r.value === 'Referral Partner';
@@ -443,10 +593,16 @@ export default function PartnerRegister() {
                                   : f.propertiesCount,
                             }))
                           }
-                          className={`rounded-xl border px-3 py-2.5 text-left transition ${form.role === r.value ? 'border-brass-500 bg-brass-500/15 text-brass-200' : 'border-ink-800 text-ink-300 hover:border-ink-600'}`}
+                          className={`rounded-2xl border px-3 py-2.5 text-left transition ${
+                            form.role === r.value
+                              ? 'border-brass-500 bg-brass-500/15 text-brass-200'
+                              : 'border-ink-800 bg-ink-900/50 text-ink-300 hover:border-ink-600'
+                          }`}
                         >
                           <span className="block text-[11px] font-bold leading-tight">{r.value}</span>
-                          <span className="mt-0.5 block text-[9.5px] font-medium leading-snug text-ink-400">{r.blurb}</span>
+                          <span className="mt-0.5 block text-[9.5px] font-medium leading-snug text-ink-400">
+                            {r.blurb}
+                          </span>
                         </button>
                       );
                     })}
@@ -455,19 +611,32 @@ export default function PartnerRegister() {
 
                 <label>
                   <span className="label-dark">Properties to list (0 if closing/referral only)</span>
-                  <input type="number" min={0} className={`input-dark ${errors.propertiesCount ? '!border-red-500' : ''}`} value={form.propertiesCount} onChange={set('propertiesCount')} />
+                  <input
+                    type="number"
+                    min={0}
+                    className={`input-dark ${errors.propertiesCount ? '!border-red-500' : ''}`}
+                    value={form.propertiesCount}
+                    onChange={set('propertiesCount')}
+                  />
                   {errors.propertiesCount && <Err msg={errors.propertiesCount} />}
                 </label>
 
                 <div className="sm:col-span-1">
-                  <span className="label-dark">Lagos areas of operation {errors.areas && <span className="normal-case text-red-400">— {errors.areas}</span>}</span>
+                  <span className="label-dark">
+                    Lagos areas of operation{' '}
+                    {errors.areas && <span className="normal-case text-red-400">— {errors.areas}</span>}
+                  </span>
                   <div className="flex flex-wrap gap-1.5 pt-1">
                     {AREAS.map(a => (
                       <button
                         key={a}
                         type="button"
                         onClick={() => toggleArea(a)}
-                        className={`rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition ${areas.includes(a) ? 'border-brass-500 bg-brass-500 text-ink-950' : 'border-ink-800 text-ink-300 hover:border-ink-600'}`}
+                        className={`rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition ${
+                          areas.includes(a)
+                            ? 'border-brass-500 bg-brass-500 text-ink-950'
+                            : 'border-ink-800 text-ink-300 hover:border-ink-600'
+                        }`}
                       >
                         {a}
                       </button>
@@ -476,7 +645,9 @@ export default function PartnerRegister() {
                 </div>
 
                 <label className="sm:col-span-2">
-                  <span className="label-dark flex items-center gap-1.5"><Gift size={12} className="text-brass-400" /> Partner referral code (optional)</span>
+                  <span className="label-dark flex items-center gap-1.5">
+                    <Gift size={12} className="text-brass-400" /> Partner referral code (optional)
+                  </span>
                   <input
                     className="input-dark font-mono uppercase"
                     value={referralCode}
@@ -484,7 +655,11 @@ export default function PartnerRegister() {
                     placeholder="e.g. HML-ADEWALE-1A2B"
                   />
                   {referralCode.trim() && resolvedReferrer && (
-                    <span className={`mt-1 block text-[10.5px] font-bold ${resolvedReferrer.valid ? 'text-jade-400' : 'text-amber-300'}`}>
+                    <span
+                      className={`mt-1 block text-[10.5px] font-bold ${
+                        resolvedReferrer.valid ? 'text-emerald-400' : 'text-amber-300'
+                      }`}
+                    >
                       {resolvedReferrer.valid
                         ? `Referred by ${resolvedReferrer.referrerName}${resolvedReferrer.referrerCompany ? ` (${resolvedReferrer.referrerCompany})` : ''} — verified server-side on approval.`
                         : 'Code not matched to an active approved partner (self-referrals and unrecognised codes are ignored).'}
@@ -493,7 +668,7 @@ export default function PartnerRegister() {
                 </label>
 
                 <label className="sm:col-span-2">
-                  <span className="label-dark">Portfolio, authority basis & operational experience</span>
+                  <span className="label-dark">Portfolio, authority basis &amp; operational experience</span>
                   <textarea
                     className={`input-dark min-h-[88px] ${errors.motivation ? '!border-red-500' : ''}`}
                     value={form.motivation}
@@ -504,11 +679,15 @@ export default function PartnerRegister() {
                 </label>
               </div>
 
-              <p className="mt-4 flex items-start gap-2 text-[10px] font-medium leading-relaxed text-ink-500">
+              <p className="mt-4 flex items-start gap-2 text-[10px] font-medium leading-relaxed text-ink-400">
                 <CircleAlert size={12} className="mt-0.5 shrink-0" /> By applying you consent to a manual review of your identity, authority and documentation. Providing false information leads to rejection or suspension. Your data is handled under the HAMLET privacy notice (NDPR-aligned).
               </p>
 
-              <button type="submit" disabled={submitting} className="btn-brass mt-4 w-full !py-4 text-[15px]">
+              <button
+                type="submit"
+                disabled={submitting}
+                className="btn-brass mt-4 w-full !rounded-full !py-4 text-[15px]"
+              >
                 {submitting
                   ? 'Submitting…'
                   : isCorrectionMode
```

### `src/pages/PropertyDetail.tsx` (Modified)

```diff
diff --git a/src/pages/PropertyDetail.tsx b/src/pages/PropertyDetail.tsx
index d433252..1a65ecb 100644
--- a/src/pages/PropertyDetail.tsx
+++ b/src/pages/PropertyDetail.tsx
@@ -2,12 +2,35 @@ import { useEffect, useMemo, useState } from 'react';
 import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
 import { AnimatePresence, motion } from 'framer-motion';
 import {
-  BedDouble, Bath, Users, MapPin, ShieldCheck, X, Check, ChevronLeft, ChevronRight,
-  AlertTriangle, Info, ListChecks, Banknote, ArrowRight, UserPlus, LogIn, CalendarClock, Tag, Compass, Lock,
+  BedDouble,
+  Bath,
+  Users,
+  MapPin,
+  ShieldCheck,
+  X,
+  Check,
+  ChevronLeft,
+  ChevronRight,
+  AlertTriangle,
+  Info,
+  ListChecks,
+  Banknote,
+  ArrowRight,
+  UserPlus,
+  LogIn,
+  CalendarClock,
+  Tag,
+  Compass,
+  Lock,
+  Heart,
+  Sparkles,
+  Share2,
 } from 'lucide-react';
 import { GuestLayout } from '../components/Navbar';
 import { TrustBadge } from '../components/Badges';
 import { CurrencyToggle } from '../components/CurrencyToggle';
+import { useHoratio } from '../components/HoratioDrawer';
+import { useWishlist } from '../lib/wishlist';
 import { useHamlet, getPersistedClosingAgentCode } from '../lib/store';
 import { useCurrency, formatMinorCurrency } from '../lib/currency';
 import { usePageMeta } from '../lib/brand';
@@ -39,6 +62,8 @@ export default function PropertyDetail() {
     activeRateConfig,
     activeRateIsAvailable,
   } = useCurrency();
+  const { isSaved, toggleSaved } = useWishlist();
+  const { openHoratio } = useHoratio();
   const { toast } = useToast();
   const navigate = useNavigate();
 
@@ -198,16 +223,30 @@ export default function PropertyDetail() {
   }, [checkIn, checkOut, nights, todayIso, datesUnavailable, availabilitySummary]);
 
   if (!backendReady) {
-    return <GuestLayout><div className="mx-auto max-w-lg px-4 py-24 text-center"><p className="text-sm font-semibold text-ink-500">Finding spaces that fit your plans…</p></div></GuestLayout>;
+    return (
+      <GuestLayout>
+        <div className="mx-auto max-w-lg px-4 py-24 text-center">
+          <p className="text-sm font-semibold text-ink-500">Finding spaces that fit your plans…</p>
+        </div>
+      </GuestLayout>
+    );
   }
   if (backendError) {
-    return <GuestLayout><div className="mx-auto max-w-lg px-4 py-24 text-center"><h1 className="font-display text-2xl font-black text-ink-900">Something didn’t go as planned.</h1><p role="alert" className="mt-2 text-sm text-red-700">{backendError}</p><Link to="/stays" className="btn-jade mt-6">Browse stays</Link></div></GuestLayout>;
+    return (
+      <GuestLayout>
+        <div className="mx-auto max-w-lg px-4 py-24 text-center">
+          <h1 className="font-display text-2xl font-bold text-ink-900">Something didn’t go as planned.</h1>
+          <p role="alert" className="mt-2 text-sm text-red-700">{backendError}</p>
+          <Link to="/stays" className="btn-jade mt-6">Browse stays</Link>
+        </div>
+      </GuestLayout>
+    );
   }
   if (!property) {
     return (
       <GuestLayout>
         <div className="mx-auto max-w-lg px-4 py-24 text-center">
-          <h1 className="font-display text-2xl font-black text-ink-900">We couldn’t find that stay</h1>
+          <h1 className="font-display text-2xl font-bold text-ink-900">We couldn’t find that stay</h1>
           <p className="mt-2 text-sm text-ink-500">It may have been paused, suspended or removed since you last saw it.</p>
           <Link to="/stays" className="btn-jade mt-6">Browse approved stays</Link>
         </div>
@@ -215,7 +254,8 @@ export default function PropertyDetail() {
     );
   }
 
-  const guestNightlyNgn = Math.round(property.nightlyRate * 1.2);
+  const saved = isSaved(property.id);
+  const guestNightlyNgn = guestFacingNightlyNgn(property.nightlyRate);
 
   const bookingParams = new URLSearchParams({
     checkIn,
@@ -238,8 +278,10 @@ export default function PropertyDetail() {
   };
 
   const guestCanBook = property.status === 'approved';
-  const warning = property.status === 'approved' && nights > 0 && guests > property.capacity
-    ? `This home sleeps ${property.capacity} — please reduce guests to ${property.capacity} or fewer.` : '';
+  const warning =
+    property.status === 'approved' && nights > 0 && guests > property.capacity
+      ? `This home sleeps ${property.capacity} — please reduce guests to ${property.capacity} or fewer.`
+      : '';
 
   const jumpToNextAvailable = () => {
     if (!availabilitySummary?.nextAvailableDate) return;
@@ -248,9 +290,24 @@ export default function PropertyDetail() {
     setCheckOut(addDaysToIsoDate(nextStart, Math.max(nights, 2)));
   };
 
+  const copyShareLink = async () => {
+    try {
+      await navigator.clipboard.writeText(window.location.href);
+      toast('Listing link copied to clipboard.');
+    } catch {
+      toast('Could not copy link automatically.', 'error');
+    }
+  };
+
   const submitRequest = async () => {
-    if (!session) { navigate(buildAuthPath({ signup: true, redirect: bookingReturnPath })); return; }
-    if (session.role !== 'guest') { toast('Partner and admin accounts cannot book stays. Use a guest account.', 'error'); return; }
+    if (!session) {
+      navigate(buildAuthPath({ signup: true, redirect: bookingReturnPath }));
+      return;
+    }
+    if (session.role !== 'guest') {
+      toast('Partner and admin accounts cannot book stays. Use a guest account.', 'error');
+      return;
+    }
     if (!termsConfirmed) {
       toast('Please confirm you have reviewed the property details, house rules, and booking terms.', 'error');
       return;
@@ -269,7 +326,10 @@ export default function PropertyDetail() {
         quoteCurrency: currency !== 'NGN' && activeRateIsAvailable ? currency : 'NGN',
         closingAgentCode: closingAgentCode.trim() || undefined,
       });
-      if (!res.ok) { toast(res.error ?? 'Could not submit request.', 'error'); return; }
+      if (!res.ok) {
+        toast(res.error ?? 'Could not submit request.', 'error');
+        return;
+      }
       closeModal();
       toast(`Your request (${res.booking?.ref ?? ''}) is on its way.`);
       navigate('/account');
@@ -283,53 +343,142 @@ export default function PropertyDetail() {
   return (
     <GuestLayout>
       <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
-        {/* Breadcrumb */}
-        <div className="flex flex-wrap items-center justify-between gap-2">
+        {/* Breadcrumb + Action Pills */}
+        <div className="flex flex-wrap items-center justify-between gap-3">
           <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-ink-500">
-            <Link to="/stays" className="hover:text-jade-700">← All stays</Link>
+            <Link to="/stays" className="hover:text-ink-900">← All stays</Link>
             <span>·</span>
-            <Link to="/lagos" className="hover:text-jade-700">Lagos</Link>
+            <Link to="/lagos" className="hover:text-ink-900">Lagos</Link>
             <span>·</span>
-            <Link to={`/stays?area=${encodeURIComponent(property.area)}`} className="hover:text-jade-700">{property.area}</Link>
+            <Link to={`/stays?area=${encodeURIComponent(property.area)}`} className="hover:text-ink-900">{property.area}</Link>
+          </div>
+          <div className="flex flex-wrap items-center gap-2">
+            <button
+              type="button"
+              onClick={() => openHoratio(`Tell me about ${property.title} (${property.id}) and its verification and pricing.`)}
+              className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-bold text-ink-800 transition hover:border-ink-400"
+            >
+              <Sparkles size={13} className="text-brass-600" /> Ask Horatio
+            </button>
+            <button
+              type="button"
+              onClick={() => void copyShareLink()}
+              className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-bold text-ink-700 transition hover:border-ink-400"
+            >
+              <Share2 size={13} /> Share
+            </button>
+            <button
+              type="button"
+              onClick={() => {
+                toggleSaved(property.id);
+                toast(saved ? 'Removed from saved stays.' : 'Saved to your shortlist.');
+              }}
+              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
+                saved
+                  ? 'border-brass-500 bg-brass-500/15 text-ink-900'
+                  : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400'
+              }`}
+            >
+              <Heart size={13} className={saved ? 'fill-brass-500 text-brass-600' : ''} />
+              {saved ? 'Saved' : 'Save'}
+            </button>
           </div>
-          <span className="text-[11px] font-semibold text-ink-400">Listed by {property.submittedRole === 'Owner' ? 'owner' : property.submittedRole.toLowerCase()} · {property.ownerName}</span>
         </div>
 
-        <h1 className="mt-3 font-display text-2xl font-black leading-tight text-ink-900 sm:text-4xl">{property.title}</h1>
-        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
-          <span className="inline-flex items-start gap-1.5 text-[13px] font-semibold text-ink-600"><MapPin size={15} className="mt-0.5 shrink-0 text-jade-600" /><span>{property.address}</span></span>
-          <TrustBadge label={property.trustLabel} />
-          {availabilitySummary && (
-            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold ${
-              availabilitySummary.currentStatus === 'available_now'
-                ? 'border-jade-200 bg-jade-50 text-jade-800'
-                : 'border-amber-200 bg-amber-50 text-amber-900'
-            }`}>
-              <CalendarClock size={12} className="shrink-0" />
-              {availabilitySummary.currentStatus === 'currently_booked'
-                ? 'Currently booked'
-                : availabilitySummary.currentStatus === 'currently_unavailable'
-                  ? 'Currently unavailable'
-                  : 'Available now'}
-              {availabilitySummary.nextAvailableLabel ? ` · ${availabilitySummary.nextAvailableLabel}` : ''}
-            </span>
-          )}
+        {/* Title & Verification Header */}
+        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
+          <div>
+            <h1 className="font-display text-2xl font-bold leading-tight text-ink-900 sm:text-4xl">
+              {property.title}
+            </h1>
+            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
+              <span className="inline-flex items-start gap-1.5 text-[13px] font-semibold text-ink-600">
+                <MapPin size={15} className="mt-0.5 shrink-0 text-brass-600" />
+                <span>{property.address}</span>
+              </span>
+              <TrustBadge label={property.trustLabel} />
+              {availabilitySummary && (
+                <span
+                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold ${
+                    availabilitySummary.currentStatus === 'available_now'
+                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
+                      : 'border-amber-200 bg-amber-50 text-amber-900'
+                  }`}
+                >
+                  <CalendarClock size={12} className="shrink-0" />
+                  {availabilitySummary.currentStatus === 'currently_booked'
+                    ? 'Currently booked'
+                    : availabilitySummary.currentStatus === 'currently_unavailable'
+                      ? 'Currently unavailable'
+                      : 'Available now'}
+                  {availabilitySummary.nextAvailableLabel ? ` · ${availabilitySummary.nextAvailableLabel}` : ''}
+                </span>
+              )}
+            </div>
+          </div>
+          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink-400">
+            Ref {property.id.toUpperCase()} · Listed by {property.submittedRole === 'Owner' ? 'owner' : property.submittedRole.toLowerCase()} ({property.ownerName})
+          </span>
         </div>
 
-        {/* Gallery */}
-        <div className="mt-5 grid gap-2 lg:grid-cols-12">
-          <div className="relative overflow-hidden rounded-2xl lg:col-span-8">
-            <img src={property.images[imgIndex]} alt={`${property.title} — photo ${imgIndex + 1}`} className="h-72 w-full object-cover sm:h-96 lg:h-[440px]" />
-            <button onClick={() => setGallery({ propertyId: id, imageIndex: (imgIndex - 1 + property.images.length) % property.images.length })} aria-label="Previous photo"
-              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-ink-950/60 p-2 text-white backdrop-blur transition hover:bg-ink-950/80"><ChevronLeft size={18} /></button>
-            <button onClick={() => setGallery({ propertyId: id, imageIndex: (imgIndex + 1) % property.images.length })} aria-label="Next photo"
-              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-ink-950/60 p-2 text-white backdrop-blur transition hover:bg-ink-950/80"><ChevronRight size={18} /></button>
-            <span className="absolute bottom-3 right-3 rounded-full bg-ink-950/70 px-3 py-1 text-[11px] font-bold text-white backdrop-blur">{imgIndex + 1} / {property.images.length}</span>
+        {/* Editorial Gallery */}
+        <div className="mt-5 grid gap-2.5 lg:grid-cols-12">
+          <div className="relative overflow-hidden rounded-3xl bg-ink-100 lg:col-span-8">
+            <img
+              src={property.images[imgIndex]}
+              alt={`${property.title} — photo ${imgIndex + 1}`}
+              className="h-72 w-full object-cover sm:h-96 lg:h-[460px]"
+            />
+            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
+              <span className="rounded-full bg-ink-950/80 px-3 py-1 font-mono text-[10.5px] font-bold text-white backdrop-blur-md">
+                {property.area} · Lagos
+              </span>
+            </div>
+            <button
+              onClick={() =>
+                setGallery({
+                  propertyId: id,
+                  imageIndex: (imgIndex - 1 + property.images.length) % property.images.length,
+                })
+              }
+              aria-label="Previous photo"
+              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-ink-950/65 p-2.5 text-white backdrop-blur transition hover:bg-ink-950/85"
+            >
+              <ChevronLeft size={18} />
+            </button>
+            <button
+              onClick={() =>
+                setGallery({
+                  propertyId: id,
+                  imageIndex: (imgIndex + 1) % property.images.length,
+                })
+              }
+              aria-label="Next photo"
+              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-ink-950/65 p-2.5 text-white backdrop-blur transition hover:bg-ink-950/85"
+            >
+              <ChevronRight size={18} />
+            </button>
+            <span className="absolute bottom-3.5 right-3.5 rounded-full bg-ink-950/75 px-3 py-1 font-mono text-[11px] font-bold text-white backdrop-blur">
+              {imgIndex + 1} / {property.images.length}
+            </span>
           </div>
-          <div className="grid grid-cols-4 gap-2 lg:col-span-4 lg:grid-cols-2">
+          <div className="grid grid-cols-4 gap-2.5 lg:col-span-4 lg:grid-cols-2">
             {property.images.slice(0, 4).map((src, i) => (
-              <button key={i} onClick={() => setGallery({ propertyId: id, imageIndex: i })} className={`overflow-hidden rounded-2xl border-2 transition ${i === imgIndex ? 'border-brass-500' : 'border-transparent opacity-80 hover:opacity-100'}`}>
-                <img src={src} alt="" className="h-24 w-full object-cover sm:h-44 lg:h-[212px]" loading="lazy" />
+              <button
+                key={i}
+                onClick={() => setGallery({ propertyId: id, imageIndex: i })}
+                className={`overflow-hidden rounded-3xl border-2 transition ${
+                  i === imgIndex
+                    ? 'border-brass-500 ring-2 ring-brass-500/30'
+                    : 'border-transparent hover:border-ink-300'
+                }`}
+              >
+                <img
+                  src={src}
+                  alt=""
+                  className="h-24 w-full object-cover sm:h-44 lg:h-[224px]"
+                  loading="lazy"
+                />
               </button>
             ))}
           </div>
@@ -338,43 +487,63 @@ export default function PropertyDetail() {
         <div className="mt-8 grid gap-8 lg:grid-cols-12">
           {/* ── Left column ─────────────────────────── */}
           <div className="lg:col-span-7">
-            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-ink-100 pb-6 text-[13px] font-semibold text-ink-700">
-              <span className="inline-flex items-center gap-2"><BedDouble size={17} className="shrink-0 text-jade-700" />{property.bedrooms} bedrooms · {property.bedSetup}</span>
-              <span className="inline-flex items-center gap-2"><Bath size={17} className="shrink-0 text-jade-700" />{property.bathrooms} bathrooms</span>
-              <span className="inline-flex items-center gap-2"><Users size={17} className="shrink-0 text-jade-700" />Sleeps {property.capacity}</span>
+            {/* Key Spec Chips */}
+            <div className="flex flex-wrap items-center gap-2.5 border-b border-ink-100 pb-6">
+              <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3.5 py-2 text-xs font-bold text-ink-800">
+                <BedDouble size={15} className="shrink-0 text-brass-600" />
+                {property.bedrooms} bedroom{property.bedrooms === 1 ? '' : 's'} · {property.bedSetup}
+              </span>
+              <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3.5 py-2 text-xs font-bold text-ink-800">
+                <Bath size={15} className="shrink-0 text-brass-600" />
+                {property.bathrooms} bathroom{property.bathrooms === 1 ? '' : 's'}
+              </span>
+              <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3.5 py-2 text-xs font-bold text-ink-800">
+                <Users size={15} className="shrink-0 text-brass-600" />
+                Sleeps {property.capacity}
+              </span>
             </div>
 
             {/* Availability & Calendar Transparency Panel */}
             {availabilitySummary && (
-              <div className="mt-6 rounded-2xl border border-ink-200 bg-white p-4 sm:p-5">
+              <div className="mt-6 rounded-3xl border border-ink-200 bg-white p-5 sm:p-6">
                 <div className="flex flex-wrap items-center justify-between gap-2">
-                  <h2 className="flex items-center gap-2 font-display text-base font-black text-ink-900">
-                    <CalendarClock size={18} className="shrink-0 text-jade-700" /> Calendar & availability status
+                  <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
+                    <CalendarClock size={18} className="shrink-0 text-brass-600" /> Calendar &amp; availability status
                   </h2>
-                  <span className="rounded-full border border-ink-200 bg-ink-50 px-2.5 py-0.5 text-[10.5px] font-bold text-ink-700">
+                  <span className="rounded-full border border-ink-200 bg-paper px-3 py-0.5 text-[10.5px] font-bold text-ink-700">
                     {formatConfirmationStatusLabel(availabilitySummary.confirmationStatus)}
                   </span>
                 </div>
-                <p className="mt-1.5 text-[12.5px] font-medium text-ink-600">
+                <p className="mt-1 text-[12px] font-medium text-ink-600">
                   {availabilitySummary.currentStatus === 'currently_booked'
-                    ? `Currently booked on a confirmed HAMLET stay. ${availabilitySummary.nextAvailableLabel ?? ''}${availabilitySummary.relativeDaysUntilAvailable ? ` (${availabilitySummary.relativeDaysUntilAvailable})` : ''}.`
+                    ? `Currently booked. ${availabilitySummary.nextAvailableLabel ?? ''}.`
                     : availabilitySummary.currentStatus === 'currently_unavailable'
-                      ? `Currently unavailable due to an owner/external calendar block. ${availabilitySummary.nextAvailableLabel ?? ''}${availabilitySummary.relativeDaysUntilAvailable ? ` (${availabilitySummary.relativeDaysUntilAvailable})` : ''}.`
-                      : 'Available now for upcoming dates — select a day below or choose your check-in and check-out dates to request a stay.'}
+                      ? `Currently blocked. ${availabilitySummary.nextAvailableLabel ?? ''}.`
+                      : 'Open for upcoming dates.'}
                 </p>
                 {upcomingDays.length > 0 && (
-                  <div className="mt-3.5">
+                  <div className="mt-4">
                     <div className="flex flex-wrap items-center justify-between gap-2">
-                      <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">Next 21 days — tap an open date to set check-in</p>
+                      <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
+                        Next 21 days — tap an open date to set check-in
+                      </p>
                       <div className="flex items-center gap-3 text-[10px] font-bold text-ink-500">
-                        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-jade-600" /> Open</span>
-                        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-ink-900" /> Selected</span>
-                        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Occupied</span>
+                        <span className="inline-flex items-center gap-1">
+                          <span className="h-2 w-2 rounded-full bg-emerald-600" /> Open
+                        </span>
+                        <span className="inline-flex items-center gap-1">
+                          <span className="h-2 w-2 rounded-full bg-ink-900" /> Selected
+                        </span>
+                        <span className="inline-flex items-center gap-1">
+                          <span className="h-2 w-2 rounded-full bg-amber-400" /> Occupied
+                        </span>
                       </div>
                     </div>
                     <div className="mt-2 grid grid-cols-7 gap-1.5">
                       {upcomingDays.map(day => {
-                        const inSelectedStay = Boolean(checkIn && checkOut && day.iso >= checkIn && day.iso < checkOut);
+                        const inSelectedStay = Boolean(
+                          checkIn && checkOut && day.iso >= checkIn && day.iso < checkOut,
+                        );
                         return (
                           <button
                             key={day.iso}
@@ -398,11 +567,15 @@ export default function PropertyDetail() {
                                 ? 'cursor-not-allowed border-amber-200 bg-amber-50/70 text-amber-800 line-through opacity-75'
                                 : inSelectedStay
                                   ? 'border-ink-900 bg-ink-900 text-paper shadow-2xs'
-                                  : 'border-jade-200 bg-jade-50/60 text-jade-900 hover:border-jade-500 hover:bg-jade-100/70'
+                                  : 'border-emerald-200 bg-emerald-50/60 text-emerald-900 hover:border-emerald-500 hover:bg-emerald-100/70'
                             }`}
                           >
-                            <span className="block text-[9.5px] font-bold uppercase opacity-75">{day.weekday}</span>
-                            <span className="block text-[11px] font-extrabold tabular-nums">{day.dayNum}</span>
+                            <span className="block text-[9.5px] font-bold uppercase opacity-75">
+                              {day.weekday}
+                            </span>
+                            <span className="block text-[11px] font-extrabold tabular-nums">
+                              {day.dayNum}
+                            </span>
                           </button>
                         );
                       })}
@@ -410,11 +583,16 @@ export default function PropertyDetail() {
                   </div>
                 )}
                 {availabilitySummary.occupiedSpans.length > 0 && (
-                  <div className="mt-3">
-                    <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">Upcoming unavailable windows</p>
+                  <div className="mt-3.5">
+                    <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
+                      Upcoming unavailable windows
+                    </p>
                     <div className="mt-1.5 flex flex-wrap gap-1.5">
                       {availabilitySummary.occupiedSpans.slice(0, 6).map((span, idx) => (
-                        <span key={idx} className="rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-1 text-[11px] font-semibold text-amber-950">
+                        <span
+                          key={idx}
+                          className="rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-1 text-[11px] font-semibold text-amber-950"
+                        >
                           {formatDate(span.startDate)} → {formatDate(span.endDate)}
                         </span>
                       ))}
@@ -422,33 +600,60 @@ export default function PropertyDetail() {
                   </div>
                 )}
                 {property.lastAvailabilityUpdate && (
-                  <p className="mt-2.5 text-[10.5px] font-semibold text-ink-400">
+                  <p className="mt-3 text-[10.5px] font-semibold text-ink-400">
                     Calendar last updated {formatDateTime(property.lastAvailabilityUpdate)}
-                    {property.calendarResponsiblePerson ? ` · Managed by ${property.calendarResponsiblePerson}` : ''}
+                    {property.calendarResponsiblePerson
+                      ? ` · Managed by ${property.calendarResponsiblePerson}`
+                      : ''}
                   </p>
                 )}
               </div>
             )}
 
-            {/* Verification panel */}
-            <div className="mt-6 rounded-2xl border border-jade-200 bg-jade-50/60 p-4 sm:p-5">
-              <h2 className="flex items-center gap-2 font-display text-base font-black text-jade-900"><ShieldCheck size={18} className="shrink-0" /> How this home was verified</h2>
-              <p className="mt-1 text-[11.5px] font-medium text-jade-800">
-                Evidence reviewed by a HAMLET operations lead. Outcomes are recorded — self-reported items are labelled as such.{' '}
-                <Link to="/safety" className="underline hover:text-jade-950">Read guest protection guide</Link>.
-              </p>
-              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
+            {/* 4-Pillar Verification Status Grid */}
+            <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50/55 p-5 sm:p-6">
+              <div className="flex flex-wrap items-center justify-between gap-2">
+                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
+                  <ShieldCheck size={19} className="shrink-0 text-emerald-700" /> Verification status
+                </h2>
+                <Link to="/safety" className="text-xs font-extrabold text-emerald-800 underline hover:text-ink-900">
+                  Safety guide
+                </Link>
+              </div>
+              <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                 {[
                   { label: 'Ownership', s: property.verification.ownership },
                   { label: 'Identity', s: property.verification.identity },
                   { label: 'Authority to list', s: property.verification.authority },
                   { label: 'Inspection', s: property.verification.inspection },
                 ].map(v => (
-                  <div key={v.label} className="rounded-xl border border-jade-100 bg-white px-3 py-2.5">
-                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink-500">{v.label}</p>
-                    <p className={`mt-0.5 flex items-center gap-1 text-[12px] font-bold ${v.s === 'verified' ? 'text-jade-700' : v.s === 'missing' ? 'text-red-700' : 'text-amber-800'}`}>
-                      {v.s === 'verified' ? <Check size={13} strokeWidth={3} className="shrink-0" /> : <Info size={13} className="shrink-0" />}
-                      <span className="truncate">{v.s === 'verified' ? 'Verified' : v.s === 'pending_review' ? 'Pending' : v.s === 'missing' ? 'Missing' : 'Self-reported'}</span>
+                  <div key={v.label} className="rounded-2xl border border-emerald-200/80 bg-white px-3.5 py-3">
+                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink-500">
+                      {v.label}
+                    </p>
+                    <p
+                      className={`mt-1 flex items-center gap-1 text-xs font-bold ${
+                        v.s === 'verified'
+                          ? 'text-emerald-700'
+                          : v.s === 'missing'
+                            ? 'text-red-700'
+                            : 'text-amber-800'
+                      }`}
+                    >
+                      {v.s === 'verified' ? (
+                        <Check size={13} strokeWidth={3} className="shrink-0" />
+                      ) : (
+                        <Info size={13} className="shrink-0" />
+                      )}
+                      <span className="truncate">
+                        {v.s === 'verified'
+                          ? 'Verified'
+                          : v.s === 'pending_review'
+                            ? 'Pending'
+                            : v.s === 'missing'
+                              ? 'Missing'
+                              : 'Self-reported'}
+                      </span>
                     </p>
                   </div>
                 ))}
@@ -456,46 +661,61 @@ export default function PropertyDetail() {
             </div>
 
             {/* Amenities */}
-            <h2 className="mt-7 font-display text-lg font-black text-ink-900">Amenities</h2>
-            <div className="mt-2.5 flex flex-wrap gap-2">
-              {property.amenities.map(a => <span key={a} className="rounded-xl border border-ink-100 bg-white px-3.5 py-2 text-[12px] font-semibold text-ink-800">{a}</span>)}
+            <div className="mt-7">
+              <h2 className="font-display text-xl font-bold text-ink-900">Amenities &amp; utilities</h2>
+              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
+                {property.amenities.map(a => (
+                  <span
+                    key={a}
+                    className="flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-3.5 py-2.5 text-xs font-semibold text-ink-800"
+                  >
+                    <Check size={13} className="shrink-0 text-emerald-600" />
+                    <span className="truncate">{a}</span>
+                  </span>
+                ))}
+              </div>
             </div>
 
             {/* House rules */}
-            <h2 className="mt-7 font-display text-lg font-black text-ink-900">House rules</h2>
-            <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
-              {property.houseRules.map(r => <li key={r} className="flex items-start gap-2 text-[13px] font-medium text-ink-700"><ListChecks size={15} className="mt-0.5 shrink-0 text-jade-600" />{r}</li>)}
-            </ul>
+            <div className="mt-7 rounded-3xl border border-ink-100 bg-white p-5 sm:p-6">
+              <h2 className="font-display text-xl font-bold text-ink-900">House rules</h2>
+              <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
+                {property.houseRules.map(r => (
+                  <li key={r} className="flex items-start gap-2 text-[13px] font-medium text-ink-700">
+                    <ListChecks size={15} className="mt-0.5 shrink-0 text-brass-600" />
+                    {r}
+                  </li>
+                ))}
+              </ul>
+            </div>
 
             {/* Location & Wayfinder Arrival Overview */}
-            <div className="mt-7 rounded-2xl border border-ink-200 bg-white p-4 sm:p-5">
+            <div className="mt-7 rounded-3xl border border-ink-200 bg-white p-5 sm:p-6">
               <div className="flex flex-wrap items-start justify-between gap-2">
                 <div>
-                  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-jade-700">
-                    <Compass size={13} className="shrink-0" /> HAMLET Wayfinder · Location & arrival
+                  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-brass-700">
+                    <Compass size={13} className="shrink-0" /> HAMLET Wayfinder · Location &amp; arrival
                   </span>
-                  <h2 className="mt-1 font-display text-base font-black text-ink-900">
+                  <h2 className="mt-1 font-display text-lg font-bold text-ink-900">
                     {property.area}, Lagos
                   </h2>
                 </div>
                 {property.wayfinderStatus === 'guide_ready' ? (
-                  <span className="inline-flex items-center gap-1 rounded-full border border-jade-200 bg-jade-50 px-2.5 py-1 text-[10.5px] font-bold text-jade-800">
-                    <ShieldCheck size={12} className="shrink-0 text-jade-700" /> Door-to-door arrival guide ready
+                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10.5px] font-bold text-emerald-800">
+                    <ShieldCheck size={12} className="shrink-0 text-emerald-700" /> Door-to-door arrival guide ready
                   </span>
                 ) : property.locationAccuracy === 'verified_entrance' ? (
                   <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10.5px] font-bold text-sky-900">
                     <MapPin size={12} className="shrink-0 text-sky-700" /> Entrance pin verified · Guide partial
                   </span>
                 ) : (
-                  <span className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 text-[10.5px] font-bold text-ink-600">
+                  <span className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-paper px-2.5 py-1 text-[10.5px] font-bold text-ink-600">
                     Street address on file
                   </span>
                 )}
               </div>
 
-              <p className="mt-2 text-[13px] font-semibold text-ink-800">
-                {property.address}
-              </p>
+              <p className="mt-2 text-[13px] font-semibold text-ink-800">{property.address}</p>
 
               {property.publicLocationSummary && (
                 <p className="mt-1.5 text-[12.5px] font-medium leading-relaxed text-ink-600">
@@ -510,7 +730,10 @@ export default function PropertyDetail() {
                   </p>
                   <div className="mt-1.5 flex flex-wrap gap-1.5">
                     {property.publicLandmarks.map(lm => (
-                      <span key={lm} className="rounded-lg border border-ink-100 bg-ink-50/70 px-2.5 py-1 text-[11.5px] font-semibold text-ink-700">
+                      <span
+                        key={lm}
+                        className="rounded-lg border border-ink-100 bg-paper px-2.5 py-1 text-[11.5px] font-semibold text-ink-700"
+                      >
                         {lm}
                       </span>
                     ))}
@@ -520,94 +743,115 @@ export default function PropertyDetail() {
 
               <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                 {[
-                  { step: '1. Area', desc: `${property.area} neighbourhood` },
-                  { step: '2. Entrance', desc: 'Google Maps gate pin' },
-                  { step: '3. Building', desc: 'Compound & block turns' },
-                  { step: '4. Door', desc: 'Floor & check-in access' },
+                  { step: '01 · Area', desc: `${property.area} neighbourhood` },
+                  { step: '02 · Entrance', desc: 'Google Maps gate pin' },
+                  { step: '03 · Building', desc: 'Compound & block turns' },
+                  { step: '04 · Door', desc: 'Floor & check-in access' },
                 ].map(item => (
-                  <div key={item.step} className="rounded-xl border border-ink-100 bg-ink-50/50 px-3 py-2">
-                    <p className="text-[10.5px] font-extrabold text-jade-800">{item.step}</p>
+                  <div key={item.step} className="rounded-2xl border border-ink-100 bg-paper/70 px-3 py-2.5">
+                    <p className="font-mono text-[10.5px] font-extrabold text-ink-900">{item.step}</p>
                     <p className="mt-0.5 text-[11px] font-medium text-ink-600">{item.desc}</p>
                   </div>
                 ))}
               </div>
 
               {activeConfirmedGuestBooking ? (
-                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-jade-200 bg-jade-50 px-3.5 py-3">
-                  <p className="text-[12px] font-bold text-jade-900">
+                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
+                  <p className="text-xs font-bold text-emerald-900">
                     You have a confirmed stay here ({activeConfirmedGuestBooking.ref}).
                   </p>
                   <Link
                     to={`/wayfinder/${activeConfirmedGuestBooking.id}`}
-                    className="btn-jade !px-3.5 !py-2 text-[12px]"
+                    className="btn-jade !rounded-full !px-4 !py-2 text-xs"
                   >
                     <Compass size={14} /> Open Wayfinder
                   </Link>
                 </div>
               ) : (
-                <p className="mt-3 flex items-start gap-1.5 text-[11px] font-medium leading-relaxed text-ink-500">
-                  <Lock size={13} className="mt-0.5 shrink-0 text-ink-400" />
-                  <span>
-                    For resident safety, exact entrance coordinates, internal compound directions, apartment numbers, and check-in codes are shared exclusively after your booking is confirmed.
-                  </span>
+                <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-ink-500">
+                  <Lock size={12} className="shrink-0 text-ink-400" />
+                  <span>Exact gate pin and check-in codes unlock after booking confirmation.</span>
                 </p>
               )}
             </div>
 
-            {/* Deposit & charges */}
-            <div className="mt-7 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
+            {/* Separate Refundable Caution Deposit & Mandatory Charges */}
+            <div className="mt-7 rounded-3xl border border-ink-100 bg-white p-5 sm:p-6">
               <div className="flex flex-wrap items-center justify-between gap-2">
-                <h2 className="flex items-center gap-2 font-display text-base font-black text-ink-900"><Banknote size={17} className="shrink-0 text-jade-700" />Caution deposit & mandatory charges</h2>
+                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
+                  <Banknote size={18} className="shrink-0 text-brass-600" /> Caution deposit &amp; charges
+                </h2>
                 <CurrencyToggle compact />
               </div>
-              <dl className="mt-3 space-y-1.5 text-[13px] font-medium text-ink-800">
-                <div className="flex justify-between gap-3"><dt className="min-w-0">Refundable caution deposit (unbuffered)</dt><dd className="shrink-0 tabular-nums">{formatUnbufferedMoney(property.deposit)}</dd></div>
-                {property.mandatoryCharges.map(c => <div key={c.label} className="flex justify-between gap-3"><dt className="min-w-0">{c.label}</dt><dd className="shrink-0 tabular-nums">{formatStayPrice(c.amount)}</dd></div>)}
+              <dl className="mt-3 space-y-2 text-[13px] font-medium text-ink-800">
+                <div className="flex justify-between gap-3">
+                  <dt className="min-w-0">Refundable caution deposit</dt>
+                  <dd className="shrink-0 font-mono font-bold tabular-nums">{formatUnbufferedMoney(property.deposit)}</dd>
+                </div>
+                {property.mandatoryCharges.map(c => (
+                  <div key={c.label} className="flex justify-between gap-3">
+                    <dt className="min-w-0">{c.label}</dt>
+                    <dd className="shrink-0 font-mono font-bold tabular-nums">{formatStayPrice(c.amount)}</dd>
+                  </div>
+                ))}
               </dl>
-              <p className="mt-2.5 text-[11px] font-medium leading-relaxed text-ink-400">
-                The refundable caution deposit is itemised and tracked separately from accommodation pricing, is never included in HAMLET’s 20% markup or 10% international currency buffer, and is refunded after post-checkout inspection.
+              <p className="mt-2.5 text-[11px] font-medium text-ink-500">
+                Held separately (0% markup / FX buffer) and refunded after post-checkout inspection.
               </p>
             </div>
           </div>
 
-          {/* ── Booking widget ──────────────────────── */}
+          {/* ── Sticky Booking Request Card ──────────────────────── */}
           <aside className="mt-8 lg:col-span-5 lg:mt-0">
-            <div className="card overflow-hidden lg:sticky lg:top-20">
-              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 bg-ink-950 px-5 py-4 sm:px-6">
+            <div className="overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-lg lg:sticky lg:top-20">
+              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-800 bg-ink-950 px-5 py-5 sm:px-6">
                 <div>
-                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brass-400">Request to book</p>
+                  <p className="eyebrow-light">Request to book</p>
                   <div className="mt-1 flex flex-wrap items-baseline gap-2">
-                    <span className="font-display text-2xl font-black tabular-nums text-paper">{formatStayPrice(guestNightlyNgn)}</span>
-                    <span className="text-[12px] font-semibold text-ink-300">/ night · guest stay rate</span>
+                    <span className="font-display text-2xl font-bold tabular-nums text-white sm:text-3xl">
+                      {formatStayPrice(guestNightlyNgn)}
+                    </span>
+                    <span className="text-xs font-semibold text-ink-300">/ night · guest stay rate</span>
                   </div>
                 </div>
                 <CurrencyToggle variant="dark" />
               </div>
-              <div className="p-4 sm:p-6">
+
+              <div className="p-5 sm:p-6">
                 {currency !== 'NGN' && !activeRateIsAvailable && (
-                  <p role="status" className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] font-semibold text-amber-900">
+                  <p
+                    role="status"
+                    className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] font-semibold text-amber-900"
+                  >
                     Live {currency} FX rate is currently unavailable or expired — displaying exact Naira (₦) pricing.
                   </p>
                 )}
 
                 {availabilitySummary && checkIn && checkOut && checkOut > checkIn && (
-                  <div className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[11.5px] font-bold ${
-                    availabilitySummary.selectedDatesStatus === 'unavailable'
-                      ? 'border-red-200 bg-red-50 text-red-800'
-                      : availabilitySummary.selectedDatesStatus === 'needs_confirmation'
-                        ? 'border-amber-200 bg-amber-50 text-amber-900'
-                        : 'border-jade-200 bg-jade-50 text-jade-900'
-                  }`}>
+                  <div
+                    className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3.5 py-2 text-[11.5px] font-bold ${
+                      availabilitySummary.selectedDatesStatus === 'unavailable'
+                        ? 'border-red-200 bg-red-50 text-red-800'
+                        : availabilitySummary.selectedDatesStatus === 'needs_confirmation'
+                          ? 'border-amber-200 bg-amber-50 text-amber-900'
+                          : 'border-emerald-200 bg-emerald-50 text-emerald-900'
+                    }`}
+                  >
                     <span>{availabilitySummary.selectedDatesLabel}</span>
-                    {availabilitySummary.selectedDatesStatus === 'unavailable' && availabilitySummary.nextAvailableDate && (
-                      <button type="button" onClick={jumpToNextAvailable} className="underline hover:opacity-80">
-                        Select next available ({formatDate(availabilitySummary.nextAvailableDate)})
-                      </button>
-                    )}
+                    {availabilitySummary.selectedDatesStatus === 'unavailable' &&
+                      availabilitySummary.nextAvailableDate && (
+                        <button
+                          type="button"
+                          onClick={jumpToNextAvailable}
+                          className="underline hover:opacity-80"
+                        >
+                          Select next available ({formatDate(availabilitySummary.nextAvailableDate)})
+                        </button>
+                      )}
                   </div>
                 )}
 
-                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
+                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                   <label className="min-w-0">
                     <span className="label">Check in</span>
                     <input
@@ -637,84 +881,111 @@ export default function PropertyDetail() {
                 </div>
                 <label className="mt-3 block">
                   <span className="label">Guests</span>
-                  <select className="input" value={guests} onChange={e => setGuests(Number(e.target.value))}>
-                    {Array.from({ length: property.capacity }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}
+                  <select
+                    className="input"
+                    value={guests}
+                    onChange={e => setGuests(Number(e.target.value))}
+                  >
+                    {Array.from({ length: property.capacity }, (_, i) => i + 1).map(n => (
+                      <option key={n} value={n}>
+                        {n} guest{n > 1 ? 's' : ''}
+                      </option>
+                    ))}
                   </select>
                 </label>
 
                 {(dateError || warning) && (
-                  <p className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-semibold text-red-800"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{dateError || warning}</p>
+                  <p className="mt-3 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-800">
+                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
+                    {dateError || warning}
+                  </p>
                 )}
 
                 {/* Price breakdown — single-source pricing engine */}
                 {pricing && fxQuote && nights > 0 && !dateError && (
                   <dl className="mt-4 space-y-1.5 border-t border-ink-100 pt-4 text-[13px] font-medium text-ink-800">
                     <div className="flex justify-between gap-3">
-                      <dt className="min-w-0">Owner listed rate ({formatNaira(property.nightlyRate)} × {nights} night{nights > 1 ? 's' : ''})</dt>
-                      <dd className="shrink-0 tabular-nums">{formatNaira(pricing.accommodationSubtotal)}</dd>
+                      <dt className="min-w-0">
+                        Owner listed rate ({formatNaira(property.nightlyRate)} × {nights} night{nights > 1 ? 's' : ''})
+                      </dt>
+                      <dd className="shrink-0 font-mono tabular-nums">{formatNaira(pricing.accommodationSubtotal)}</dd>
                     </div>
                     <div className="flex justify-between gap-3">
                       <dt className="min-w-0">HAMLET domestic markup (20%)</dt>
-                      <dd className="shrink-0 tabular-nums">{formatNaira(pricing.hamletGuestServiceFee)}</dd>
+                      <dd className="shrink-0 font-mono tabular-nums">{formatNaira(pricing.hamletGuestServiceFee)}</dd>
                     </div>
                     <div className="flex justify-between gap-3 font-semibold text-ink-900">
-                      <dt className="min-w-0">Domestic guest accommodation ({nights} night{nights > 1 ? 's' : ''})</dt>
-                      <dd className="shrink-0 tabular-nums">{formatNaira(pricing.domesticGuestPriceNgn)}</dd>
+                      <dt className="min-w-0">
+                        Domestic guest accommodation ({nights} night{nights > 1 ? 's' : ''})
+                      </dt>
+                      <dd className="shrink-0 font-mono tabular-nums">{formatNaira(pricing.domesticGuestPriceNgn)}</dd>
                     </div>
                     {pricing.mandatoryCharges.map(c => (
                       <div key={c.label} className="flex justify-between gap-3">
                         <dt className="min-w-0 text-ink-600">{c.label}</dt>
-                        <dd className="shrink-0 tabular-nums">{formatNaira(c.amount)}</dd>
+                        <dd className="shrink-0 font-mono tabular-nums">{formatNaira(c.amount)}</dd>
                       </div>
                     ))}
 
-                    {fxQuote.quoteCurrency !== 'NGN' && fxQuote.convertedBaseMinor !== null && fxQuote.internationalBufferMinor !== null ? (
+                    {fxQuote.quoteCurrency !== 'NGN' &&
+                    fxQuote.convertedBaseMinor !== null &&
+                    fxQuote.internationalBufferMinor !== null ? (
                       <>
-                        <div className="mt-2 flex justify-between gap-3 border-t border-dashed border-ink-200 pt-2 text-[12px] text-ink-600">
-                          <dt className="min-w-0">Converted stay base (@ ₦{fxQuote.fxRate?.toLocaleString('en-NG')}/{currencySymbol}1)</dt>
-                          <dd className="shrink-0 tabular-nums">{formatMinorCurrency(fxQuote.convertedBaseMinor, fxQuote.quoteCurrency)}</dd>
+                        <div className="mt-2 flex justify-between gap-3 border-t border-dashed border-ink-200 pt-2 text-xs text-ink-600">
+                          <dt className="min-w-0">
+                            Converted stay base (@ ₦{fxQuote.fxRate?.toLocaleString('en-NG')}/{currencySymbol}1)
+                          </dt>
+                          <dd className="shrink-0 font-mono tabular-nums">
+                            {formatMinorCurrency(fxQuote.convertedBaseMinor, fxQuote.quoteCurrency)}
+                          </dd>
                         </div>
-                        <div className="flex justify-between gap-3 text-[12px] text-ink-600">
+                        <div className="flex justify-between gap-3 text-xs text-ink-600">
                           <dt className="min-w-0">International currency buffer (10%)</dt>
-                          <dd className="shrink-0 tabular-nums">{formatMinorCurrency(fxQuote.internationalBufferMinor, fxQuote.quoteCurrency)}</dd>
+                          <dd className="shrink-0 font-mono tabular-nums">
+                            {formatMinorCurrency(fxQuote.internationalBufferMinor, fxQuote.quoteCurrency)}
+                          </dd>
                         </div>
-                        <div className="flex justify-between gap-3 border-t-2 border-ink-900 pt-2.5 font-display text-[15px] font-black text-ink-900">
+                        <div className="flex justify-between gap-3 border-t-2 border-ink-900 pt-2.5 font-display text-base font-bold text-ink-900">
                           <dt className="min-w-0">Quoted stay total ({fxQuote.quoteCurrency})</dt>
-                          <dd className="shrink-0 tabular-nums text-jade-800">{formatMinorCurrency(fxQuote.quotedStayTotalMinor, fxQuote.quoteCurrency)}</dd>
+                          <dd className="shrink-0 font-mono tabular-nums text-ink-900">
+                            {formatMinorCurrency(fxQuote.quotedStayTotalMinor, fxQuote.quoteCurrency)}
+                          </dd>
                         </div>
                         {pricing.refundableDeposit > 0 && (
                           <div className="flex justify-between gap-3 text-[11.5px] text-ink-500">
                             <dt className="min-w-0">Refundable caution deposit (unbuffered, held separately)</dt>
-                            <dd className="shrink-0 tabular-nums">{formatUnbufferedMoney(pricing.refundableDeposit)} ({formatNaira(pricing.refundableDeposit)})</dd>
+                            <dd className="shrink-0 font-mono tabular-nums">
+                              {formatUnbufferedMoney(pricing.refundableDeposit)} ({formatNaira(pricing.refundableDeposit)})
+                            </dd>
                           </div>
                         )}
-                        <p className="pt-1 text-[11px] font-semibold text-jade-800">
+                        <p className="pt-1 text-[11px] font-semibold text-ink-700">
                           FX rate: 1 {fxQuote.quoteCurrency} = ₦{fxQuote.fxRate?.toLocaleString('en-NG')} ({fxQuote.fxRateSource}). Paystack stay checkout settles in NGN: {formatNaira(fxQuote.settlementTotalNgn)}.
                         </p>
                       </>
                     ) : (
                       <>
-                        <div className="flex justify-between gap-3 border-t-2 border-ink-900 pt-2.5 font-display text-[15px] font-black text-ink-900">
+                        <div className="flex justify-between gap-3 border-t-2 border-ink-900 pt-2.5 font-display text-base font-bold text-ink-900">
                           <dt className="min-w-0">Stay checkout total (Paystack NGN)</dt>
-                          <dd className="shrink-0 tabular-nums text-jade-800">{formatNaira(fxQuote.settlementTotalNgn)}</dd>
+                          <dd className="shrink-0 font-mono tabular-nums text-ink-900">
+                            {formatNaira(fxQuote.settlementTotalNgn)}
+                          </dd>
                         </div>
                         {pricing.refundableDeposit > 0 && (
                           <div className="flex justify-between gap-3 text-[11.5px] text-ink-500">
-                            <dt className="min-w-0">Refundable caution deposit (tracked separately, refunded post-inspection)</dt>
-                            <dd className="shrink-0 tabular-nums">{formatNaira(pricing.refundableDeposit)}</dd>
+                            <dt className="min-w-0">
+                              Refundable caution deposit (tracked separately, refunded post-inspection)
+                            </dt>
+                            <dd className="shrink-0 font-mono tabular-nums">{formatNaira(pricing.refundableDeposit)}</dd>
                           </div>
                         )}
                       </>
                     )}
                   </dl>
                 )}
-                <p className="mt-3 text-[10.5px] font-medium leading-snug text-ink-400">
-                  20% domestic accommodation markup (0% owner fee). International USD/GBP quotes include a single 10% currency buffer on stay pricing and never on the refundable caution deposit.
-                </p>
-
                 {guestCanBook ? (
                   <button
-                    className="btn-jade mt-4 w-full !py-4 text-[15px]"
+                    className="btn-jade mt-4 w-full !rounded-full !py-4 text-[15px]"
                     disabled={!!dateError || !!warning || nights === 0}
                     onClick={() => {
                       setTermsConfirmed(false);
@@ -724,9 +995,13 @@ export default function PropertyDetail() {
                     Request to book <ArrowRight size={17} />
                   </button>
                 ) : (
-                  <button className="btn-outline mt-4 w-full !py-4 text-[15px]" disabled>Not bookable — listing {property.status.replace('_', ' ')}</button>
+                  <button className="btn-outline mt-4 w-full !rounded-full !py-4 text-[15px]" disabled>
+                    Not bookable — listing {property.status.replace('_', ' ')}
+                  </button>
                 )}
-                <p className="mt-2 text-center text-[10.5px] font-semibold text-ink-400">You won’t be charged yet. Availability and terms are confirmed first.</p>
+                <p className="mt-2 text-center text-[10.5px] font-semibold text-ink-400">
+                  No charge until availability is confirmed.
+                </p>
               </div>
             </div>
           </aside>
@@ -736,59 +1011,111 @@ export default function PropertyDetail() {
       {/* ── Booking request modal ─────────────────────────────── */}
       <AnimatePresence>
         {showModal && pricing && fxQuote && (
-          <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
+          <motion.div
+            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
+            initial={{ opacity: 0 }}
+            animate={{ opacity: 1 }}
+            exit={{ opacity: 0 }}
+          >
             <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={closeModal} />
-            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
-              className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-y-contain rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-3xl sm:p-6">
+            <motion.div
+              initial={{ y: 60, opacity: 0 }}
+              animate={{ y: 0, opacity: 1 }}
+              exit={{ y: 40, opacity: 0 }}
+              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
+              className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-y-contain rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
+            >
               <div className="flex items-start justify-between gap-3">
                 <div className="min-w-0">
-                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-jade-700">{property.title}</p>
-                  <h2 className="mt-1 font-display text-xl font-black text-ink-900">One last look before you book.</h2>
-                  <p className="mt-1 text-[11.5px] font-medium text-ink-500">
-                    Check your dates, guest count, quote breakdown, house rules, and refundable caution deposit terms before sending your request.
-                  </p>
+                  <p className="eyebrow">{property.title}</p>
+                  <h2 className="mt-1 font-display text-xl font-bold text-ink-900">
+                    Confirm booking request
+                  </h2>
                 </div>
-                <button onClick={closeModal} className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-50" aria-label="Close"><X size={20} /></button>
+                <button
+                  onClick={closeModal}
+                  className="shrink-0 rounded-xl p-1.5 text-ink-400 hover:bg-ink-50"
+                  aria-label="Close"
+                >
+                  <X size={20} />
+                </button>
               </div>
               <div className="mt-4 flex items-center justify-between gap-2">
-                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Quote currency</span>
+                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
+                  Quote currency
+                </span>
                 <CurrencyToggle compact />
               </div>
-              <div className="mt-2 grid grid-cols-3 gap-2 rounded-2xl bg-ink-50 p-3 text-center">
-                <div><p className="text-[10px] font-extrabold uppercase text-ink-400">Dates</p><p className="text-[12px] font-bold text-ink-900 sm:text-[12.5px]">{checkIn.slice(5)} → {checkOut.slice(5)}</p></div>
-                <div><p className="text-[10px] font-extrabold uppercase text-ink-400">Nights</p><p className="text-[12.5px] font-bold text-ink-900">{nights}</p></div>
-                <div><p className="text-[10px] font-extrabold uppercase text-ink-400">Guests</p><p className="text-[12.5px] font-bold text-ink-900">{guests}</p></div>
+              <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-2xl bg-paper p-3 text-center">
+                <div>
+                  <p className="text-[10px] font-extrabold uppercase text-ink-400">Dates</p>
+                  <p className="text-xs font-bold text-ink-900">
+                    {checkIn.slice(5)} → {checkOut.slice(5)}
+                  </p>
+                </div>
+                <div>
+                  <p className="text-[10px] font-extrabold uppercase text-ink-400">Nights</p>
+                  <p className="text-xs font-bold text-ink-900">{nights}</p>
+                </div>
+                <div>
+                  <p className="text-[10px] font-extrabold uppercase text-ink-400">Guests</p>
+                  <p className="text-xs font-bold text-ink-900">{guests}</p>
+                </div>
               </div>
               <dl className="mt-4 space-y-1.5 text-[13px] font-medium text-ink-800">
-                <div className="flex justify-between gap-3"><dt className="min-w-0">Domestic accommodation ({nights} nights incl. 20% markup)</dt><dd className="shrink-0 tabular-nums">{formatNaira(pricing.domesticGuestPriceNgn)}</dd></div>
-                {pricing.mandatoryCharges.map(c => <div key={c.label} className="flex justify-between gap-3"><dt className="min-w-0">{c.label}</dt><dd className="shrink-0 tabular-nums">{formatNaira(c.amount)}</dd></div>)}
+                <div className="flex justify-between gap-3">
+                  <dt className="min-w-0">
+                    Domestic accommodation ({nights} nights incl. 20% markup)
+                  </dt>
+                  <dd className="shrink-0 font-mono tabular-nums">{formatNaira(pricing.domesticGuestPriceNgn)}</dd>
+                </div>
+                {pricing.mandatoryCharges.map(c => (
+                  <div key={c.label} className="flex justify-between gap-3">
+                    <dt className="min-w-0">{c.label}</dt>
+                    <dd className="shrink-0 font-mono tabular-nums">{formatNaira(c.amount)}</dd>
+                  </div>
+                ))}
                 {fxQuote.quoteCurrency !== 'NGN' && fxQuote.internationalBufferMinor !== null && (
-                  <div className="flex justify-between gap-3 text-[12px] text-ink-600">
-                    <dt className="min-w-0">International {fxQuote.quoteCurrency} quote (incl. 10% buffer)</dt>
-                    <dd className="shrink-0 tabular-nums font-bold">{formatMinorCurrency(fxQuote.quotedStayTotalMinor, fxQuote.quoteCurrency)}</dd>
+                  <div className="flex justify-between gap-3 text-xs text-ink-600">
+                    <dt className="min-w-0">
+                      International {fxQuote.quoteCurrency} quote (incl. 10% buffer)
+                    </dt>
+                    <dd className="shrink-0 font-mono font-bold tabular-nums">
+                      {formatMinorCurrency(fxQuote.quotedStayTotalMinor, fxQuote.quoteCurrency)}
+                    </dd>
                   </div>
                 )}
-                <div className="flex justify-between gap-3 border-t-2 border-ink-900 pt-2 font-display text-[15px] font-black">
+                <div className="flex justify-between gap-3 border-t-2 border-ink-900 pt-2 font-display text-[15px] font-bold">
                   <dt className="min-w-0">Paystack stay settlement on acceptance (NGN)</dt>
-                  <dd className="shrink-0 tabular-nums text-jade-800">{formatNaira(fxQuote.settlementTotalNgn)}</dd>
+                  <dd className="shrink-0 font-mono tabular-nums text-ink-900">
+                    {formatNaira(fxQuote.settlementTotalNgn)}
+                  </dd>
                 </div>
                 {pricing.refundableDeposit > 0 && (
                   <div className="flex justify-between gap-3 text-[11.5px] text-ink-500">
-                    <dt className="min-w-0">Separate refundable caution deposit (post-inspection refund)</dt>
-                    <dd className="shrink-0 tabular-nums">{formatNaira(pricing.refundableDeposit)}</dd>
+                    <dt className="min-w-0">
+                      Separate refundable caution deposit (post-inspection refund)
+                    </dt>
+                    <dd className="shrink-0 font-mono tabular-nums">{formatNaira(pricing.refundableDeposit)}</dd>
                   </div>
                 )}
               </dl>
               <label className="mt-4 block">
-                <span className="label flex items-center gap-1"><Tag size={12} /> Closing agent / partner code (optional)</span>
+                <span className="label flex items-center gap-1">
+                  <Tag size={12} /> Closing agent / partner code (optional)
+                </span>
                 <input
-                  className="input font-mono text-[12px] uppercase"
+                  className="input font-mono text-xs uppercase"
                   placeholder="e.g. HML-ZAINAB-3C4D"
                   value={closingAgentCode}
                   onChange={e => setClosingAgentCode(e.target.value)}
                 />
                 {closingAgentCode.trim() && resolvedAgent && (
-                  <p className={`mt-1 text-[11px] font-semibold ${resolvedAgent.valid ? 'text-jade-700' : 'text-amber-700'}`}>
+                  <p
+                    className={`mt-1 text-[11px] font-semibold ${
+                      resolvedAgent.valid ? 'text-emerald-700' : 'text-amber-700'
+                    }`}
+                  >
                     {resolvedAgent.valid
                       ? `Closing agent verified: ${resolvedAgent.referrerName}${resolvedAgent.referrerCompany ? ` (${resolvedAgent.referrerCompany})` : ''}`
                       : 'Code not recognised as an active HAMLET partner — booking will still submit normally.'}
@@ -797,40 +1124,59 @@ export default function PropertyDetail() {
               </label>
               <label className="mt-3 block">
                 <span className="label">Note for the host (optional)</span>
-                <textarea className="input min-h-[68px] resize-none" placeholder="e.g. Arriving from Murtala Muhammed Airport, flight lands 14:10…" value={note} onChange={e => setNote(e.target.value)} />
+                <textarea
+                  className="input min-h-[68px] resize-none"
+                  placeholder="e.g. Arriving from Murtala Muhammed Airport, flight lands 14:10…"
+                  value={note}
+                  onChange={e => setNote(e.target.value)}
+                />
               </label>
               {session && (
-                <label className="mt-3.5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-ink-200 bg-ink-50/60 p-3 text-[12px] font-semibold text-ink-800">
+                <label className="mt-3.5 flex cursor-pointer items-start gap-2.5 rounded-2xl border border-ink-200 bg-paper p-3 text-xs font-semibold text-ink-800">
                   <input
                     type="checkbox"
                     checked={termsConfirmed}
                     onChange={e => setTermsConfirmed(e.target.checked)}
-                    className="mt-0.5 h-4 w-4 shrink-0 accent-jade-600"
+                    className="mt-0.5 h-4 w-4 shrink-0 accent-ink-900"
                   />
-                  <span>I have reviewed the property details, house rules, caution deposit inspection terms, and booking terms.</span>
+                  <span>
+                    I have reviewed the property details, house rules, caution deposit inspection terms, and booking terms.
+                  </span>
                 </label>
               )}
               {session ? (
-                <button className="btn-jade mt-4 w-full !py-4 disabled:opacity-50" onClick={submitRequest} disabled={submitting || !termsConfirmed}>
-                  {submitting ? 'Sending…' : <>Submit booking request <ArrowRight size={16} /></>}
+                <button
+                  className="btn-jade mt-4 w-full !rounded-full !py-4 disabled:opacity-50"
+                  onClick={submitRequest}
+                  disabled={submitting || !termsConfirmed}
+                >
+                  {submitting ? (
+                    'Sending…'
+                  ) : (
+                    <>
+                      Submit booking request <ArrowRight size={16} />
+                    </>
+                  )}
                 </button>
               ) : (
                 <div className="mt-4 space-y-2">
                   <Link
                     to={buildAuthPath({ signup: true, redirect: bookingReturnPath })}
-                    className="btn-jade w-full !py-4"
+                    className="btn-jade w-full !rounded-full !py-4"
                   >
                     <UserPlus size={16} /> Create guest account to book <ArrowRight size={16} />
                   </Link>
                   <Link
                     to={buildAuthPath({ signup: false, redirect: bookingReturnPath })}
-                    className="btn-outline w-full !py-3 text-[13px]"
+                    className="btn-outline w-full !rounded-full !py-3 text-[13px]"
                   >
                     <LogIn size={15} /> Already have an account? Sign in
                   </Link>
                 </div>
               )}
-              <p className="mt-2 text-center text-[10.5px] font-medium text-ink-400">Request → host checks availability & terms → accepted with a payment deadline → confirmed only after verified provider payment.</p>
+              <p className="mt-2 text-center text-[10.5px] font-medium text-ink-400">
+                You pay only after the host confirms your dates.
+              </p>
             </motion.div>
           </motion.div>
         )}
```

### `src/pages/Safety.tsx` (Modified)

```diff
diff --git a/src/pages/Safety.tsx b/src/pages/Safety.tsx
index fd4b8b1..8a54f88 100644
--- a/src/pages/Safety.tsx
+++ b/src/pages/Safety.tsx
@@ -1,145 +1,179 @@
 import { Link } from 'react-router-dom';
-import { ArrowRight, Banknote, CreditCard, LifeBuoy, Lock, RefreshCcw, ShieldCheck, Zap } from 'lucide-react';
+import {
+  ArrowRight,
+  CheckCircle2,
+  CreditCard,
+  LifeBuoy,
+  Lock,
+  ShieldCheck,
+} from 'lucide-react';
 import { GuestLayout } from '../components/Navbar';
+import { DocStatusBadge } from '../components/Badges';
 import { usePageMeta } from '../lib/brand';
+import type { DocStatus } from '../lib/types';
+
+const VERIFICATION_PILLARS = [
+  {
+    num: '01',
+    title: 'Ownership',
+    body: 'Title or purchase documents checked against the property record.',
+  },
+  {
+    num: '02',
+    title: 'Identity',
+    body: 'Government ID verified for the owner or authorised representative.',
+  },
+  {
+    num: '03',
+    title: 'Authority to list',
+    body: 'Direct ownership or signed management mandate recorded.',
+  },
+  {
+    num: '04',
+    title: 'Physical inspection',
+    body: 'On-site check of photos, power backup, and arrival accuracy.',
+  },
+] as const;
+
+const HONEST_STATUSES: { status: DocStatus; code: string; desc: string }[] = [
+  {
+    status: 'verified',
+    code: 'verified',
+    desc: 'Evidence reviewed and recorded by HAMLET.',
+  },
+  {
+    status: 'self_reported',
+    code: 'self_reported',
+    desc: 'Declared by the partner; awaiting review.',
+  },
+  {
+    status: 'pending_review',
+    code: 'pending_review',
+    desc: 'Submitted and in the review queue.',
+  },
+  {
+    status: 'missing',
+    code: 'missing',
+    desc: 'Not yet supplied.',
+  },
+];
 
 export default function Safety() {
   usePageMeta(
     'Guest Safety & Booking Protection | HAMLET',
-    'How HAMLET handles property verification, clear pricing, payment awareness, physical access, amenities, and support if something goes wrong.',
+    'How HAMLET handles four-pillar property verification, honest status labelling, Paystack payment protection, NDPR privacy, and guest issue resolution.',
   );
 
   return (
     <GuestLayout>
-      <section className="border-b border-ink-100 bg-ink-950 text-paper">
-        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
-          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brass-300">
-            Safety, transparency & guest protection
-          </p>
-          <h1 className="mt-3 max-w-2xl font-display text-3xl font-black leading-tight sm:text-5xl">
-            Your peace of mind matters.
+      {/* Hero */}
+      <section className="border-b border-ink-800 bg-ink-950 text-paper">
+        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
+          <p className="eyebrow-light">Safety &amp; protection</p>
+          <h1 className="mt-2.5 max-w-2xl font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
+            Four-pillar{' '}
+            <span className="italic text-brass-300">verification.</span>
           </h1>
-          <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-ink-100">
-            A shortlet booking involves more than choosing an attractive room. You are trusting a listing, a property representative, and a set of arrangements that need to work when you arrive. We take that seriously.
-          </p>
-          <p className="mt-2.5 max-w-3xl text-sm font-medium leading-relaxed text-ink-200">
-            HAMLET is designed to make property information, booking terms, payment instructions, and support routes easier to understand before you commit. Here is what guests should know.
+          <p className="mt-3 max-w-xl text-sm font-medium text-ink-200 sm:text-base">
+            Clear verification records, in-account Paystack checkout, and structured support.
           </p>
         </div>
       </section>
 
-      <div className="mx-auto max-w-5xl space-y-6 px-4 py-14 sm:px-6 sm:py-16">
-        <section className="card p-6 sm:p-7">
-          <h2 className="flex items-center gap-2 font-display text-xl font-black text-ink-900">
-            <ShieldCheck size={20} className="shrink-0 text-jade-700" /> 1. Property information and verification
-          </h2>
-          <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
-            We want guests to be able to make decisions based on accurate, useful information. Where a property is marked as verified, the listing explains the relevant verification status (ownership, identity, authority to list, and inspection) and what was checked. Verification should not be interpreted as a guarantee that every amenity will always work or that every future stay will be problem-free.
-          </p>
-          <p className="mt-2 text-sm leading-relaxed text-ink-600">
-            Before booking, review the listing photos, location, facilities, occupancy limits, and house rules. If you notice a material discrepancy, contact HAMLET through your booking support channel and provide the booking details and any relevant evidence.
-          </p>
-        </section>
-
-        <section className="card p-6 sm:p-7">
-          <h2 className="flex items-center gap-2 font-display text-xl font-black text-ink-900">
-            <Banknote size={20} className="shrink-0 text-jade-700" /> 2. Clear pricing before commitment
-          </h2>
-          <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
-            You should understand the cost of your stay before you confirm. Review the price breakdown, including the owner’s listed rate, the 20% HAMLET domestic accommodation markup, disclosed mandatory charges, any 10% international USD/GBP currency buffer, and any refundable caution deposit itemised separately for your booking. Check the payment instructions and cancellation terms before proceeding.
-          </p>
-          <p className="mt-2 text-sm font-semibold text-ink-800">
-            Never rely on an informal promise that conflicts with the displayed booking terms. If someone requests an additional payment that was not disclosed, pause and contact HAMLET through the official support route before sending money.
-          </p>
-        </section>
-
-        <section className="card p-6 sm:p-7">
-          <h2 className="flex items-center gap-2 font-display text-xl font-black text-ink-900">
-            <CreditCard size={20} className="shrink-0 text-jade-700" /> 3. Payment awareness
-          </h2>
-          <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
-            Follow the payment process presented through HAMLET for your reservation. Confirm the amount, recipient, and booking reference before making a payment. Do not send funds to an unrelated personal account or an unverified contact simply because someone claims to represent a property.
-          </p>
-          <p className="mt-2 text-sm leading-relaxed text-ink-600">
-            Keep receipts, payment confirmations, and booking records until your stay is complete. Reservations are confirmed only after server-verified payment.
-          </p>
-        </section>
-
-        <section className="card p-6 sm:p-7">
-          <h2 className="flex items-center gap-2 font-display text-xl font-black text-ink-900">
-            <Lock size={20} className="shrink-0 text-jade-700" /> 4. Physical safety and property access
+      <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6 sm:py-14">
+        <section>
+          <p className="eyebrow">Recorded per listing</p>
+          <h2 className="mt-1 font-display text-2xl font-bold text-ink-900 sm:text-3xl">
+            What we check
           </h2>
-          <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
-            Every property has its own access arrangements. Review the entry instructions and ask questions about anything that is unclear before arrival. Where provided, check the details of gated access, building security, smart locks, parking, and identification requirements.
-          </p>
-          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-700">
-            <li>Share your itinerary with someone you trust when appropriate.</li>
-            <li>Keep access codes and keys private.</li>
-            <li>Confirm you are communicating with the authorised property contact.</li>
-            <li>Do not disclose passwords, banking PINs, or one-time banking codes.</li>
-            <li>If you arrive and the property or access arrangements materially differ from what was agreed, document the issue and contact support.</li>
-          </ul>
-          <p className="mt-3 text-xs font-medium text-ink-500">
-            No online platform can guarantee complete physical safety at every property. Our aim is to help guests make informed choices and provide a clear process for raising concerns.
-          </p>
+          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
+            {VERIFICATION_PILLARS.map(pillar => (
+              <article key={pillar.num} className="card flex flex-col p-5">
+                <span className="font-mono text-xs font-extrabold tracking-widest text-brass-600">
+                  {pillar.num}
+                </span>
+                <h3 className="mt-2.5 font-display text-xl font-bold text-ink-900">{pillar.title}</h3>
+                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{pillar.body}</p>
+              </article>
+            ))}
+          </div>
         </section>
 
-        <section className="card p-6 sm:p-7">
-          <h2 className="flex items-center gap-2 font-display text-xl font-black text-ink-900">
-            <Zap size={20} className="shrink-0 text-jade-700" /> 5. Power, water, Wi-Fi and other amenities
+        <section className="rounded-3xl border border-ink-200 bg-white p-6">
+          <p className="eyebrow">Transparent badges</p>
+          <h2 className="mt-1 font-display text-xl font-bold text-ink-900 sm:text-2xl">
+            Pillar statuses
           </h2>
-          <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
-            Amenities vary from property to property. If uninterrupted power, air conditioning, hot water, or reliable internet is essential to your stay, review the property’s stated arrangements before booking. A listed amenity is an important representation — if a material discrepancy affects your stay, report it from your booking record with the relevant details.
-          </p>
+          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
+            {HONEST_STATUSES.map(item => (
+              <div
+                key={item.code}
+                className="rounded-2xl border border-ink-100 bg-paper/75 p-4"
+              >
+                <DocStatusBadge status={item.status} />
+                <p className="mt-2.5 text-xs font-medium leading-relaxed text-ink-700">
+                  {item.desc}
+                </p>
+              </div>
+            ))}
+          </div>
         </section>
 
-        <section className="card p-6 sm:p-7">
-          <h2 className="flex items-center gap-2 font-display text-xl font-black text-ink-900">
-            <LifeBuoy size={20} className="shrink-0 text-jade-700" /> 6. What happens if something goes wrong?
-          </h2>
-          <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
-            If you encounter a problem, report an issue from your HAMLET guest account as soon as possible and provide:
-          </p>
-          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-700">
-            <li>Your booking reference.</li>
-            <li>The property and issue involved.</li>
-            <li>The time the problem occurred.</li>
-            <li>Relevant photos, screenshots, or messages, where safe and appropriate.</li>
-            <li>The resolution you are seeking.</li>
-          </ul>
-          <p className="mt-3 text-xs font-semibold text-red-800">
-            For an immediate threat to life or physical safety, contact the appropriate local emergency service first.
-          </p>
-        </section>
+        <div className="grid gap-6 md:grid-cols-2">
+          <section className="card p-6">
+            <div className="flex items-center gap-2 text-ink-900">
+              <CreditCard size={19} className="shrink-0 text-brass-600" />
+              <h2 className="font-display text-xl font-bold">Payments</h2>
+            </div>
+            <ul className="mt-3.5 space-y-2 text-sm text-ink-700">
+              {[
+                'Pay only inside your HAMLET account after dates are confirmed',
+                'Bookings confirm via Paystack’s server-side webhook — never screenshots',
+                'Caution deposits are tracked separately and reviewed post-checkout',
+              ].map(line => (
+                <li key={line} className="flex items-start gap-2.5">
+                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-700" />
+                  <span>{line}</span>
+                </li>
+              ))}
+            </ul>
+          </section>
 
-        <section className="card p-6 sm:p-7">
-          <h2 className="flex items-center gap-2 font-display text-xl font-black text-ink-900">
-            <RefreshCcw size={20} className="shrink-0 text-jade-700" /> 7. Cancellations, refunds and disputes
-          </h2>
-          <p className="mt-2.5 text-sm leading-relaxed text-ink-600">
-            Cancellation and refund eligibility depends on the terms shown for the booking and the circumstances of the issue. Review the policy before confirming your reservation. If a significant problem arises, report it promptly and retain your supporting evidence. Any refund or dispute outcome is handled according to the applicable policy and recorded booking terms.
-          </p>
-        </section>
+          <section className="card p-6">
+            <div className="flex items-center gap-2 text-ink-900">
+              <Lock size={19} className="shrink-0 text-brass-600" />
+              <h2 className="font-display text-xl font-bold">Privacy &amp; access</h2>
+            </div>
+            <ul className="mt-3.5 space-y-2 text-sm text-ink-700">
+              {[
+                'Card details stay with Paystack — never stored on HAMLET',
+                'Exact gate pins and door codes unlock only after confirmation',
+                'NDPR-aligned access controls protect identity and booking records',
+              ].map(line => (
+                <li key={line} className="flex items-start gap-2.5">
+                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-700" />
+                  <span>{line}</span>
+                </li>
+              ))}
+            </ul>
+          </section>
+        </div>
 
-        <section className="rounded-3xl bg-ink-950 p-7 text-paper sm:p-10">
-          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-brass-300">Our commitment</p>
-          <h2 className="mt-2 font-display text-2xl font-black sm:text-3xl">
-            Trust should be visible in the details, the communication, and the way problems are addressed.
-          </h2>
-          <p className="mt-2.5 max-w-2xl text-sm font-medium leading-relaxed text-ink-200">
-            We want HAMLET to be a place where guests can compare accommodation with greater clarity and where concerns are handled through a defined process — not just in the words on a website.
-          </p>
-          <div className="mt-6 flex flex-wrap gap-3">
-            <Link to="/stays" className="btn-brass min-h-12">
-              Explore available stays <ArrowRight size={15} />
-            </Link>
-            <Link
-              to="/account"
-              className="inline-flex min-h-12 items-center rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-bold text-paper transition hover:bg-white/10"
-            >
-              Contact guest support
-            </Link>
+        <section className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-ink-950 p-6 text-paper sm:flex-row sm:items-center sm:p-8">
+          <div>
+            <div className="flex items-center gap-2 text-brass-300">
+              <LifeBuoy size={16} className="shrink-0" />
+              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">
+                Need help during a stay?
+              </span>
+            </div>
+            <h2 className="mt-1.5 font-display text-2xl font-bold text-white">
+              Report issues from My Bookings.
+            </h2>
           </div>
+          <Link to="/account" className="btn-brass shrink-0 !rounded-full !px-6">
+            Open My Bookings <ArrowRight size={15} />
+          </Link>
         </section>
       </div>
     </GuestLayout>
```

### `src/pages/SignIn.tsx` (Modified)

```diff
diff --git a/src/pages/SignIn.tsx b/src/pages/SignIn.tsx
index c18ce03..696113b 100644
--- a/src/pages/SignIn.tsx
+++ b/src/pages/SignIn.tsx
@@ -1,11 +1,28 @@
 import { useState } from 'react';
 import { Link, useNavigate, useSearchParams } from 'react-router-dom';
 import {
-  ShieldCheck, ArrowRight, User, Building2, KeyRound, ChevronDown, Eye, EyeOff, UserPlus, LogIn, Home, MailCheck,
+  ShieldCheck,
+  ArrowRight,
+  User,
+  Building2,
+  KeyRound,
+  ChevronDown,
+  Eye,
+  EyeOff,
+  UserPlus,
+  LogIn,
+  Home,
+  MailCheck,
 } from 'lucide-react';
 import { HamletMark } from '../components/Logo';
 import { useHamlet } from '../lib/store';
-import { HAMLET_TAGLINE, usePageMeta } from '../lib/brand';
+import {
+  HAMLET_MANTRA,
+  HAMLET_PARENT_COMPANY,
+  HAMLET_TAGLINE,
+  HAMLET_USP,
+  usePageMeta,
+} from '../lib/brand';
 import { useToast } from '../lib/toast';
 import {
   resolvePostSignInRedirect,
@@ -15,9 +32,9 @@ import {
 } from '../lib/authRedirect';
 
 const DEMO_ACCOUNTS = [
-  { role: 'Guest', email: 'guest@hamlet.ng', desc: 'Book stays, track lifecycle, pay, report issues', Icon: User, color: 'text-jade-700 bg-jade-50 border-jade-200' },
-  { role: 'Partner', email: 'partner@hamlet.ng', desc: 'Owner portal — properties, bookings, earnings (0% owner fee)', Icon: Building2, color: 'text-brass-700 bg-brass-200/40 border-brass-400/50' },
-  { role: 'Admin', email: 'admin@hamlet.ng', desc: 'HAMLET operations — reviews, ledger, issues, audit log', Icon: KeyRound, color: 'text-red-800 bg-red-50 border-red-200' },
+  { role: 'Guest', email: 'guest@hamlet.ng', desc: 'Book stays, track lifecycle, pay, report issues', Icon: User, color: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
+  { role: 'Partner', email: 'partner@hamlet.ng', desc: 'Owner portal — properties, bookings, earnings (0% owner fee)', Icon: Building2, color: 'text-brass-800 bg-brass-100/70 border-brass-300' },
+  { role: 'Admin', email: 'admin@hamlet.ng', desc: 'HAMLET operations — reviews, ledger, issues, audit log', Icon: KeyRound, color: 'text-ink-800 bg-ink-100 border-ink-300' },
 ];
 
 type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset';
@@ -225,71 +242,106 @@ export default function SignIn() {
 
   return (
     <div className="grid min-h-screen lg:grid-cols-2">
-      {/* Brand panel */}
+      {/* Midnight Navy Brand Showcase */}
       <div className="relative hidden overflow-hidden bg-ink-950 lg:block">
-        <img src="/images/lagos-hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
-        <div className="absolute inset-0 bg-gradient-to-br from-ink-950/80 via-ink-950/55 to-ink-950/90" />
+        <img
+          src="/images/hero-sample-living.jpg"
+          alt=""
+          className="absolute inset-0 h-full w-full object-cover opacity-90"
+        />
+        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/88 via-ink-950/45 to-ink-950/60" />
         <div className="relative flex h-full flex-col justify-between p-12">
-          <Link to="/"><div className="flex items-center gap-3"><HamletMark size={40} light /><span className="font-display text-3xl font-black text-paper">HAMLET<span className="text-brass-500">.</span></span></div></Link>
+          <Link to="/" className="inline-flex items-center gap-3">
+            <HamletMark size={40} light />
+            <span className="font-display text-3xl font-bold tracking-[0.06em] text-white">
+              HAMLET<span className="text-brass-500">.</span>
+            </span>
+          </Link>
+
           <div>
-            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brass-300">{HAMLET_TAGLINE}</p>
-            <h1 className="mt-2 font-display text-5xl font-black leading-[1.05] text-paper">Shortlet stays,<br /><span className="italic text-brass-400">sorted before you arrive.</span></h1>
-            <p className="mt-5 max-w-md text-[14px] font-medium leading-relaxed text-ink-100">Compare locations, amenities, house rules, and total pricing before you commit — with clear booking status and support from request to check-out.</p>
-            <div className="mt-6 space-y-2 text-[12.5px] font-semibold text-ink-200">
-              {['Manual, evidence-based verification before any listing goes live', 'Total price visible before you commit — 20% domestic markup, 0% owner fee', 'Payment confirmed only by server-side provider webhook'].map(t => (
-                <p key={t} className="flex items-start gap-2"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-brass-400" />{t}</p>
+            <p className="eyebrow-light">
+              {HAMLET_TAGLINE} · {HAMLET_USP}
+            </p>
+            <h1 className="mt-3 font-display text-5xl font-bold leading-[1.05] text-white">
+              Shortlet stays,
+              <br />
+              <span className="italic text-brass-300">sorted before you arrive.</span>
+            </h1>
+            <div className="mt-6 space-y-2.5 text-xs font-semibold text-ink-100">
+              {[
+                'Four-pillar verification on every listing',
+                'Upfront pricing — 0% owner fee, separate caution deposit',
+                'Paystack server-verified confirmation',
+              ].map(t => (
+                <p key={t} className="flex items-start gap-2.5">
+                  <ShieldCheck size={15} className="mt-0.5 shrink-0 text-brass-400" />
+                  {t}
+                </p>
               ))}
             </div>
           </div>
-          <p className="text-[11px] font-semibold text-ink-400">Lagos pilot · v1.0 · Verified short-stay operations</p>
+
+          <div className="flex items-center justify-between text-[11px] font-semibold text-ink-400">
+            <span>{HAMLET_PARENT_COMPANY} · Lagos</span>
+            <span>{HAMLET_MANTRA}</span>
+          </div>
         </div>
       </div>
 
-      {/* Form panel */}
+      {/* Form Panel */}
       <div className="flex items-center justify-center bg-paper px-4 py-12 sm:px-8">
-        <div className="w-full max-w-md">
-          <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden"><HamletMark size={32} /><span className="font-display text-2xl font-black text-ink-900">HAMLET<span className="text-brass-500">.</span></span></Link>
+        <div className="w-full max-w-md rounded-3xl border border-ink-100 bg-white p-6 shadow-sm sm:p-8">
+          <Link to="/" className="mb-6 inline-flex items-center gap-2 lg:hidden">
+            <HamletMark size={32} />
+            <span className="font-display text-2xl font-bold tracking-[0.06em] text-ink-900">
+              HAMLET<span className="text-brass-500">.</span>
+            </span>
+          </Link>
 
           {/* Prominent Sign in / Guest sign up mode switcher */}
-          <div role="tablist" aria-label="Account mode" className="mb-6 grid grid-cols-2 gap-1.5 rounded-2xl border border-ink-200 bg-white p-1.5 shadow-xs">
+          <div
+            role="tablist"
+            aria-label="Account mode"
+            className="mb-6 grid grid-cols-2 gap-1.5 rounded-full border border-ink-200 bg-paper p-1"
+          >
             <button
               type="button"
               role="tab"
               aria-selected={activeMode === 'signin'}
               onClick={() => switchMode('signin')}
-              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[12.5px] font-bold transition ${
+              className={`flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition ${
                 activeMode === 'signin'
-                  ? 'bg-ink-900 text-ink-50 shadow-xs'
-                  : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
+                  ? 'bg-ink-900 text-white shadow-2xs'
+                  : 'text-ink-600 hover:text-ink-900'
               }`}
             >
-              <LogIn size={15} /> Sign in
+              <LogIn size={14} /> Sign in
             </button>
             <button
               type="button"
               role="tab"
               aria-selected={creatingAccount}
               onClick={() => switchMode('signup')}
-              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[12.5px] font-bold transition ${
+              className={`flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition ${
                 creatingAccount
-                  ? 'bg-jade-700 text-white shadow-xs'
-                  : 'text-jade-800 hover:bg-jade-50'
+                  ? 'bg-ink-900 text-white shadow-2xs'
+                  : 'text-ink-600 hover:text-ink-900'
               }`}
             >
-              <UserPlus size={15} /> Create account
+              <UserPlus size={14} /> Create account
             </button>
           </div>
 
           {returningToProperty && (
-            <p className="mb-4 flex items-center gap-2 rounded-xl border border-jade-200 bg-jade-50 px-3 py-2.5 text-[11.5px] font-semibold text-jade-900">
-              <Home size={14} className="shrink-0 text-jade-700" />
+            <p className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[11.5px] font-semibold text-emerald-900">
+              <Home size={14} className="shrink-0 text-emerald-700" />
               <span>
                 You’ll return directly to your selected stay after {creatingAccount ? 'creating your account' : 'signing in'}.
               </span>
             </p>
           )}
           {activeMode === 'signin' && returningToPartnerWorkspace && (
-            <p className="mb-4 flex items-center gap-2 rounded-xl border border-brass-400/50 bg-brass-200/30 px-3 py-2.5 text-[11.5px] font-semibold text-ink-900">
+            <p className="mb-4 flex items-center gap-2 rounded-2xl border border-brass-400/50 bg-brass-200/30 px-3.5 py-2.5 text-[11.5px] font-semibold text-ink-900">
               <Building2 size={14} className="shrink-0 text-brass-700" />
               <span>
                 Sign in with your authorised partner account to open your requested booking directly in the Partner Workspace.
@@ -297,7 +349,7 @@ export default function SignIn() {
             </p>
           )}
           {activeMode === 'signin' && returningToAdminWorkspace && (
-            <p className="mb-4 flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-[11.5px] font-semibold text-ink-800">
+            <p className="mb-4 flex items-center gap-2 rounded-2xl border border-ink-200 bg-paper px-3.5 py-2.5 text-[11.5px] font-semibold text-ink-800">
               <KeyRound size={14} className="shrink-0 text-ink-700" />
               <span>
                 Sign in with your HAMLET operations account to open the requested booking directly.
@@ -305,7 +357,7 @@ export default function SignIn() {
             </p>
           )}
 
-          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">
+          <p className="eyebrow">
             {activeMode === 'signup'
               ? 'New HAMLET account'
               : activeMode === 'forgot'
@@ -314,7 +366,7 @@ export default function SignIn() {
                   ? 'Choose new password'
                   : 'Welcome back'}
           </p>
-          <h2 className="mt-1 font-display text-3xl font-black text-ink-900">
+          <h2 className="mt-1 font-display text-3xl font-bold text-ink-900">
             {activeMode === 'signup'
               ? 'Create your account'
               : activeMode === 'forgot'
@@ -323,14 +375,14 @@ export default function SignIn() {
                   ? 'Set a new password'
                   : 'Sign in'}
           </h2>
-          <p className="mt-1 text-[12.5px] font-medium text-ink-500">
+          <p className="mt-1 text-xs font-medium text-ink-500">
             {activeMode === 'signup'
-              ? 'Request verified Lagos stays, track booking status, complete checkout and contact support. Pre-authorised HAMLET operators are routed directly to the Admin Console.'
+              ? 'Book verified Lagos stays and manage your reservations.'
               : activeMode === 'forgot'
-                ? 'Enter the email address on your HAMLET account to receive a secure password reset link.'
+                ? 'Enter your email to receive a password reset link.'
                 : activeMode === 'reset'
-                  ? 'Enter and confirm your new password (at least 6 characters) to finish securing your account.'
-                  : 'One account experience for clients, partners and HAMLET operations — access is role-based.'}
+                  ? 'Choose a new password (at least 6 characters).'
+                  : 'Sign in as a guest, partner, or operator.'}
           </p>
 
           {activeMode === 'signin' && !backendConfigured && (
@@ -345,12 +397,12 @@ export default function SignIn() {
                     type="button"
                     onClick={() => quick(acc)}
                     title={acc.desc}
-                    className={`flex items-center gap-2.5 rounded-2xl border p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md sm:block ${acc.color} ${email === acc.email ? 'ring-2 ring-ink-900' : ''}`}
+                    className={`flex items-center gap-2.5 rounded-2xl border p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-xs sm:block ${acc.color} ${email === acc.email ? 'ring-2 ring-ink-900' : ''}`}
                   >
-                    <acc.Icon size={18} className="shrink-0" />
+                    <acc.Icon size={16} className="shrink-0" />
                     <div className="min-w-0 flex-1">
-                      <p className="text-[11px] font-black text-ink-900 sm:mt-1.5">{acc.role}</p>
-                      <p className="truncate text-[10.5px] font-semibold text-ink-600">{acc.email}</p>
+                      <p className="text-[11px] font-bold text-ink-900 sm:mt-1.5">{acc.role}</p>
+                      <p className="truncate text-[10px] font-semibold text-ink-600">{acc.email}</p>
                     </div>
                   </button>
                 ))}
@@ -359,8 +411,11 @@ export default function SignIn() {
           )}
 
           {infoMessage && (
-            <p role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-jade-200 bg-jade-50 px-3 py-2.5 text-[12px] font-semibold text-jade-900">
-              <MailCheck size={16} className="mt-0.5 shrink-0 text-jade-700" />
+            <p
+              role="status"
+              className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-900"
+            >
+              <MailCheck size={16} className="mt-0.5 shrink-0 text-emerald-700" />
               <span>{infoMessage}</span>
             </p>
           )}
@@ -416,7 +471,7 @@ export default function SignIn() {
                     <button
                       type="button"
                       onClick={() => switchMode('forgot')}
-                      className="text-[11px] font-bold text-jade-800 hover:underline"
+                      className="text-[11px] font-bold text-ink-900 hover:underline"
                     >
                       Forgot password?
                     </button>
@@ -460,15 +515,22 @@ export default function SignIn() {
               </label>
             )}
             {error && (
-              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-semibold text-red-800">
+              <p
+                role="alert"
+                className="rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-800"
+              >
                 {error}
               </p>
             )}
-            <button type="submit" disabled={loading} className="btn-jade w-full !py-4 text-[15px]">
-              {loading ? 'Please wait…' : (
+            <button type="submit" disabled={loading} className="btn-jade w-full !rounded-full !py-4 text-[15px]">
+              {loading ? (
+                'Please wait…'
+              ) : (
                 <>
                   {activeMode === 'signup'
-                    ? (returningToProperty ? 'Create account & continue' : 'Create account')
+                    ? returningToProperty
+                      ? 'Create account & continue'
+                      : 'Create account'
                     : activeMode === 'forgot'
                       ? 'Send recovery link'
                       : activeMode === 'reset'
@@ -481,12 +543,12 @@ export default function SignIn() {
           </form>
 
           {/* Secondary mode button */}
-          <div className="mt-4">
+          <div className="mt-3">
             {activeMode === 'signin' ? (
               <button
                 type="button"
                 onClick={() => switchMode('signup')}
-                className="btn-outline w-full !py-3 text-[13px]"
+                className="btn-outline w-full !rounded-full !py-3 text-[13px]"
               >
                 <UserPlus size={15} /> New to HAMLET? Create account
               </button>
@@ -494,16 +556,18 @@ export default function SignIn() {
               <button
                 type="button"
                 onClick={() => switchMode('signin')}
-                className="btn-outline w-full !py-3 text-[13px]"
+                className="btn-outline w-full !rounded-full !py-3 text-[13px]"
               >
                 <LogIn size={15} /> Back to sign in
               </button>
             )}
           </div>
 
-          <p className="mt-6 text-center text-[12.5px] font-medium text-ink-500">
+          <p className="mt-6 text-center text-xs font-medium text-ink-500">
             Own or manage a Lagos property?{' '}
-            <Link to="/partner/register" className="font-bold text-jade-800 hover:underline">Register & apply as a HAMLET partner</Link>
+            <Link to="/partner/register" className="font-bold text-ink-900 hover:underline">
+              Register &amp; apply as a HAMLET partner
+            </Link>
           </p>
         </div>
       </div>
```

### `src/pages/Stays.tsx` (Modified)

```diff
diff --git a/src/pages/Stays.tsx b/src/pages/Stays.tsx
index 3681758..3d49cc1 100644
--- a/src/pages/Stays.tsx
+++ b/src/pages/Stays.tsx
@@ -1,24 +1,66 @@
 import { useEffect, useState } from 'react';
 import { Link, useSearchParams } from 'react-router-dom';
-import { SlidersHorizontal, SearchX, ShieldCheck, Building2, Search } from 'lucide-react';
+import {
+  SlidersHorizontal,
+  SearchX,
+  Building2,
+  Search,
+  Heart,
+  Sparkles,
+} from 'lucide-react';
 import { GuestLayout } from '../components/Navbar';
 import { PropertyCard } from '../components/PropertyCard';
 import { CurrencyToggle } from '../components/CurrencyToggle';
+import { useHoratio } from '../components/HoratioDrawer';
 import { useHamlet } from '../lib/store';
 import { useCurrency } from '../lib/currency';
+import { useWishlist } from '../lib/wishlist';
 import { usePageMeta } from '../lib/brand';
 import {
   ISLAND_AND_LEKKI_AREAS,
+  isMainlandProperty,
   MAINLAND_AREAS,
   matchesLagosAreaFilter,
 } from '../lib/areas';
 import { addDaysToIsoDate, lagosIsoDateOffset } from '../lib/pricing';
 import { computePropertyAvailabilitySummary } from '../lib/availability';
 
-const AMENITY_FILTERS = ['Wifi', 'Pool', 'Gym', 'Parking', '24/7 Power', 'Security', 'Workspace', 'Kitchen', 'Generator', 'Concierge'];
-const TYPE_FILTERS = ['All types', 'Penthouse', 'Serviced apartment', 'Apartment', 'Studio apartment', 'Duplex', 'Villa'];
+const AMENITY_FILTERS = [
+  'Wifi',
+  'Pool',
+  'Gym',
+  'Parking',
+  '24/7 Power',
+  'Security',
+  'Workspace',
+  'Kitchen',
+  'Generator',
+  'Concierge',
+];
+const TYPE_FILTERS = [
+  'All types',
+  'Penthouse',
+  'Serviced apartment',
+  'Apartment',
+  'Studio apartment',
+  'Duplex',
+  'Villa',
+];
 const MAX_PRICE_TIERS = [120_000, 240_000, 420_000, 600_000, 900_000, 1_200_000];
-const MAINLAND_QUICK_HUBS = ['Lagos Mainland', 'Yaba', 'Surulere', 'Shomolu', 'Ikeja GRA', 'Gbagada', 'Maryland', 'Ilupeju', 'Ebute Metta', 'Magodo'] as const;
+const MAINLAND_QUICK_HUBS = [
+  'Lagos Mainland',
+  'Yaba',
+  'Surulere',
+  'Shomolu',
+  'Ikeja GRA',
+  'Gbagada',
+  'Maryland',
+  'Ilupeju',
+  'Ebute Metta',
+  'Magodo',
+] as const;
+
+type SortMode = 'recommended' | 'price_asc' | 'price_desc' | 'capacity';
 
 export default function Stays() {
   usePageMeta(
@@ -28,12 +70,17 @@ export default function Stays() {
 
   const { state, getUnavailablePropertyIds, backendReady, backendError } = useHamlet();
   const { formatStayPrice } = useCurrency();
+  const { savedIds } = useWishlist();
+  const { openHoratio } = useHoratio();
   const [params, setParams] = useSearchParams();
   const [showFilters, setShowFilters] = useState(false);
   const [unavailableIds, setUnavailableIds] = useState<Set<string>>(() => new Set());
 
   const keyword = params.get('q') ?? '';
   const area = params.get('area') ?? '';
+  const side = params.get('side') ?? '';
+  const savedOnly = params.get('saved') === '1';
+  const sort = (params.get('sort') as SortMode | null) ?? 'recommended';
   const checkIn = params.get('checkIn') ?? '';
   const checkOut = params.get('checkOut') ?? '';
   const availabilityMode = params.get('avail') ?? 'all';
@@ -51,7 +98,9 @@ export default function Stays() {
       Promise.resolve().then(() => {
         if (active) setUnavailableIds(new Set());
       });
-      return () => { active = false; };
+      return () => {
+        active = false;
+      };
     }
     void getUnavailablePropertyIds(checkIn, checkOut)
       .then(ids => {
@@ -60,13 +109,16 @@ export default function Stays() {
       .catch(() => {
         if (active) setUnavailableIds(new Set());
       });
-    return () => { active = false; };
+    return () => {
+      active = false;
+    };
   }, [checkIn, checkOut, getUnavailablePropertyIds, state.bookings]);
 
   const update = (patch: Record<string, string>) => {
     const next = new URLSearchParams(params);
     for (const [k, v] of Object.entries(patch)) {
-      if (v) next.set(k, v); else next.delete(k);
+      if (v) next.set(k, v);
+      else next.delete(k);
     }
     setParams(next, { replace: true });
   };
@@ -77,11 +129,18 @@ export default function Stays() {
   };
 
   const normalizedQuery = keyword.trim().toLowerCase();
-  const isMainlandActive = MAINLAND_AREAS.some(m => m.toLowerCase() === area.trim().toLowerCase());
+  const isMainlandActive =
+    side.toLowerCase() === 'mainland' ||
+    MAINLAND_AREAS.some(m => m.toLowerCase() === area.trim().toLowerCase());
 
-  // Approved listings remain discoverable for future dates unless filtered by a specific unavailable date range or availability filter.
   const results = state.properties
     .filter(p => p.status === 'approved')
+    .filter(p => !savedOnly || savedIds.includes(p.id))
+    .filter(p => {
+      if (side.toLowerCase() === 'mainland') return isMainlandProperty(p);
+      if (side.toLowerCase() === 'island') return !isMainlandProperty(p);
+      return true;
+    })
     .filter(p => !unavailableIds.has(p.id))
     .filter(p => {
       if (availabilityMode === 'all') return true;
@@ -105,69 +164,182 @@ export default function Stays() {
     .filter(p => !maxPrice || Math.round(p.nightlyRate * 1.2) <= Number(maxPrice))
     .filter(p => type === 'All types' || p.type === type)
     .filter(p => amenities.every(a => p.amenities.includes(a)))
-    .sort((a, b) => a.nightlyRate - b.nightlyRate);
+    .sort((a, b) => {
+      if (sort === 'price_asc') return a.nightlyRate - b.nightlyRate;
+      if (sort === 'price_desc') return b.nightlyRate - a.nightlyRate;
+      if (sort === 'capacity') return b.capacity - a.capacity || a.nightlyRate - b.nightlyRate;
+      // Recommended: fully inspected & Wayfinder-ready homes first, then price ascending
+      const score = (x: typeof a) =>
+        (x.verification.inspection === 'verified' ? 2 : 0) +
+        (x.wayfinderStatus === 'guide_ready' ? 1 : 0);
+      const diff = score(b) - score(a);
+      return diff !== 0 ? diff : a.nightlyRate - b.nightlyRate;
+    });
 
   const forwardQuery = new URLSearchParams();
   if (checkIn) forwardQuery.set('checkIn', checkIn);
   if (checkOut) forwardQuery.set('checkOut', checkOut);
   if (guests > 1) forwardQuery.set('guests', String(guests));
 
+  const headingText = savedOnly
+    ? 'Saved stays'
+    : keyword.trim()
+      ? `“${keyword.trim()}”`
+      : area === 'Lagos Mainland' || side.toLowerCase() === 'mainland'
+        ? 'Lagos Mainland stays'
+        : side.toLowerCase() === 'island'
+          ? 'Lagos Island stays'
+          : area
+            ? `Stays in ${area}`
+            : 'Explore stays';
+
   return (
     <GuestLayout>
-      <div className="border-b border-ink-100 bg-clay/60">
-        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 py-6 sm:px-6">
-          <div>
-            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">
-              <Link to="/lagos" className="hover:underline">Lagos shortlets</Link>
-              <span>·</span>
-              <span>Your stay, sorted.</span>
-            </div>
-            <h1 className="mt-1 font-display text-2xl font-black text-ink-900 sm:text-3xl">
-              {keyword.trim()
-                ? `Stays matching “${keyword.trim()}”`
-                : area === 'Lagos Mainland'
-                  ? 'Shortlets in Lagos Mainland (Yaba, Shomolu, Surulere & environs)'
-                  : area
-                    ? `Shortlets in ${area}`
-                    : 'Explore Lagos stays'}
-            </h1>
-            <p className="mt-1 text-[12.5px] font-medium text-ink-500">
-              {!backendReady
-                ? 'Finding spaces that fit your plans…'
-                : `${results.length} approved propert${results.length === 1 ? 'y' : 'ies'}${area ? ` in ${area}` : ''}${checkIn && checkOut ? ` · ${checkIn} → ${checkOut}` : ''} · capacity ${guests}+`}
-            </p>
-            {backendError && (
-              <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
-                Something didn’t go as planned ({backendError}). Please refresh the page and try again.
+      {/* Editorial Top Header */}
+      <div className="border-b border-ink-100 bg-white">
+        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-8">
+          <div className="flex flex-wrap items-end justify-between gap-4">
+            <div>
+              <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-brass-600">
+                <Link to="/lagos" className="hover:underline">
+                  Lagos
+                </Link>
+              </div>
+              <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
+                {headingText}
+              </h1>
+              <p className="mt-1 text-[13px] font-medium text-ink-500">
+                {!backendReady
+                  ? 'Loading stays…'
+                  : `${results.length} stay${results.length === 1 ? '' : 's'}${checkIn && checkOut ? ` · ${checkIn} → ${checkOut}` : ''}`}
               </p>
-            )}
+              {backendError && (
+                <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
+                  Could not load stays ({backendError}).
+                </p>
+              )}
+            </div>
+
+            <div className="flex flex-wrap items-center gap-2">
+              <CurrencyToggle />
+              <button
+                type="button"
+                onClick={() => openHoratio()}
+                className="inline-flex items-center gap-1.5 rounded-full border border-brass-400/60 bg-paper px-3.5 py-2 text-xs font-bold text-ink-900 transition hover:border-brass-500 [&>svg]:shrink-0"
+              >
+                <Sparkles size={13} className="text-brass-600" />
+                Ask Horatio
+              </button>
+            </div>
+          </div>
+
+          {/* Corridor + Sort Control Bar */}
+          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
+            <div className="flex flex-wrap items-center gap-1.5">
+              {[
+                { label: 'All Lagos', nextSide: '', nextArea: '' },
+                { label: 'Lagos Mainland', nextSide: 'Mainland', nextArea: '' },
+                { label: 'Lagos Island', nextSide: 'Island', nextArea: '' },
+              ].map(tab => {
+                const active =
+                  tab.nextSide === ''
+                    ? !side && area !== 'Lagos Mainland' && !savedOnly
+                    : side.toLowerCase() === tab.nextSide.toLowerCase();
+                return (
+                  <button
+                    key={tab.label}
+                    type="button"
+                    onClick={() =>
+                      update({ side: tab.nextSide, area: tab.nextArea, saved: '' })
+                    }
+                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
+                      active
+                        ? 'bg-ink-900 text-white'
+                        : 'border border-ink-200 bg-paper/70 text-ink-700 hover:border-ink-400'
+                    }`}
+                  >
+                    {tab.label}
+                  </button>
+                );
+              })}
+
+              <button
+                type="button"
+                onClick={() => update({ saved: savedOnly ? '' : '1' })}
+                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition [&>svg]:shrink-0 ${
+                  savedOnly
+                    ? 'border-brass-600 bg-brass-500 text-ink-950'
+                    : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400'
+                }`}
+              >
+                <Heart size={12} className={savedOnly ? 'fill-ink-950' : 'text-brass-600'} />
+                Saved ({savedIds.length})
+              </button>
+            </div>
+
+            <div className="flex flex-wrap items-center gap-1.5">
+              {(
+                [
+                  { id: 'recommended', label: 'Recommended' },
+                  { id: 'price_asc', label: 'Price: low → high' },
+                  { id: 'price_desc', label: 'Price: high → low' },
+                  { id: 'capacity', label: 'Largest group' },
+                ] as const
+              ).map(opt => (
+                <button
+                  key={opt.id}
+                  type="button"
+                  onClick={() => update({ sort: opt.id === 'recommended' ? '' : opt.id })}
+                  className={`rounded-full px-3 py-1.5 text-[11.5px] font-bold transition ${
+                    sort === opt.id
+                      ? 'bg-clay text-ink-950 ring-1 ring-ink-300'
+                      : 'text-ink-500 hover:bg-paper hover:text-ink-900'
+                  }`}
+                >
+                  {opt.label}
+                </button>
+              ))}
+            </div>
           </div>
-          <CurrencyToggle />
         </div>
       </div>
 
-      <div className="mx-auto max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid lg:grid-cols-12">
+      <div className="mx-auto max-w-7xl gap-7 px-4 py-7 sm:px-6 lg:grid lg:grid-cols-12">
         <div className="mb-4 lg:hidden">
-          <button onClick={() => setShowFilters(v => !v)} className="btn-outline !py-2.5 text-[12px]">
-            <SlidersHorizontal size={15} /> {showFilters ? 'Hide filters' : 'Show filters'}
+          <button
+            type="button"
+            onClick={() => setShowFilters(v => !v)}
+            className="btn-outline !rounded-full !py-2.5 text-[12px]"
+          >
+            <SlidersHorizontal size={15} /> {showFilters ? 'Hide filters' : 'Filters & amenities'}
           </button>
         </div>
 
-        {/* Filters */}
+        {/* Filters Sidebar — preserves sticky scroll responsiveness invariants */}
         <aside className={`${showFilters ? 'block' : 'hidden'} lg:col-span-3 lg:block`}>
           <div className="card mb-6 p-5 lg:mb-0 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overscroll-y-contain">
             <div className="flex items-center justify-between">
-              <h2 className="flex items-center gap-2 font-display text-base font-black text-ink-900"><SlidersHorizontal size={16} className="shrink-0" /> Filters</h2>
+              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
+                <SlidersHorizontal size={16} className="shrink-0 text-brass-600" /> Filters
+              </h2>
               <button
+                type="button"
                 onClick={() => setParams({}, { replace: true })}
                 className="text-[11px] font-extrabold uppercase tracking-wide text-jade-700 hover:text-jade-800"
-              >Clear all</button>
+              >
+                Clear all
+              </button>
             </div>
 
             <div className="mt-4">
-              <label className="label" htmlFor="f-q">Neighbourhood or keyword</label>
+              <label className="label" htmlFor="f-q">
+                Neighbourhood or keyword
+              </label>
               <div className="relative">
-                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
+                <Search
+                  size={14}
+                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
+                />
                 <input
                   id="f-q"
                   type="search"
@@ -180,8 +352,15 @@ export default function Stays() {
             </div>
 
             <div className="mt-4">
-              <label className="label" htmlFor="f-area">Area</label>
-              <select id="f-area" className="input" value={area} onChange={e => update({ area: e.target.value })}>
+              <label className="label" htmlFor="f-area">
+                Area
+              </label>
+              <select
+                id="f-area"
+                className="input"
+                value={area}
+                onChange={e => update({ area: e.target.value, side: '' })}
+              >
                 <option value="">All Lagos areas</option>
                 <optgroup label="Lagos Mainland & Environs">
                   {MAINLAND_AREAS.map(a => (
@@ -192,7 +371,9 @@ export default function Stays() {
                 </optgroup>
                 <optgroup label="Lagos Island & Lekki Corridor">
                   {ISLAND_AND_LEKKI_AREAS.map(a => (
-                    <option key={a} value={a}>{a}</option>
+                    <option key={a} value={a}>
+                      {a}
+                    </option>
                   ))}
                 </optgroup>
               </select>
@@ -227,22 +408,35 @@ export default function Stays() {
                 />
               </label>
             </div>
-            {checkIn && checkOut && (
-              <p className="mt-1.5 text-[10px] font-medium leading-snug text-ink-500">
-                Excludes homes with confirmed/held bookings on these dates. Final availability is still verified by the host on request.
-              </p>
-            )}
 
             <div className="mt-4">
-              <label className="label" htmlFor="f-guests">Guests (min capacity)</label>
-              <select id="f-guests" className="input" value={guests} onChange={e => update({ guests: e.target.value === '1' ? '' : e.target.value })}>
-                {[1, 2, 3, 4, 6, 8, 10].map(n => <option key={n} value={n}>{n}+ guests</option>)}
+              <label className="label" htmlFor="f-guests">
+                Guests
+              </label>
+              <select
+                id="f-guests"
+                className="input"
+                value={guests}
+                onChange={e => update({ guests: e.target.value === '1' ? '' : e.target.value })}
+              >
+                {[1, 2, 3, 4, 6, 8, 10].map(n => (
+                  <option key={n} value={n}>
+                    {n}+ guests
+                  </option>
+                ))}
               </select>
             </div>
 
             <div className="mt-4">
-              <label className="label" htmlFor="f-avail">Calendar availability</label>
-              <select id="f-avail" className="input" value={availabilityMode} onChange={e => update({ avail: e.target.value === 'all' ? '' : e.target.value })}>
+              <label className="label" htmlFor="f-avail">
+                Calendar availability
+              </label>
+              <select
+                id="f-avail"
+                className="input"
+                value={availabilityMode}
+                onChange={e => update({ avail: e.target.value === 'all' ? '' : e.target.value })}
+              >
                 <option value="all">All approved stays (now + future)</option>
                 <option value="now">Available right now</option>
                 <option value="future">Currently occupied · Future dates</option>
@@ -250,11 +444,20 @@ export default function Stays() {
             </div>
 
             <div className="mt-4">
-              <label className="label" htmlFor="f-price">Max nightly stay price</label>
-              <select id="f-price" className="input" value={maxPrice} onChange={e => update({ maxPrice: e.target.value })}>
+              <label className="label" htmlFor="f-price">
+                Max nightly stay price
+              </label>
+              <select
+                id="f-price"
+                className="input"
+                value={maxPrice}
+                onChange={e => update({ maxPrice: e.target.value })}
+              >
                 <option value="">No maximum</option>
                 {MAX_PRICE_TIERS.map(tier => (
-                  <option key={tier} value={String(tier)}>{formatStayPrice(tier)}</option>
+                  <option key={tier} value={String(tier)}>
+                    {formatStayPrice(tier)}
+                  </option>
                 ))}
               </select>
             </div>
@@ -263,8 +466,16 @@ export default function Stays() {
               <label className="label">Property type</label>
               <div className="flex flex-wrap gap-1.5">
                 {TYPE_FILTERS.map(t => (
-                  <button key={t} onClick={() => update({ type: t === 'All types' ? '' : t })}
-                    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${type === t ? 'border-jade-600 bg-jade-700 text-white' : 'border-ink-200 text-ink-600 hover:border-ink-400'}`}>
+                  <button
+                    key={t}
+                    type="button"
+                    onClick={() => update({ type: t === 'All types' ? '' : t })}
+                    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
+                      type === t
+                        ? 'border-ink-900 bg-ink-900 text-white'
+                        : 'border-ink-200 text-ink-600 hover:border-ink-400'
+                    }`}
+                  >
                     {t}
                   </button>
                 ))}
@@ -275,40 +486,44 @@ export default function Stays() {
               <label className="label">Amenities</label>
               <div className="flex flex-wrap gap-1.5">
                 {AMENITY_FILTERS.map(a => (
-                  <button key={a} onClick={() => toggleAmenity(a)}
-                    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${amenities.includes(a) ? 'border-jade-600 bg-jade-700 text-white' : 'border-ink-200 text-ink-600 hover:border-ink-400'}`}>
+                  <button
+                    key={a}
+                    type="button"
+                    onClick={() => toggleAmenity(a)}
+                    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
+                      amenities.includes(a)
+                        ? 'border-brass-600 bg-brass-500 text-ink-950'
+                        : 'border-ink-200 text-ink-600 hover:border-ink-400'
+                    }`}
+                  >
                     {a}
                   </button>
                 ))}
               </div>
             </div>
-
-            <div className="mt-5 rounded-xl bg-jade-50 p-3 text-[10.5px] font-semibold leading-relaxed text-jade-900">
-              <ShieldCheck size={13} className="mb-1 shrink-0" />
-              Only approved, non-suspended listings appear here. Verification outcomes are recorded honestly — see each listing’s trust badge.
-            </div>
           </div>
         </aside>
 
-        {/* Results */}
+        {/* Results Column */}
         <div className="lg:col-span-9">
           {isMainlandActive && (
-            <div className="mb-4 rounded-2xl border border-jade-200 bg-jade-50/70 p-3.5">
-              <p className="text-[11px] font-extrabold uppercase tracking-wider text-jade-800">
-                Lagos Mainland & Environs
+            <div className="mb-5 rounded-2xl border border-ink-200 bg-white p-4 shadow-2xs">
+              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-brass-700">
+                Lagos Mainland
               </p>
-              <div className="mt-2 flex flex-wrap gap-1.5">
+              <div className="mt-2.5 flex flex-wrap gap-1.5">
                 {MAINLAND_QUICK_HUBS.map(hub => {
-                  const selected = area === hub;
+                  const selected =
+                    area === hub || (hub === 'Lagos Mainland' && !area && side === 'Mainland');
                   return (
                     <button
                       key={hub}
                       type="button"
-                      onClick={() => update({ area: hub })}
+                      onClick={() => update({ area: hub, side: '' })}
                       className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                         selected
-                          ? 'border-jade-700 bg-jade-700 text-white'
-                          : 'border-jade-200 bg-white text-ink-700 hover:border-jade-500'
+                          ? 'border-ink-900 bg-ink-900 text-white'
+                          : 'border-ink-200 bg-paper text-ink-700 hover:border-ink-400'
                       }`}
                     >
                       {hub === 'Lagos Mainland' ? 'All Mainland' : hub}
@@ -321,38 +536,58 @@ export default function Stays() {
 
           {!backendReady ? (
             <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
-              <p role="status" className="font-display text-lg font-bold text-ink-800">Finding spaces that fit your plans…</p>
+              <p role="status" className="font-display text-lg font-bold text-ink-800">
+                Loading stays…
+              </p>
             </div>
           ) : results.length === 0 ? (
-            <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
-              <SearchX size={40} className="text-ink-300" />
-              <h2 className="font-display text-xl font-black text-ink-900">
-                {totalApproved === 0 ? 'We’re still adding stays in this area.' : 'Nothing matches your search right now.'}
+            <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
+              <SearchX size={36} className="text-ink-300" />
+              <h2 className="font-display text-2xl font-bold text-ink-900">
+                {savedOnly
+                  ? 'No saved stays yet.'
+                  : totalApproved === 0
+                    ? 'More stays arriving soon.'
+                    : 'No stays match these filters.'}
               </h2>
-              <p className="max-w-md text-[13px] font-medium leading-relaxed text-ink-500">
-                {totalApproved === 0
-                  ? 'Try another neighbourhood or check back as more properties become available. Property owners and managers across Lagos Mainland and Island can apply to list now.'
-                  : 'Try adjusting your dates, location, or filters to see more available stays.'}
+              <p className="max-w-sm text-[13px] font-medium text-ink-500">
+                {savedOnly
+                  ? 'Tap the heart icon on any listing to save it here.'
+                  : totalApproved === 0
+                    ? 'Check back soon or list a property in Lagos.'
+                    : 'Adjust your dates, area, or filters.'}
               </p>
               <div className="mt-2 flex flex-wrap justify-center gap-2.5">
-                {totalApproved === 0 ? (
+                {totalApproved === 0 && !savedOnly ? (
                   <>
-                    <Link to="/partner/register" className="btn-jade !py-2.5 text-[12px]">
+                    <Link to="/partner/register" className="btn-jade !rounded-full !py-2.5 text-[12px]">
                       <Building2 size={14} /> List your property
                     </Link>
-                    <Link to="/lagos" className="btn-outline !py-2.5 text-[12px]">Lagos neighbourhood guide</Link>
+                    <Link to="/lagos" className="btn-outline !rounded-full !py-2.5 text-[12px]">
+                      Lagos neighbourhood guide
+                    </Link>
                   </>
                 ) : (
                   <>
-                    <button onClick={() => setParams({}, { replace: true })} className="btn-jade !py-2.5 text-[12px]">Clear filters</button>
-                    <Link to="/lagos" className="btn-outline !py-2.5 text-[12px]">Browse Lagos neighbourhoods</Link>
+                    <button
+                      type="button"
+                      onClick={() => setParams({}, { replace: true })}
+                      className="btn-jade !rounded-full !py-2.5 text-[12px]"
+                    >
+                      Clear filters
+                    </button>
+                    <Link to="/lagos" className="btn-outline !rounded-full !py-2.5 text-[12px]">
+                      Browse Lagos neighbourhoods
+                    </Link>
                   </>
                 )}
               </div>
             </div>
           ) : (
-            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
-              {results.map(p => <PropertyCard key={p.id} p={p} searchQuery={forwardQuery.toString()} />)}
+            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
+              {results.map(p => (
+                <PropertyCard key={p.id} p={p} searchQuery={forwardQuery.toString()} />
+              ))}
             </div>
           )}
         </div>
```

### `src/pages/Wayfinder.tsx` (Modified)

```diff
diff --git a/src/pages/Wayfinder.tsx b/src/pages/Wayfinder.tsx
index 1ab1d5d..03897e6 100644
--- a/src/pages/Wayfinder.tsx
+++ b/src/pages/Wayfinder.tsx
@@ -8,6 +8,7 @@ import {
 } from 'lucide-react';
 import { GuestLayout } from '../components/Navbar';
 import { ArrivalPhoto } from '../components/ArrivalPhoto';
+import { useHoratio } from '../components/HoratioDrawer';
 import { useHamlet } from '../lib/store';
 import { usePageMeta } from '../lib/brand';
 import { useToast } from '../lib/toast';
@@ -37,6 +38,7 @@ export default function Wayfinder() {
     recordWayfinderEvent,
   } = useHamlet();
   const { toast } = useToast();
+  const { openHoratio } = useHoratio();
 
   const [loadState, setLoadState] = useState<{
     targetId: string;
@@ -304,17 +306,26 @@ export default function Wayfinder() {
             <ArrowLeft size={15} className="shrink-0" />
             <span>My booking ({view.bookingReference})</span>
           </Link>
-          <button
-            type="button"
-            onClick={() => {
-              setHelpOpen(true);
-              handleHelpAction('open_trouble_drawer');
-            }}
-            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11.5px] font-extrabold text-amber-950 transition hover:bg-amber-100"
-          >
-            <HelpCircle size={14} className="shrink-0 text-amber-700" />
-            <span>Trouble finding stay?</span>
-          </button>
+          <div className="flex items-center gap-2">
+            <button
+              type="button"
+              onClick={() => openHoratio(`How do I arrive and check in for booking ${view.bookingReference}?`)}
+              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11.5px] font-bold text-ink-800 transition hover:border-ink-400"
+            >
+              <span>Ask Horatio</span>
+            </button>
+            <button
+              type="button"
+              onClick={() => {
+                setHelpOpen(true);
+                handleHelpAction('open_trouble_drawer');
+              }}
+              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11.5px] font-extrabold text-amber-950 transition hover:bg-amber-100"
+            >
+              <HelpCircle size={14} className="shrink-0 text-amber-700" />
+              <span>Trouble finding stay?</span>
+            </button>
+          </div>
         </div>
       </div>
```

### `src/pages/admin/AdminLayout.tsx` (Modified)

```diff
diff --git a/src/pages/admin/AdminLayout.tsx b/src/pages/admin/AdminLayout.tsx
index 48d22cb..b297585 100644
--- a/src/pages/admin/AdminLayout.tsx
+++ b/src/pages/admin/AdminLayout.tsx
@@ -28,7 +28,12 @@ export default function AdminLayout({ children }: { children: ReactNode }) {
 
   return (
     <WorkspaceGuard expected="admin">
-      <WorkspaceShell title="Admin Console" subtitle="HAMLET operations · full accountability" accent="border-red-400/40 bg-red-400/10 text-red-300" nav={nav}>
+      <WorkspaceShell
+        title="Admin Console"
+        subtitle="Elsinore · HAMLET operations"
+        accent="border-brass-500/40 bg-brass-500/15 text-brass-300"
+        nav={nav}
+      >
         {children}
       </WorkspaceShell>
     </WorkspaceGuard>
```

### `src/pages/admin/Applications.tsx` (Modified)

```diff
diff --git a/src/pages/admin/Applications.tsx b/src/pages/admin/Applications.tsx
index df3da86..8d5cfce 100644
--- a/src/pages/admin/Applications.tsx
+++ b/src/pages/admin/Applications.tsx
@@ -223,7 +223,7 @@ export default function AdminApplications() {
               <label className="mt-2.5 flex items-start gap-2.5 text-[11.5px] font-semibold text-ink-200">
                 <input
                   type="checkbox"
-                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#C9A227]"
+                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#C9A44A]"
                   checked={cascadeSuspend}
                   onChange={e => setCascadeSuspend(e.target.checked)}
                 />
```

### `src/pages/admin/Issues.tsx` (Modified)

```diff
diff --git a/src/pages/admin/Issues.tsx b/src/pages/admin/Issues.tsx
index 4fea75d..6fe2376 100644
--- a/src/pages/admin/Issues.tsx
+++ b/src/pages/admin/Issues.tsx
@@ -133,8 +133,8 @@ export default function AdminIssues() {
     <div className="p-4 sm:p-6 lg:p-8">
       <div className="flex flex-wrap items-end justify-between gap-4">
         <div>
-          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Issue resolution</p>
-          <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Issues & accountability</h1>
+          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">The Watch · Live Operations &amp; Safety</p>
+          <h1 className="mt-1.5 font-display text-2xl font-bold text-ink-50 sm:text-3xl">Issues &amp; accountability</h1>
           <p className="mt-1 max-w-xl text-[12px] font-medium text-ink-300">Report → assign → investigate → escalate → resolve → close. Every action, note and evidence artefact is recorded against the issue and audit-logged.</p>
         </div>
         <div className="flex flex-wrap items-center gap-2">
```

### `src/pages/admin/Overview.tsx` (Modified)

```diff
diff --git a/src/pages/admin/Overview.tsx b/src/pages/admin/Overview.tsx
index 1f46881..5b3b6ef 100644
--- a/src/pages/admin/Overview.tsx
+++ b/src/pages/admin/Overview.tsx
@@ -1,14 +1,16 @@
 import { Link } from 'react-router-dom';
 import { motion } from 'framer-motion';
 import {
-  Home, BadgeCheck, Receipt, LifeBuoy, TrendingUp, ArrowRight, ShieldAlert, Gauge, Target, MessageSquareQuote, Star, Compass,
+  Home, BadgeCheck, Receipt, LifeBuoy, TrendingUp, ArrowRight, ShieldAlert, Gauge, Target, MessageSquareQuote, Star, Compass, Sparkles,
 } from 'lucide-react';
+import { useHoratio } from '../../components/HoratioDrawer';
 import { useHamlet } from '../../lib/store';
 import { formatNaira, formatDateTime, daysUntilLagosDate } from '../../lib/pricing';
 import { computeWayfinderReadiness } from '../../lib/wayfinder';
 
 export default function AdminOverview() {
   const { state } = useHamlet();
+  const { openHoratio } = useHoratio();
   const pilotDaysRemaining = daysUntilLagosDate('2026-10-31');
 
   const approved = state.properties.filter(p => p.status === 'approved');
@@ -44,12 +46,18 @@ export default function AdminOverview() {
   return (
     <div className="p-4 sm:p-6 lg:p-8">
       {/* Pilot command header */}
-      <div className="rounded-2xl border border-brass-500/25 bg-gradient-to-br from-brass-500/10 via-ink-900 to-ink-900 p-5 sm:p-6">
+      <div className="rounded-3xl border border-brass-500/25 bg-gradient-to-br from-brass-500/10 via-ink-900 to-ink-900 p-5 sm:p-6">
         <div className="flex flex-wrap items-center justify-between gap-4">
           <div>
-            <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-brass-400"><Gauge size={13} className="shrink-0" /> Lagos launch · pilot scoreboard</p>
-            <h1 className="mt-1.5 font-display text-2xl font-black text-paper sm:text-3xl">Launch operations, live</h1>
-            <p className="mt-1 max-w-md text-[12px] font-medium text-ink-300">Success is measured by completed bookings, trustworthy supply, reconciled transactions, resolved issues and repeat demand — not registrations.</p>
+            <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-brass-400"><Gauge size={13} className="shrink-0" /> Elsinore · Lagos launch scoreboard</p>
+            <h1 className="mt-1.5 font-display text-2xl font-bold text-paper sm:text-3xl">Launch operations, live</h1>
+            <button
+              type="button"
+              onClick={() => openHoratio('Summarize open ops queues')}
+              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brass-500/35 bg-brass-500/12 px-3.5 py-1.5 text-[11px] font-bold text-brass-300 transition hover:bg-brass-500/20"
+            >
+              <Sparkles size={13} /> Ask Horatio
+            </button>
           </div>
           <div className="flex items-center gap-5">
             <div className="text-right">
@@ -61,8 +69,8 @@ export default function AdminOverview() {
             </div>
             <div className="h-14 w-14 shrink-0">
               <svg viewBox="0 0 56 56">
-                <circle cx="28" cy="28" r="24" stroke="#1C2F24" strokeWidth="7" fill="none" />
-                <circle cx="28" cy="28" r="24" stroke="#C9A227" strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 24}`} strokeDashoffset={`${2 * Math.PI * 24 * (1 - approved.length / 50)}`} transform="rotate(-90 28 28)" className="transition-all duration-700" />
+                <circle cx="28" cy="28" r="24" stroke="#1B3560" strokeWidth="7" fill="none" />
+                <circle cx="28" cy="28" r="24" stroke="#C9A44A" strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 24}`} strokeDashoffset={`${2 * Math.PI * 24 * (1 - approved.length / 50)}`} transform="rotate(-90 28 28)" className="transition-all duration-700" />
               </svg>
             </div>
           </div>
@@ -88,7 +96,7 @@ export default function AdminOverview() {
         {/* Attention queue */}
         <section className="rounded-2xl border border-ink-800 bg-ink-900 xl:col-span-3">
           <div className="flex items-center justify-between border-b border-ink-800 px-4 py-4 sm:px-5">
-            <h2 className="flex items-center gap-2 font-display text-base font-black text-ink-50"><ShieldAlert size={17} className="shrink-0 text-brass-400" /> Needs attention now</h2>
+            <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-50"><ShieldAlert size={17} className="shrink-0 text-brass-400" /> Needs attention now · The Watch</h2>
           </div>
           <div className="divide-y divide-ink-800">
             {inReview.map(p => (
```

### `src/pages/admin/Users.tsx` (Modified)

```diff
diff --git a/src/pages/admin/Users.tsx b/src/pages/admin/Users.tsx
index 8e1b23f..22d3067 100644
--- a/src/pages/admin/Users.tsx
+++ b/src/pages/admin/Users.tsx
@@ -319,7 +319,7 @@ export default function AdminUsers() {
                   </label>
                   {acc.role === 'partner' && govAccount.nextStatus === 'suspended' && (
                     <label className="mt-2.5 flex items-center gap-2 text-[11.5px] font-medium text-ink-300">
-                      <input type="checkbox" className="accent-[#C9A227]" checked={cascadeProperties} onChange={e => setCascadeProperties(e.target.checked)} />
+                      <input type="checkbox" className="accent-[#C9A44A]" checked={cascadeProperties} onChange={e => setCascadeProperties(e.target.checked)} />
                       Also suspend all currently approved properties owned by this partner
                     </label>
                   )}
```

### `src/pages/partner/NewProperty.tsx` (Modified)

```diff
diff --git a/src/pages/partner/NewProperty.tsx b/src/pages/partner/NewProperty.tsx
index 2e0964d..b3cc08e 100644
--- a/src/pages/partner/NewProperty.tsx
+++ b/src/pages/partner/NewProperty.tsx
@@ -104,6 +104,17 @@ export default function NewProperty() {
 
   const canSaveDraft = title.trim().length >= 8 && address.trim().length >= 10 && nightlyRate >= 20_000;
 
+  const normalizedAddr = address.trim().toLowerCase().replace(/\s+/g, ' ');
+  const normalizedArea = area.trim().toLowerCase().replace(/\s+/g, ' ');
+  const potentialAddressMatch =
+    normalizedAddr.length >= 10 &&
+    state.properties.some(
+      other =>
+        other.status !== 'rejected' &&
+        other.area.trim().toLowerCase().replace(/\s+/g, ' ') === normalizedArea &&
+        other.address.trim().toLowerCase().replace(/\s+/g, ' ') === normalizedAddr,
+    );
+
   const submit = async (saveAsDraft = false) => {
     if (saveAsDraft && !canSaveDraft) {
       toast('Enter a property title (min 8 chars), Lagos address (min 10 chars), and nightly rate (min ₦20,000) to save a draft.', 'error');
@@ -235,6 +246,14 @@ export default function NewProperty() {
               </label>
               <label className="sm:col-span-2"><span className="label-dark">Full address</span><input className="input-dark" placeholder="Street, landmark, area, Lagos" value={address} onChange={e => setAddress(e.target.value)} /></label>
             </div>
+            {potentialAddressMatch && (
+              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-200">
+                <CircleAlert size={16} className="mt-0.5 shrink-0 text-amber-400" />
+                <span>
+                  Another HAMLET listing already matches this Lagos area and street address. If this is a separate unit in the same building, specify the block/unit clearly — duplicate public listings for the same physical apartment are blocked during review.
+                </span>
+              </div>
+            )}
             <div className="rounded-xl border border-ink-800 bg-ink-950/60 p-4">
               <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brass-400">
                 <Compass size={12} /> Optional · HAMLET Wayfinder location basics
@@ -452,7 +471,7 @@ export default function NewProperty() {
                 { v: selfDeclaration, set: setSelfDeclaration, label: 'I declare the information is accurate and I consent to a HAMLET inspection and document review' },
               ].map(({ v, set, label }) => (
                 <label key={label} className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-800 bg-ink-850 p-3.5 transition hover:border-ink-600">
-                  <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[#C9A227]" checked={v} onChange={e => set(e.target.checked)} />
+                  <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[#C9A44A]" checked={v} onChange={e => set(e.target.checked)} />
                   <span className="text-[12px] font-medium leading-snug text-ink-100">{label}</span>
                 </label>
               ))}
```

### `src/pages/partner/Overview.tsx` (Modified)

```diff
diff --git a/src/pages/partner/Overview.tsx b/src/pages/partner/Overview.tsx
index e740174..dd0eef5 100644
--- a/src/pages/partner/Overview.tsx
+++ b/src/pages/partner/Overview.tsx
@@ -1,6 +1,7 @@
 import { Link } from 'react-router-dom';
-import { Home, CalendarDays, Banknote, PlusCircle, Clock3, ArrowRight, Inbox, CheckCircle2 } from 'lucide-react';
+import { Home, CalendarDays, Banknote, PlusCircle, Clock3, ArrowRight, Inbox, CheckCircle2, Sparkles } from 'lucide-react';
 import { useMemo } from 'react';
+import { useHoratio } from '../../components/HoratioDrawer';
 import { useHamlet } from '../../lib/store';
 import { PropertyStatusPill, BookingStatusPill } from '../../components/Badges';
 import { myPartnerProperties, propertyIdsOf } from '../../lib/partnerUtils';
@@ -8,6 +9,7 @@ import { formatNaira, formatDate, ownerProceeds } from '../../lib/pricing';
 
 export default function PartnerOverview() {
   const { state } = useHamlet();
+  const { openHoratio } = useHoratio();
   const userId = state.session!.userId;
   const myProps = useMemo(() => myPartnerProperties(state, userId), [state, userId]);
   const propIds = useMemo(() => new Set(propertyIdsOf(state, userId)), [state, userId]);
@@ -34,10 +36,21 @@ export default function PartnerOverview() {
       <div className="flex flex-wrap items-end justify-between gap-4">
         <div>
           <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Partner workspace</p>
-          <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Welcome, {state.session!.name.split(' ')[0]}</h1>
-          <p className="mt-1 text-[12px] font-medium text-ink-300">{state.session!.partnerRole} · {state.session!.company} · Role-based access — you see only your own profile, authorised properties and permitted booking data.</p>
+          <h1 className="mt-1.5 font-display text-2xl font-bold text-ink-50 sm:text-3xl">Welcome, {state.session!.name.split(' ')[0]}</h1>
+          <p className="mt-1 text-[12px] font-medium text-ink-300">{state.session!.partnerRole} · {state.session!.company}</p>
+        </div>
+        <div className="flex flex-wrap items-center gap-2.5">
+          <button
+            type="button"
+            onClick={() => openHoratio('Summarize my partner workspace')}
+            className="btn-ghost-dark !rounded-full !border !border-ink-700 !py-2.5 text-xs"
+          >
+            <Sparkles size={15} className="text-brass-400" /> Ask Horatio
+          </button>
+          <Link to="/partner/properties/new" className="btn-brass !rounded-full !py-2.5 text-xs">
+            <PlusCircle size={16} /> List a new property
+          </Link>
         </div>
-        <Link to="/partner/properties/new" className="btn-brass !py-3"><PlusCircle size={17} /> List a new property</Link>
       </div>
 
       {/* KPI cards */}
```

---

## 3. Earlier Platform Milestones (PR #1 – PR #16 Breakdown)

Full line-by-line diffs for PR #1 – PR #16 (Supabase schema migrations, RLS policies, Edge Functions, Paystack webhook & controlled ledger, Wayfinder arrival guidance, SEO & `llms.txt`, NGN/USD/GBP currency switcher, and Lagos Mainland/Island support) are included in **`hamlet-all-code-changes-pr1-to-pr21.patch`**.

### PR #1 — Add Docker-free PGlite booking lifecycle tests & fix dependency advisories (`d1b2dc1`, 2026-10-23)

```text
README.md                                 |  13 +-
 eslint.config.js                          |   6 +
 package.json                              |  10 +-
 src/lib/pricing.test.ts                   |  70 +++
 supabase/tests/booking_lifecycle.test.sql |   1 +
 supabase/tests/booking_lifecycle.test.ts  | 980 ++++++++++++++++++++++++++++++
 supabase/tests/helpers/testDb.ts          | 187 ++++++
 tsconfig.node.json                        |   2 +-
 vitest.config.ts                          |  13 +
 9 files changed, 1273 insertions(+), 9 deletions(-)
```

### PR #2 — Implement HAMLET MVP Spec v1.0: verified webhook payments, controlled ledger, duplicate guards & ops workflows (`5dc2538`, 2026-10-23)

```text
.env.example                                       |    4 +
 MVP_SPECIFICATION.md                               |  162 +++
 README.md                                          |   53 +-
 src/lib/store.tsx                                  |  372 +++++-
 src/pages/admin/Assignments.tsx                    |   43 +-
 src/pages/admin/Bookings.tsx                       |  204 ++-
 src/pages/admin/Issues.tsx                         |   56 +-
 src/pages/admin/Ledger.tsx                         |   98 +-
 src/pages/admin/Properties.tsx                     |   19 +
 src/pages/partner/Assignments.tsx                  |   18 +-
 supabase/functions/paystack-webhook/handler.ts     |  174 +++
 supabase/functions/paystack-webhook/index.ts       |   46 +
 ...261023100000_payments_ledger_and_operations.sql | 1403 ++++++++++++++++++++
 supabase/tests/helpers/testDb.ts                   |   20 +
 .../tests/payments_ledger_and_operations.test.ts   |  752 +++++++++++
 vite.config.ts                                     |    3 +
 16 files changed, 3300 insertions(+), 127 deletions(-)
```

### PR #3 — Complete HAMLET Release 1 governance, property corrections, private pilot feedback, date search & Paystack checkout init (`fbb621f`, 2026-10-23)

```text
README.md                                          |  53 +-
 src/lib/store.tsx                                  | 383 +++++++++-
 src/lib/types.ts                                   |   5 +
 src/pages/Account.tsx                              | 170 ++++-
 src/pages/PropertyDetail.tsx                       |  34 +-
 src/pages/Stays.tsx                                |  70 +-
 src/pages/admin/AdminLayout.tsx                    |  13 +-
 src/pages/admin/Applications.tsx                   | 155 +++-
 src/pages/admin/Ledger.tsx                         | 129 +++-
 src/pages/admin/Overview.tsx                       |  42 +-
 src/pages/partner/Bookings.tsx                     |  94 ++-
 src/pages/partner/NewProperty.tsx                  |   2 +-
 src/pages/partner/PartnerLayout.tsx                |  28 +-
 src/pages/partner/Profile.tsx                      |   2 +-
 src/pages/partner/Properties.tsx                   | 228 +++++-
 supabase/functions/paystack-initialize/handler.ts  | 263 +++++++
 supabase/functions/paystack-initialize/index.ts    |  90 +++
 ...feedback_partner_governance_and_corrections.sql | 781 +++++++++++++++++++++
 .../pilot_feedback_governance_and_checkout.test.ts | 654 +++++++++++++++++
 19 files changed, 3068 insertions(+), 128 deletions(-)
```

### PR #4 — Fix font loading, Naira glyph coverage, and dark-table typography (`b43d94d`, 2026-10-23)

```text
package.json                    |  3 +++
 src/index.css                   | 49 +++++++++++++++++++++++++++++++++++------
 src/main.tsx                    |  6 +++++
 src/pages/SignIn.tsx            |  2 +-
 src/pages/admin/Assignments.tsx |  2 +-
 src/pages/admin/Audit.tsx       |  2 +-
 src/pages/admin/Ledger.tsx      |  8 +++----
 src/pages/admin/Properties.tsx  |  2 +-
 src/pages/partner/Earnings.tsx  | 12 +++++-----
 9 files changed, 65 insertions(+), 21 deletions(-)
```

### PR #5 — Add guest sign-up flow on Sign In page and Navbar (`2bc7fed`, 2026-10-23)

```text
src/App.tsx                                        |   1 +
 src/components/Navbar.tsx                          |  10 +-
 src/lib/store.tsx                                  |  83 ++++--
 src/pages/PartnerRegister.tsx                      |   2 +-
 src/pages/SignIn.tsx                               | 280 +++++++++++++++++----
 .../20261023150000_guest_signup_profile_phone.sql  |  17 ++
 .../pilot_feedback_governance_and_checkout.test.ts |  26 ++
 7 files changed, 355 insertions(+), 64 deletions(-)
```

### PR #6 — Guest signup booking redirects & full-app icon, text, and scroll responsiveness (`43b522f`, 2026-10-23)

```text
src/App.tsx                       |   9 ++-
 src/components/Badges.tsx         |  10 +--
 src/components/Logo.tsx           |   6 +-
 src/components/Navbar.tsx         |  37 ++++++-----
 src/components/PropertyCard.tsx   |  22 +++----
 src/components/WorkspaceShell.tsx |  18 +++---
 src/index.css                     |  16 +++--
 src/lib/authRedirect.test.ts      |  51 +++++++++++++++
 src/lib/authRedirect.ts           |  76 ++++++++++++++++++++++
 src/lib/responsiveness.test.ts    |  81 +++++++++++++++++++++++
 src/lib/toast.tsx                 |   4 +-
 src/pages/Account.tsx             | 109 +++++++++++++++++--------------
 src/pages/Home.tsx                |  16 ++---
 src/pages/Legal.tsx               |   4 +-
 src/pages/PartnerRegister.tsx     |   6 +-
 src/pages/PropertyDetail.tsx      | 132 ++++++++++++++++++++++++--------------
 src/pages/SignIn.tsx              |  62 ++++++++++++++----
 src/pages/Stays.tsx               |  26 ++++----
 src/pages/admin/Applications.tsx  |  32 ++++-----
 src/pages/admin/Assignments.tsx   |   6 +-
 src/pages/admin/Audit.tsx         |  20 +++---
 src/pages/admin/Bookings.tsx      |  36 +++++------
 src/pages/admin/Issues.tsx        |  52 ++++++++-------
 src/pages/admin/Ledger.tsx        |  24 +++----
 src/pages/admin/Overview.tsx      |  56 ++++++++--------
 src/pages/admin/Properties.tsx    |  36 +++++------
 src/pages/partner/Assignments.tsx |   6 +-
 src/pages/partner/Bookings.tsx    |  34 +++++-----
 src/pages/partner/Earnings.tsx    |  10 +--
 src/pages/partner/NewProperty.tsx |  26 ++++----
 src/pages/partner/Overview.tsx    |  26 ++++----
 src/pages/partner/Profile.tsx     |  20 +++---
 src/pages/partner/Properties.tsx  |  14 ++--
 33 files changed, 700 insertions(+), 383 deletions(-)
```

### PR #7 — Booking notifications, Resend Edge Function & partner availability review workflow (`2032224`, 2026-10-23)

```text
.env.example                                       |   15 +-
 README.md                                          |   96 ++
 src/App.tsx                                        |    2 +
 src/lib/authRedirect.test.ts                       |   33 +-
 src/lib/authRedirect.ts                            |   64 +-
 src/lib/responsiveness.test.ts                     |    6 +
 src/lib/store.tsx                                  |  185 +++-
 src/lib/types.ts                                   |   40 +
 src/pages/Account.tsx                              |   83 +-
 src/pages/SignIn.tsx                               |   42 +-
 src/pages/admin/Bookings.tsx                       |  118 ++-
 src/pages/partner/BookingReview.tsx                |  666 +++++++++++++
 src/pages/partner/Bookings.tsx                     |   13 +-
 supabase/config.toml                               |   10 +
 .../functions/booking-notifications/handler.ts     |  516 ++++++++++
 supabase/functions/booking-notifications/index.ts  |   89 ++
 .../functions/booking-notifications/templates.ts   |  679 +++++++++++++
 ...000_booking_notifications_and_resend_outbox.sql |  543 ++++++++++
 ..._notifications_and_partner_confirmation.test.ts | 1033 ++++++++++++++++++++
 supabase/tests/helpers/testDb.ts                   |    2 +
 20 files changed, 4192 insertions(+), 43 deletions(-)
```

### PR #8 — fix(endpoints): audit and harden Edge Functions, RPC/RLS grants, and SPA routing (`0205cc7`, 2026-10-23)

```text
src/lib/authRedirect.test.ts                       |  46 ++
 src/lib/authRedirect.ts                            |  19 +
 src/lib/store.tsx                                  |  27 +-
 src/lib/supabase.ts                                |  44 ++
 src/main.tsx                                       |  12 +
 .../functions/booking-notifications/handler.ts     |   6 +-
 supabase/functions/booking-notifications/index.ts  |  13 +-
 supabase/functions/deno.json                       |   5 +
 supabase/functions/paystack-initialize/handler.ts  |  91 ++-
 supabase/functions/paystack-initialize/index.ts    |  68 ++-
 supabase/functions/paystack-webhook/handler.ts     |  53 +-
 supabase/functions/paystack-webhook/index.ts       |  11 +
 ...0261023200000_endpoint_hardening_and_parity.sql | 214 +++++++
 supabase/tests/all_endpoints_audit.test.ts         | 649 +++++++++++++++++++++
 tsconfig.node.json                                 |   7 +-
 vercel.json                                        |   8 +
 vite.config.ts                                     |   3 +
 17 files changed, 1215 insertions(+), 61 deletions(-)
```

### PR #9 — feat: MVP live readiness for clients, partners, and admin management (`e743022`, 2026-10-23)

```text
README.md                                          |  29 +-
 src/App.tsx                                        |   2 +
 src/components/Badges.tsx                          |  23 +-
 src/components/WorkspaceShell.tsx                  |   3 +-
 src/lib/csv.ts                                     |  31 +
 src/lib/pricing.ts                                 |  42 ++
 src/lib/store.tsx                                  | 550 +++++++++++++++--
 src/lib/types.ts                                   |   9 +
 src/pages/Account.tsx                              | 635 ++++++++++++++-----
 src/pages/Home.tsx                                 |  18 +-
 src/pages/PartnerRegister.tsx                      | 406 ++++++++++--
 src/pages/PropertyDetail.tsx                       |  33 +-
 src/pages/SignIn.tsx                               | 275 ++++++---
 src/pages/Stays.tsx                                |  47 +-
 src/pages/admin/AdminLayout.tsx                    |   3 +-
 src/pages/admin/Bookings.tsx                       |  80 ++-
 src/pages/admin/Issues.tsx                         | 215 ++++++-
 src/pages/admin/Ledger.tsx                         |  38 +-
 src/pages/admin/Overview.tsx                       |   7 +-
 src/pages/admin/Users.tsx                          | 350 +++++++++++
 src/pages/partner/Bookings.tsx                     | 109 +++-
 src/pages/partner/NewProperty.tsx                  |  96 ++-
 src/pages/partner/Profile.tsx                      | 102 ++-
 src/pages/partner/Properties.tsx                   | 116 +++-
 .../20261023220000_mvp_live_readiness.sql          | 684 +++++++++++++++++++++
 supabase/tests/helpers/testDb.ts                   |   1 +
 supabase/tests/mvp_live_readiness.test.ts          | 365 +++++++++++
 27 files changed, 3794 insertions(+), 475 deletions(-)
```

### PR #10 — feat: Lagos website copy, supporting pages & NGN/USD/GBP stay currency switcher (`0aa2650`, 2026-10-23)

```text
index.html                        |   4 +-
 src/App.tsx                       |  85 ++++---
 src/components/CurrencyToggle.tsx |  75 ++++++
 src/components/Navbar.tsx         |  75 +++---
 src/components/PropertyCard.tsx   | 107 +++++++--
 src/lib/brand.ts                  |  20 +-
 src/lib/currency.tsx              | 169 ++++++++++++++
 src/lib/currencyAndCopy.test.ts   | 102 +++++++++
 src/lib/seed.ts                   |   2 +-
 src/pages/About.tsx               | 130 +++++++++++
 src/pages/Account.tsx             |  37 ++-
 src/pages/Faqs.tsx                | 133 +++++++++++
 src/pages/Home.tsx                | 463 ++++++++++++++++++++++++++++----------
 src/pages/HowItWorks.tsx          | 104 +++++++++
 src/pages/Lagos.tsx               | 224 ++++++++++++++++++
 src/pages/Legal.tsx               |  14 +-
 src/pages/PartnerRegister.tsx     |  16 +-
 src/pages/PropertyDetail.tsx      | 134 ++++++++---
 src/pages/Safety.tsx              | 147 ++++++++++++
 src/pages/SignIn.tsx              |  11 +-
 src/pages/Stays.tsx               | 108 +++++++--
 src/pages/partner/NewProperty.tsx |   2 +-
 22 files changed, 1874 insertions(+), 288 deletions(-)
```

### PR #11 — feat: marketplace-first landing page & move Four Pillars section to About Us (`5e204ec`, 2026-10-23)

```text
src/lib/currencyAndCopy.test.ts |   7 +
 src/pages/About.tsx             | 225 ++++++++++-----
 src/pages/Home.tsx              | 609 +++++++++++++++++-----------------------
 3 files changed, 413 insertions(+), 428 deletions(-)
```

### PR #12 — feat(marketplace): add Lagos Mainland featuring Yaba, Shomolu, Surulere & environs (`4b61f4c`, 2026-10-23)

```text
index.html                      |   2 +-
 src/components/Navbar.tsx       |   3 +-
 src/lib/areas.ts                | 121 +++++++++++++++++++++
 src/lib/currencyAndCopy.test.ts |  50 +++++++++
 src/lib/seed.ts                 |  66 +++++++++++-
 src/pages/About.tsx             |   2 +-
 src/pages/Home.tsx              |  97 +++++++++++------
 src/pages/Lagos.tsx             | 227 ++++++++++++++++++++++++++--------------
 src/pages/Stays.tsx             |  67 ++++++++++--
 9 files changed, 505 insertions(+), 130 deletions(-)
```

### PR #13 — Implement property availability, partner referrals, 20% domestic pricing & 10% USD/GBP buffer (`aefaa1c`, 2026-10-24)

```text
src/App.tsx                                        |   24 +-
 src/components/Badges.tsx                          |    6 +-
 src/components/PropertyCard.tsx                    |   48 +-
 src/lib/availability.ts                            |  465 +++
 src/lib/consolidatedDomain.test.ts                 |  440 +++
 src/lib/currency.tsx                               |  244 +-
 src/lib/currencyAndCopy.test.ts                    |   12 +-
 src/lib/pricing.test.ts                            |   54 +-
 src/lib/pricing.ts                                 |  629 +++-
 src/lib/referrals.ts                               |  246 ++
 src/lib/seed.ts                                    |  369 ++-
 src/lib/store.tsx                                  | 1317 ++++++++-
 src/lib/types.ts                                   |  290 +-
 src/pages/Account.tsx                              |  123 +-
 src/pages/Faqs.tsx                                 |    2 +-
 src/pages/Home.tsx                                 |    2 +-
 src/pages/Lagos.tsx                                |    2 +-
 src/pages/Legal.tsx                                |   10 +-
 src/pages/PartnerRegister.tsx                      |   64 +-
 src/pages/PropertyDetail.tsx                       |  299 +-
 src/pages/Safety.tsx                               |    2 +-
 src/pages/SignIn.tsx                               |    2 +-
 src/pages/Stays.tsx                                |   34 +-
 src/pages/admin/AdminLayout.tsx                    |    3 +-
 src/pages/admin/Bookings.tsx                       |  123 +-
 src/pages/admin/Ledger.tsx                         |  144 +-
 src/pages/admin/Overview.tsx                       |    8 +-
 src/pages/admin/Properties.tsx                     |   51 +-
 src/pages/admin/Referrals.tsx                      |  291 ++
 src/pages/partner/BookingReview.tsx                |   81 +-
 src/pages/partner/Earnings.tsx                     |   78 +-
 src/pages/partner/NewProperty.tsx                  |  114 +-
 src/pages/partner/PartnerLayout.tsx                |    7 +-
 src/pages/partner/Properties.tsx                   |  223 +-
 src/pages/partner/Referrals.tsx                    |  271 ++
 supabase/functions/paystack-initialize/handler.ts  |   41 +-
 supabase/functions/paystack-initialize/index.ts    |   43 +-
 ...vailability_referrals_pricing_fx_settlement.sql | 3104 ++++++++++++++++++++
 supabase/tests/booking_lifecycle.test.ts           |    6 +-
 supabase/tests/consolidated_brief_e2e.test.ts      |  948 ++++++
 supabase/tests/helpers/testDb.ts                   |   18 +
 .../tests/payments_ledger_and_operations.test.ts   |   30 +-
 .../pilot_feedback_governance_and_checkout.test.ts |    6 +-
 43 files changed, 9795 insertions(+), 479 deletions(-)
```

### PR #14 — fix: harden RPC/edge endpoints, add draft listing workflow, and polish guest/partner UX (`8752b34`, 2026-10-24)

```text
src/App.tsx                                        | 139 ++--
 src/components/CurrencyToggle.tsx                  |  48 +-
 src/lib/store.tsx                                  | 215 +++++-
 src/pages/Account.tsx                              |  18 +-
 src/pages/PartnerRegister.tsx                      |  41 +-
 src/pages/PropertyDetail.tsx                       | 138 +++-
 src/pages/admin/Bookings.tsx                       |   8 +-
 src/pages/partner/Earnings.tsx                     |  43 +-
 src/pages/partner/NewProperty.tsx                  |  41 +-
 src/pages/partner/Overview.tsx                     |   8 +-
 src/pages/partner/Properties.tsx                   |  67 +-
 src/pages/partner/Referrals.tsx                    |   6 +-
 .../functions/booking-notifications/templates.ts   |  51 +-
 ...61024140000_endpoint_bugfixes_and_ux_parity.sql | 817 +++++++++++++++++++++
 supabase/tests/endpoints-and-ux-parity.test.ts     | 429 +++++++++++
 15 files changed, 1887 insertions(+), 182 deletions(-)
```

### PR #15 — Configure technical & structured SEO and spec-compliant llms.txt / llms-full.txt (`97b2c6b`, 2026-10-24)

```text
index.html                        |  97 ++++++++++++
 public/llms-full.txt              | 157 +++++++++++++++++++
 public/llms.txt                   |  36 +++++
 public/robots.txt                 |  38 +++++
 public/site.webmanifest           |  19 +++
 public/sitemap.xml                |  21 +++
 src/components/Navbar.tsx         |   2 +
 src/components/WorkspaceShell.tsx |  13 +-
 src/lib/brand.ts                  |  54 +++++--
 src/lib/seo.test.ts               | 221 ++++++++++++++++++++++++++
 src/lib/seo.ts                    | 319 ++++++++++++++++++++++++++++++++++++++
 src/pages/Faqs.tsx                |   4 +
 src/pages/Lagos.tsx               |   7 +
 src/pages/PropertyDetail.tsx      |  14 ++
 vercel.json                       |  26 +++-
 15 files changed, 1014 insertions(+), 14 deletions(-)
```

### PR #16 — feat(wayfinder): implement HAMLET Wayfinder verified arrival guidance, RLS & workflows (`963721a`, 2026-10-24)

```text
src/App.tsx                                        |    2 +
 src/components/ArrivalPhoto.tsx                    |   96 ++
 src/components/PropertyCard.tsx                    |   17 +-
 src/components/WayfinderEditorModal.tsx            | 1020 ++++++++++++
 src/lib/seed.ts                                    |  343 +++-
 src/lib/seo.ts                                     |    2 +
 src/lib/store.tsx                                  | 1129 ++++++++++++-
 src/lib/types.ts                                   |  297 ++++
 src/lib/wayfinder.test.ts                          |  394 +++++
 src/lib/wayfinder.ts                               |  588 +++++++
 src/pages/Account.tsx                              |  169 +-
 src/pages/PropertyDetail.tsx                       |   99 +-
 src/pages/Wayfinder.tsx                            | 1111 +++++++++++++
 src/pages/admin/Issues.tsx                         |   57 +-
 src/pages/admin/Overview.tsx                       |   83 +-
 src/pages/admin/Properties.tsx                     |  307 +++-
 src/pages/partner/NewProperty.tsx                  |   91 +-
 src/pages/partner/Properties.tsx                   |   39 +-
 ...024180000_hamlet_wayfinder_arrival_guidance.sql | 1658 ++++++++++++++++++++
 supabase/tests/helpers/testDb.ts                   |    6 +
 supabase/tests/wayfinder_rls_and_e2e.test.ts       |  594 +++++++
 21 files changed, 8065 insertions(+), 37 deletions(-)
```

---

## 4. Cumulative Repository Diff Stat (PR #1 – PR #21)

```text
.env.example                                       |   13 +
 MVP_SPECIFICATION.md                               |  162 +
 README.md                                          |  162 +-
 eslint.config.js                                   |    6 +
 index.html                                         |  101 +-
 package.json                                       |   13 +-
 public/favicon.svg                                 |   25 +-
 public/images/hero-sample-bedroom.jpg              |  Bin 0 -> 173721 bytes
 public/images/hero-sample-kitchen.jpg              |  Bin 0 -> 185607 bytes
 public/images/hero-sample-living.jpg               |  Bin 0 -> 209762 bytes
 public/images/hero-sample-lounge.jpg               |  Bin 0 -> 231920 bytes
 public/llms-full.txt                               |  157 +
 public/llms.txt                                    |   36 +
 public/robots.txt                                  |   38 +
 public/site.webmanifest                            |   19 +
 public/sitemap.xml                                 |   21 +
 src/App.tsx                                        |  173 +-
 src/components/ArrivalPhoto.tsx                    |   96 +
 src/components/Badges.tsx                          |   43 +-
 src/components/CurrencyToggle.tsx                  |  107 +
 src/components/HoratioDrawer.tsx                   |  507 +++
 src/components/Logo.tsx                            |   79 +-
 src/components/Navbar.tsx                          |  370 +-
 src/components/PropertyCard.tsx                    |  209 +-
 src/components/WayfinderEditorModal.tsx            | 1020 +++++
 src/components/WorkspaceShell.tsx                  |   54 +-
 src/index.css                                      |  162 +-
 src/lib/areas.ts                                   |  121 +
 src/lib/authRedirect.test.ts                       |  128 +
 src/lib/authRedirect.ts                            |  141 +
 src/lib/availability.ts                            |  465 +++
 src/lib/brand.ts                                   |   55 +-
 src/lib/brandIdentity.test.ts                      |   61 +
 src/lib/consolidatedDomain.test.ts                 |  440 +++
 src/lib/csv.ts                                     |   31 +
 src/lib/currency.tsx                               |  349 ++
 src/lib/currencyAndCopy.test.ts                    |  163 +
 src/lib/pricing.test.ts                            |  106 +
 src/lib/pricing.ts                                 |  661 +++-
 src/lib/redesignAdoption.test.ts                   |  106 +
 src/lib/referrals.ts                               |  246 ++
 src/lib/responsiveness.test.ts                     |   87 +
 src/lib/seed.ts                                    |  776 +++-
 src/lib/seo.test.ts                                |  221 ++
 src/lib/seo.ts                                     |  321 ++
 src/lib/store.tsx                                  | 4135 +++++++++++++++++++-
 src/lib/supabase.ts                                |   44 +
 src/lib/toast.tsx                                  |    4 +-
 src/lib/types.ts                                   |  637 ++-
 src/lib/wayfinder.test.ts                          |  394 ++
 src/lib/wayfinder.ts                               |  588 +++
 src/lib/wishlist.tsx                               |   77 +
 src/main.tsx                                       |   18 +
 src/pages/About.tsx                                |  142 +
 src/pages/Account.tsx                              | 1777 ++++++++-
 src/pages/Faqs.tsx                                 |  197 +
 src/pages/Home.tsx                                 |  840 ++--
 src/pages/HowItWorks.tsx                           |  167 +
 src/pages/Lagos.tsx                                |  322 ++
 src/pages/Legal.tsx                                |  167 +-
 src/pages/PartnerRegister.tsx                      |  716 +++-
 src/pages/PropertyDetail.tsx                       | 1171 +++++-
 src/pages/Safety.tsx                               |  181 +
 src/pages/SignIn.tsx                               |  588 ++-
 src/pages/Stays.tsx                                |  565 ++-
 src/pages/Wayfinder.tsx                            | 1122 ++++++
 src/pages/admin/AdminLayout.tsx                    |   24 +-
 src/pages/admin/Applications.tsx                   |  175 +-
 src/pages/admin/Assignments.tsx                    |   47 +-
 src/pages/admin/Audit.tsx                          |   22 +-
 src/pages/admin/Bookings.tsx                       |  535 ++-
 src/pages/admin/Issues.tsx                         |  354 +-
 src/pages/admin/Ledger.tsx                         |  375 +-
 src/pages/admin/Overview.tsx                       |  208 +-
 src/pages/admin/Properties.tsx                     |  411 +-
 src/pages/admin/Referrals.tsx                      |  291 ++
 src/pages/admin/Users.tsx                          |  350 ++
 src/pages/partner/Assignments.tsx                  |   24 +-
 src/pages/partner/BookingReview.tsx                |  739 ++++
 src/pages/partner/Bookings.tsx                     |  234 +-
 src/pages/partner/Earnings.tsx                     |  131 +-
 src/pages/partner/NewProperty.tsx                  |  373 +-
 src/pages/partner/Overview.tsx                     |   53 +-
 src/pages/partner/PartnerLayout.tsx                |   33 +-
 src/pages/partner/Profile.tsx                      |  124 +-
 src/pages/partner/Properties.tsx                   |  627 ++-
 src/pages/partner/Referrals.tsx                    |  271 ++
 supabase/config.toml                               |   10 +
 .../functions/booking-notifications/handler.ts     |  520 +++
 supabase/functions/booking-notifications/index.ts  |  100 +
 .../functions/booking-notifications/templates.ts   |  728 ++++
 supabase/functions/deno.json                       |    5 +
 supabase/functions/paystack-initialize/handler.ts  |  349 ++
 supabase/functions/paystack-initialize/index.ts    |  143 +
 supabase/functions/paystack-webhook/handler.ts     |  201 +
 supabase/functions/paystack-webhook/index.ts       |   57 +
 ...261023100000_payments_ledger_and_operations.sql | 1403 +++++++
 ...feedback_partner_governance_and_corrections.sql |  781 ++++
 .../20261023150000_guest_signup_profile_phone.sql  |   17 +
 ...000_booking_notifications_and_resend_outbox.sql |  543 +++
 ...0261023200000_endpoint_hardening_and_parity.sql |  214 +
 .../20261023220000_mvp_live_readiness.sql          |  684 ++++
 ...vailability_referrals_pricing_fx_settlement.sql | 3104 +++++++++++++++
 ...61024140000_endpoint_bugfixes_and_ux_parity.sql |  817 ++++
 ...024180000_hamlet_wayfinder_arrival_guidance.sql | 1658 ++++++++
 supabase/tests/all_endpoints_audit.test.ts         |  649 +++
 supabase/tests/booking_lifecycle.test.sql          |    1 +
 supabase/tests/booking_lifecycle.test.ts           |  980 +++++
 ..._notifications_and_partner_confirmation.test.ts | 1033 +++++
 supabase/tests/consolidated_brief_e2e.test.ts      |  948 +++++
 supabase/tests/endpoints-and-ux-parity.test.ts     |  429 ++
 supabase/tests/helpers/testDb.ts                   |  234 ++
 supabase/tests/mvp_live_readiness.test.ts          |  365 ++
 .../tests/payments_ledger_and_operations.test.ts   |  754 ++++
 .../pilot_feedback_governance_and_checkout.test.ts |  680 ++++
 supabase/tests/wayfinder_rls_and_e2e.test.ts       |  594 +++
 tsconfig.node.json                                 |    7 +-
 vercel.json                                        |   32 +
 vite.config.ts                                     |    6 +
 vitest.config.ts                                   |   13 +
 120 files changed, 43540 insertions(+), 1823 deletions(-)
```
