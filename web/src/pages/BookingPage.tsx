import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, Lot, Vehicle } from '../api';
import { priceLabel } from '../lib/format';
import { IconBack, IconCalendar, IconCar, IconCheck, IconClock, IconPin } from '../components/icons';

function toLocalDatetimeValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingPage() {
  const { lotId } = useParams();
  const nav = useNavigate();
  const [lot, setLot] = useState<Lot | null>(null);

  const nowMs = Date.now();
  const defaultArrival = nowMs + 30 * 60_000;
  const maxArrival = nowMs + 24 * 60 * 60_000;

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualPlate, setManualPlate] = useState('');
  const [scheduledAt, setScheduledAt] = useState(toLocalDatetimeValue(defaultArrival));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (lotId) api.getLot(Number(lotId)).then((r) => setLot(r.lot));

    api.listVehicles().then((r) => {
      setVehicles(r.vehicles);
      if (r.vehicles.length === 0) setManualMode(true);
      else setSelectedVehicleId(r.vehicles[0].id);
    }).catch(() => setManualMode(true));
  }, [lotId]);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;
  const activePlate = manualMode
    ? manualPlate.trim().toUpperCase()
    : (selectedVehicle?.plate ?? '');

  const submit = async () => {
    if (!activePlate) {
      setError('Vui lòng chọn hoặc nhập biển số xe');
      return;
    }
    const scheduledMs = new Date(scheduledAt).getTime();
    if (isNaN(scheduledMs) || scheduledMs <= Date.now()) {
      setError('Thời gian đến phải ở trong tương lai');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await api.createBooking(Number(lotId), activePlate, scheduledMs);
      nav('/ticket');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!lot) {
    return (
      <div className="grid h-full place-items-center text-slate-400">
        <p className="text-sm">Đang tải…</p>
      </div>
    );
  }

  return (
    <div className="min-h-full animate-fade-in pb-10">
      {/* Header */}
      <div className="glass-header sticky top-0 z-10 flex items-center justify-between px-3 py-3">
        <button
          onClick={() => nav(-1)}
          className="glass-icon grid h-9 w-9 place-items-center rounded-full transition-all duration-300 active:scale-95"
        >
          <IconBack />
        </button>
        <span className="font-bold text-slate-800">Đặt chỗ trước</span>
        <div className="w-9" />
      </div>

      <div className="space-y-4 px-4 pt-4">
        {/* Lot summary */}
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            {lot.image_url && (
              <img src={lot.image_url} alt={lot.name} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <h2 className="font-extrabold leading-tight text-slate-800">{lot.name}</h2>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                <IconPin width={11} className="shrink-0 text-blue-400" />
                <span className="truncate">{lot.address}</span>
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-bold text-brand-700">
              {priceLabel(lot)}
            </span>
          </div>
          <div className="flex items-center gap-2.5 border-t border-slate-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <IconClock width={14} className="shrink-0 text-amber-500" />
            <span>Chỗ được giữ <b>15 phút</b> sau giờ hẹn. Quá hạn sẽ tự động huỷ.</span>
          </div>
        </div>

        {/* Vehicle selector */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconCar width={16} className="text-slate-500" />
              <span className="text-sm font-bold text-slate-700">Xe của bạn</span>
            </div>
            <button
              onClick={() => nav('/account')}
              className="text-xs font-medium text-blue-500 transition active:scale-95"
            >
              Quản lý xe →
            </button>
          </div>

          {vehicles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {vehicles.map((v) => {
                const active = !manualMode && selectedVehicleId === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => { setSelectedVehicleId(v.id); setManualMode(false); }}
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-bold font-mono transition-all duration-150 active:scale-95 ${
                      active
                        ? 'border-blue-500 bg-blue-500 text-white shadow-md shadow-blue-200'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {active && <IconCheck width={13} />}
                    {v.plate}
                    {v.label && (
                      <span className={`font-sans text-xs font-normal ${active ? 'text-blue-100' : 'text-slate-400'}`}>
                        {v.label}
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                onClick={() => { setManualMode(true); setSelectedVehicleId(null); }}
                className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all duration-150 active:scale-95 ${
                  manualMode
                    ? 'border-slate-800 bg-slate-800 text-white'
                    : 'border-dashed border-slate-300 bg-transparent text-slate-500'
                }`}
              >
                + Xe khác
              </button>
            </div>
          )}

          {manualMode && (
            <div className="mt-1">
              <input
                className="input font-mono uppercase tracking-widest"
                placeholder="VD: 51F-123.45"
                value={manualPlate}
                autoFocus
                onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
              />
              {vehicles.length > 0 && (
                <button
                  onClick={() => { setManualMode(false); setSelectedVehicleId(vehicles[0].id); }}
                  className="mt-2 text-xs font-medium text-blue-500 transition active:scale-95"
                >
                  ← Chọn xe đã lưu
                </button>
              )}
            </div>
          )}

          {vehicles.length === 0 && !manualMode && (
            <p className="text-sm text-slate-400">
              Chưa có xe nào.{' '}
              <button onClick={() => nav('/account')} className="font-medium text-blue-500">
                Thêm xe trong Tài khoản →
              </button>
            </p>
          )}
        </div>

        {/* Time picker */}
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <IconCalendar width={16} className="text-slate-500" />
            <span className="text-sm font-bold text-slate-700">Giờ dự kiến đến</span>
          </div>
          <input
            type="datetime-local"
            className="input"
            value={scheduledAt}
            min={toLocalDatetimeValue(Date.now() + 60_000)}
            max={toLocalDatetimeValue(maxArrival)}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-slate-400">Tối đa đặt trước 24 giờ</p>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        <button onClick={submit} disabled={busy} className="btn-primary w-full">
          <IconCheck width={18} />
          {busy ? 'Đang đặt chỗ…' : 'Xác nhận đặt chỗ'}
        </button>

        <div className="rounded-2xl bg-slate-50 px-5 py-4">
          <p className="mb-2 font-semibold text-slate-700">Lưu ý khi đặt chỗ</p>
          <ul className="space-y-1.5 pl-4 text-sm text-slate-500 list-disc">
            <li>1 xe chỉ đặt được 1 chỗ tại cùng một bãi.</li>
            <li>Nhân viên quét QR hoặc nhập mã ngắn khi bạn đến.</li>
            <li>Đến đúng giờ - chỗ giữ 15 phút sau giờ hẹn rồi tự huỷ.</li>
            <li>Có thể huỷ bất kỳ lúc nào trước khi hết hạn.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
