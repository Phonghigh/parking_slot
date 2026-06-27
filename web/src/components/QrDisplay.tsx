import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { IconRefresh } from './icons';

/**
 * Hiển thị QR trong khung scanner (corner brackets) + đếm ngược auto-refresh.
 * value: nội dung QR. refreshSeconds: chu kỳ tự làm mới (cosmetic + đổi nonce).
 */
export function QrDisplay({
  value,
  refreshSeconds = 30,
  onRefresh,
}: {
  value: string;
  refreshSeconds?: number;
  onRefresh?: () => void;
}) {
  const [left, setLeft] = useState(refreshSeconds);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    setLeft(refreshSeconds);
  }, [value, nonce, refreshSeconds]);

  useEffect(() => {
    const t = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          setNonce((n) => n + 1);
          onRefresh?.();
          return refreshSeconds;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [refreshSeconds, onRefresh]);

  const refreshNow = () => {
    setNonce((n) => n + 1);
    onRefresh?.();
    setLeft(refreshSeconds);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative rounded-2xl border-2 border-brand-200 bg-brand-50/40 p-6">
        {/* corner brackets */}
        <Corner className="left-2 top-2 border-l-4 border-t-4" />
        <Corner className="right-2 top-2 border-r-4 border-t-4" />
        <Corner className="bottom-2 left-2 border-b-4 border-l-4" />
        <Corner className="bottom-2 right-2 border-b-4 border-r-4" />
        <QRCodeSVG value={`${value}#${nonce}`} size={180} level="M" fgColor="#0f172a" bgColor="transparent" />
      </div>
      <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-500">
        <IconClockTiny /> Tự động làm mới sau <span className="font-semibold text-slate-700">{left}s</span>
      </div>
      <button onClick={refreshNow} className="btn-outline w-full">
        <IconRefresh width={18} /> Làm mới mã QR
      </button>
    </div>
  );
}

function Corner({ className }: { className: string }) {
  return <span className={`absolute h-5 w-5 rounded-sm border-brand-500 ${className}`} />;
}

function IconClockTiny() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
