import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { HamletProvider } from './lib/store';
import { ToastProvider } from './lib/toast';
import Home from './pages/Home';
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
import PartnerEarnings from './pages/partner/Earnings';
import PartnerAssignments from './pages/partner/Assignments';
import PartnerProfile from './pages/partner/Profile';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/Overview';
import AdminProperties from './pages/admin/Properties';
import AdminBookings from './pages/admin/Bookings';
import AdminLedger from './pages/admin/Ledger';
import AdminIssues from './pages/admin/Issues';
import AdminApplications from './pages/admin/Applications';
import AdminAssignments from './pages/admin/Assignments';
import AdminAudit from './pages/admin/Audit';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <HamletProvider>
      <ToastProvider>
        <HashRouter>
          <ScrollToTop />
          <Routes>
            {/* Guest marketplace */}
            <Route path="/" element={<Home />} />
            <Route path="/stays" element={<Stays />} />
            <Route path="/stays/:id" element={<PropertyDetail />} />
            <Route path="/account" element={<Account />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<Navigate to="/signin?mode=signup" replace />} />
            <Route path="/partner/register" element={<PartnerRegister />} />
            <Route path="/legal/:page" element={<Legal />} />

            {/* Partner workspace */}
            <Route path="/partner" element={<PartnerLayout><PartnerOverview /></PartnerLayout>} />
            <Route path="/partner/properties" element={<PartnerLayout><PartnerProperties /></PartnerLayout>} />
            <Route path="/partner/properties/new" element={<PartnerLayout><NewProperty /></PartnerLayout>} />
            <Route path="/partner/bookings" element={<PartnerLayout><PartnerBookings /></PartnerLayout>} />
            <Route path="/partner/earnings" element={<PartnerLayout><PartnerEarnings /></PartnerLayout>} />
            <Route path="/partner/assignments" element={<PartnerLayout><PartnerAssignments /></PartnerLayout>} />
            <Route path="/partner/profile" element={<PartnerLayout><PartnerProfile /></PartnerLayout>} />

            {/* Admin console */}
            <Route path="/admin" element={<AdminLayout><AdminOverview /></AdminLayout>} />
            <Route path="/admin/properties" element={<AdminLayout><AdminProperties /></AdminLayout>} />
            <Route path="/admin/bookings" element={<AdminLayout><AdminBookings /></AdminLayout>} />
            <Route path="/admin/ledger" element={<AdminLayout><AdminLedger /></AdminLayout>} />
            <Route path="/admin/issues" element={<AdminLayout><AdminIssues /></AdminLayout>} />
            <Route path="/admin/applications" element={<AdminLayout><AdminApplications /></AdminLayout>} />
            <Route path="/admin/assignments" element={<AdminLayout><AdminAssignments /></AdminLayout>} />
            <Route path="/admin/audit" element={<AdminLayout><AdminAudit /></AdminLayout>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </HamletProvider>
  );
}
