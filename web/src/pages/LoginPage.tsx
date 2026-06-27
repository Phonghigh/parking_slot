import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(username, password);
      nav(user.role === 'owner' ? '/owner' : '/', { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const quick = (u: string) => {
    setUsername(u);
    setPassword('123456');
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-b from-brand-600 to-brand-700 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center text-white">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-white/15 text-3xl font-extrabold backdrop-blur">
            P
          </div>
          <h1 className="text-3xl font-extrabold">ParkSmart</h1>
          <p className="mt-1 text-brand-100">Đỗ xe thông minh, không vé giấy</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <div>
            <label className="label">Tên đăng nhập</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="commuter1" />
          </div>
          <div>
            <label className="label">Mật khẩu</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>

          <div className="text-center text-sm text-slate-400">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-semibold text-brand-600">
              Đăng ký
            </Link>
          </div>
        </form>

        <div className="mt-4 rounded-xl bg-white/10 p-3 text-center text-xs text-white/90">
          <p className="mb-2 font-medium">Tài khoản demo (mật khẩu: 123456)</p>
          <div className="flex justify-center gap-2">
            <button onClick={() => quick('commuter1')} className="rounded-lg bg-white/20 px-3 py-1.5 font-medium">
              👤 commuter1
            </button>
            <button onClick={() => quick('owner1')} className="rounded-lg bg-white/20 px-3 py-1.5 font-medium">
              🅿️ owner1
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
