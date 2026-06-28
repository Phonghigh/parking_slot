import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Booking, Session } from '../api';
import { useAuth } from '../auth/AuthContext';
import { QrDisplay } from '../components/QrDisplay';
import { PaymentSelector } from '../components/PaymentSelector';
import { BookingCard } from '../components/BookingCard';
import { formatVnd, formatClock, formatDuration } from '../lib/format';
import { IconBell, IconCheck, IconTicket, IconStar } from '../components/icons';
import { PlateDisplay } from '../components/PlateDisplay';

const PM_LABEL: Record<string, string> = { momo: 'Momo', wallet: 'GoPark Wallet', cash: 'tiền mặt' };

type TicketItem =
  | { type: 'booking'; data: Booking }
  | { type: 'session'; data: Session };

export function TicketPage() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [actives, setActives] = useState<Session[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [completed, setCompleted] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const seenRef = useRef<Set<number>>(new Set());

  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const [sessionRes, bookingRes] = await Promise.all([
          api.activeSessions(),
          api.activeBookings(),
        ]);
        if (stop) return;
        const list = sessionRes.sessions;
        const ids = new Set(list.map((s) => s.id));

        for (const id of seenRef.current) {
          if (!ids.has(id)) {
            try {
              const detail = await api.getSession(id);
              if (detail.session.status === 'completed') {
                setCompleted(detail.session);
                refresh();
              }
            } catch { /* ignore */ }
          }
        }
        seenRef.current = ids;
        setActives(list);
        setBookings(bookingRes.bookings);
      } finally {
        if (!stop) setLoading(false);
      }
    };
    tick();
    const t = setInterval(tick, 2500);
    return () => { stop = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchSession = (s: Session) =>
    setActives((list) => list.map((x) => (x.id === s.id ? s : x)));

  const tickets: TicketItem[] = [
    ...bookings.map((b) => ({ type: 'booking' as const, data: b })),
    ...actives.map((s) => ({ type: 'session' as const, data: s })),
  ];

  const onScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    setActiveIdx(Math.round(el.scrollLeft / el.clientWidth));
  };

  const scrollToIdx = (idx: number) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
  };

  const removeBooking = (id: number) => {
    setBookings((prev) => {
      const next = prev.filter((x) => x.id !== id);
      // if the removed card was last, scroll back one
      const removedAt = bookings.findIndex((x) => x.id === id);
      const newTotal = next.length + actives.length;
      if (removedAt !== -1 && activeIdx >= newTotal && newTotal > 0) {
        setTimeout(() => scrollToIdx(newTotal - 1), 50);
      }
      return next;
    });
  };

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

  if (tickets.length === 0) return <EmptyTicket onFind={() => nav('/')} />;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />
          <span className="font-bold text-brand-700">GoPark</span>
        </div>
        <div className="flex items-center gap-3">
          {tickets.length > 1 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
              {activeIdx + 1} / {tickets.length}
            </span>
          )}
          <IconBell width={20} className="text-slate-400" />
        </div>
      </div>

      {/* ── Carousel ─────────────────────────────────────────────── */}
      <div
        ref={carouselRef}
        onScroll={onScroll}
        className="no-scrollbar flex flex-1 overflow-x-auto"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {tickets.map((ticket) => {
          const key = ticket.type === 'booking' ? `b-${ticket.data.id}` : `s-${ticket.data.id}`;
          return (
            <div
              key={key}
              className="no-scrollbar h-full shrink-0 overflow-y-auto px-4 pb-28"
              style={{ scrollSnapAlign: 'start', width: '100%' }}
            >
              {ticket.type === 'booking' ? (
                <BookingCard
                  booking={ticket.data}
                  onCancelled={removeBooking}
                />
              ) : (
                <ActiveTicket
                  session={ticket.data}
                  walletBalance={user?.wallet_balance ?? 0}
                  onPay={patchSession}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Dot indicators ───────────────────────────────────────── */}
      {tickets.length > 1 && (
        <div className="shrink-0 flex items-center justify-center gap-2 pb-4 pt-2">
          {tickets.map((ticket, i) => {
            const isBooking = ticket.type === 'booking';
            return (
              <button
                key={i}
                onClick={() => scrollToIdx(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === activeIdx
                    ? `w-6 ${isBooking ? 'bg-blue-500' : 'bg-brand-600'}`
                    : 'w-2 bg-slate-300'
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function EmptyTicket({ onFind }: { onFind: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center animate-fade-in">
      <div className="glass-icon grid h-20 w-20 place-items-center rounded-full text-slate-400">
        <IconTicket width={36} />
      </div>
      <h2 className="mt-5 text-lg font-bold text-slate-700">Chưa có phiên gửi xe</h2>
      <p className="mt-1 text-sm text-slate-500">Tìm một bãi đỗ và bấm "Gửi xe ngay" để bắt đầu.</p>
      <button onClick={onFind} className="btn-primary mt-6">Tìm bãi đỗ</button>
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
    <div className="space-y-4 pt-1">
      {/* Ticket card */}
      <div className="card overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-5">
          <div className="flex-1">
            <span className="glass-green inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-brand-700">
              ⚡ Đang hoạt động
            </span>
            <h2 className="mt-2.5 font-bold text-slate-800">{session.lot.name}</h2>
            <p className="text-sm text-slate-500">{session.slot_label}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Biển số xe</p>
            <PlateDisplay plate={session.plate} className="mt-1 text-base" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-white/40 px-5 py-3">
          <Field label="Thời gian vào" value={formatClock(session.checkin_at)} />
          <Field
            label="Thời gian đỗ"
            value={<span className="font-mono text-blue-600">{formatDuration(now - session.checkin_at)}</span>}
          />
        </div>

        <div className="glass-green m-4 mt-0 flex items-center justify-between rounded-2xl px-4 py-3">
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
          <QrDisplay value={`GOPARK-CHECKOUT:${session.checkout_token}`} refreshSeconds={30} />
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
    <div className="flex min-h-full items-center justify-center p-5 animate-fade-in">
      <div className="card w-full max-w-sm p-6 text-center">
        <div className="glass-icon-green mx-auto grid h-16 w-16 place-items-center rounded-full text-brand-600">
          <IconCheck width={34} />
        </div>
        <h1 className="mt-4 text-xl font-extrabold text-slate-800">Thanh toán thành công!</h1>
        <p className="mt-1 text-sm text-slate-500">Cảm ơn bạn đã sử dụng dịch vụ của GoPark.</p>

        <div className="glass-surface mt-5 space-y-3 rounded-3xl p-4 text-left">
          <Row label="Vị trí đỗ xe" value={session.lot.name} strong />
          <Row label="Thời gian gửi" value={`${formatClock(inT)} - ${formatClock(outT)} (${dur})`} />
          <div className="border-t border-dashed border-white/50 pt-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Tổng tiền phí</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-extrabold text-brand-700">{formatVnd(session.fee)}</span>
              <span className="glass-green rounded-full px-2.5 py-1 text-xs font-semibold text-brand-700">
                {PM_LABEL[pm]}
              </span>
            </div>
          </div>
        </div>

        <CheckoutReviewPrompt session={session} />

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

function CheckoutReviewPrompt({ session }: { session: Session }) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.submitReview(session.lot_id, rating, comment);
      setDone(true);
    } catch {
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <div className="glass-green mt-5 rounded-2xl px-4 py-3 text-sm font-medium text-brand-700">
        ✓ Cảm ơn đánh giá của bạn!
      </div>
    );

  return (
    <div className="glass-surface mt-5 rounded-3xl p-4 text-left">
      <p className="text-center text-sm font-semibold text-slate-700">Đánh giá trải nghiệm gửi xe?</p>
      <div className="mt-2 flex items-center justify-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            className="p-0.5 transition active:scale-90"
            aria-label={`${n} sao`}
          >
            <IconStar width={28} className={(hover || rating) >= n ? 'text-amber-400' : 'text-slate-300'} />
          </button>
        ))}
      </div>
      <textarea
        className="input mt-3 min-h-[52px] resize-none bg-white/70"
        placeholder="Nhận xét (tuỳ chọn)…"
        maxLength={500}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button onClick={submit} disabled={busy} className="btn-primary mt-3 w-full">
        {busy ? 'Đang gửi…' : 'Gửi đánh giá'}
      </button>
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
