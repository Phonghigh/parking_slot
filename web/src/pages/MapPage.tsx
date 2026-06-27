import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Lot } from '../api';
import { MapView } from '../components/MapView';
import { LotCard } from '../components/LotCard';
import { effectivePrice, formatDistance } from '../lib/format';
import { IconPin, IconStar, IconRoof } from '../components/icons';

const HCMC: [number, number] = [10.7769, 106.7009];

type SortKey = 'distance' | 'price' | 'available';

export function MapPage() {
  const nav = useNavigate();
  const [center, setCenter] = useState<[number, number]>(HCMC);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [activeId, setActiveId] = useState<number | undefined>();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [sort, setSort] = useState<SortKey>('distance');
  const [covered, setCovered] = useState(false);
  const [openNow, setOpenNow] = useState(false);
  const [minRating, setMinRating] = useState(0);

  const loadLots = (c: [number, number]) => {
    api.listLots(c[0], c[1]).then((r) => setLots(r.lots));
  };

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
      loadLots(c);
    });
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q=${encodeURIComponent(
          query
        )}`
      );
      const data = await res.json();
      if (data[0]) {
        const c: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        setCenter(c);
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
      {/* Map (nửa trên) */}
      <div className="relative h-[48vh] shrink-0">
        <MapView
          center={center}
          userPos={userPos}
          lots={visible}
          activeId={activeId}
          onSelect={(l) => {
            setActiveId(l.id);
            setCenter([l.lat, l.lng]);
          }}
          onMoveEnd={(c) => loadLots(c)}
        />
        {/* Search overlay */}
        <div className="absolute inset-x-0 top-0 z-10 p-3">
          <form onSubmit={search} className="flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-3 shadow-md">
              <IconPin width={18} className="text-brand-600" />
              <input
                className="flex-1 bg-transparent py-3 text-sm outline-none"
                placeholder="Tìm địa chỉ, trạm metro…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {searching && <span className="text-xs text-slate-400">…</span>}
            </div>
            <button type="button" onClick={useGps} className="grid w-12 place-items-center rounded-xl bg-white shadow-md" title="Vị trí của tôi">
              <GpsIcon />
            </button>
          </form>
        </div>
      </div>

      {/* Bottom sheet (nửa dưới) */}
      <div className="-mt-4 flex flex-1 flex-col rounded-t-3xl bg-slate-100 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-300" />
        <div className="px-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800">{visible.length} bãi đỗ gần đây</h2>
          </div>

          {/* Sort */}
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            <Pill active={sort === 'distance'} onClick={() => setSort('distance')}>Gần nhất</Pill>
            <Pill active={sort === 'price'} onClick={() => setSort('price')}>Rẻ nhất</Pill>
            <Pill active={sort === 'available'} onClick={() => setSort('available')}>Còn nhiều chỗ</Pill>
            <span className="mx-1 w-px bg-slate-200" />
            <Pill active={covered} onClick={() => setCovered((v) => !v)}>
              <IconRoof width={14} /> Mái che
            </Pill>
            <Pill active={openNow} onClick={() => setOpenNow((v) => !v)}>Đang mở</Pill>
            <Pill active={minRating > 0} onClick={() => setMinRating((v) => (v > 0 ? 0 : 4))}>
              <IconStar width={14} /> 4.0+
            </Pill>
          </div>
        </div>

        <div className="no-scrollbar mt-2 flex-1 space-y-2 overflow-y-auto px-4 pb-24">
          {visible.map((lot) => (
            <LotCard key={lot.id} lot={lot} onClick={() => nav(`/lot/${lot.id}`)} />
          ))}
          {visible.length === 0 && (
            <p className="py-10 text-center text-slate-400">Không có bãi phù hợp bộ lọc.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'
      }`}
    >
      {children}
    </button>
  );
}

function GpsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}
