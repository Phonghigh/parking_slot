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
    <div className="flex min-h-full items-center justify-center bg-gradient-to-b from-brand-600 to-brand-700 p-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-extrabold text-white">Tạo tài khoản</h1>
        <form onSubmit={submit} className="card space-y-4 p-6">
          <div className="grid grid-cols-2 gap-2">
            <RoleBtn active={role === 'commuter'} onClick={() => setRole('commuter')} emoji="👤" label="Người gửi xe" />
            <RoleBtn active={role === 'owner'} onClick={() => setRole('owner')} emoji="🅿️" label="Chủ bãi xe" />
          </div>
          <div>
            <label className="label">Họ tên</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Tên đăng nhập</label>
            <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label className="label">Mật khẩu</label>
            <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Đang tạo…' : 'Đăng ký'}
          </button>
          <div className="text-center text-sm text-slate-400">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-semibold text-brand-600">
              Đăng nhập
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoleBtn({ active, onClick, emoji, label }: { active: boolean; onClick: () => void; emoji: string; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 p-3 text-center transition ${
        active ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="text-2xl">{emoji}</div>
      <div className={`mt-1 text-sm font-semibold ${active ? 'text-brand-700' : 'text-slate-500'}`}>{label}</div>
    </button>
  );
}
