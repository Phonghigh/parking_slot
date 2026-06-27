import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Role } from '../api';

export function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', username: '', password: '' });
  const [role, setRole] = useState<Role>('commuter');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await register({ ...form, role });
      nav(user.role === 'owner' ? '/owner' : '/', { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold text-slate-800">Tạo tài khoản</h1>
          <p className="mt-1 text-sm text-slate-500">Chào mừng đến với ParkSmart</p>
        </div>

        <form onSubmit={submit} className="card animate-scale-in space-y-4 p-6">
          <div className="grid grid-cols-2 gap-2">
            <RoleBtn active={role === 'commuter'} onClick={() => setRole('commuter')} icon="🚗" label="Người gửi xe" />
            <RoleBtn active={role === 'owner'} onClick={() => setRole('owner')} icon="🅿" label="Chủ bãi xe" />
          </div>

          <div>
            <label className="label">Họ tên</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nguyễn Văn A"
              autoComplete="name"
            />
          </div>
          <div>
            <label className="label">Tên đăng nhập</label>
            <input
              className="input"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="username"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="label">Mật khẩu</label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="glass-red rounded-2xl px-4 py-2.5 text-sm text-red-700">{error}</p>
          )}

          <button className="btn-primary w-full py-3.5 text-base" disabled={busy}>
            {busy ? 'Đang tạo…' : 'Đăng ký'}
          </button>

          <div className="text-center text-sm text-slate-500">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-semibold text-blue-600">
              Đăng nhập
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoleBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl p-3 text-center transition-all duration-200 active:scale-[0.97] ${
        active ? 'glass-icon-green' : 'glass-surface'
      }`}
    >
      <div className="text-2xl">{icon}</div>
      <div className={`mt-1 text-sm font-semibold ${active ? 'text-brand-700' : 'text-slate-500'}`}>{label}</div>
    </button>
  );
}
