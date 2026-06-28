import { useEffect, useState } from 'react';
import { api, Booking } from '../api';
import { QrDisplay } from './QrDisplay';
import { formatClock, formatDuration } from '../lib/format';
import { PlateDisplay } from './PlateDisplay';
import { IconPin, IconClock } from './icons';

export function BookingCard({
  booking,
  onCancelled,
}: {
  booking: Booking;
  onCancelled: (id: number) => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const msLeft = booking.expires_at - now;
  const expired = msLeft <= 0;

  const cancel = async () => {
    setCancelling(true);
    setError('');
    try {
      await api.cancelBooking(booking.id);
      onCancelled(booking.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <IconClock width={12} /> Đặt chỗ trước
          </span>
          <h2 className="mt-2.5 font-bold text-slate-800">{booking.lot.name}</h2>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
            <IconPin width={13} className="shrink-0 text-blue-400" />
            {booking.lot.address}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Biển số xe</p>
          <PlateDisplay plate={booking.plate} className="mt-1 text-base" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-white/40 px-5 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Giờ dự kiến đến</p>
          <p className="mt-0.5 font-semibold text-slate-700">{formatClock(booking.scheduled_at)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Thời gian giữ chỗ còn</p>
          <p className={`mt-0.5 font-mono font-bold ${expired ? 'text-red-500' : msLeft < 5 * 60_000 ? 'text-amber-500' : 'text-blue-600'}`}>
            {expired ? 'Đã hết hạn' : formatDuration(msLeft)}
          </p>
        </div>
      </div>

      {!expired && (
        <div className="space-y-3 px-5 pb-5 pt-2">
          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <p className="mb-2 text-xs text-slate-400">Xuất trình mã này khi đến cổng</p>
            <QrDisplay value={`GOPARK-BOOKING:${booking.booking_token}`} />
            {booking.short_code && (
              <div className="mt-3">
                <p className="text-xs text-slate-400">Không quét được? Đọc mã này cho nhân viên</p>
                <p className="mt-1 font-mono text-2xl font-extrabold tracking-[0.3em] text-blue-700">
                  {booking.short_code}
                </p>
              </div>
            )}
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button
            onClick={cancel}
            disabled={cancelling}
            className="w-full rounded-2xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 transition active:scale-95 disabled:opacity-50"
          >
            {cancelling ? 'Đang huỷ…' : 'Huỷ đặt chỗ'}
          </button>
        </div>
      )}
    </div>
  );
}
