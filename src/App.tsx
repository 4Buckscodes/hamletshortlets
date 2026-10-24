import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { HamletProvider, useHamlet, captureUrlAttributionParams } from './lib/store';
import { CurrencyProvider } from './lib/currency';
import { ToastProvider } from './lib/toast';
import { buildAuthPath } from './lib/authRedirect';
import { HamletWordmark } from './components/Logo';
import Home from './pages/Home';
import Lagos from './pages/Lagos';
import About from './pages/About';
import HowItWorks from './pages/HowItWorks';
import Safety from './pages/Safety';
import Faqs from './pages/Faqs';
import Stays from './pages/Stays';
import PropertyDetail from './pages/PropertyDetail';
import Account from './pages/Account';
import SignIn from './pages/SignIn';
import PartnerRegister from './pages/PartnerRegister';
import Legal from './pages/Legal';

const Wayfinder = lazy(() => import('./pages/Wayfinder'));
const PartnerLayout = lazy(() => import('./pages/partner/PartnerLayout'));
const PartnerOverview = lazy(() => import('./pages/partner/Overview'));
const PartnerProperties = lazy(() => import('./pages/partner/Properties'));
const NewProperty = lazy(() => import('./pages/partner/NewProperty'));
const PartnerBookings = lazy(() => import('./pages/partner/Bookings'));
const PartnerBookingReview = lazy(() => import('./pages/partner/BookingReview'));
const PartnerEarnings = lazy(() => import('./pages/partner/Earnings'));
const PartnerReferrals = lazy(() => import('./pages/partner/Referrals'));
const PartnerAssignments = lazy(() => import('./pages/partner/Assignments'));
const PartnerProfile = lazy(() => import('./pages/partner/Profile'));

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminOverview = lazy(() => import('./pages/admin/Overview'));
const AdminProperties = lazy(() => import('./pages/admin/Properties'));
const AdminBookings = lazy(() => import('./pages/admin/Bookings'));
const AdminLedger = lazy(() => import('./pages/admin/Ledger'));
const AdminReferrals = lazy(() => import('./pages/admin/Referrals'));
const AdminIssues = lazy(() => import('./pages/admin/Issues'));
const AdminApplications = lazy(() => import('./pages/admin/Applications'));
const AdminAssignments = lazy(() => import('./pages/admin/Assignments'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminAudit = lazy(() => import('./pages/admin/Audit'));

function WorkspaceFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4 text-center">
      <div>
        <div className="flex justify-center">
          <HamletWordmark light />
        </div>
        <p role="status" className="mt-1.5 text-xs font-semibold text-ink-300">
          Loading workspace…
        </p>
      </div>
    </div>
  );
}

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    captureUrlAttributionParams();
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
}

function SignupRedirect() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  return <Navigate to={buildAuthPath({ signup: true, redirect: params.get('redirect') })} replace />;
}

function StoreBackedCurrencyProvider({ children }: { children: ReactNode }) {
  const { state } = useHamlet();
  return <CurrencyProvider exchangeRates={state.exchangeRates}>{children}</CurrencyProvider>;
}

export default function App() {
  return (
    <HamletProvider>
      <StoreBackedCurrencyProvider>
        <ToastProvider>
          <HashRouter>
            <ScrollToTop />
            <Suspense fallback={<WorkspaceFallback />}>
              <Routes>
                {/* Guest marketplace */}
                <Route path="/" element={<Home />} />
                <Route path="/lagos" element={<Lagos />} />
                <Route path="/stays" element={<Stays />} />
                <Route path="/stays/:id" element={<PropertyDetail />} />
                <Route path="/about" element={<About />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/safety" element={<Safety />} />
                <Route path="/faqs" element={<Faqs />} />
                <Route path="/account" element={<Account />} />
                <Route path="/wayfinder/:bookingId" element={<Wayfinder />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignupRedirect />} />
                <Route path="/partner/register" element={<PartnerRegister />} />
                <Route path="/legal/:page" element={<Legal />} />

                {/* Partner workspace */}
                <Route path="/partner" element={<PartnerLayout><PartnerOverview /></PartnerLayout>} />
                <Route path="/partner/properties" element={<PartnerLayout><PartnerProperties /></PartnerLayout>} />
                <Route path="/partner/properties/new" element={<PartnerLayout><NewProperty /></PartnerLayout>} />
                <Route path="/partner/bookings" element={<PartnerLayout><PartnerBookings /></PartnerLayout>} />
                <Route path="/partner/bookings/:bookingId" element={<PartnerLayout><PartnerBookingReview /></PartnerLayout>} />
                <Route path="/partner/earnings" element={<PartnerLayout><PartnerEarnings /></PartnerLayout>} />
                <Route path="/partner/referrals" element={<PartnerLayout><PartnerReferrals /></PartnerLayout>} />
                <Route path="/partner/assignments" element={<PartnerLayout><PartnerAssignments /></PartnerLayout>} />
                <Route path="/partner/profile" element={<PartnerLayout><PartnerProfile /></PartnerLayout>} />

                {/* Admin console */}
                <Route path="/admin" element={<AdminLayout><AdminOverview /></AdminLayout>} />
                <Route path="/admin/properties" element={<AdminLayout><AdminProperties /></AdminLayout>} />
                <Route path="/admin/bookings" element={<AdminLayout><AdminBookings /></AdminLayout>} />
                <Route path="/admin/ledger" element={<AdminLayout><AdminLedger /></AdminLayout>} />
                <Route path="/admin/referrals" element={<AdminLayout><AdminReferrals /></AdminLayout>} />
                <Route path="/admin/issues" element={<AdminLayout><AdminIssues /></AdminLayout>} />
                <Route path="/admin/applications" element={<AdminLayout><AdminApplications /></AdminLayout>} />
                <Route path="/admin/assignments" element={<AdminLayout><AdminAssignments /></AdminLayout>} />
                <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
                <Route path="/admin/audit" element={<AdminLayout><AdminAudit /></AdminLayout>} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </HashRouter>
        </ToastProvider>
      </StoreBackedCurrencyProvider>
    </HamletProvider>
  );
}
