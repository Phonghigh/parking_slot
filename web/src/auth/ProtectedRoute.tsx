import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Role } from '../api';

export function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">Đang tải…</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    // Sai role → đưa về trang chủ đúng vai trò
    return <Navigate to={user.role === 'owner' ? '/owner' : '/'} replace />;
  }
  return <>{children}</>;
}
