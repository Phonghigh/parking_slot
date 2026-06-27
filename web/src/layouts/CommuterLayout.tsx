import { NavLink, Outlet } from 'react-router-dom';
import { IconMap, IconTicket, IconHistory, IconUser } from '../components/icons';

export function CommuterLayout() {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col bg-slate-100">
      <main className="no-scrollbar flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex">
          <Tab to="/" icon={<IconMap />} label="Bản đồ" end />
          <Tab to="/ticket" icon={<IconTicket />} label="Vé của tôi" />
          <Tab to="/history" icon={<IconHistory />} label="Lịch sử" />
          <Tab to="/account" icon={<IconUser />} label="Tài khoản" />
        </div>
      </nav>
    </div>
  );
}

function Tab({
  to,
  icon,
  label,
  end,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition ${
          isActive ? 'text-brand-600' : 'text-slate-400'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
