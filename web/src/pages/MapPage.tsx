import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Lot } from '../api';
import { MapView } from '../components/MapView';
import { LotCard } from '../components/LotCard';
import { capacityColor, effectivePrice, formatDistance, priceLabel } from '../lib/format';
import { IconPin, IconStar, IconRoof } from '../components/icons';
import { subscribeLotUpdates } from '../lib/liveEvents';

const HCMC: [number, number] = [10.7769, 106.7009];

type SortKey = 'distance' | 'price' | 'available';

export function MapPage() {
  const nav = useNavigate();
  const [center, setCenter] = useState<[number, number]>(HCMC);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [activeLot, setActiveLot] = useState<Lot | undefined>();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchPin, setSearchPin] = useState<{ coords: [number, number]; name: string } | null>(null);
  const [sort, setSort] = useState<SortKey>('distance');
  const [covered, setCovered] = useState(false);
  const [openNow, setOpenNow] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [flashIds, setFlashIds] = useState<Set<number>>(new Set());

  const loadLots = (c: [number, number]) => {
    api.listLots(c[0], c[1]).then((r) => setLots(r.lots));
  };

  // Real-time: nhận cập nhật capacity qua SSE và áp ngay vào map/list (không cần reload)
  useEffect(() => {
    const unsub = subscribeLotUpdates((u) => {
      setLots((prev) =>
        prev.map((l) =>
          l.id === u.id
            ? { ...l, available_spots: u.available_spots, total_spots: u.total_spots, is_open: u.is_open }
            : l
        )
      );
      setActiveLot((prev) =>
        prev && prev.id === u.id
          ? { ...prev, available_spots: u.available_spots, is_open: u.is_open }
          : prev
      );
      // hiệu ứng nhấp nháy thẻ vừa đổi để thấy rõ "live"
      setFlashIds((prev) => new Set(prev).add(u.id));
      setTimeout(() => {
        setFlashIds((prev) => {
          const n = new Set(prev);
          n.delete(u.id);
          return n;
        });
      }, 1600);
    });
    return unsub;
  }, []);

  useEffect(() => {
    loadLots(center);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserPos(c);
          setCenter(c);
          loadLots(c);
        },
        () => {},
        { timeout: 5000 }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const c: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      setUserPos(c);
      setCenter(c);
      setSearchPin(null);
      loadLots(c);
    });
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (data[0]) {
        const c: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        setCenter(c);
        setSearchPin({ coords: c, name: data[0].display_name ?? query });
        loadLots(c);
      }
    } finally {
      setSearching(false);
    }
  };

  const visible = useMemo(() => {
    let list = lots.filter((l) => {
      if (covered && !l.covered) return false;
      if (openNow && !l.is_open) return false;
      if (l.rating < minRating) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'price') return effectivePrice(a) - effectivePrice(b);
      if (sort === 'available') return b.available_spots - a.available_spots;
      return (a.distance ?? 9e9) - (b.distance ?? 9e9);
    });
    return list;
  }, [lots, covered, openNow, minRating, sort]);

  return (
    <div className="relative flex h-full flex-col">
      {/* Map */}
      <div className="relative h-[48vh] shrink-0">
        <MapView
          center={center}
          userPos={userPos}
          lots={visible}
          activeId={activeLot?.id}
          searchPin={searchPin}
          onSelect={(l) => {
            setActiveLot(l);
            setCenter([l.lat, l.lng]);
          }}
          onMoveEnd={(c) => loadLots(c)}
          onMapClick={() => { setActiveLot(undefined); setSearchPin(null); }}
        />

        {/* Glass search bar */}
        <div className="absolute inset-x-0 top-0 z-10 p-3">
          <form onSubmit={search} className="flex gap-2">
            <div className="glass-search flex flex-1 items-center gap-2 rounded-full px-4 py-1">
              <IconPin width={16} className="shrink-0 text-blue-500" />
              <input
                className="flex-1 bg-transparent py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                placeholder="Tìm địa chỉ, trạm metro…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {searching && <span className="text-xs text-slate-400">…</span>}
              {query && !searching && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setSearchPin(null); }}
                  className="shrink-0 text-slate-400 transition hover:text-slate-600 active:scale-90"
                  aria-label="Xóa tìm kiếm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={useGps}
              className="glass-search grid h-11 w-11 shrink-0 place-items-center rounded-full transition active:scale-95"
              title="Vị trí của tôi"
            >
              <GpsIcon />
            </button>
          </form>
        </div>

        {/* Mini preview card */}
        {activeLot && (
          <div className="absolute bottom-8 left-4 right-4 z-[1000] animate-fade-slide-up">
            <MiniLotCard
              lot={activeLot}
              onClose={() => setActiveLot(undefined)}
              onDetail={() => nav(`/lot/${activeLot.id}`)}
            />
          </div>
        )}
      </div>

      {/* Glass bottom sheet */}
      <div className="glass-sheet no-scrollbar -mt-5 flex flex-1 flex-col overflow-hidden rounded-t-[32px]">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/50" />

        <div className="px-4 pt-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-700">{visible.length} bãi đỗ gần đây</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
              </span>
              Cập nhật trực tiếp
            </span>
          </div>

          {/* Sort & filter pills */}
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            <Pill active={sort === 'distance'} onClick={() => setSort('distance')}>Gần nhất</Pill>
            <Pill active={sort === 'price'} onClick={() => setSort('price')}>Rẻ nhất</Pill>
            <Pill active={sort === 'available'} onClick={() => setSort('available')}>Còn chỗ</Pill>
            <span className="mx-0.5 w-px self-stretch bg-white/30" />
            <Pill active={covered} onClick={() => setCovered((v) => !v)}>
              <IconRoof width={13} /> Mái che
            </Pill>
            <Pill active={openNow} onClick={() => setOpenNow((v) => !v)}>Đang mở</Pill>
            <Pill active={minRating > 0} onClick={() => setMinRating((v) => (v > 0 ? 0 : 4))}>
              <IconStar width={13} /> 4.0+
            </Pill>
          </div>
        </div>

        <div className="no-scrollbar mt-2 flex-1 space-y-2 overflow-y-auto px-4 pb-32">
          {visible.map((lot) => (
            <div
              key={lot.id}
              className={`rounded-2xl transition-all duration-500 ${
                flashIds.has(lot.id) ? 'ring-2 ring-brand-400 ring-offset-2' : ''
              }`}
            >
              <LotCard lot={lot} onClick={() => nav(`/lot/${lot.id}`)} />
            </div>
          ))}
          {visible.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">Không có bãi phù hợp bộ lọc.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniLotCard({
  lot,
  onClose,
  onDetail,
}: {
  lot: Lot;
  onClose: () => void;
  onDetail: () => void;
}) {
  const cap = capacityColor(lot.available_spots, lot.total_spots);
  return (
    <div className="glass-surface shadow-glass-lg flex items-center gap-3 rounded-3xl p-3">
      <img src={lot.image_url} alt={lot.name} className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <h3 className="truncate text-sm font-semibold text-slate-800">{lot.name}</h3>
          <button onClick={onClose} className="shrink-0 text-xl leading-none text-slate-400 transition hover:text-slate-600">
            ×
          </button>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          <span className="font-bold text-blue-600">{priceLabel(lot)}</span>
          <span className="flex items-center gap-1" style={{ color: cap.color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: cap.color }} />
            {lot.available_spots} chỗ
          </span>
          <span className="flex items-center gap-1 font-medium text-amber-500">
            <IconStar width={11} /> {lot.rating.toFixed(1)}
          </span>
          {lot.distance != null && <span className="text-slate-400">{formatDistance(lot.distance)}</span>}
        </div>
      </div>
      <button onClick={onDetail} className="btn-primary shrink-0 px-4 py-2 text-xs">
        Xem →
      </button>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 active:scale-95 ${
        active ? 'pill-active' : 'glass-white text-slate-600'
      }`}
    >
      {children}
    </button>
  );
}

function GpsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}
