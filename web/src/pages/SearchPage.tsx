import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, Lot } from '../api';
import { capacityColor, effectivePrice, formatDistance, formatVnd } from '../lib/format';
import { IconBack, IconPin, IconDirections } from '../components/icons';

// ── Types ────────────────────────────────────────────────────────────────────
type Tab = 'all' | 'lots' | 'places' | 'buildings';

interface NominatimResult {
  place_id: number;
  display_name: string;
  name: string;
  lat: string;
  lon: string;
  class: string;
  type: string;
  address?: {
    road?: string;
    suburb?: string;
    quarter?: string;
    city_district?: string;
    city?: string;
    town?: string;
    county?: string;
  };
}

// ── Vietnamese text helpers ───────────────────────────────────────────────────

/** Strip Vietnamese diacritics + đ → d, lowercase. "Thảo Điền" → "thao dien" */
function normalizeVi(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

/** Score how well `query` matches `text`. Higher = better match. */
function scoreMatch(text: string, query: string): number {
  const normText = normalizeVi(text);
  const normQ = normalizeVi(query);
  if (!normQ) return 0;
  if (normText === normQ) return 100;
  if (normText.startsWith(normQ)) return 90;
  // word-boundary match
  if (normText.split(/\s+/).some((w) => w.startsWith(normQ))) return 70;
  if (normText.includes(normQ)) return 50;
  // partial word match (each query word appears somewhere)
  const qWords = normQ.split(/\s+/).filter(Boolean);
  if (qWords.length > 1 && qWords.every((w) => normText.includes(w))) return 40;
  return 0;
}

// ── Haversine ─────────────────────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function walkMinutes(distKm: number): number {
  return Math.max(1, Math.round((distKm * 1000) / 80));
}

// ── Place helpers ─────────────────────────────────────────────────────────────
const PLACE_CLASSES = new Set(['amenity', 'leisure', 'tourism', 'natural', 'historic', 'railway', 'public_transport']);

function placeCategory(r: NominatimResult): 'places' | 'buildings' {
  return PLACE_CLASSES.has(r.class) ? 'places' : 'buildings';
}

function placeAddress(r: NominatimResult): string {
  const a = r.address;
  if (!a) return r.display_name.split(',').slice(1, 3).join(',').trim();
  const parts = [
    a.road,
    a.suburb ?? a.quarter ?? a.city_district,
    a.city ?? a.town ?? a.county,
  ].filter(Boolean);
  return parts.join(', ');
}

function placeName(r: NominatimResult): string {
  return r.name || r.display_name.split(',')[0].trim();
}

// ── Recent searches (localStorage) ───────────────────────────────────────────
const RECENT_KEY = 'gopark_recent_searches';

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
}
function saveRecent(q: string) {
  const list = [q, ...getRecent().filter((s) => s !== q)].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}
function clearRecent() {
  localStorage.removeItem(RECENT_KEY);
}

// ── Main component ────────────────────────────────────────────────────────────
export function SearchPage() {
  const nav = useNavigate();
  const { state } = useLocation() as { state?: { userPos?: [number, number] } };
  const userPos = state?.userPos ?? null;

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [allLots, setAllLots] = useState<Lot[]>([]);
  const [nominatim, setNominatim] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>(getRecent);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load lots once on mount
  useEffect(() => {
    api.listLots(userPos?.[0], userPos?.[1]).then((r) => setAllLots(r.lots));
    // slight delay so keyboard animation doesn't fight focus
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced Nominatim search with Vietnamese language header
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) { setNominatim([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Try original query first; fall back to normalized if empty
        const tryQuery = async (text: string) => {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&countrycodes=vn&accept-language=vi&q=${encodeURIComponent(text)}`,
            { headers: { 'Accept-Language': 'vi' } }
          );
          return res.json() as Promise<NominatimResult[]>;
        };

        let data = await tryQuery(q);
        if (data.length === 0) {
          // fallback: try normalized (e.g. "thao dien" → finds "Thảo Điền")
          data = await tryQuery(normalizeVi(q));
        }
        setNominatim(data);
      } catch {
        setNominatim([]);
      } finally {
        setLoading(false);
      }
    }, 320);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Relevance-sorted lot filter with Vietnamese normalization
  const filteredLots = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return allLots
      .map((l) => {
        const nameScore = scoreMatch(l.name, q);
        const addrScore = scoreMatch(l.address ?? '', q) * 0.6;
        return { lot: l, score: Math.max(nameScore, addrScore) };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || (a.lot.distance ?? 9e9) - (b.lot.distance ?? 9e9))
      .map(({ lot }) => lot);
  }, [allLots, query]);

  const placesResults = useMemo(() => nominatim.filter((r) => placeCategory(r) === 'places'), [nominatim]);
  const buildingsResults = useMemo(() => nominatim.filter((r) => placeCategory(r) === 'buildings'), [nominatim]);

  const lotsToShow      = tab === 'all' || tab === 'lots'      ? filteredLots     : [];
  const placesToShow    = tab === 'all' || tab === 'places'    ? placesResults     : [];
  const buildingsToShow = tab === 'all' || tab === 'buildings' ? buildingsResults  : [];
  const hasResults = lotsToShow.length > 0 || placesToShow.length > 0 || buildingsToShow.length > 0;

  const goToPlace = useCallback((r: NominatimResult) => {
    const coords: [number, number] = [parseFloat(r.lat), parseFloat(r.lon)];
    saveRecent(placeName(r));
    setRecent(getRecent());
    nav('/', { state: { flyTo: { coords, name: placeName(r) } } });
  }, [nav]);

  const submitQuery = useCallback((q: string) => {
    if (!q.trim()) return;
    saveRecent(q.trim());
    setRecent(getRecent());
    setQuery(q.trim());
  }, []);

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'all',       label: 'Tất cả',    count: filteredLots.length + placesResults.length + buildingsResults.length },
    { key: 'lots',      label: 'Bãi xe',    count: filteredLots.length },
    { key: 'places',    label: 'Địa điểm',  count: placesResults.length },
    { key: 'buildings', label: 'Tòa nhà',   count: buildingsResults.length },
  ];

  const showEmpty = !query.trim();
  const showNoResults = query.trim() && !loading && !hasResults;

  return (
    <div className="flex h-full flex-col" style={{ background: '#F5F5F7' }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        {/* Search row */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-0">
          <button
            onClick={() => nav(-1 as never)}
            className="shrink-0 rounded-xl p-2 text-slate-500 transition hover:bg-black/5 active:scale-95"
            aria-label="Quay lại"
          >
            <IconBack width={20} />
          </button>

          <div
            className="flex flex-1 items-center gap-2 rounded-2xl px-3.5 py-2.5"
            style={{
              background: 'rgba(120,120,128,0.12)',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            {/* Search icon */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" className="shrink-0 text-slate-400">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>

            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              placeholder="Tìm bãi xe, địa điểm, tòa nhà..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitQuery(query)}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />

            {/* Spinner while searching Nominatim */}
            {loading && (
              <svg className="shrink-0 animate-spin text-slate-400" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}

            {/* Clear */}
            {query && !loading && (
              <button
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                className="shrink-0 grid h-5 w-5 place-items-center rounded-full bg-slate-400/60 text-white transition hover:bg-slate-500/60 active:scale-90"
                aria-label="Xóa"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <button
            onClick={() => nav('/')}
            className="shrink-0 px-1 text-sm font-semibold text-blue-500 transition active:scale-95"
          >
            Hủy
          </button>
        </div>

        {/* ── Category tabs ─────────────────────────────────────────── */}
        <div className="no-scrollbar mt-2 flex overflow-x-auto">
          {TABS.map(({ key, label, count }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="relative shrink-0 px-4 pb-3 pt-1 text-sm font-semibold transition-colors duration-150"
                style={{ color: active ? '#007AFF' : '#8E8E93' }}
              >
                <span className="flex items-center gap-1.5">
                  {label}
                  {query.trim() && count > 0 && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
                      style={{
                        background: active ? 'rgba(0,122,255,0.12)' : 'rgba(142,142,147,0.14)',
                        color: active ? '#007AFF' : '#8E8E93',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </span>
                {/* Active underline */}
                {active && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-[2.5px] rounded-full"
                    style={{ background: '#007AFF' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      <div className="no-scrollbar flex-1 overflow-y-auto">

        {/* Empty state - show recent searches */}
        {showEmpty && (
          <div className="px-4 pt-4">
            {recent.length > 0 ? (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tìm kiếm gần đây</span>
                  <button
                    onClick={() => { clearRecent(); setRecent([]); }}
                    className="text-xs font-medium text-blue-500 transition active:scale-95"
                  >
                    Xóa
                  </button>
                </div>
                <div className="space-y-0.5 rounded-2xl bg-white shadow-sm overflow-hidden">
                  {recent.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => { setQuery(r); inputRef.current?.focus(); }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 active:scale-[0.98]"
                      style={{ borderBottom: i < recent.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" className="shrink-0 text-slate-400">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                      </svg>
                      <span className="flex-1 text-sm text-slate-700">{r}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.5" strokeLinecap="round" className="shrink-0 rotate-45 text-slate-300">
                        <path d="M7 17L17 7M7 7h10v10" />
                      </svg>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-12 text-center text-sm text-slate-400">
                Nhập tên bãi xe, địa điểm hoặc tòa nhà…
              </p>
            )}
          </div>
        )}

        {/* No results */}
        {showNoResults && (
          <div className="mt-12 px-4 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-slate-100">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" className="text-slate-400">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">
              Không tìm thấy kết quả
            </p>
            <p className="mt-1 text-xs text-slate-400">
              cho "<span className="font-semibold">{query}</span>"
            </p>
          </div>
        )}

        {/* ── Parking lots ─────────────────────────────────────────── */}
        {lotsToShow.length > 0 && (
          <ResultSection
            title="Bãi xe"
            total={filteredLots.length}
            limit={tab === 'lots' ? undefined : 3}
            onSeeAll={() => setTab('lots')}
          >
            {lotsToShow.slice(0, tab === 'lots' ? undefined : 3).map((lot) => (
              <LotResultRow
                key={lot.id}
                lot={lot}
                query={query}
                onClick={() => { saveRecent(lot.name); setRecent(getRecent()); nav('/', { state: { selectLot: lot } }); }}
              />
            ))}
          </ResultSection>
        )}

        {/* ── Địa điểm ─────────────────────────────────────────────── */}
        {placesToShow.length > 0 && (
          <ResultSection
            title={buildingsToShow.length > 0 ? 'Địa điểm' : 'Tòa nhà / Địa điểm'}
            total={placesResults.length}
            limit={tab === 'places' ? undefined : 3}
            onSeeAll={() => setTab('places')}
          >
            {placesToShow.slice(0, tab === 'places' ? undefined : 3).map((r) => (
              <PlaceResultRow key={r.place_id} result={r} userPos={userPos} query={query} onClick={() => goToPlace(r)} />
            ))}
          </ResultSection>
        )}

        {/* ── Tòa nhà ──────────────────────────────────────────────── */}
        {buildingsToShow.length > 0 && (
          <ResultSection
            title="Tòa nhà"
            total={buildingsResults.length}
            limit={tab === 'buildings' ? undefined : 3}
            onSeeAll={() => setTab('buildings')}
          >
            {buildingsToShow.slice(0, tab === 'buildings' ? undefined : 3).map((r) => (
              <PlaceResultRow key={r.place_id} result={r} userPos={userPos} query={query} onClick={() => goToPlace(r)} />
            ))}
          </ResultSection>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ResultSection({
  title,
  total,
  limit,
  onSeeAll,
  children,
}: {
  title: string;
  total: number;
  limit?: number;
  onSeeAll: () => void;
  children: React.ReactNode;
}) {
  const truncated = limit != null && total > limit;
  return (
    <div className="px-4 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        {truncated && (
          <button onClick={onSeeAll} className="text-xs font-semibold text-blue-500 transition active:scale-95">
            Xem tất cả
          </button>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {children}
      </div>
    </div>
  );
}

function HighlightText({ text, query }: { text: string; query: string }) {
  const normText = normalizeVi(text);
  const normQ = normalizeVi(query);
  if (!normQ || !normText.includes(normQ)) return <>{text}</>;

  // Find the position in the normalized text, then map back character-by-character
  const idx = normText.indexOf(normQ);

  // Walk original text to find real char positions matching normalized offset
  let normPos = 0;
  let startReal = -1;
  let endReal = -1;
  for (let i = 0; i < text.length; i++) {
    const normChar = normalizeVi(text[i]);
    if (normPos === idx && startReal === -1) startReal = i;
    normPos += normChar.length;
    if (normPos === idx + normQ.length && endReal === -1) { endReal = i + 1; break; }
  }
  if (startReal === -1 || endReal === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, startReal)}
      <mark className="rounded bg-blue-100 px-0.5 text-blue-700" style={{ background: 'rgba(0,122,255,0.12)', color: '#007AFF' }}>
        {text.slice(startReal, endReal)}
      </mark>
      {text.slice(endReal)}
    </>
  );
}

function LotResultRow({ lot, query, onClick }: { lot: Lot; query: string; onClick: () => void }) {
  const cap = capacityColor(lot.available_spots, lot.total_spots);
  const distKm = lot.distance ?? 0;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 active:scale-[0.99]"
      style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}
    >
      {/* Spots */}
      <div className="w-11 shrink-0 text-center">
        <div className="text-xl font-extrabold leading-none" style={{ color: cap.color }}>
          {lot.available_spots}
        </div>
        <div className="mt-0.5 text-[10px] font-medium leading-snug text-slate-400">chỗ<br />trống</div>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-800">
          <HighlightText text={lot.name} query={query} />
        </div>
        <div className="mt-0.5 text-xs text-slate-400">
          {walkMinutes(distKm)} phút
          {distKm > 0 && <> · {formatDistance(distKm)}</>}
          {' · '}{formatVnd(effectivePrice(lot))}/giờ
        </div>
      </div>

      {/* Navigate */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          window.open(`https://www.google.com/maps/dir/?api=1&destination=${lot.lat},${lot.lng}`, '_blank');
        }}
        className="shrink-0 grid h-9 w-9 place-items-center rounded-full transition hover:bg-blue-50 active:scale-90"
        style={{ background: 'rgba(0,122,255,0.10)', color: '#007AFF' }}
      >
        <IconDirections width={16} />
      </button>
    </button>
  );
}

function PlaceResultRow({
  result, userPos, query, onClick,
}: {
  result: NominatimResult;
  userPos: [number, number] | null;
  query: string;
  onClick: () => void;
}) {
  const distKm = userPos
    ? haversineKm(userPos[0], userPos[1], parseFloat(result.lat), parseFloat(result.lon))
    : null;
  const name = placeName(result);
  const addr = placeAddress(result);

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 active:scale-[0.99]"
      style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}
    >
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
        style={{ background: 'rgba(120,120,128,0.10)' }}
      >
        <IconPin width={15} className="text-slate-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-800">
          <HighlightText text={name} query={query} />
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
          {addr && <span className="truncate">{addr}</span>}
          {distKm != null && (
            <>
              {addr && <span className="shrink-0">·</span>}
              <span className="shrink-0">{formatDistance(distKm)}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
