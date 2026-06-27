import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { randomToken, computeFee, generateSlotLabel } from '../lib.js';

const router = Router();

function getLot(lotId) {
  return db.prepare('SELECT * FROM lots WHERE id = ?').get(lotId);
}

// Gắn thông tin bãi + phí tạm tính (live) vào session để trả về client
function enrich(session) {
  const lot = getLot(session.lot_id);
  const now = Date.now();
  const estimateFee =
    session.status === 'active'
      ? computeFee(lot, session.checkin_at, now)
      : session.fee;
  return {
    ...session,
    lot: {
      id: lot.id,
      name: lot.name,
      address: lot.address,
      pricing_type: lot.pricing_type,
      price_per_hour: lot.price_per_hour,
      flat_price: lot.flat_price,
    },
    estimate_fee: estimateFee,
  };
}

// POST /api/sessions  (check-in, owner) { lotId, userId, plate }
router.post('/', requireRole('owner'), (req, res) => {
  const { lotId, userId, plate } = req.body || {};
  if (!lotId || !userId || !plate)
    return res.status(400).json({ error: 'Thiếu lotId, userId hoặc biển số' });

  const lot = getLot(lotId);
  if (!lot) return res.status(404).json({ error: 'Không tìm thấy bãi' });
  if (lot.owner_id !== req.user.id)
    return res.status(403).json({ error: 'Bãi này không thuộc quyền của bạn' });

  const commuter = db
    .prepare("SELECT * FROM users WHERE id = ? AND role = 'commuter'").get(userId);
  if (!commuter) return res.status(404).json({ error: 'Không tìm thấy người dùng (QR không hợp lệ)' });

  const active = db
    .prepare("SELECT id FROM sessions WHERE user_id = ? AND status = 'active'")
    .get(userId);
  if (active)
    return res.status(409).json({ error: 'Người dùng này đang có phiên gửi xe chưa kết thúc' });

  if (lot.available_spots <= 0)
    return res.status(409).json({ error: 'Bãi đã hết chỗ' });

  const checkoutToken = randomToken();
  const slotLabel = generateSlotLabel();
  const info = db
    .prepare(
      `INSERT INTO sessions (lot_id, user_id, plate, slot_label, checkin_at, status, checkout_token)
       VALUES (?,?,?,?,?,'active',?)`
    )
    .run(lotId, userId, plate.toUpperCase(), slotLabel, Date.now(), checkoutToken);
  db.prepare('UPDATE lots SET available_spots = available_spots - 1 WHERE id = ?').run(lotId);

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(Number(info.lastInsertRowid));
  res.json({ session: enrich(session) });
});

// GET /api/sessions/active  (commuter) → phiên đang gửi của chính mình
router.get('/active', requireAuth, (req, res) => {
  const session = db
    .prepare("SELECT * FROM sessions WHERE user_id = ? AND status = 'active' ORDER BY id DESC")
    .get(req.user.id);
  res.json({ session: session ? enrich(session) : null });
});

// GET /api/sessions/history  (commuter)
router.get('/history', requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM sessions WHERE user_id = ? AND status = 'completed' ORDER BY checkout_at DESC")
    .all(req.user.id);
  res.json({ sessions: rows.map(enrich) });
});

// GET /api/sessions/lookup?token=<checkout_token>  (owner) → tra cứu phiên để đối chiếu trước khi checkout
router.get('/lookup', requireRole('owner'), (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).json({ error: 'Thiếu token' });
  const session = db
    .prepare("SELECT * FROM sessions WHERE checkout_token = ? AND status = 'active'")
    .get(token);
  if (!session) return res.status(404).json({ error: 'Không tìm thấy phiên (mã không hợp lệ hoặc đã checkout)' });
  const lot = getLot(session.lot_id);
  if (lot.owner_id !== req.user.id)
    return res.status(403).json({ error: 'Phiên này thuộc bãi khác' });
  res.json({ session: enrich(session) });
});

// PATCH /api/sessions/:id/payment  (commuter) { payment_method }
router.patch('/:id/payment', requireAuth, (req, res) => {
  const { payment_method } = req.body || {};
  if (!['momo', 'wallet', 'cash'].includes(payment_method))
    return res.status(400).json({ error: 'Phương thức thanh toán không hợp lệ' });
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Không tìm thấy phiên' });
  if (session.user_id !== req.user.id)
    return res.status(403).json({ error: 'Không có quyền' });
  db.prepare('UPDATE sessions SET payment_method = ? WHERE id = ?').run(payment_method, session.id);
  const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id);
  res.json({ session: enrich(updated) });
});

// POST /api/sessions/:id/checkout  (owner) { plate }
router.post('/:id/checkout', requireRole('owner'), (req, res) => {
  const { plate } = req.body || {};
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Không tìm thấy phiên' });
  if (session.status !== 'active')
    return res.status(409).json({ error: 'Phiên đã được checkout' });

  const lot = getLot(session.lot_id);
  if (lot.owner_id !== req.user.id)
    return res.status(403).json({ error: 'Phiên này thuộc bãi khác' });

  if (plate && plate.toUpperCase().replace(/\s/g, '') !== session.plate.replace(/\s/g, ''))
    return res.status(400).json({ error: `Biển số không khớp (hệ thống: ${session.plate})` });

  const checkoutAt = Date.now();
  const fee = computeFee(lot, session.checkin_at, checkoutAt);
  const method = session.payment_method || 'cash';

  db.prepare(
    "UPDATE sessions SET status = 'completed', checkout_at = ?, fee = ?, payment_method = ? WHERE id = ?"
  ).run(checkoutAt, fee, method, session.id);
  db.prepare('UPDATE lots SET available_spots = available_spots + 1 WHERE id = ?').run(lot.id);

  // Trừ ví nếu thanh toán bằng ParkSmart Wallet
  if (method === 'wallet') {
    db.prepare('UPDATE users SET wallet_balance = MAX(0, wallet_balance - ?) WHERE id = ?').run(
      fee,
      session.user_id
    );
  }

  const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id);
  res.json({ session: enrich(updated), fee, payment_method: method });
});

// GET /api/sessions/:id
router.get('/:id', requireAuth, (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Không tìm thấy phiên' });
  res.json({ session: enrich(session) });
});

export default router;
