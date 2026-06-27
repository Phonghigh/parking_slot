import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api, Lot } from '../api';
import { IconLogout, IconQr, IconUser, IconWallet, IconHistory } from '../components/icons';

const NAV = [
  { to: '/owner', icon: IconWallet, label: 'Tổng quan', end: true },
  { to: '/owner/operations', icon: IconQr, label: 'Vận hành' },
  { to: '/owner/profile', icon: IconUser, label: 'Hồ sơ bãi' },
];

export function OwnerLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [lot, setLot] = useState<Lot | null>(null);

  useEffect(() => {
    api.ownerLot().then((r) => setLot(r.lot)).catch(() => {});
  }, []);

  return (
    <div
      className="relative flex min-h-screen"
      style={{
        background:
          'radial-gradient(60% 50% at 12% 8%, rgba(0,177,79,0.12), transparent 60%),' +
          'radial-gradient(55% 45% at 88% 28%, rgba(0,122,255,0.10), transparent 60%),' +
          'radial-gradient(50% 45% at 60% 100%, rgba(0,212,106,0.10), transparent 60%), #F5F5F7',
      }}
    >
      {/* Sidebar */}
      <aside className="owner-aside sticky top-0 z-10 flex h-screen w-[260px] shrink-0 flex-col px-4 py-6 text-white">
        <div className="flex items-center gap-3 px-2">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-xl font-black backdrop-blur">
            G
          </span>
          <div>
            <h1 className="text-lg font-extrabold leading-tight">GoPark</h1>
            <p className="text-xs font-medium text-emerald-200/80">Partner Portal</p>
          </div>
        </div>

        <nav className="mt-9 space-y-1.5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 ${
                  isActive ? 'owner-navitem-active' : 'text-emerald-50/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <n.icon width={19} />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          {lot && (
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3.5 backdrop-blur">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-emerald-200/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Bãi đang quản lý
              </p>
              <p className="mt-1 text-sm font-bold leading-snug">{lot.name}</p>
              <p className="mt-0.5 truncate text-xs text-emerald-100/60">{lot.address}</p>
            </div>
          )}
          <div className="flex items-center gap-3 rounded-2xl px-1 py-1">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 font-bold shadow-lg">
              {user?.name?.[0] ?? 'O'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-xs text-emerald-100/60">@{user?.username}</p>
            </div>
            <button
              onClick={() => { logout(); nav('/login', { replace: true }); }}
              title="Đăng xuất"
              className="grid h-9 w-9 place-items-center rounded-xl text-emerald-100/70 transition hover:bg-white/10 hover:text-white"
            >
              <IconLogout width={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="relative z-[1] flex min-h-screen flex-1 flex-col">
        <header className="glass-header sticky top-0 z-10 flex items-center justify-between px-8 py-3.5">
          <span className="glass-green inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold text-brand-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
            </span>
            Hệ thống hoạt động
          </span>
          <div className="flex items-center gap-3">
            <button onClick={() => nav('/owner/operations')} className="btn-green px-4 py-2 text-sm">
              <IconQr width={16} /> Check-in nhanh
            </button>
            <button onClick={() => nav('/owner/profile')} className="glass-icon grid h-10 w-10 place-items-center rounded-full text-slate-600 transition active:scale-95">
              <IconUser width={18} />
            </button>
          </div>
        </header>
        <main className="flex-1 px-8 py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
