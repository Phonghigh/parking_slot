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
  const [active, setActive] = useState<Session | null>(null);
  const [completed, setCompleted] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastId = useRef<number | null>(null);

  // poll phiên active
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await api.activeSession();
        if (stop) return;
        if (r.session) {
          setActive(r.session);
          lastId.current = r.session.id;
          setCompleted(null);
        } else {
          setActive(null);
          // vừa checkout xong → lấy chi tiết để hiện màn thành công
          if (lastId.current && !completed) {
            try {
              const detail = await api.getSession(lastId.current);
              if (detail.session.status === 'completed') {
                setCompleted(detail.session);
                refresh();
              }
            } catch {
              /* ignore */
            }
          }
        }
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

  if (loading) return <div className="grid h-full place-items-center text-slate-400">Đang tải…</div>;

  if (completed) return <SuccessView session={completed} onHome={() => nav('/')} onHistory={() => nav('/history')} />;

  if (!active) return <EmptyTicket onFind={() => nav('/')} />;

  return <ActiveTicket session={active} walletBalance={user?.wallet_balance ?? 0} onPay={setActive} />;
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
    <div className="space-y-4 px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-brand-600" />
          <span className="font-bold text-brand-700">ParkSmart</span>
        </div>
        <IconBell width={20} className="text-slate-400" />
      </div>
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Phiên đỗ xe hiện tại</h1>
        <p className="text-sm text-slate-400">Đang đỗ tại {session.lot.name}</p>
      </div>

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

function SuccessView({ session, onHome, onHistory }: { session: Session; onHome: () => void; onHistory: () => void }) {
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

        <button onClick={onHome} className="btn-primary mt-5 w-full">Về trang chủ</button>
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
