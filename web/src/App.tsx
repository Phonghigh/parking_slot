import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { CommuterLayout } from './layouts/CommuterLayout';
import { CommuterPlain } from './layouts/CommuterPlain';
import { OwnerLayout } from './layouts/OwnerLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { MapPage } from './pages/MapPage';
import { LotDetail } from './pages/LotDetail';
import { CheckinQrPage } from './pages/CheckinQrPage';
import { TicketPage } from './pages/TicketPage';
import { HistoryPage } from './pages/HistoryPage';
import { AccountPage } from './pages/AccountPage';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { OwnerOperations } from './pages/OwnerOperations';
import { OwnerProfile } from './pages/OwnerProfile';
import { SearchPage } from './pages/SearchPage';
import { BookingPage } from './pages/BookingPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Commuter (PWA mobile) - các tab chính có thanh điều hướng dưới */}
      <Route
        element={
          <ProtectedRoute role="commuter">
            <CommuterLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<MapPage />} />
        <Route path="/ticket" element={<TicketPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Route>

      {/* Commuter - trang push full-screen (không có tab bar) */}
      <Route
        element={
          <ProtectedRoute role="commuter">
            <CommuterPlain />
          </ProtectedRoute>
        }
      >
        <Route path="/lot/:id" element={<LotDetail />} />
        <Route path="/booking/:lotId" element={<BookingPage />} />
        <Route path="/checkin" element={<CheckinQrPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Route>

      {/* Owner (web desktop) */}
      <Route
        element={
          <ProtectedRoute role="owner">
            <OwnerLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/owner" element={<OwnerDashboard />} />
        <Route path="/owner/operations" element={<OwnerOperations />} />
        <Route path="/owner/profile" element={<OwnerProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
