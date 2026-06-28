import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, Lot } from '../api';
import { priceLabel } from '../lib/format';
import { IconBack, IconCalendar, IconPin } from '../components/icons';

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
  const defaultArrival = nowMs + 30 * 60_000; // default: 30 min from now
  const maxArrival = nowMs + 24 * 60 * 60_000;

  const [plate, setPlate] = useState('');
  const [scheduledAt, setScheduledAt] = useState(toLocalDatetimeValue(defaultArrival));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (lotId) api.getLot(Number(lotId)).then((r) => setLot(r.lot));
  }, [lotId]);

  const submit = async () => {
    if (!plate.trim()) {
      setError('Vui lòng nhập biển số xe');
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
      await api.createBooking(Number(lotId), plate.trim(), scheduledMs);
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
        <span className="font-bold text-brand-700">Đặt chỗ trước</span>
        <div className="w-9" />
      </div>

      <div className="px-5 pt-5 space-y-5">
        {/* Lot summary */}
        <div className="glass-surface rounded-3xl p-4">
          <div className="flex items-start gap-3">
            {lot.image_url && (
              <img src={lot.image_url} alt={lot.name} className="h-16 w-16 rounded-2xl object-cover shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <h2 className="font-extrabold text-slate-800">{lot.name}</h2>
              <p className="mt-1 flex items-start gap-1 text-sm text-slate-500">
                <IconPin width={13} className="mt-0.5 shrink-0 text-blue-400" />
                {lot.address}
              </p>
              <span className="mt-2 inline-block rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
                {priceLabel(lot)}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
            <span className="shrink-0">ℹ️</span>
            Chỗ được giữ trong <b>15 phút</b> sau giờ hẹn. Quá hạn sẽ tự động huỷ.
          </div>
        </div>

        {/* Form */}
        <div className="card p-5 space-y-4">
          <div>
            <label className="label">Biển số xe *</label>
            <input
              className="input font-mono uppercase tracking-wide"
              placeholder="VD: 51F-123.45"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className="label">Giờ dự kiến đến *</label>
            <input
              type="datetime-local"
              className="input"
              value={scheduledAt}
              min={toLocalDatetimeValue(Date.now() + 60_000)}
              max={toLocalDatetimeValue(maxArrival)}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">Tối đa đặt trước 24 giờ</p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button onClick={submit} disabled={busy} className="btn-primary w-full">
            <IconCalendar width={18} />
            {busy ? 'Đang đặt chỗ…' : 'Xác nhận đặt chỗ'}
          </button>
        </div>

        {/* Info */}
        <div className="glass-surface rounded-3xl px-5 py-4 space-y-2 text-sm text-slate-500">
          <p className="font-semibold text-slate-700">Lưu ý khi đặt chỗ</p>
          <ul className="space-y-1.5 list-disc pl-4">
            <li>1 xe chỉ đặt được 1 chỗ tại cùng một bãi.</li>
            <li>Nhân viên sẽ quét QR hoặc nhập mã ngắn khi bạn đến.</li>
            <li>Chỗ giữ 15 phút sau giờ hẹn — đến đúng giờ để tránh huỷ tự động.</li>
            <li>Bạn có thể huỷ đặt chỗ bất kỳ lúc nào trước khi hết hạn.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
