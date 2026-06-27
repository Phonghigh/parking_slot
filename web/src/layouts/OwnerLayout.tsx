import { Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { IconLogout } from '../components/icons';

export function OwnerLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-full bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 font-bold text-white">
              P
            </span>
            <div>
              <p className="font-bold text-brand-700">ParkSmart</p>
              <p className="text-xs text-slate-400">Cổng vận hành bãi xe</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{user?.name}</span>
            <button onClick={logout} className="btn-ghost text-sm">
              <IconLogout width={18} /> Đăng xuất
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
