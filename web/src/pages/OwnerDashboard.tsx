import { useEffect, useRef, useState } from 'react';
import { api, Lot, Session } from '../api';
import { QrScanner } from '../components/QrScanner';
import { formatVnd, formatClock, priceLabel, capacityColor } from '../lib/format';
import { IconCamera, IconCheck, IconQr } from '../components/icons';

type Tab = 'checkin' | 'checkout';

export function OwnerDashboard() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [lotId, setLotId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('checkin');

  const reloadLots = () =>
    api.ownerLots().then((r) => {
      setLots(r.lots);
      setLotId((cur) => cur ?? r.lots[0]?.id ?? null);
    });

  useEffect(() => {
    reloadLots();
  }, []);

  const lot = lots.find((l) => l.id === lotId) || null;

  return (
    <div className="space-y-6">
      {/* Lots overview */}
      <section>
        <h1 className="text-2xl font-extrabold text-slate-900">Bãi xe của tôi</h1>
        <p className="text-sm text-slate-400">Chọn bãi để thao tác check-in / checkout</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lots.map((l) => {
            const cap = capacityColor(l.available_spots, l.total_spots);
            const active = l.id === lotId;
            return (
              <button
                key={l.id}
                onClick={() => setLotId(l.id)}
                className={`card p-4 text-left transition ${active ? 'ring-2 ring-brand-500' : 'hover:shadow-md'}`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-slate-800">{l.name}</h3>
                  <span className="rounded-lg bg-brand-50 px-2 py-1 text-sm font-bold text-brand-700">
                    {priceLabel(l)}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-400">{l.address}</p>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: cap.color }} />
                  <span className="font-semibold" style={{ color: cap.color }}>
                    {l.available_spots}/{l.total_spots} chỗ trống
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Console */}
      {lot && (
        <section className="card p-0">
          <div className="flex border-b border-slate-100">
            <TabBtn active={tab === 'checkin'} onClick={() => setTab('checkin')}>
              Check-in (Xe vào)
            </TabBtn>
            <TabBtn active={tab === 'checkout'} onClick={() => setTab('checkout')}>
              Checkout (Xe ra)
            </TabBtn>
          </div>
          <div className="p-6">
            <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm">
              Đang thao tác tại: <span className="font-bold text-slate-800">{lot.name}</span>
            </div>
            {tab === 'checkin' ? (
              <CheckinPanel lot={lot} onDone={reloadLots} />
            ) : (
              <CheckoutPanel onDone={reloadLots} />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-3 text-center font-semibold transition ${
        active ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------- Check-in ---------------- */
function parseUserId(text: string): number | null {
  const m = text.match(/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}

function CheckinPanel({ lot, onDone }: { lot: Lot; onDone: () => void }) {
  const [userId, setUserId] = useState<number | null>(null);
  const [plate, setPlate] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [result, setResult] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setUserId(null);
    setPlate('');
    setPhoto(null);
    setResult(null);
    setError('');
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setPhoto(URL.createObjectURL(f));
  };

  const confirm = async () => {
    if (!userId || !plate.trim()) {
      setError('Cần quét QR người dùng và nhập biển số.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const r = await api.checkin(lot.id, userId, plate.trim());
      setResult(r.session);
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand-600">
          <IconCheck width={34} />
        </div>
        <h3 className="mt-3 text-xl font-extrabold text-slate-900">Check-in thành công!</h3>
        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm">
          <Line label="Biển số" value={<span className="plate">{result.plate}</span>} />
          <Line label="Vị trí" value={result.slot_label || ''} />
          <Line label="Giờ vào" value={formatClock(result.checkin_at)} />
        </div>
        <button onClick={reset} className="btn-primary mt-5 w-full">Check-in xe khác</button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Step 1: scan user QR */}
      <div>
        <h4 className="mb-2 flex items-center gap-2 font-semibold text-slate-700">
          <Num n={1} /> Quét QR định danh người dùng
        </h4>
        {userId ? (
          <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-brand-700">
            <IconQr width={18} /> Đã nhận diện người dùng <b>#{userId}</b>
            <button onClick={() => setUserId(null)} className="ml-auto text-sm underline">
              Quét lại
            </button>
          </div>
        ) : (
          <QrScanner
            manualPlaceholder="Nhập mã người dùng (số)"
            onResult={(t) => {
              const id = parseUserId(t);
              if (id) setUserId(id);
              else setError('QR không hợp lệ');
            }}
          />
        )}
      </div>

      {/* Step 2: plate */}
      <div className="space-y-4">
        <div>
          <h4 className="mb-2 flex items-center gap-2 font-semibold text-slate-700">
            <Num n={2} /> Chụp biển số xe
          </h4>
          <div
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-6 text-slate-400 hover:border-brand-300"
          >
            {photo ? (
              <img src={photo} alt="biển số" className="h-24 rounded-lg object-cover" />
            ) : (
              <>
                <IconCamera /> Tải ảnh biển số
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
        </div>
        <div>
          <label className="label">Biển số (nhập tay)</label>
          <input
            className="input font-mono uppercase tracking-wide"
            placeholder="51F-123.45"
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
          />
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button onClick={confirm} disabled={busy} className="btn-primary w-full">
          {busy ? 'Đang xử lý…' : 'Xác nhận xe vào'}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Checkout ---------------- */
function parseToken(text: string): string {
  const i = text.indexOf(':');
  return (i >= 0 ? text.slice(i + 1) : text).split('#')[0].trim();
}

function CheckoutPanel({ onDone }: { onDone: () => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [plate, setPlate] = useState('');
  const [done, setDone] = useState<{ fee: number; method: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setSession(null);
    setPlate('');
    setDone(null);
    setError('');
  };

  const onScan = async (text: string) => {
    setError('');
    try {
      const token = parseToken(text);
      const r = await api.lookupByToken(token);
      setSession(r.session);
      setPlate(r.session.plate);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const confirm = async () => {
    if (!session) return;
    setBusy(true);
    setError('');
    try {
      const r = await api.checkout(session.id, plate.trim());
      setDone({ fee: r.fee, method: r.payment_method });
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand-600">
          <IconCheck width={34} />
        </div>
        <h3 className="mt-3 text-xl font-extrabold text-slate-900">Cho xe ra thành công!</h3>
        <p className="mt-2 text-slate-500">
          Phí: <b className="text-brand-700">{formatVnd(done.fee)}</b> · Thanh toán: {done.method}
        </p>
        <button onClick={reset} className="btn-primary mt-5 w-full">Checkout xe khác</button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h4 className="mb-2 flex items-center gap-2 font-semibold text-slate-700">
          <Num n={1} /> Quét QR Checkout của khách
        </h4>
        {session ? (
          <div className="rounded-xl bg-brand-50 px-4 py-3 text-brand-700">
            <IconQr width={18} className="mb-1" /> Đã tìm thấy phiên #{session.id}
          </div>
        ) : (
          <QrScanner manualPlaceholder="Nhập mã checkout" onResult={onScan} />
        )}
      </div>

      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-semibold text-slate-700">
          <Num n={2} /> Đối chiếu biển số & xác nhận
        </h4>
        {session ? (
          <>
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
              <Line label="Bãi" value={session.lot.name} />
              <Line label="Vị trí" value={session.slot_label || ''} />
              <Line label="Giờ vào" value={formatClock(session.checkin_at)} />
              <Line label="Tạm tính" value={<b className="text-brand-700">{formatVnd(session.estimate_fee)}</b>} />
              <Line label="Thanh toán" value={session.payment_method || 'chưa chọn'} />
            </div>
            <div>
              <label className="label">Biển số (đối chiếu)</label>
              <input
                className="input font-mono uppercase tracking-wide"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
              />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button onClick={confirm} disabled={busy} className="btn-primary w-full">
              {busy ? 'Đang xử lý…' : 'Xác nhận cho xe ra'}
            </button>
          </>
        ) : (
          <p className="text-sm text-slate-400">Quét mã QR Checkout từ điện thoại khách để bắt đầu.</p>
        )}
        {error && !session && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

function Num({ n }: { n: number }) {
  return (
    <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
      {n}
    </span>
  );
}
function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}
