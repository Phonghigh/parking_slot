import { db } from './db.js';

// Lấy user từ token trong header Authorization: Bearer <token>
export function getUserFromReq(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.username, u.role, u.wallet_balance
       FROM tokens t JOIN users u ON u.id = t.user_id
       WHERE t.token = ?`
    )
    .get(token);
  return row || null;
}

export function requireAuth(req, res, next) {
  const user = getUserFromReq(req);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  req.user = user;
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    const user = getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
    if (user.role !== role)
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    req.user = user;
    next();
  };
}
