import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { QrDisplay } from '../components/QrDisplay';
import { IconBack } from '../components/icons';

export function CheckinQrPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const value = `PARKSMART-CHECKIN:${user?.id}`;

  return (
    <div className="min-h-full bg-slate-100 px-4 py-4">
      <button onClick={() => nav(-1)} className="mb-3 grid h-9 w-9 place-items-center rounded-full bg-white shadow-sm">
        <IconBack />
      </button>

      <div className="card mx-auto max-w-sm p-6 text-center">
        <h1 className="text-xl font-extrabold text-slate-900">Mã QR Check-in</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
          Vui lòng đưa mã này cho nhân viên để check-in. Hệ thống sẽ tự động liên kết biển số xe của bạn.
        </p>

        <div className="mt-6">
          <QrDisplay value={value} refreshSeconds={30} />
        </div>

        <div className="mt-5 rounded-xl bg-brand-50 px-4 py-3 text-left text-sm text-brand-700">
          <p className="font-semibold">Mã định danh: #{user?.id}</p>
          <p className="mt-0.5 text-brand-600/80">{user?.name}</p>
        </div>
      </div>
    </div>
  );
}
