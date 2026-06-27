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
    <div className="min-h-full animate-fade-in px-4 pt-6 pb-32">
      <h1 className="mb-5 text-xl font-extrabold text-slate-800">Tài khoản</h1>

      {/* Profile card */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="glass-icon-green grid h-16 w-16 shrink-0 place-items-center rounded-full text-brand-600">
            <IconUser width={30} />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800">{user?.name}</p>
            <p className="text-sm text-slate-500">@{user?.username}</p>
            <span className="glass-green mt-1.5 inline-block rounded-full px-3 py-0.5 text-xs font-semibold text-brand-700">
              Người gửi xe
            </span>
          </div>
        </div>
      </div>

      {/* Wallet */}
      <div className="card mt-3 flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <span className="glass-icon-blue grid h-11 w-11 place-items-center rounded-2xl text-white">
            <IconWallet width={20} />
          </span>
          <div>
            <p className="text-xs text-slate-500">Số dư ParkSmart Wallet</p>
            <p className="font-bold text-slate-800">{formatVnd(user?.wallet_balance ?? 0)}</p>
          </div>
        </div>
      </div>

      {/* Action list */}
      <div className="mt-3 space-y-2">
        <button
          onClick={() => nav('/checkin')}
          className="card flex w-full items-center gap-3 p-4 text-left transition-all duration-150 active:scale-[0.98]"
        >
          <span className="glass-icon grid h-11 w-11 place-items-center rounded-2xl text-slate-600">
            <IconQr width={20} />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-slate-800">Mã QR Check-in</p>
            <p className="text-sm text-slate-500">Đưa cho nhân viên khi gửi xe</p>
          </div>
          <span className="text-slate-400">›</span>
        </button>

        <button
          onClick={doLogout}
          className="card flex w-full items-center gap-3 p-4 text-left text-red-600 transition-all duration-150 active:scale-[0.98]"
        >
          <span className="glass-icon-red grid h-11 w-11 place-items-center rounded-2xl">
            <IconLogout width={20} />
          </span>
          <span className="font-semibold">Đăng xuất</span>
        </button>
      </div>

      <p className="mt-8 text-center text-xs text-slate-400/70">ParkSmart · MVP</p>
    </div>
  );
}
