import { Router } from 'express';
import { db } from '../db.js';
import { randomToken } from '../lib.js';
import { requireAuth } from '../auth.js';

const router = Router();

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    wallet_balance: u.wallet_balance,
  };
}

function issueToken(userId) {
  const token = randomToken();
  db.prepare('INSERT INTO tokens (token, user_id) VALUES (?, ?)').run(token, userId);
  return token;
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, username, password, role } = req.body || {};
  if (!name || !username || !password || !role)
    return res.status(400).json({ error: 'Thiếu thông tin đăng ký' });
  if (!['commuter', 'owner'].includes(role))
    return res.status(400).json({ error: 'Role không hợp lệ' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Username đã tồn tại' });

  const walletBalance = role === 'commuter' ? 120000 : 0;
  const info = db
    .prepare(
      'INSERT INTO users (name, username, password, role, wallet_balance) VALUES (?,?,?,?,?)'
    )
    .run(name, username, password, role, walletBalance);
  const userId = Number(info.lastInsertRowid);
  const token = issueToken(userId);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  res.json({ token, user: publicUser(user) });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'Thiếu username hoặc password' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || user.password !== password)
    return res.status(401).json({ error: 'Sai username hoặc password' });
  const token = issueToken(user.id);
  res.json({ token, user: publicUser(user) });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

export default router;
