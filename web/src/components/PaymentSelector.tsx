import { formatVnd } from '../lib/format';

type Method = 'momo' | 'wallet' | 'cash';

const OPTIONS: { key: Method; label: string; sub?: string; badge: React.ReactNode }[] = [
  { key: 'momo', label: 'Ví MoMo', badge: <span className="grid h-8 w-8 place-items-center rounded-lg bg-pink-600 text-[10px] font-bold text-white">Mo</span> },
  { key: 'wallet', label: 'GoPark Wallet', badge: <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">₽</span> },
  { key: 'cash', label: 'Tiền mặt tại trạm', badge: <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-200 text-slate-600">$</span> },
];

export function PaymentSelector({
  value,
  walletBalance,
  onChange,
}: {
  value: Method | null;
  walletBalance: number;
  onChange: (m: Method) => void;
}) {
  return (
    <div className="space-y-2">
      {OPTIONS.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-3 text-left transition ${
              active ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'
            }`}
          >
            <span
              className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
                active ? 'border-brand-600' : 'border-slate-300'
              }`}
            >
              {active && <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />}
            </span>
            {o.badge}
            <span className="flex-1">
              <span className="block font-semibold text-slate-800">{o.label}</span>
              {o.key === 'wallet' && (
                <span className="block text-xs text-slate-400">Số dư: {formatVnd(walletBalance)}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
