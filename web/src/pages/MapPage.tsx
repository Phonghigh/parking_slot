import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, Lot } from '../api';
import { MapView } from '../components/MapView';
import { LotCard } from '../components/LotCard';
import { capacityColor, effectivePrice, formatDistance, formatVnd } from '../lib/format';
import {
  IconMenu, IconMic, IconList, IconTarget, IconSliders,
  IconPin, IconMap, IconRoof,
} from '../components/icons';
import { subscribeLotUpdates } from '../lib/liveEvents';

const HCMC: [number, number] = [10.7769, 106.7009];
type SortKey = 'distance' | 'price';

const AMENITIES: { key: string; label: string; svg: React.ReactNode }[] = [
  {
    key: 'covered',
    label: 'Mái che',
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7" />
      </svg>
    ),
  },
  {
    key: 'guarded',
    label: 'Giữ xe',
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="9" width="22" height="9" rx="2" />
        <path d="M6 18v2M18 18v2" />
        <path d="M3 9l2-5h14l2 5" />
        <circle cx="7.5" cy="13.5" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="16.5" cy="13.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    key: 'elevator',
    label: 'Thang máy',
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="2" width="18" height="20" rx="2" />
        <path d="M12 2v20M9 7l3-3 3 3M9 17l3 3 3-3" />
      </svg>
    ),
  },
  {
    key: 'ev',
    label: 'Sạc xe điện',
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 18H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" />
        <path d="M15 14h5l-5 6h5" />
        <path d="M7 14h2v4H7zM11 14h2v4h-2z" />
      </svg>
    ),
  },
  {
    key: 'restroom',
    label: 'Nhà vệ sinh',
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="4" r="1.5" />
        <circle cx="15" cy="4" r="1.5" />
        <path d="M6 8h4l1 6H7L6 8zM14 8h4l-1 7h-2l-1-7z" />
        <path d="M8 14v4M10 14v4M16 15v3" />
      </svg>
    ),
  },
  {
    key: 'h24',
    label: '24/7',
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    key: 'monthly',
    label: 'Thẻ tháng',
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
        <path d="M6 15h4M16 15h2" />
      </svg>
    ),
  },
  {
    key: 'camera',
    label: 'Camera',
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
];

export function MapPage() {
  const nav = useNavigate();
  const location = useLocation();
  const [center, setCenter] = useState<[number, number]>(HCMC);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [activeLot, setActiveLot] = useState<Lot | undefined>();
  const [searchPin, setSearchPin] = useState<{ coords: [number, number]; name: string } | null>(null);
  const [sort, setSort] = useState<SortKey>('distance');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [showList, setShowList] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [flashIds, setFlashIds] = useState<Set<number>>(new Set());

  // Applied filter state
  const [maxDist, setMaxDist] = useState<number | null>(null);
  const [priceFilter, setPriceFilter] = useState<'all' | 'under5' | '5to10' | 'over10'>('all');
  const [amenities, setAmenities] = useState<Set<string>>(new Set());
  const [minSpots, setMinSpots] = useState<number | null>(null);

  // Draft state (edited inside modal, applied on confirm)
  const [draftMaxDist, setDraftMaxDist] = useState<number | null>(null);
  const [draftPriceFilter, setDraftPriceFilter] = useState<'all' | 'under5' | '5to10' | 'over10'>('all');
  const [draftAmenities, setDraftAmenities] = useState<Set<string>>(new Set());
  const [draftMinSpots, setDraftMinSpots] = useState<number | null>(null);

  const openFilterSheet = () => {
    setDraftMaxDist(maxDist);
    setDraftPriceFilter(priceFilter);
    setDraftAmenities(new Set(amenities));
    setDraftMinSpots(minSpots);
    setShowFilters(true);
  };

  const applyFilters = () => {
    setMaxDist(draftMaxDist);
    setPriceFilter(draftPriceFilter);
    setAmenities(new Set(draftAmenities));
    setMinSpots(draftMinSpots);
    setShowFilters(false);
  };

  const resetDraft = () => {
    setDraftMaxDist(null);
    setDraftPriceFilter('all');
    setDraftAmenities(new Set());
    setDraftMinSpots(null);
  };

  const toggleDraftAmenity = (key: string) => {
    setDraftAmenities((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const draftFilterCount =
    (draftMaxDist !== null ? 1 : 0) +
    (draftPriceFilter !== 'all' ? 1 : 0) +
    draftAmenities.size +
    (draftMinSpots !== null ? 1 : 0);

  const loadLots = (c: [number, number]) => {
    api.listLots(c[0], c[1]).then((r) => setLots(r.lots));
  };

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

  // Receive navigation state from SearchPage
  useEffect(() => {
    const state = location.state as any;
    const fly = state?.flyTo;
    const selectLot = state?.selectLot;

    if (selectLot) {
      const coords: [number, number] = [selectLot.lat, selectLot.lng];
      setCenter(coords);
      setActiveLot(selectLot);
      setSearchPin(null);
      setShowList(false);
      loadLots(coords);
      // Briefly ping the marker
      setFlashIds(new Set([selectLot.id]));
      setTimeout(() => setFlashIds(new Set()), 1600);
      window.history.replaceState({}, '');
    } else if (fly) {
      setCenter(fly.coords);
      setSearchPin({ coords: fly.coords, name: fly.name });
      loadLots(fly.coords);
      window.history.replaceState({}, '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

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

  const visible = useMemo(() => {
    let list = lots.filter((l) => {
      if (onlyAvailable && l.available_spots <= 0) return false;
      if (maxDist !== null && (l.distance ?? 999) > maxDist) return false;
      if (priceFilter === 'under5' && effectivePrice(l) >= 5000) return false;
      if (priceFilter === '5to10' && (effectivePrice(l) < 5000 || effectivePrice(l) > 10000)) return false;
      if (priceFilter === 'over10' && effectivePrice(l) <= 10000) return false;
      if (amenities.has('covered') && !l.covered) return false;
      if (minSpots !== null && l.available_spots < minSpots) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'price') return effectivePrice(a) - effectivePrice(b);
      return (a.distance ?? 9e9) - (b.distance ?? 9e9);
    });
    return list;
  }, [lots, onlyAvailable, maxDist, priceFilter, amenities, minSpots, sort]);

  const bestLot = useMemo(
    () => visible.find((l) => l.available_spots > 0) ?? visible[0] ?? null,
    [visible]
  );

  const activeFilterCount =
    (maxDist !== null ? 1 : 0) +
    (priceFilter !== 'all' ? 1 : 0) +
    amenities.size +
    (minSpots !== null ? 1 : 0);

  return (
    <div className="relative h-full overflow-hidden">
      {/* ── Map — full screen background ────────────────────────── */}
      <MapView
        center={center}
        userPos={userPos}
        lots={visible}
        activeId={activeLot?.id}
        searchPin={searchPin}
        onSelect={(l) => {
          setActiveLot(l);
          setCenter([l.lat, l.lng]);
          setShowList(false);
        }}
        onMoveEnd={(c) => loadLots(c)}
        onMapClick={() => { setActiveLot(undefined); setSearchPin(null); }}
      />

      {/* ── Floating search pill ────────────────────────────────── */}
      <div className="absolute inset-x-4 top-3 z-10">
        <div
          className="flex items-center gap-2 rounded-2xl px-2 py-2"
          style={{
            background: 'rgba(255,255,255,0.90)',
            backdropFilter: 'blur(32px) saturate(200%)',
            WebkitBackdropFilter: 'blur(32px) saturate(200%)',
            border: '1px solid rgba(255,255,255,0.85)',
            boxShadow:
              'inset 0 1.5px 0 rgba(255,255,255,0.98), 0 0 0 0.5px rgba(0,0,0,0.06), 0 8px 24px rgba(31,38,135,0.14)',
          }}
        >
          {/* <button
            type="button"
            className="shrink-0 rounded-xl p-1.5 text-slate-500 transition hover:bg-black/5 active:scale-95"
          >
            <IconMenu width={18} />
          </button> */}

          <button
            onClick={() => nav('/search', { state: { userPos } })}
            className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-left transition active:scale-[0.98]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" className="shrink-0 text-slate-400">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <span className="flex-1 text-sm text-slate-400">Tìm bãi xe, địa điểm, tòa nhà...</span>
          </button>

          <button
            type="button"
            onClick={() => nav('/search', { state: { userPos } })}
            className="shrink-0 rounded-xl p-1.5 text-slate-400 transition hover:text-blue-500 active:scale-95"
          >
            <IconMic width={17} />
          </button>
        </div>
      </div>

      {/* ── Floating filter chips ────────────────────────────────── */}
      <div className="absolute inset-x-0 z-10" style={{ top: '68px' }}>
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 pb-1">
          <FilterChip active onClick={useGps}>
            <IconPin width={13} /> Gần tôi
          </FilterChip>
          <FilterChip active={onlyAvailable} onClick={() => setOnlyAvailable((v) => !v)}>
            Còn chỗ
          </FilterChip>
          <FilterChip
            active={sort === 'price'}
            onClick={() => setSort((v) => (v === 'price' ? 'distance' : 'price'))}
          >
            Giá rẻ
          </FilterChip>
          <FilterChip active={amenities.has('covered')} onClick={() => {
            setAmenities((prev) => { const n = new Set(prev); n.has('covered') ? n.delete('covered') : n.add('covered'); return n; });
          }}>
            <IconRoof width={13} /> Mái che
          </FilterChip>
          <button
            onClick={openFilterSheet}
            className={`relative shrink-0 rounded-xl p-2.5 shadow-sm transition active:scale-95 ${
              activeFilterCount > 0 ? 'pill-active' : 'glass-icon text-slate-600'
            }`}
          >
            <IconSliders width={16} />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Filter bottom sheet ─────────────────────────────────── */}
      {showFilters && (
        <>
          {/* Backdrop */}
          <div
            className="absolute inset-0 z-[1100] bg-black/30 backdrop-blur-[2px]"
            onClick={() => setShowFilters(false)}
          />
          {/* Sheet */}
          <div
            className="absolute inset-x-0 bottom-0 z-[1200] animate-fade-slide-up rounded-t-[28px] pb-8"
            style={{
              background: '#fff',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
              maxHeight: '88vh',
              overflowY: 'auto',
            }}
          >
            {/* Handle */}
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-slate-200" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <button
                onClick={() => setShowFilters(false)}
                className="text-xl leading-none text-slate-400 transition hover:text-slate-600"
              >×</button>
              <span className="text-base font-bold text-slate-800">Bộ lọc</span>
              <button
                onClick={resetDraft}
                className="text-sm font-medium text-blue-500 transition hover:text-blue-700"
              >Xóa tất cả</button>
            </div>

            <div className="px-5 pt-2 space-y-6">
              {/* Khoảng cách */}
              <div>
                <p className="mb-3 text-sm font-bold text-slate-700">Khoảng cách</p>
                <div className="flex gap-2 flex-wrap">
                  {([null, 0.5, 1, 2, 5] as const).map((d) => (
                    <button
                      key={String(d)}
                      onClick={() => setDraftMaxDist(d)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                        draftMaxDist === d
                          ? 'bg-[#1a3a6b] text-white'
                          : 'border border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {d === null ? 'Tất cả' : d < 1 ? `${d * 1000}m` : `${d} km`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Giá */}
              <div>
                <p className="mb-3 text-sm font-bold text-slate-700">Giá</p>
                <div className="flex gap-2 flex-wrap">
                  {(
                    [
                      { key: 'all', label: 'Tất cả' },
                      { key: 'under5', label: 'Dưới 5k' },
                      { key: '5to10', label: '5k – 10k' },
                      { key: 'over10', label: 'Trên 10k' },
                    ] as const
                  ).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setDraftPriceFilter(key)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                        draftPriceFilter === key
                          ? 'bg-[#1a3a6b] text-white'
                          : 'border border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tiện ích */}
              <div>
                <p className="mb-3 text-sm font-bold text-slate-700">Tiện ích</p>
                <div className="grid grid-cols-4 gap-3">
                  {AMENITIES.map(({ key, label, svg }) => {
                    const active = draftAmenities.has(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleDraftAmenity(key)}
                        style={{
                          background: active ? '#1a3a6b' : 'rgba(248,250,252,1)',
                          boxShadow: active
                            ? '0 4px 16px rgba(26,58,107,0.28), inset 0 1px 0 rgba(255,255,255,0.12)'
                            : '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
                          border: active ? '1.5px solid rgba(26,58,107,0.6)' : '1.5px solid rgba(226,232,240,0.8)',
                        }}
                        className="flex flex-col items-center gap-2 rounded-2xl px-1 py-3.5 transition-all duration-200 active:scale-95"
                      >
                        <span style={{ color: active ? '#fff' : '#475569' }}>
                          {svg}
                        </span>
                        <span
                          className="text-center text-[11px] font-semibold leading-tight"
                          style={{ color: active ? 'rgba(255,255,255,0.9)' : '#64748b' }}
                        >
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Số chỗ trống */}
              <div>
                <p className="mb-3 text-sm font-bold text-slate-700">Số chỗ trống</p>
                <div className="flex gap-2 flex-wrap">
                  {(
                    [
                      { val: null, label: 'Tất cả' },
                      { val: 50, label: 'Trên 50' },
                      { val: 20, label: 'Trên 20' },
                      { val: 10, label: 'Trên 10' },
                    ] as const
                  ).map(({ val, label }) => (
                    <button
                      key={String(val)}
                      onClick={() => setDraftMinSpots(val)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                        draftMinSpots === val
                          ? 'bg-[#1a3a6b] text-white'
                          : 'border border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="sticky bottom-0 mt-6 border-t border-slate-100 bg-white px-5 pt-4 pb-2">
              <button
                onClick={applyFilters}
                className="w-full rounded-2xl bg-[#1a3a6b] py-3.5 text-sm font-bold text-white transition active:scale-[0.98]"
              >
                {draftFilterCount > 0 ? `Áp dụng (${draftFilterCount})` : 'Áp dụng'}
              </button>
              <button
                onClick={resetDraft}
                className="mt-3 w-full py-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
              >
                Đặt lại
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Right floating buttons ───────────────────────────────── */}
      <div className="absolute right-3 top-1/2 z-[1000] flex -translate-y-1/2 flex-col gap-2">
        <button
          onClick={() => { setShowList((v) => !v); setActiveLot(undefined); }}
          className={`grid h-10 w-10 place-items-center rounded-2xl shadow-md transition active:scale-95 ${
            showList ? 'bg-blue-500 text-white' : 'glass-icon text-slate-600'
          }`}
          title={showList ? 'Xem bản đồ' : 'Xem danh sách'}
        >
          {showList ? <IconMap width={18} /> : <IconList width={18} />}
        </button>
        <button
          onClick={useGps}
          className="glass-icon grid h-10 w-10 place-items-center rounded-2xl shadow-md transition active:scale-95"
          title="Vị trí của tôi"
        >
          <IconTarget width={18} className="text-blue-500" />
        </button>
      </div>

      {/* ── Lot detail floating card (tap marker) ───────────────── */}
      {activeLot && !showList && (
        <div
          key={activeLot.id}
          className="absolute inset-x-4 bottom-24 z-[1000] animate-spring-up"
        >
          <MiniLotCard
            lot={activeLot}
            onClose={() => setActiveLot(undefined)}
            onDetail={() => nav(`/lot/${activeLot.id}`)}
          />
        </div>
      )}

      {/* ── Floating list panel ──────────────────────────────────── */}
      {showList && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 flex animate-fade-slide-up flex-col rounded-t-[28px]"
          style={{
            maxHeight: '60vh',
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(32px) saturate(200%)',
            WebkitBackdropFilter: 'blur(32px) saturate(200%)',
            borderTop: '1px solid rgba(255,255,255,0.85)',
            boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.95), 0 -8px 32px rgba(31,38,135,0.10)',
          }}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-300/60" />
          <div className="flex shrink-0 items-center justify-between px-4 pb-1 pt-2">
            <h2 className="text-sm font-bold text-slate-700">{visible.length} bãi đỗ gần đây</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
              </span>
              Cập nhật trực tiếp
            </span>
          </div>
          <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-4 pb-28 pt-1">
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
      )}

      {/* ── Floating suggestion card ─────────────────────────────── */}
      {!showList && !activeLot && bestLot && (
        <div className="absolute inset-x-5 bottom-24 z-10 animate-spring-up">
          <SuggestionCard lot={bestLot} onDetail={() => nav(`/lot/${bestLot.id}`)} />
        </div>
      )}
    </div>
  );
}

function SuggestionCard({ lot, onDetail }: { lot: Lot; onDetail: () => void }) {
  const cap = capacityColor(lot.available_spots, lot.total_spots);
  const spots = useCountUp(lot.available_spots, 800);
  const walkMins = Math.max(1, Math.round(((lot.distance ?? 0) * 1000) / 80));

  return (
    <div
      className="overflow-hidden rounded-3xl"
      style={{
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.75)',
        boxShadow:
          'inset 0 1.5px 0 rgba(255,255,255,0.95), 0 8px 32px rgba(31,38,135,0.14), 0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-[11px] font-medium text-slate-400">Gợi ý tốt nhất</span>
        <button
          onClick={onDetail}
          className="flex items-center gap-0.5 text-sm font-semibold text-slate-700 transition active:scale-95"
        >
          {lot.name}
          <span className="ml-1 text-slate-400">›</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 px-1 py-3 text-center">
        <div className="relative px-2">
          <div
            className="animate-blob-pulse pointer-events-none absolute inset-0 rounded-full blur-2xl"
            style={{ background: cap.color, opacity: 0.18 }}
          />
          <div className="animate-count-up relative text-xl font-extrabold leading-tight" style={{ color: cap.color }}>
            {spots}
          </div>
          <div className="text-[10px] text-slate-400">chỗ trống</div>
        </div>
        <div className="px-2">
          <div className="text-xl font-bold leading-tight text-slate-800">{walkMins} phút</div>
          <div className="text-[10px] text-slate-400">({formatDistance(lot.distance)})</div>
        </div>
        <div className="px-2">
          <div className="text-xl font-bold leading-tight text-slate-800">{formatVnd(effectivePrice(lot))}</div>
          <div className="text-[10px] text-slate-400">/giờ</div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-3 pb-3">
        <button
          onClick={() =>
            window.open(
              `https://www.google.com/maps/dir/?api=1&destination=${lot.lat},${lot.lng}`,
              '_blank'
            )
          }
          className="liquid-btn w-full rounded-2xl py-3 text-sm font-bold text-white"
        >
          ▲ Dẫn đường
        </button>
      </div>
    </div>
  );
}

function useCountUp(target: number, duration = 700) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setCount(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return count;
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
  const walkMins = Math.max(1, Math.round(((lot.distance ?? 0) * 1000) / 80));
  const animatedSpots = useCountUp(lot.available_spots);

  return (
    <div
      className="overflow-hidden rounded-3xl"
      style={{
        background: 'rgba(255,255,255,0.86)',
        backdropFilter: 'blur(32px) saturate(200%)',
        WebkitBackdropFilter: 'blur(32px) saturate(200%)',
        border: '1px solid rgba(255,255,255,0.80)',
        boxShadow:
          'inset 0 1.5px 0 rgba(255,255,255,0.98), 0 12px 40px rgba(31,38,135,0.16), 0 2px 8px rgba(0,0,0,0.07)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-bold text-slate-800">{lot.name}</h3>
            <span className="shrink-0 text-[11px] font-semibold text-amber-500">★ {lot.rating.toFixed(1)}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {lot.distance != null ? `${formatDistance(lot.distance)} · ` : ''}{walkMins} phút đi bộ
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={onDetail}
            className="flex items-center gap-1 rounded-full bg-blue-500 px-3.5 py-1.5 text-xs font-bold text-white shadow shadow-blue-200 transition active:scale-95"
          >
            Xem →
          </button>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-full bg-black/6 text-slate-400 transition active:scale-95"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 3-col stats */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 px-1 py-3 text-center">
        <div className="relative px-2">
          <div
            className="animate-blob-pulse pointer-events-none absolute inset-0 rounded-full blur-2xl"
            style={{ background: cap.color, opacity: 0.22 }}
          />
          <div className="animate-count-up relative text-xl font-extrabold leading-tight" style={{ color: cap.color }}>
            {animatedSpots}
          </div>
          <div className="text-[10px] text-slate-400">chỗ trống</div>
        </div>
        <div className="px-2">
          <div className="text-xl font-bold leading-tight text-slate-800">{walkMins} phút</div>
          <div className="text-[10px] text-slate-400">({formatDistance(lot.distance)})</div>
        </div>
        <div className="px-2">
          <div className="text-xl font-bold leading-tight text-slate-800">{formatVnd(effectivePrice(lot))}</div>
          <div className="text-[10px] text-slate-400">/giờ</div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-3 pb-3">
        <button
          onClick={() =>
            window.open(
              `https://www.google.com/maps/dir/?api=1&destination=${lot.lat},${lot.lng}`,
              '_blank'
            )
          }
          className="liquid-btn w-full rounded-2xl py-3 text-sm font-bold text-white"
        >
          ▲ Dẫn đường
        </button>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold shadow-sm transition-all duration-200 active:scale-95 ${
        active ? 'pill-active' : 'glass-white text-slate-600'
      }`}
    >
      {children}
    </button>
  );
}
