import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { PortProvider } from './context/PortContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import { TutorialProvider } from './context/TutorialContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SlotBookingPage from './pages/SlotBookingPage';
import FleetTrackerPage from './pages/FleetTrackerPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import { TutorialOverlay } from './components/tutorial/TutorialOverlay';

export default function App() {
  return (
    <ThemeProvider>
      <PortProvider>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <TutorialProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected — wrapped in AppShell */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppShell />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/slots"     element={<SlotBookingPage />} />
                    <Route path="/fleet"     element={<FleetTrackerPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/settings"  element={<SettingsPage />} />
                    <Route path="/"          element={<Navigate to="/dashboard" replace />} />
                  </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
            <TutorialOverlay />
          </TutorialProvider>
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
      </PortProvider>
    </ThemeProvider>
  );
}

