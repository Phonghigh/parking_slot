import { useEffect, useRef, useState } from 'react';
import { api, Lot, Session } from '../api';
import { QrScanner } from '../components/QrScanner';
import { formatVnd, formatClock } from '../lib/format';
import { readPlateFromImage } from '../lib/ocr';
import { IconCamera, IconCheck, IconQr } from '../components/icons';
import { PlateDisplay } from '../components/PlateDisplay';

type Tab = 'checkin' | 'checkout';

export function OwnerOperations() {
  const [lot, setLot] = useState<Lot | null>(null);
  const [tab, setTab] = useState<Tab>('checkin');

  const reload = () => api.ownerLot().then((r) => setLot(r.lot)).catch(() => {});
  useEffect(() => {
    reload();
  }, []);

  if (!lot) return <div className="text-slate-400">Đang tải…</div>;

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-slate-800">Vận hành bãi</h1>
          <p className="mt-0.5 text-sm text-slate-500">{lot.name}</p>
        </div>
        <span className="glass-green inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-brand-700">
          {lot.available_spots}/{lot.total_spots} chỗ trống
        </span>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="flex gap-2 p-3">
          <TabBtn active={tab === 'checkin'} onClick={() => setTab('checkin')}>↓ Check-in (Xe vào)</TabBtn>
          <TabBtn active={tab === 'checkout'} onClick={() => setTab('checkout')}>↑ Checkout (Xe ra)</TabBtn>
        </div>
        <div className="px-6 pb-6 pt-2">
          {tab === 'checkin' ? (
            <CheckinPanel lot={lot} onDone={reload} />
          ) : (
            <CheckoutPanel onDone={reload} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-2xl px-4 py-3 text-center font-bold transition-all duration-200 ${
        active
          ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-md'
          : 'text-slate-400 hover:bg-white/50 hover:text-slate-600'
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------- Check-in ---------------- */
function parseUserId(text: string): number | null {
  // Cắt bỏ phần '#nonce' (nếu có) rồi lấy số định danh ở cuối: "GOPARK-CHECKIN:1" -> 1
  const base = text.split('#')[0].trim();
  const m = base.match(/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}

function CheckinPanel({ lot, onDone }: { lot: Lot; onDone: () => void }) {
  const [userId, setUserId] = useState<number | null>(null);
  const [plate, setPlate] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [result, setResult] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrMsg, setOcrMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setUserId(null);
    setPlate('');
    setPhoto(null);
    setResult(null);
    setError('');
    setOcrBusy(false);
    setOcrMsg('');
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhoto(URL.createObjectURL(f));
    setOcrBusy(true);
    setOcrProgress(0);
    setOcrMsg('');
    try {
      const text = await readPlateFromImage(f, setOcrProgress);
      if (text) {
        setPlate(text);
      } else {
        console.warn('[OCR] readPlateFromImage returned empty string — check cleanPlate logs above');
        setError('OCR không nhận ra biển số — vui lòng nhập tay.');
      }
    } catch (e: any) {
      console.error('[OCR] readPlateFromImage threw:', e);
      setError(`OCR lỗi: ${e?.message ?? e}`);
    } finally {
      setOcrBusy(false);
    }
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
          <Line label="Biển số" value={<PlateDisplay plate={result.plate} />} />
          <Line label="Vị trí" value={result.slot_label || ''} />
          <Line label="Giờ vào" value={formatClock(result.checkin_at)} />
        </div>
        <button onClick={reset} className="btn-green mt-5 w-full">Check-in xe khác</button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h4 className="mb-2 flex items-center gap-2 font-semibold text-slate-700">
          <Num n={1} /> Quét mã QR định danh của khách
        </h4>
        {userId ? (
          <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-brand-700">
            <IconQr width={18} /> Đã nhận diện khách <b>#{userId}</b>
            <button onClick={() => setUserId(null)} className="ml-auto text-sm underline">Quét lại</button>
          </div>
        ) : (
          <QrScanner
            hint="Khách mở app GoPark → tab Tài khoản → “Mã QR Check-in” để bạn quét. Không quét được? Nhập số định danh của khách bên dưới (vd: 1)."
            manualLabel="Hoặc nhập số định danh khách"
            manualPlaceholder="vd: 1"
            onResult={(t) => {
              const id = parseUserId(t);
              if (id) setUserId(id);
              else setError('Mã không hợp lệ');
            }}
          />
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="mb-2 flex items-center gap-2 font-semibold text-slate-700">
            <Num n={2} /> Biển số xe
          </h4>
          <p className="mb-2 text-xs text-slate-400">
            Tải ảnh biển số → hệ thống <b>tự đọc (OCR)</b> rồi điền vào ô bên dưới. Vui lòng kiểm tra lại.
          </p>
          <div
            onClick={() => !ocrBusy && fileRef.current?.click()}
            className="relative flex min-h-[7rem] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-6 text-slate-400 hover:border-brand-300"
          >
            {photo ? (
              <img src={photo} alt="biển số" className="h-24 rounded-lg object-cover" />
            ) : (
              <>
                <IconCamera /> Tải ảnh biển số
              </>
            )}
            {ocrBusy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/85 text-brand-700">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                <span className="text-sm font-medium">Đang đọc biển số… {Math.round(ocrProgress * 100)}%</span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
        </div>
        <div>
          <label className="label">Biển số (kiểm tra / sửa) *</label>
          <input
            className="input font-mono uppercase tracking-wide"
            placeholder="51F-123.45"
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
          />
          {!ocrBusy && ocrMsg === 'ok' && (
            <p className="mt-1 text-xs text-brand-600">✓ Đã đọc từ ảnh — sửa lại nếu chưa đúng.</p>
          )}
          {!ocrBusy && ocrMsg && ocrMsg !== 'ok' && (
            <p className="mt-1 text-xs text-amber-600">⚠ {ocrMsg}</p>
          )}
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button onClick={confirm} disabled={busy} className="btn-green w-full">
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

  // DỰ PHÒNG: khách mất / hết pin điện thoại -> tra theo biển số (gõ tay hoặc chụp ảnh + OCR)
  const [lookupPlate, setLookupPlate] = useState('');
  const [fallback, setFallback] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrMsg, setOcrMsg] = useState('');
  const fbFileRef = useRef<HTMLInputElement>(null);

  const onPlatePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setOcrBusy(true);
    setOcrProgress(0);
    setOcrMsg('');
    try {
      const text = await readPlateFromImage(f, setOcrProgress);
      if (text) {
        setLookupPlate(text);
        setOcrMsg('ok');
      } else {
        setOcrMsg('Không đọc được biển số — vui lòng gõ tay.');
      }
    } catch {
      setOcrMsg('Lỗi xử lý ảnh — vui lòng gõ tay.');
    } finally {
      setOcrBusy(false);
    }
  };

  const findByPlate = async () => {
    if (!lookupPlate.trim()) return;
    setError('');
    try {
      const r = await api.findByPlate(lookupPlate.trim());
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
        <button onClick={reset} className="btn-green mt-5 w-full">Checkout xe khác</button>
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
          <>
            <QrScanner
              hint="Khách mở tab “Vé của tôi” → “Mã QR Checkout” để bạn quét. Không quét được? Nhập mã ngắn (6 ký tự) khách đọc cho bạn vào ô bên dưới."
              manualLabel="Hoặc nhập mã checkout (6 ký tự)"
              manualPlaceholder="VD: ABC123"
              onResult={onScan}
            />

            {/* Dự phòng: mất / hết pin điện thoại */}
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <button
                onClick={() => setFallback((v) => !v)}
                className="flex w-full items-center justify-between text-sm font-semibold text-amber-700"
              >
                <span>🔋 Khách mất / hết pin điện thoại?</span>
                <span>{fallback ? '▲' : '▼'}</span>
              </button>
              {fallback && (
                <div className="mt-2">
                  <p className="mb-2 text-xs text-amber-700/80">
                    Tra phiên đang gửi theo <b>biển số xe</b> — chụp ảnh để OCR tự đọc hoặc gõ tay
                    (xác minh thêm bằng CCCD / cà vẹt xe).
                  </p>

                  {/* Chụp ảnh biển số + OCR */}
                  <div
                    onClick={() => !ocrBusy && fbFileRef.current?.click()}
                    className="relative mb-2 flex min-h-[5rem] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-white py-4 text-amber-600"
                  >
                    <IconCamera width={18} /> Chụp / tải ảnh biển số (OCR)
                    {ocrBusy && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-xl bg-white/85 text-brand-700">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                        <span className="text-xs font-medium">Đang đọc biển số… {Math.round(ocrProgress * 100)}%</span>
                      </div>
                    )}
                  </div>
                  <input ref={fbFileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPlatePhoto} />
                  {!ocrBusy && ocrMsg === 'ok' && (
                    <p className="mb-2 text-xs text-brand-600">✓ Đã đọc từ ảnh — kiểm tra lại bên dưới.</p>
                  )}
                  {!ocrBusy && ocrMsg && ocrMsg !== 'ok' && (
                    <p className="mb-2 text-xs text-amber-700">⚠ {ocrMsg}</p>
                  )}

                  <div className="flex gap-2">
                    <input
                      className="input bg-white font-mono uppercase"
                      placeholder="Biển số xe"
                      value={lookupPlate}
                      onChange={(e) => setLookupPlate(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && findByPlate()}
                    />
                    <button onClick={findByPlate} className="btn-green shrink-0">Tìm xe</button>
                  </div>
                </div>
              )}
            </div>
          </>
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
            <button onClick={confirm} disabled={busy} className="btn-green w-full">
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
    <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{n}</span>
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
