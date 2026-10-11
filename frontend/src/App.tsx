import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { PortProvider } from './context/PortContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { MarketplaceProvider } from './context/MarketplaceContext';
import { NotificationProvider } from './context/NotificationContext';
import { TutorialProvider } from './context/TutorialContext';
import { ProtectedRoute, RequireRole } from './components/layout/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import RoleSelectPage from './pages/RoleSelectPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DriverHomePage from './pages/DriverHomePage';
import AvailableJobsPage from './pages/AvailableJobsPage';
import MyDeliveriesPage from './pages/MyDeliveriesPage';
import ProfilePage from './pages/ProfilePage';
import FleetManagerPage from './pages/FleetManagerPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import ConsumerSignupPage from './pages/consumer/ConsumerSignupPage';
import ConsumerOrdersPage from './pages/consumer/ConsumerOrdersPage';
import ConsumerBookPage from './pages/consumer/ConsumerBookPage';
import ConsumerTrackPage from './pages/consumer/ConsumerTrackPage';
import ConsumerProfilePage from './pages/consumer/ConsumerProfilePage';
import { PrivacyPolicyPage, TermsPage } from './pages/LegalPages';
import { TutorialOverlay } from './components/tutorial/TutorialOverlay';

export default function App() {
  return (
    <ThemeProvider>
      <PortProvider>
        <AuthProvider>
          <ToastProvider>
            <MarketplaceProvider>
              {/* NotificationProvider subscribes to the marketplace socket, so it
                  must sit inside MarketplaceProvider. TutorialProvider has to be
                  an ancestor of both TutorialOverlay and AppShell. */}
              <NotificationProvider>
                <TutorialProvider>
                  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <Routes>
                      {/* ── Public ─────────────────────────────────────────────── */}
                      <Route path="/" element={<RoleSelectPage />} />
                      <Route path="/login/:role" element={<LoginPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/signup" element={<SignupPage />} />
                      <Route path="/signup/consumer" element={<ConsumerSignupPage />} />
                      <Route path="/privacy" element={<PrivacyPolicyPage />} />
                      <Route path="/terms" element={<TermsPage />} />

                      {/* ── Ops console ────────────────────────────────────────── */}
                      <Route element={<ProtectedRoute />}>
                        <Route element={<AppShell />}>
                          {/* driver */}
                          <Route path="/home" element={<RequireRole allowed={['driver']}><DriverHomePage /></RequireRole>} />
                          <Route path="/jobs" element={<RequireRole allowed={['driver']}><AvailableJobsPage /></RequireRole>} />
                          <Route path="/deliveries" element={<RequireRole allowed={['driver']}><MyDeliveriesPage /></RequireRole>} />
                          <Route path="/profile" element={<RequireRole allowed={['driver']}><ProfilePage /></RequireRole>} />
                          {/* fleet manager */}
                          <Route path="/fleet-manage" element={<RequireRole allowed={['fleet_manager']}><FleetManagerPage /></RequireRole>} />
                          {/* port admin */}
                          <Route path="/admin/users" element={<RequireRole allowed={['port_admin']}><AdminUsersPage /></RequireRole>} />
                          {/* customer */}
                          <Route path="/consumer/orders" element={<RequireRole allowed={['consumer']}><ConsumerOrdersPage /></RequireRole>} />
                          <Route path="/consumer/orders/:token" element={<RequireRole allowed={['consumer']}><ConsumerTrackPage /></RequireRole>} />
                          <Route path="/consumer/book" element={<RequireRole allowed={['consumer']}><ConsumerBookPage /></RequireRole>} />
                          <Route path="/consumer/profile" element={<RequireRole allowed={['consumer']}><ConsumerProfilePage /></RequireRole>} />
                          {/* shared */}
                          <Route path="/analytics" element={<RequireRole allowed={['port_admin', 'fleet_manager']}><AnalyticsPage /></RequireRole>} />
                          <Route path="/settings" element={<RequireRole allowed={['port_admin', 'fleet_manager', 'driver', 'consumer']}><SettingsPage /></RequireRole>} />
                        </Route>
                      </Route>

                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </BrowserRouter>
                  {/* Outside Routes so the spotlight survives navigation */}
                  <TutorialOverlay />
                </TutorialProvider>
              </NotificationProvider>
            </MarketplaceProvider>
          </ToastProvider>
        </AuthProvider>
      </PortProvider>
    </ThemeProvider>
  );
}
