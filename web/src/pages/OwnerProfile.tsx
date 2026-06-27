import { useEffect, useState } from 'react';
import { api, Lot } from '../api';
import { priceLabel } from '../lib/format';
import { IconPin, IconStar, IconClock } from '../components/icons';

export function OwnerProfile() {
  const [lot, setLot] = useState<Lot | null>(null);
  useEffect(() => {
    api.ownerLot().then((r) => api.getLot(r.lot.id)).then((r) => setLot(r.lot)).catch(() => {});
  }, []);

  if (!lot) return <div className="text-slate-400">Đang tải…</div>;

  return (
    <div className="animate-fade-in max-w-3xl space-y-5">
      <h1 className="text-[28px] font-extrabold tracking-tight text-slate-800">Hồ sơ bãi</h1>

      <div className="card overflow-hidden">
        <div className="relative">
          <img src={lot.image_url} alt={lot.name} className="h-52 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
          <span className={`absolute bottom-3 left-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-white ${lot.is_open ? 'glass-green text-brand-800' : 'glass-white text-slate-700'}`}>
            <span className={`h-2 w-2 rounded-full ${lot.is_open ? 'bg-brand-500' : 'bg-slate-400'}`} /> {lot.is_open ? 'Đang mở cửa' : 'Đã đóng cửa'}
          </span>
        </div>
        <div className="p-5">
          <h2 className="text-xl font-extrabold text-slate-900">{lot.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <IconPin width={15} className="text-brand-600" /> {lot.address}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Info label="Giá vé" value={priceLabel(lot)} />
            <Info label="Sức chứa" value={`${lot.total_spots} chỗ`} />
            <Info label="Đánh giá" value={<span className="flex items-center gap-1"><IconStar width={14} className="text-amber-400" /> {lot.rating.toFixed(1)} ({lot.review_count})</span>} />
            <Info label="Giờ mở cửa" value={<span className="flex items-center gap-1"><IconClock width={14} /> {lot.open_hours}</span>} />
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-bold text-slate-700">Tiện ích</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {lot.amenities.map((a) => (
                <span key={a} className="chip">{a}</span>
              ))}
            </div>
          </div>

          <p className="mt-5 text-xs text-slate-400">
            * Thông tin & giá bãi được thiết lập khi đăng ký (Phase 2 cho phép chỉnh sửa trực tiếp).
          </p>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-800">{value}</p>
    </div>
  );
}
