import { Lot } from '../api';
import { priceLabel, formatDistance, capacityColor } from '../lib/format';
import { IconStar, IconPin, IconRoof } from './icons';

export function LotCard({ lot, onClick }: { lot: Lot; onClick?: () => void }) {
  const cap = capacityColor(lot.available_spots, lot.total_spots);
  return (
    <button
      onClick={onClick}
      className="card flex w-full items-stretch gap-3 p-3 text-left transition-all duration-300 active:scale-[0.975]"
    >
      <img
        src={lot.image_url}
        alt={lot.name}
        className="h-20 w-20 shrink-0 rounded-2xl object-cover"
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold text-slate-800">{lot.name}</h3>
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-brand-700"
            style={{ background: 'rgba(0,177,79,0.12)', border: '1px solid rgba(0,177,79,0.20)' }}
          >
            {priceLabel(lot)}
          </span>
        </div>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
          <IconPin width={13} /> {lot.address}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span className="flex items-center gap-1 font-medium text-amber-500">
            <IconStar width={13} /> {lot.rating.toFixed(1)}
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1" style={{ color: cap.color }}>
            <span className="h-2 w-2 rounded-full" style={{ background: cap.color }} />
            {lot.available_spots} chỗ
          </span>
          {lot.distance != null && (
            <>
              <span className="text-slate-300">·</span>
              <span>{formatDistance(lot.distance)}</span>
            </>
          )}
          {lot.covered && (
            <>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1 text-slate-400">
                <IconRoof width={13} /> Mái che
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
