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
    <div className="min-h-full px-4 py-4">
      <h1 className="mb-4 text-xl font-extrabold text-slate-900">Lịch sử gửi xe</h1>

      {loading ? (
        <p className="py-10 text-center text-slate-400">Đang tải…</p>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
          <IconHistory width={40} />
          <p className="mt-3">Chưa có lịch sử gửi xe</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{s.lot.name}</h3>
                  <p className="text-xs text-slate-400">{s.slot_label}</p>
                </div>
                <span className="plate text-sm">{s.plate}</span>
              </div>
              <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-3">
                <div className="text-xs text-slate-400">
                  <p>Vào: {formatDateTime(s.checkin_at)}</p>
                  <p>Ra: {s.checkout_at ? formatDateTime(s.checkout_at) : '—'}</p>
                  {s.payment_method && (
                    <span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                      {PM_LABEL[s.payment_method]}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold text-brand-700">{formatVnd(s.fee)}</p>
                  <span className="flex items-center justify-end gap-1 text-xs text-amber-400">
                    <IconStar width={12} /> Đã hoàn tất
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
