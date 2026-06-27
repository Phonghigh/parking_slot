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
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo & headline */}
        <div className="mb-8 text-center">
          <div className="glass-icon-green mx-auto mb-4 grid h-20 w-20 place-items-center rounded-3xl text-4xl font-extrabold text-brand-600">
            G
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800">GoPark</h1>
          <p className="mt-1 text-slate-500">Đỗ xe thông minh, không vé giấy</p>
        </div>

        {/* Glass form card */}
        <form onSubmit={submit} className="card animate-scale-in space-y-4 p-6">
          <div>
            <label className="label">Tên đăng nhập</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="commuter1"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="label">Mật khẩu</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="glass-red rounded-2xl px-4 py-2.5 text-sm text-red-700">{error}</p>
          )}

          <button className="btn-primary w-full py-3.5 text-base" disabled={busy}>
            {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>

          <div className="text-center text-sm text-slate-500">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-semibold text-blue-600">
              Đăng ký
            </Link>
          </div>
        </form>

        {/* Demo accounts */}
        <div className="glass-surface mt-4 rounded-3xl p-4 text-center text-xs text-slate-600">
          <p className="mb-2.5 font-semibold text-slate-700">Tài khoản demo (mật khẩu: 123456)</p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => quick('commuter1')}
              className="glass-white rounded-full px-4 py-1.5 text-xs font-semibold text-slate-700 transition active:scale-95"
            >
              Người dùng
            </button>
            <button
              onClick={() => quick('owner1')}
              className="glass-green rounded-full px-4 py-1.5 text-xs font-semibold text-brand-700 transition active:scale-95"
            >
              Chủ bãi xe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
