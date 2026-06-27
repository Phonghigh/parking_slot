import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api, Lot } from '../api';
import { IconLogout, IconQr, IconUser, IconWallet, IconHistory } from '../components/icons';

export function OwnerLayout() {
  const { user, logout } = useAuth();
  const [lot, setLot] = useState<Lot | null>(null);

  useEffect(() => {
    api.ownerLot().then((r) => setLot(r.lot)).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen bg-brand-50/40">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-brand-700 px-4 py-6 text-white">
        <div className="px-2">
          <h1 className="text-xl font-extrabold">Parking Partners</h1>
          <p className="text-sm text-brand-100/80">Cổng quản lý đối tác</p>
        </div>

        <nav className="mt-8 space-y-1">
          <Item to="/owner" icon={<IconWallet width={20} />} label="Tổng quan" end />
          <Item to="/owner/operations" icon={<IconQr width={20} />} label="Vận hành (Check-in)" />
          <Item to="/owner/profile" icon={<IconUser width={20} />} label="Hồ sơ bãi" />
        </nav>

        <div className="mt-auto space-y-3">
          {lot && (
            <div className="rounded-xl bg-white/10 px-3 py-2 text-sm">
              <p className="text-brand-100/70 text-xs">Bãi đang quản lý</p>
              <p className="font-semibold leading-tight">{lot.name}</p>
            </div>
          )}
          <div className="flex items-center gap-3 px-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
              <IconUser width={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-brand-100/70">@{user?.username}</p>
            </div>
          </div>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-brand-100 hover:bg-white/10">
            <IconLogout width={18} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-8 py-3 backdrop-blur">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-700">
              <span className="h-2 w-2 rounded-full bg-brand-500" /> Hệ thống hoạt động
            </span>
          </div>
          <div className="flex items-center gap-3">
            <NavLink to="/owner/operations" className="btn-primary px-4 py-2 text-sm">
              <IconQr width={16} /> Check-in nhanh
            </NavLink>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 font-bold text-white">
              {user?.name?.[0] ?? 'O'}
            </span>
          </div>
        </header>
        <main className="px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Item({ to, icon, label, end }: { to: string; icon: React.ReactNode; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition ${
          isActive ? 'bg-white text-brand-700' : 'text-brand-50 hover:bg-white/10'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
