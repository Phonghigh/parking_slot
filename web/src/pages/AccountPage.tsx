import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api, Vehicle } from '../api';
import { formatVnd } from '../lib/format';
import { IconUser, IconWallet, IconQr, IconLogout, IconCar, IconCheck } from '../components/icons';

export function AccountPage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [addingPlate, setAddingPlate] = useState('');
  const [addingLabel, setAddingLabel] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    api.listVehicles().then((r) => setVehicles(r.vehicles)).catch(() => {});
  }, []);

  const submitAdd = async () => {
    const plate = addingPlate.trim().toUpperCase();
    if (!plate) { setAddError('Nhập biển số xe'); return; }
    setAddBusy(true);
    setAddError('');
    try {
      const r = await api.addVehicle(plate, addingLabel.trim() || undefined);
      setVehicles((prev) => [...prev, r.vehicle]);
      setAddingPlate('');
      setAddingLabel('');
      setShowAddForm(false);
    } catch (e: any) {
      setAddError(e.message);
    } finally {
      setAddBusy(false);
    }
  };

  const removeVehicle = async (id: number) => {
    try {
      await api.deleteVehicle(id);
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    } catch {}
  };

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
            <p className="text-xs text-slate-500">Số dư GoPark Wallet</p>
            <p className="font-bold text-slate-800">{formatVnd(user?.wallet_balance ?? 0)}</p>
          </div>
        </div>
      </div>

      {/* ── Vehicles ────────────────────────────────────────────── */}
      <div className="card mt-3 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconCar width={16} className="text-slate-500" />
            <span className="font-semibold text-slate-800">Xe của tôi</span>
            {vehicles.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                {vehicles.length}
              </span>
            )}
          </div>
          <button
            onClick={() => { setShowAddForm((v) => !v); setAddError(''); }}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
              showAddForm ? 'bg-slate-100 text-slate-600' : 'bg-blue-500 text-white'
            }`}
          >
            {showAddForm ? 'Hủy' : '+ Thêm xe'}
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="mb-3 space-y-2 rounded-2xl bg-slate-50 p-3">
            <input
              className="input font-mono uppercase tracking-widest"
              placeholder="Biển số xe *  (VD: 51F-123.45)"
              value={addingPlate}
              autoFocus
              onChange={(e) => setAddingPlate(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && submitAdd()}
            />
            <input
              className="input"
              placeholder="Tên gợi nhớ  (VD: Xe máy hàng ngày)"
              value={addingLabel}
              onChange={(e) => setAddingLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitAdd()}
            />
            {addError && (
              <p className="text-xs text-red-500">{addError}</p>
            )}
            <button
              onClick={submitAdd}
              disabled={addBusy}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-500 py-2.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
            >
              <IconCheck width={14} />
              {addBusy ? 'Đang lưu…' : 'Lưu xe'}
            </button>
          </div>
        )}

        {/* Vehicle list */}
        {vehicles.length === 0 && !showAddForm ? (
          <p className="py-3 text-center text-sm text-slate-400">
            Chưa có xe nào. Thêm xe để đặt chỗ nhanh hơn.
          </p>
        ) : (
          <div className="space-y-2">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3.5 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100">
                    <IconCar width={16} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-bold tracking-wide text-slate-800">{v.plate}</p>
                    {v.label && (
                      <p className="max-w-[140px] truncate text-xs text-slate-400">{v.label}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeVehicle(v.id)}
                  className="grid h-8 w-8 place-items-center rounded-full text-slate-300 transition hover:bg-red-50 hover:text-red-400 active:scale-90"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
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

      {/* <p className="mt-8 text-center text-xs text-slate-400/70">GoPark · MVP</p> */}
    </div>
  );
}
