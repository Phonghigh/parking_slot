import { useEffect, useRef, useState } from 'react';
import { api, Booking, Session } from '../api';
import { formatVnd, formatDateTime } from '../lib/format';
import { IconCalendar, IconHistory, IconStar } from '../components/icons';
import { PlateDisplay } from '../components/PlateDisplay';

const PM_LABEL: Record<string, string> = { momo: 'Momo', wallet: 'GoPark Wallet', cash: 'Tiền mặt' };

const BOOKING_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  checked_in: { label: 'Đã check-in', cls: 'bg-brand-50 text-brand-700' },
  cancelled: { label: 'Đã huỷ', cls: 'bg-slate-100 text-slate-500' },
  expired: { label: 'Hết hạn', cls: 'bg-red-50 text-red-500' },
};

type Tab = 'sessions' | 'bookings';

const TABS_DEF = [
  { key: 'sessions' as Tab, icon: <IconHistory width={14} />, label: 'Phiên gửi xe' },
  { key: 'bookings' as Tab, icon: <IconCalendar width={14} />, label: 'Đặt chỗ' },
];

type BlobPhase = 'idle' | 'stretch' | 'land';

export function HistoryPage() {
  const [tab, setTab] = useState<Tab>('sessions');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Blob animation (same pattern as bottom nav)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const prevIdxRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [blob, setBlob] = useState({ x: 0, w: 0, phase: 'idle' as BlobPhase });
  const [blobReady, setBlobReady] = useState(false);

  const activeIdx = TABS_DEF.findIndex((t) => t.key === tab);

  const snapBlob = (idx: number, animate: boolean) => {
    const destEl = tabRefs.current[idx];
    if (!destEl) return;
    const { offsetLeft: dL, offsetWidth: dW } = destEl;
    if (!animate) { setBlob({ x: dL, w: dW, phase: 'idle' }); setBlobReady(true); return; }
    const srcEl = tabRefs.current[prevIdxRef.current];
    if (!srcEl) { setBlob({ x: dL, w: dW, phase: 'land' }); return; }
    const { offsetLeft: sL, offsetWidth: sW } = srcEl;
    const spanL = Math.min(sL, dL);
    const spanR = Math.max(sL + sW, dL + dW);
    setBlob({ x: spanL, w: spanR - spanL, phase: 'stretch' });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setBlob({ x: dL, w: dW, phase: 'land' }), 150);
  };

  useEffect(() => {
    snapBlob(activeIdx, blobReady);
    prevIdxRef.current = activeIdx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  useEffect(() => {
    if (blobReady) return;
    const frame = requestAnimationFrame(() => snapBlob(activeIdx, false));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoading(true);
    if (tab === 'sessions') {
      api.history().then((r) => setSessions(r.sessions)).finally(() => setLoading(false));
    } else {
      api.bookingHistory().then((r) => setBookings(r.bookings)).finally(() => setLoading(false));
    }
  }, [tab]);

  return (
    <div className="min-h-full animate-fade-in px-4 pt-6 pb-32">
      <h1 className="mb-4 text-xl font-extrabold text-slate-800">Lịch sử</h1>

      {/* Liquid blob tab switcher */}
      <div className="mb-5 rounded-2xl bg-slate-100 p-1">
        <div className="relative flex">
          {blobReady && (
            <div
              className={`blob-tab${blob.phase === 'land' ? ' landing' : ''}`}
              style={{ left: blob.x, width: blob.w }}
            />
          )}
          {TABS_DEF.map((t, i) => (
            <button
              key={t.key}
              ref={(el) => { tabRefs.current[i] = el; }}
              onClick={() => setTab(t.key)}
              className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-colors duration-200 ${
                tab === t.key ? 'text-white' : 'text-slate-500'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
      ) : tab === 'sessions' ? (
        sessions.length === 0 ? (
          <EmptyState icon={<IconHistory width={32} />} text="Chưa có lịch sử gửi xe" />
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-slate-800">{s.lot.name}</h3>
                    <p className="text-xs text-slate-500">{s.slot_label}</p>
                  </div>
                  <PlateDisplay plate={s.plate} className="ml-2 text-sm" />
                </div>
                <div className="mt-3 flex items-end justify-between border-t border-white/40 pt-3">
                  <div className="text-xs text-slate-500">
                    <p>Vào: {formatDateTime(s.checkin_at)}</p>
                    <p>Ra: {s.checkout_at ? formatDateTime(s.checkout_at) : '-'}</p>
                    {s.payment_method && (
                      <span className="glass-white mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                        {PM_LABEL[s.payment_method]}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-brand-700">{formatVnd(s.fee)}</p>
                    <span className="flex items-center justify-end gap-1 text-xs text-amber-500">
                      <IconStar width={12} /> Hoàn tất
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : bookings.length === 0 ? (
        <EmptyState icon={<IconCalendar width={32} />} text="Chưa có lịch sử đặt chỗ" />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const st = BOOKING_STATUS_LABEL[b.status] ?? { label: b.status, cls: 'bg-slate-100 text-slate-500' };
            return (
              <div key={b.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-slate-800">{b.lot.name}</h3>
                    <p className="text-xs text-slate-500">{b.lot.address}</p>
                  </div>
                  <PlateDisplay plate={b.plate} className="ml-2 text-sm" />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/40 pt-3">
                  <p className="text-xs text-slate-500">
                    Đặt lúc: {formatDateTime(b.created_at)}<br />
                    Giờ hẹn: {formatDateTime(b.scheduled_at)}
                  </p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="glass-icon grid h-16 w-16 place-items-center rounded-full text-slate-400">
        {icon}
      </div>
      <p className="mt-3 text-slate-500">{text}</p>
    </div>
  );
}
