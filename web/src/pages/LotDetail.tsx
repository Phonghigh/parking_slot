import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, Lot } from '../api';
import { formatDistance, priceLabel } from '../lib/format';
import {
  IconBack, IconShare, IconPin, IconStar, IconDirections, IconQr, IconCalendar,
  IconCamera, IconRoof, IconBolt, IconShield, IconClock,
} from '../components/icons';

const AMENITY_ICON: Record<string, JSX.Element> = {
  'Camera an ninh': <IconCamera width={15} />,
  'Có mái che': <IconRoof width={15} />,
  'Thanh toán qua App': <IconQr width={15} />,
  'Sạc xe điện': <IconBolt width={15} />,
  'Bảo vệ 24/7': <IconShield width={15} />,
  'Rửa xe': <IconClock width={15} />,
};

export function LotDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [lot, setLot] = useState<Lot | null>(null);

  useEffect(() => {
    if (id) api.getLot(Number(id)).then((r) => setLot(r.lot));
  }, [id]);

  if (!lot)
    return (
      <div className="grid h-full place-items-center text-slate-400">
        <div className="text-center">
          <div className="skeleton mx-auto mb-3 h-10 w-10" />
          <p className="text-sm">Đang tải…</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-full animate-fade-in pb-28">
      {/* Glass sticky header */}
      <div className="glass-header sticky top-0 z-10 flex items-center justify-between px-3 py-3">
        <button
          onClick={() => nav(-1)}
          className="glass-icon grid h-9 w-9 place-items-center rounded-full transition-all duration-300 active:scale-95"
        >
          <IconBack />
        </button>
        <span className="font-bold text-brand-700">ParkSmart</span>
        <button className="glass-icon grid h-9 w-9 place-items-center rounded-full transition-all duration-300 active:scale-95">
          <IconShare width={18} />
        </button>
      </div>

      {/* Hero image */}
      <div className="relative">
        <img src={lot.image_url} alt={lot.name} className="h-56 w-full object-cover" />
        <span
          className={`absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-white ${
            lot.is_open ? 'glass-green text-brand-800' : 'glass-white text-slate-600'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${lot.is_open ? 'bg-brand-500' : 'bg-slate-400'}`} />
          {lot.is_open ? 'Đang mở cửa' : 'Đã đóng cửa'}
        </span>
      </div>

      <div className="px-5">
        <h1 className="mt-5 text-2xl font-extrabold text-slate-800">{lot.name}</h1>
        <p className="mt-1.5 flex items-start gap-1.5 text-sm text-slate-500">
          <IconPin width={16} className="mt-0.5 shrink-0 text-blue-500" /> {lot.address}
        </p>

        {/* Stats glass panel */}
        <div className="glass-surface mt-5 grid grid-cols-3 rounded-3xl py-4 text-center">
          <Stat
            top={<span className="flex items-center justify-center gap-1 text-amber-500"><IconStar width={16} /> {lot.rating.toFixed(1)}</span>}
            bottom={`${lot.review_count} đánh giá`}
          />
          <Stat
            top={<span className="text-slate-800">{lot.available_spots}</span>}
            bottom="chỗ trống"
            divider
          />
          <Stat
            top={<span className="text-slate-800">{lot.distance != null ? formatDistance(lot.distance) : priceLabel(lot)}</span>}
            bottom={lot.distance != null ? 'khoảng cách' : 'giá vé'}
            divider
          />
        </div>

        {/* Price banner */}
        <div className="glass-green mt-4 flex items-center justify-between rounded-3xl px-5 py-3.5">
          <span className="text-sm text-slate-600">Giá gửi xe máy</span>
          <span className="text-lg font-extrabold text-brand-700">{priceLabel(lot)}</span>
        </div>

        {/* Amenities */}
        <section className="mt-6">
          <h2 className="font-bold text-slate-800">Tiện ích</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {lot.amenities.map((a) => (
              <span key={a} className="chip">
                {AMENITY_ICON[a] || <IconShield width={15} />} {a}
              </span>
            ))}
          </div>
        </section>

        {/* Reviews */}
        <section className="mt-6">
          <h2 className="font-bold text-slate-800">Đánh giá từ người dùng</h2>
          <div className="mt-3 space-y-3">
            {(lot.reviews ?? []).map((r) => (
              <div key={r.id} className="glass-surface flex gap-3 rounded-3xl p-3">
                <div className="glass-icon grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-slate-600">
                  {r.user_name.split(' ').map((w) => w[0]).slice(-2).join('')}
                </div>
                <div>
                  <p className="font-semibold text-slate-700">{r.user_name}</p>
                  <div className="flex text-amber-400">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <IconStar key={i} width={13} />
                    ))}
                  </div>
                  {r.comment && <p className="mt-1 text-sm text-slate-500">{r.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Glass action bar */}
      <div className="fixed bottom-5 left-1/2 z-20 w-[92%] max-w-md -translate-x-1/2 px-4 py-3">
        <div className="flex items-center gap-2">
          <a
            href={`https://www.openstreetmap.org/directions?to=${lot.lat}%2C${lot.lng}`}
            target="_blank"
            rel="noreferrer"
            className="btn-outline flex-col gap-0.5 px-3 py-2 text-xs"
          >
            <IconDirections width={18} /> Chỉ đường
          </a>
          <button onClick={() => nav('/checkin')} className="btn-primary flex-1">
            <IconQr width={20} /> Gửi xe ngay
          </button>
          <button
            disabled
            title="Sắp ra mắt"
            className="glass-surface btn flex-col gap-0.5 rounded-2xl px-3 py-2 text-xs text-slate-400"
          >
            <IconCalendar width={18} /> Đặt chỗ
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ top, bottom, divider }: { top: React.ReactNode; bottom: string; divider?: boolean }) {
  return (
    <div className={`px-2 ${divider ? 'border-l border-white/50' : ''}`}>
      <div className="text-lg font-extrabold">{top}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-400">{bottom}</div>
    </div>
  );
}
