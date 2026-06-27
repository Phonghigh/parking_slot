import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Session } from '../api';
import { useAuth } from '../auth/AuthContext';
import { QrDisplay } from '../components/QrDisplay';
import { PaymentSelector } from '../components/PaymentSelector';
import { formatVnd, formatClock, formatDuration } from '../lib/format';
import { IconBell, IconCheck, IconTicket } from '../components/icons';

const PM_LABEL: Record<string, string> = { momo: 'Momo', wallet: 'ParkSmart Wallet', cash: 'tiền mặt' };

export function TicketPage() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [actives, setActives] = useState<Session[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [completed, setCompleted] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const seenRef = useRef<Set<number>>(new Set());

  // poll danh sách phiên active (1 người có thể gửi nhiều xe)
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await api.activeSessions();
        if (stop) return;
        const list = r.sessions;
        const ids = new Set(list.map((s) => s.id));

        // phiên vừa biến mất khỏi active → kiểm tra đã checkout chưa để hiện màn thành công
        for (const id of seenRef.current) {
          if (!ids.has(id)) {
            try {
              const detail = await api.getSession(id);
              if (detail.session.status === 'completed') {
                setCompleted(detail.session);
                refresh();
              }
            } catch {
              /* ignore */
            }
          }
        }
        seenRef.current = ids;
        setActives(list);
        setSelectedId((cur) => (cur != null && ids.has(cur) ? cur : list[0]?.id ?? null));
      } finally {
        if (!stop) setLoading(false);
      }
    };
    tick();
    const t = setInterval(tick, 2500);
    return () => {
      stop = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchSession = (s: Session) =>
    setActives((list) => list.map((x) => (x.id === s.id ? s : x)));

  if (loading) return <div className="grid h-full place-items-center text-slate-400">Đang tải…</div>;

  if (completed)
    return (
      <SuccessView
        session={completed}
        remaining={actives.length}
        onHome={() => nav('/')}
        onHistory={() => nav('/history')}
        onBack={() => setCompleted(null)}
      />
    );

  if (actives.length === 0) return <EmptyTicket onFind={() => nav('/')} />;

  const selected = actives.find((s) => s.id === selectedId) ?? actives[0];

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-brand-600" />
          <span className="font-bold text-brand-700">ParkSmart</span>
        </div>
        <IconBell width={20} className="text-slate-400" />
      </div>
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Xe đang gửi</h1>
        <p className="text-sm text-slate-400">
          {actives.length > 1 ? `Bạn đang gửi ${actives.length} xe` : `Đang đỗ tại ${selected.lot.name}`}
        </p>
      </div>

      {/* Bộ chọn xe khi gửi nhiều xe */}
      {actives.length > 1 && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {actives.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border-2 px-3 py-2 transition ${
                s.id === selected.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'
              }`}
            >
              <span className="plate text-sm">{s.plate}</span>
              <span className="max-w-[7rem] truncate text-xs text-slate-400">{s.lot.name}</span>
            </button>
          ))}
        </div>
      )}

      <ActiveTicket session={selected} walletBalance={user?.wallet_balance ?? 0} onPay={patchSession} />
    </div>
  );
}

function EmptyTicket({ onFind }: { onFind: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-slate-200 text-slate-400">
        <IconTicket width={36} />
      </div>
      <h2 className="mt-4 text-lg font-bold text-slate-700">Chưa có phiên gửi xe</h2>
      <p className="mt-1 text-sm text-slate-400">Tìm một bãi đỗ và bấm “Gửi xe ngay” để bắt đầu.</p>
      <button onClick={onFind} className="btn-primary mt-5">Tìm bãi đỗ</button>
    </div>
  );
}

function ActiveTicket({
  session,
  walletBalance,
  onPay,
}: {
  session: Session;
  walletBalance: number;
  onPay: (s: Session) => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const setPayment = async (m: 'momo' | 'wallet' | 'cash') => {
    const r = await api.setPayment(session.id, m);
    onPay(r.session);
  };

  return (
    <div className="space-y-4">
      {/* Ticket card */}
      <div className="card overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="flex-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
              ⚡ Đang hoạt động
            </span>
            <h2 className="mt-2 font-bold text-slate-800">{session.lot.name}</h2>
            <p className="text-sm text-slate-400">{session.slot_label}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Biển số xe</p>
            <span className="plate mt-1 text-lg">{session.plate}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 px-4 py-3">
          <Field label="Thời gian vào" value={`${formatClock(session.checkin_at)}, Hôm nay`} />
          <Field label="Thời gian đỗ" value={<span className="font-mono text-brand-600">{formatDuration(now - session.checkin_at)}</span>} />
        </div>

        <div className="m-4 mt-0 flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
          <span className="text-sm text-slate-600">Tạm tính</span>
          <span className="text-lg font-extrabold text-brand-700">{formatVnd(session.estimate_fee)}</span>
        </div>
      </div>

      {/* Payment */}
      <div className="card p-4">
        <h3 className="mb-3 font-bold text-slate-800">Phương thức thanh toán</h3>
        <PaymentSelector value={session.payment_method} walletBalance={walletBalance} onChange={setPayment} />
      </div>

      {/* QR checkout */}
      <div className="card p-5 text-center">
        <h3 className="font-bold text-slate-800">Mã QR Checkout</h3>
        <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
          Đưa mã này vào máy quét tại cổng ra để xác nhận thanh toán tự động.
        </p>
        <div className="mt-4">
          <QrDisplay value={`PARKSMART-CHECKOUT:${session.checkout_token}`} refreshSeconds={30} />
        </div>
        {session.short_code && (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-400">Quét khó? Đọc mã này cho nhân viên nhập</p>
            <p className="mt-1 font-mono text-2xl font-extrabold tracking-[0.3em] text-brand-700">
              {session.short_code}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function SuccessView({
  session,
  remaining,
  onHome,
  onHistory,
  onBack,
}: {
  session: Session;
  remaining: number;
  onHome: () => void;
  onHistory: () => void;
  onBack: () => void;
}) {
  const inT = session.checkin_at;
  const outT = session.checkout_at ?? Date.now();
  const mins = Math.round((outT - inT) / 60000);
  const dur = `${Math.floor(mins / 60)}h ${mins % 60}p`;
  const pm = session.payment_method || 'cash';

  return (
    <div className="flex min-h-full items-center justify-center p-5">
      <div className="card w-full max-w-sm p-6 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand-600">
          <IconCheck width={34} />
        </div>
        <h1 className="mt-4 text-xl font-extrabold text-slate-900">Thanh toán thành công!</h1>
        <p className="mt-1 text-sm text-slate-400">Cảm ơn bạn đã sử dụng dịch vụ của ParkSmart.</p>

        <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4 text-left">
          <Row label="Vị trí đỗ xe" value={session.lot.name} strong />
          <Row label="Thời gian gửi" value={`${formatClock(inT)} - ${formatClock(outT)} (${dur})`} />
          <div className="border-t border-dashed border-slate-200 pt-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Tổng tiền phí</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-extrabold text-brand-700">{formatVnd(session.fee)}</span>
              <span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-600">
                Đã thanh toán qua {PM_LABEL[pm]}
              </span>
            </div>
          </div>
        </div>

        {remaining > 0 ? (
          <button onClick={onBack} className="btn-primary mt-5 w-full">
            Xem {remaining} xe đang gửi
          </button>
        ) : (
          <button onClick={onHome} className="btn-primary mt-5 w-full">Về trang chủ</button>
        )}
        <button onClick={onHistory} className="btn-outline mt-2 w-full">Xem lịch sử</button>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 ${strong ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{value}</p>
    </div>
  );
}
