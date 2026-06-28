import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { randomToken, shortCode, generateSlotLabel, computeFee } from '../lib.js';
import { broadcastLot } from '../events.js';

const router = Router();

function getLot(lotId) {
  return db.prepare('SELECT * FROM lots WHERE id = ?').get(lotId);
}

function enrichBooking(booking) {
  const lot = getLot(booking.lot_id);
  return {
    ...booking,
    lot: { id: lot.id, name: lot.name, address: lot.address },
  };
}

function enrichSession(session) {
  const lot = getLot(session.lot_id);
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
    estimate_fee: computeFee(lot, session.checkin_at, Date.now()),
  };
}

// POST /api/bookings - commuter creates a booking
router.post('/', requireRole('commuter'), (req, res) => {
  const { lotId, plate, scheduledAt } = req.body || {};
  if (!lotId || !plate || !scheduledAt)
    return res.status(400).json({ error: 'Thiếu lotId, biển số hoặc thời gian đặt chỗ' });

  const now = Date.now();
  const sAt = Number(scheduledAt);
  if (isNaN(sAt) || sAt <= now)
    return res.status(400).json({ error: 'Thời gian đặt chỗ phải ở trong tương lai' });
  if (sAt > now + 24 * 60 * 60 * 1000)
    return res.status(400).json({ error: 'Chỉ được đặt chỗ trước tối đa 24 giờ' });

  const lot = getLot(lotId);
  if (!lot) return res.status(404).json({ error: 'Không tìm thấy bãi' });
  if (!lot.is_open) return res.status(409).json({ error: 'Bãi đang đóng cửa' });
  if (lot.available_spots <= 0) return res.status(409).json({ error: 'Bãi đã hết chỗ' });

  const plateNorm = plate.toUpperCase().trim();

  const conflict = db.prepare(
    "SELECT id FROM bookings WHERE user_id = ? AND lot_id = ? AND plate = ? AND status = 'pending'"
  ).get(req.user.id, lotId, plateNorm);
  if (conflict)
    return res.status(409).json({ error: `Xe ${plateNorm} đã có đặt chỗ tại bãi này` });

  const token = randomToken();
  let code = shortCode();
  while (db.prepare("SELECT 1 FROM bookings WHERE short_code = ? AND status = 'pending'").get(code)) {
    code = shortCode();
  }

  const expiresAt = sAt + 15 * 60 * 1000;
  const info = db.prepare(
    `INSERT INTO bookings (lot_id, user_id, plate, scheduled_at, expires_at, booking_token, short_code, status, created_at)
     VALUES (?,?,?,?,?,?,?,'pending',?)`
  ).run(lotId, req.user.id, plateNorm, sAt, expiresAt, token, code, now);

  db.prepare('UPDATE lots SET available_spots = available_spots - 1 WHERE id = ?').run(lotId);
  broadcastLot(lotId);

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(Number(info.lastInsertRowid));
  res.json({ booking: enrichBooking(booking) });
});

// GET /api/bookings/active - commuter's pending bookings
router.get('/active', requireRole('commuter'), (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM bookings WHERE user_id = ? AND status = 'pending' ORDER BY scheduled_at ASC"
  ).all(req.user.id);
  res.json({ bookings: rows.map(enrichBooking) });
});

// GET /api/bookings/history - commuter's past bookings
router.get('/history', requireRole('commuter'), (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM bookings WHERE user_id = ? AND status != 'pending' ORDER BY created_at DESC"
  ).all(req.user.id);
  res.json({ bookings: rows.map(enrichBooking) });
});

// DELETE /api/bookings/:id - commuter cancels booking
router.delete('/:id', requireRole('commuter'), (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Không tìm thấy đặt chỗ' });
  if (booking.user_id !== req.user.id) return res.status(403).json({ error: 'Không có quyền' });
  if (booking.status !== 'pending') return res.status(409).json({ error: 'Đặt chỗ này đã kết thúc' });

  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(booking.id);
  db.prepare('UPDATE lots SET available_spots = MIN(total_spots, available_spots + 1) WHERE id = ?').run(booking.lot_id);
  broadcastLot(booking.lot_id);
  res.json({ ok: true });
});

// GET /api/bookings/lookup?q=<token|short_code> - owner looks up a pending booking
router.get('/lookup', requireRole('owner'), (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.status(400).json({ error: 'Thiếu mã đặt chỗ' });

  let booking = db.prepare("SELECT * FROM bookings WHERE booking_token = ? AND status = 'pending'").get(q);
  if (!booking) {
    booking = db.prepare("SELECT * FROM bookings WHERE short_code = ? AND status = 'pending'").get(q.toUpperCase());
  }
  if (!booking)
    return res.status(404).json({ error: 'Không tìm thấy đặt chỗ (mã không hợp lệ hoặc đã hết hạn)' });

  const lot = getLot(booking.lot_id);
  if (lot.owner_id !== req.user.id)
    return res.status(403).json({ error: 'Đặt chỗ này thuộc bãi khác' });

  // Auto-expire if past deadline
  if (Date.now() > booking.expires_at) {
    db.prepare("UPDATE bookings SET status = 'expired' WHERE id = ?").run(booking.id);
    db.prepare('UPDATE lots SET available_spots = MIN(total_spots, available_spots + 1) WHERE id = ?').run(lot.id);
    broadcastLot(lot.id);
    return res.status(409).json({ error: 'Đặt chỗ đã hết hạn' });
  }

  res.json({ booking: enrichBooking(booking) });
});

// POST /api/bookings/:id/checkin - owner converts booking → active session
router.post('/:id/checkin', requireRole('owner'), (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Không tìm thấy đặt chỗ' });
  if (booking.status !== 'pending') return res.status(409).json({ error: 'Đặt chỗ này đã kết thúc hoặc hết hạn' });

  const lot = getLot(booking.lot_id);
  if (!lot) return res.status(404).json({ error: 'Không tìm thấy bãi' });
  if (lot.owner_id !== req.user.id) return res.status(403).json({ error: 'Đặt chỗ này thuộc bãi khác' });

  if (Date.now() > booking.expires_at) {
    db.prepare("UPDATE bookings SET status = 'expired' WHERE id = ?").run(booking.id);
    db.prepare('UPDATE lots SET available_spots = MIN(total_spots, available_spots + 1) WHERE id = ?').run(lot.id);
    broadcastLot(lot.id);
    return res.status(409).json({ error: 'Đặt chỗ đã hết hạn' });
  }

  const checkoutToken = randomToken();
  const slotLabel = generateSlotLabel();
  let code = shortCode();
  while (db.prepare("SELECT 1 FROM sessions WHERE short_code = ? AND status = 'active'").get(code)) {
    code = shortCode();
  }

  const checkinAt = Date.now();
  const info = db.prepare(
    `INSERT INTO sessions (lot_id, user_id, plate, slot_label, checkin_at, status, checkout_token, short_code)
     VALUES (?,?,?,?,?,'active',?,?)`
  ).run(lot.id, booking.user_id, booking.plate, slotLabel, checkinAt, checkoutToken, code);

  const sessionId = Number(info.lastInsertRowid);
  db.prepare("UPDATE bookings SET status = 'checked_in', session_id = ? WHERE id = ?").run(sessionId, booking.id);
  // available_spots already held when booking was created - do not decrement again

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  res.json({ session: enrichSession(session) });
});

export default router;
