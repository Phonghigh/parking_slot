import { useEffect, useState } from 'react';
import { api, Session } from '../api';
import { formatVnd, formatDateTime } from '../lib/format';
import { IconHistory, IconStar } from '../components/icons';

const PM_LABEL: Record<string, string> = { momo: 'Momo', wallet: 'ParkSmart Wallet', cash: 'Tiền mặt' };

export function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.history().then((r) => setSessions(r.sessions)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-full animate-fade-in px-4 py-6">
      <h1 className="mb-5 text-xl font-extrabold text-slate-800">Lịch sử gửi xe</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="glass-icon grid h-16 w-16 place-items-center rounded-full text-slate-400">
            <IconHistory width={32} />
          </div>
          <p className="mt-3 text-slate-500">Chưa có lịch sử gửi xe</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold text-slate-800">{s.lot.name}</h3>
                  <p className="text-xs text-slate-500">{s.slot_label}</p>
                </div>
                <span className="plate ml-2 text-sm">{s.plate}</span>
              </div>

              <div className="mt-3 flex items-end justify-between border-t border-white/40 pt-3">
                <div className="text-xs text-slate-500">
                  <p>Vào: {formatDateTime(s.checkin_at)}</p>
                  <p>Ra: {s.checkout_at ? formatDateTime(s.checkout_at) : '—'}</p>
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
      )}
    </div>
  );
}
