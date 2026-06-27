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

  if (!lot) return <div className="grid h-full place-items-center text-slate-400">Đang tải…</div>;

  return (
    <div className="min-h-full bg-white pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white/90 px-3 py-3 backdrop-blur">
        <button onClick={() => nav(-1)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100">
          <IconBack />
        </button>
        <span className="font-bold text-brand-700">ParkSmart</span>
        <button className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100">
          <IconShare width={18} />
        </button>
      </div>

      {/* Hero */}
      <div className="relative">
        <img src={lot.image_url} alt={lot.name} className="h-56 w-full object-cover" />
        <span className={`absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white ${lot.is_open ? 'bg-brand-600' : 'bg-slate-500'}`}>
          <span className="h-2 w-2 rounded-full bg-white" /> {lot.is_open ? 'Đang mở cửa' : 'Đã đóng cửa'}
        </span>
      </div>

      <div className="px-5">
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900">{lot.name}</h1>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-500">
          <IconPin width={16} className="mt-0.5 shrink-0 text-brand-600" /> {lot.address}
        </p>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-3 divide-x divide-slate-100 rounded-2xl border border-slate-100 py-3 text-center">
          <Stat
            top={<span className="flex items-center justify-center gap-1 text-brand-600"><IconStar width={16} /> {lot.rating.toFixed(1)}</span>}
            bottom={`${lot.review_count} đánh giá`}
          />
          <Stat top={<span className="text-slate-900">{lot.available_spots}</span>} bottom="chỗ trống" />
          <Stat
            top={<span className="text-slate-900">{lot.distance != null ? formatDistance(lot.distance) : priceLabel(lot)}</span>}
            bottom={lot.distance != null ? 'khoảng cách' : 'giá vé'}
          />
        </div>

        {/* Price banner */}
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3">
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
              <div key={r.id} className="flex gap-3 rounded-2xl bg-slate-50 p-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
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

      {/* Action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-slate-200 bg-white px-4 py-3">
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
            className="btn flex-col gap-0.5 px-3 py-2 text-xs text-slate-400"
          >
            <IconCalendar width={18} /> Đặt chỗ
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ top, bottom }: { top: React.ReactNode; bottom: string }) {
  return (
    <div className="px-1">
      <div className="text-lg font-extrabold">{top}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-400">{bottom}</div>
    </div>
  );
}
