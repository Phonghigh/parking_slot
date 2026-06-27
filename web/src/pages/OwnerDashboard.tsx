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

  if (!lot || !stats) return <div className="text-slate-400">Đang tải…</div>;

  const cap = capacityColor(stats.available, stats.total);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Tổng quan</h1>
        <p className="text-sm text-slate-400">{lot.name} · {lot.address}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Live capacity (lớn) */}
        <div className="card relative overflow-hidden p-6 lg:col-span-2">
          <span className="absolute right-6 top-4 select-none text-[120px] font-black leading-none text-brand-50">P</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <span className="h-2 w-2 rounded-full" style={{ background: cap.color }} /> Sức chứa trực tiếp
          </span>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-4xl font-extrabold text-slate-900">{stats.available}</span>
            <span className="pb-1 text-xl font-semibold text-slate-400">/ {stats.total} chỗ trống</span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${stats.occupancyPct}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Đang lấp đầy <b>{stats.occupancyPct}%</b> · <b>{stats.currentVehicles}</b> xe đang gửi.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <CapacityUpdater lot={lot} onSaved={(l) => { setLot(l); setStats({ ...stats, available: l.available_spots, occupancyPct: Math.round(((l.total_spots - l.available_spots) / l.total_spots) * 100) }); }} />
            <button onClick={() => nav('/owner/operations')} className="btn-outline">
              <IconQr width={18} /> Mở vận hành
            </button>
          </div>
        </div>

        {/* Operational shortcuts */}
        <div className="card bg-brand-50/50 p-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Lối tắt vận hành</h3>
          <div className="mt-3 space-y-2">
            <Shortcut icon={<IconQr width={18} />} title="Check-in / Checkout" sub="Quét QR khách" onClick={() => nav('/owner/operations')} />
            <Shortcut icon={<IconHistory width={18} />} title="Hồ sơ bãi" sub="Thông tin & tiện ích" onClick={() => nav('/owner/profile')} />
            <Shortcut icon={<IconRefresh width={18} />} title="Làm mới số liệu" sub="Cập nhật realtime" onClick={load} />
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        <StatCard
          icon={<IconWallet width={20} />}
          label="Doanh thu hôm nay"
          value={formatVnd(stats.todayEarnings)}
          foot={
            stats.earningsDeltaPct == null ? (
              <span className="text-slate-400">—</span>
            ) : (
              <span className={stats.earningsDeltaPct >= 0 ? 'text-brand-600' : 'text-red-500'}>
                {stats.earningsDeltaPct >= 0 ? '▲' : '▼'} {Math.abs(stats.earningsDeltaPct)}% so với hôm qua
              </span>
            )
          }
        />
        <StatCard
          icon={<IconCar width={20} />}
          label="Xe đang gửi"
          value={String(stats.currentVehicles)}
          foot={<span className="flex items-center gap-1 text-slate-400"><IconClock width={13} /> Trung bình {stats.avgStayHours} giờ/lượt</span>}
        />
        <StatCard
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
          <p className="text-sm text-slate-400">24 giờ gần nhất (mỗi cột 2 giờ)</p>
          <HourlyChart data={stats.hourly} />
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Hoạt động gần đây</h3>
            <button onClick={() => nav('/owner/operations')} className="text-sm font-medium text-brand-600">Vận hành ›</button>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {stats.recent.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Chưa có hoạt động.</p>}
            {stats.recent.map((e, i) => <ActivityRow key={i} e={e} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function CapacityUpdater({ lot, onSaved }: { lot: Lot; onSaved: (l: Lot) => void }) {
  const [val, setVal] = useState(lot.available_spots);
  const valRef = useRef(lot.available_spots);

  // Đồng bộ khi bãi cập nhật từ ngoài (poll) — nhưng không đè khi đang bấm liên tục
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
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5">
      <span className="px-1 text-sm text-slate-500">Cập nhật chỗ trống</span>
      <button onClick={() => step(-1)} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-lg font-bold text-slate-600 hover:bg-slate-200">−</button>
      <span className="w-8 text-center font-bold text-slate-800">{val}</span>
      <button onClick={() => step(1)} className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-lg font-bold text-white hover:bg-brand-700">+</button>
    </div>
  );
}

function Shortcut({ icon, title, sub, onClick }: { icon: React.ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left transition hover:shadow-sm">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">{icon}</span>
      <span className="flex-1">
        <span className="block font-semibold text-slate-800">{title}</span>
        <span className="block text-xs text-slate-400">{sub}</span>
      </span>
      <span className="text-slate-300">›</span>
    </button>
  );
}

function StatCard({ icon, label, value, foot }: { icon: React.ReactNode; label: string; value: string; foot: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-2 text-xs font-medium">{foot}</p>
    </div>
  );
}

function HourlyChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="mt-4 flex h-40 items-end gap-1.5">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="relative flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-brand-500/80 transition-all hover:bg-brand-600"
              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? '6px' : '2px' }}
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
    <div className="flex items-center gap-3 py-3">
      <span className={`grid h-9 w-9 place-items-center rounded-full ${isIn ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>
        {isIn ? '→' : '←'}
      </span>
      <div className="flex-1">
        <p className="font-semibold text-slate-800">{e.plate}</p>
        <p className="text-xs text-slate-400">{isIn ? 'Xe vào' : 'Xe ra'} · {e.slot}</p>
      </div>
      <div className="text-right">
        <p className="text-sm text-slate-500">{formatClock(e.ts)}</p>
        <p className={`text-xs font-medium ${isIn && e.status === 'active' ? 'text-brand-600' : 'text-slate-400'}`}>
          {isIn ? (e.status === 'active' ? 'Đang gửi' : 'Đã vào bãi') : formatVnd(e.fee)}
        </p>
      </div>
    </div>
  );
}
