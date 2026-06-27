import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { formatVnd } from '../lib/format';
import { IconUser, IconWallet, IconQr, IconLogout } from '../components/icons';

export function AccountPage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const doLogout = () => {
    logout();
    nav('/login', { replace: true });
  };

  return (
    <div className="min-h-full px-4 py-4">
      <h1 className="mb-4 text-xl font-extrabold text-slate-900">Tài khoản</h1>

      {/* Profile card */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand-700">
            <IconUser width={30} />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800">{user?.name}</p>
            <p className="text-sm text-slate-400">@{user?.username}</p>
            <span className="mt-1 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
              Người gửi xe
            </span>
          </div>
        </div>
      </div>

      {/* Wallet */}
      <div className="card mt-3 flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
            <IconWallet width={20} />
          </span>
          <div>
            <p className="text-sm text-slate-400">Số dư ParkSmart Wallet</p>
            <p className="font-bold text-slate-800">{formatVnd(user?.wallet_balance ?? 0)}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 space-y-2">
        <button onClick={() => nav('/checkin')} className="card flex w-full items-center gap-3 p-4 text-left transition hover:shadow-md">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600">
            <IconQr width={20} />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-slate-800">Mã QR Check-in</p>
            <p className="text-sm text-slate-400">Đưa cho nhân viên khi gửi xe</p>
          </div>
          <span className="text-slate-300">›</span>
        </button>

        <button onClick={doLogout} className="card flex w-full items-center gap-3 p-4 text-left text-red-600 transition hover:shadow-md">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-50">
            <IconLogout width={20} />
          </span>
          <span className="font-semibold">Đăng xuất</span>
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-slate-300">ParkSmart · MVP</p>
    </div>
  );
}
