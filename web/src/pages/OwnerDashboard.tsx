import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Lot, OwnerStats, ActivityEvent } from '../api';
import { formatVnd, formatClock, capacityColor } from '../lib/format';
import {
  IconWallet, IconCar, IconHistory, IconQr, IconRefresh, IconCheck, IconClock,
} from '../components/icons';

export function OwnerDashboard() {
  const nav = useNavigate();
  const [lot, setLot] = useState<Lot | null>(null);
  const [stats, setStats] = useState<OwnerStats | null>(null);

  const load = () =>
    api.ownerStats().then((r) => {
      setLot(r.lot);
      setStats(r.stats);
    }).catch(() => {});

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  if (!lot || !stats)
    return (
      <div className="grid h-64 place-items-center text-slate-400">
        <div className="text-center">
          <div className="skeleton mx-auto mb-3 h-10 w-10" />
          <p className="text-sm">Đang tải số liệu…</p>
        </div>
      </div>
    );

  const cap = capacityColor(stats.available, stats.total);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-slate-800">Tổng quan</h1>
        <p className="mt-0.5 text-sm text-slate-500">{lot.name} · {lot.address}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Hero capacity */}
        <div className="card relative overflow-hidden p-6 lg:col-span-2">
          <span className="pointer-events-none absolute -right-4 -top-8 select-none text-[160px] font-black leading-none text-brand-500/10">G</span>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
            <CapacityGauge pct={stats.occupancyPct} color={cap.color} />
            <div className="min-w-0 flex-1">
              <span className="glass-green inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-brand-700">
                <span className="h-2 w-2 rounded-full" style={{ background: cap.color }} /> Sức chứa trực tiếp
              </span>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-5xl font-black tracking-tight text-slate-800">{stats.available}</span>
                <span className="pb-1.5 text-lg font-semibold text-slate-400">/ {stats.total} chỗ trống</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                <b className="text-slate-700">{stats.currentVehicles}</b> xe đang gửi ·{' '}
                <span style={{ color: cap.color }} className="font-semibold">{cap.label}</span>
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <CapacityUpdater
                  lot={lot}
                  onSaved={(l) => { setLot(l); setStats({ ...stats, available: l.available_spots, occupancyPct: Math.round(((l.total_spots - l.available_spots) / l.total_spots) * 100) }); }}
                />
                <button onClick={() => nav('/owner/operations')} className="btn-green px-4 py-2.5 text-sm">
                  <IconQr width={18} /> Mở vận hành
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Shortcuts */}
        <div className="card p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Lối tắt</h3>
          <div className="mt-3 space-y-2.5">
            <Shortcut grad="from-emerald-400 to-emerald-600" icon={<IconQr width={18} />} title="Check-in / Checkout" sub="Quét QR khách" onClick={() => nav('/owner/operations')} />
            <Shortcut grad="from-sky-400 to-blue-500" icon={<IconHistory width={18} />} title="Hồ sơ bãi" sub="Thông tin & tiện ích" onClick={() => nav('/owner/profile')} />
            <Shortcut grad="from-amber-400 to-orange-500" icon={<IconRefresh width={18} />} title="Làm mới số liệu" sub="Cập nhật realtime" onClick={load} />
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        <StatCard
          grad="from-emerald-400 to-emerald-600"
          icon={<IconWallet width={20} />}
          label="Doanh thu hôm nay"
          value={formatVnd(stats.todayEarnings)}
          foot={
            stats.earningsDeltaPct == null ? (
              <span className="text-slate-400">-</span>
            ) : (
              <Trend up={stats.earningsDeltaPct >= 0} text={`${Math.abs(stats.earningsDeltaPct)}% so với hôm qua`} />
            )
          }
        />
        <StatCard
          grad="from-sky-400 to-blue-500"
          icon={<IconCar width={20} />}
          label="Xe đang gửi"
          value={String(stats.currentVehicles)}
          foot={<span className="flex items-center gap-1 text-slate-400"><IconClock width={13} /> TB {stats.avgStayHours} giờ/lượt</span>}
        />
        <StatCard
          grad="from-amber-400 to-orange-500"
          icon={<IconCheck width={20} />}
          label="Lượt vào hôm nay"
          value={String(stats.checkinsToday)}
          foot={<span className="text-slate-400">Tổng số xe đã check-in</span>}
        />
      </div>

      {/* Chart + recent */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="font-bold text-slate-800">Lượt xe vào theo giờ</h3>
          <p className="text-sm text-slate-400">24 giờ gần nhất · mỗi cột 2 giờ</p>
          <HourlyChart data={stats.hourly} />
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Hoạt động gần đây</h3>
            <button onClick={() => nav('/owner/operations')} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              Vận hành ›
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {stats.recent.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Chưa có hoạt động.</p>}
            {stats.recent.map((e, i) => <ActivityRow key={i} e={e} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Vòng tròn tỉ lệ lấp đầy (donut) */
function CapacityGauge({ pct, color }: { pct: number; color: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-36 w-36 shrink-0 place-items-center">
      <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="11" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-black text-slate-800">{pct}%</p>
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">lấp đầy</p>
      </div>
    </div>
  );
}

function Trend({ up, text }: { up: boolean; text: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${up ? 'glass-green text-brand-700' : 'glass-red text-red-600'}`}>
      {up ? '▲' : '▼'} {text}
    </span>
  );
}

function CapacityUpdater({ lot, onSaved }: { lot: Lot; onSaved: (l: Lot) => void }) {
  const [val, setVal] = useState(lot.available_spots);
  const valRef = useRef(lot.available_spots);

  useEffect(() => {
    valRef.current = lot.available_spots;
    setVal(lot.available_spots);
  }, [lot.available_spots]);

  const step = (delta: number) => {
    const next = Math.max(0, Math.min(lot.total_spots, valRef.current + delta));
    valRef.current = next;
    setVal(next);
    api.ownerSetCapacity(next).then((r) => onSaved(r.lot)).catch(() => {});
  };

  return (
    <div className="glass-surface flex items-center gap-2 rounded-full px-2 py-1.5">
      <span className="px-1.5 text-sm font-medium text-slate-500">Chỗ trống</span>
      <button onClick={() => step(-1)} className="grid h-8 w-8 place-items-center rounded-full bg-white/70 text-lg font-bold text-slate-600 transition hover:bg-white active:scale-90">−</button>
      <span className="w-8 text-center text-lg font-extrabold text-slate-800">{val}</span>
      <button onClick={() => step(1)} className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-lg font-bold text-white shadow-md transition hover:shadow-lg active:scale-90">+</button>
    </div>
  );
}

function Shortcut({ grad, icon, title, sub, onClick }: { grad: string; icon: React.ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="glass-surface flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all duration-200 hover:scale-[1.02]">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${grad} text-white shadow-md`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-slate-800">{title}</span>
        <span className="block truncate text-xs text-slate-400">{sub}</span>
      </span>
      <span className="text-slate-300">›</span>
    </button>
  );
}

function StatCard({ grad, icon, label, value, foot }: { grad: string; icon: React.ReactNode; label: string; value: string; foot: React.ReactNode }) {
  return (
    <div className="card p-5 transition-all duration-200 hover:scale-[1.015]">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={`grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br ${grad} text-white shadow-md`}>{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-800">{value}</p>
      <p className="mt-2.5 text-xs font-medium">{foot}</p>
    </div>
  );
}

function HourlyChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="mt-5 flex h-40 items-end gap-1.5">
      {data.map((d, i) => (
        <div key={i} className="group flex flex-1 flex-col items-center gap-1.5">
          <div className="relative flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 shadow-sm transition-all duration-300 group-hover:from-brand-700 group-hover:to-brand-500"
              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? '8px' : '3px' }}
              title={`${d.count} lượt`}
            />
          </div>
          <span className="text-[10px] text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function ActivityRow({ e }: { e: ActivityEvent }) {
  const isIn = e.type === 'checkin';
  return (
    <div className="glass-surface flex items-center gap-3 rounded-2xl p-3">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-white shadow-sm ${isIn ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-slate-300 to-slate-400'}`}>
        {isIn ? '→' : '←'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-800">{e.plate}</p>
        <p className="truncate text-xs text-slate-400">{isIn ? 'Xe vào' : 'Xe ra'} · {e.slot}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-slate-500">{formatClock(e.ts)}</p>
        <p className={`text-xs font-semibold ${isIn && e.status === 'active' ? 'text-brand-600' : 'text-slate-400'}`}>
          {isIn ? (e.status === 'active' ? 'Đang gửi' : 'Đã vào bãi') : formatVnd(e.fee)}
        </p>
      </div>
    </div>
  );
}
