import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { HamletProvider, useHamlet, captureUrlAttributionParams } from './lib/store';
import { CurrencyProvider } from './lib/currency';
import { ToastProvider } from './lib/toast';
import { buildAuthPath } from './lib/authRedirect';
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
import PartnerLayout from './pages/partner/PartnerLayout';
import PartnerOverview from './pages/partner/Overview';
import PartnerProperties from './pages/partner/Properties';
import NewProperty from './pages/partner/NewProperty';
import PartnerBookings from './pages/partner/Bookings';
import PartnerBookingReview from './pages/partner/BookingReview';
import PartnerEarnings from './pages/partner/Earnings';
import PartnerReferrals from './pages/partner/Referrals';
import PartnerAssignments from './pages/partner/Assignments';
import PartnerProfile from './pages/partner/Profile';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/Overview';
import AdminProperties from './pages/admin/Properties';
import AdminBookings from './pages/admin/Bookings';
import AdminLedger from './pages/admin/Ledger';
import AdminReferrals from './pages/admin/Referrals';
import AdminIssues from './pages/admin/Issues';
import AdminApplications from './pages/admin/Applications';
import AdminAssignments from './pages/admin/Assignments';
import AdminUsers from './pages/admin/Users';
import AdminAudit from './pages/admin/Audit';

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
          </HashRouter>
        </ToastProvider>
      </StoreBackedCurrencyProvider>
    </HamletProvider>
  );
}
