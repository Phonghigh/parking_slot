import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * Quét QR bằng camera (html5-qrcode) + fallback nhập tay khi camera lỗi.
 * onResult được gọi 1 lần với nội dung quét được.
 * Mọi lỗi camera đều được nuốt -> không bao giờ làm crash cây React.
 */
export function QrScanner({
  onResult,
  manualLabel = 'Nhập mã thủ công',
  manualPlaceholder = 'Nhập mã',
  hint,
}: {
  onResult: (text: string) => void;
  manualLabel?: string;
  manualPlaceholder?: string;
  hint?: string;
}) {
  const reactId = useId().replace(/[:]/g, '');
  const elementId = `qr-reader-${reactId}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;

    let scanner: Html5Qrcode;
    try {
      scanner = new Html5Qrcode(elementId, { verbose: false } as any);
    } catch (e: any) {
      setError('Không khởi tạo được trình quét. Hãy nhập mã thủ công bên dưới.');
      return;
    }
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          if (handledRef.current) return;
          handledRef.current = true;
          onResult(decodedText);
          scanner.stop().catch(() => {});
        },
        () => {}
      )
      .then(() => !cancelled && setScanning(true))
      .catch((e) => {
        setError('Không mở được camera. Hãy nhập mã thủ công bên dưới.');
      });

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        try {
          s.stop()
            .then(() => {
              try {
                s.clear();
              } catch {
                /* ignore */
              }
            })
            .catch(() => {});
        } catch {
          /* ignore */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      {hint && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">{hint}</p>
      )}

      <div className="overflow-hidden rounded-2xl border-2 border-brand-200 bg-black/5">
        <div id={elementId} className="mx-auto aspect-square w-full max-w-xs" />
      </div>
      {!scanning && !error && (
        <p className="text-center text-sm text-slate-400">Đang khởi động camera…</p>
      )}
      {error && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">{error}</p>
      )}

      {/* Fallback nhập tay - luôn hiển thị rõ ràng */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <label className="mb-1.5 block text-sm font-medium text-slate-600">{manualLabel}</label>
        <div className="flex gap-2">
          <input
            className="input bg-white"
            placeholder={manualPlaceholder}
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manual.trim()) onResult(manual.trim());
            }}
          />
          <button
            className="btn-primary shrink-0"
            onClick={() => manual.trim() && onResult(manual.trim())}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
