import { Router } from 'express';
import { db } from '../db.js';
import { haversineKm } from '../lib.js';
import { requireRole, requireAuth } from '../auth.js';
import { broadcastLot } from '../events.js';

const router = Router();

function serializeLot(lot) {
  return {
    ...lot,
    covered: !!lot.covered,
    is_open: !!lot.is_open,
    amenities: lot.amenities ? lot.amenities.split('|').filter(Boolean) : [],
  };
}

function loadReviews(lotId) {
  return db
    .prepare(
      'SELECT id, user_id, user_name, rating, comment, updated_at FROM reviews WHERE lot_id = ? ORDER BY COALESCE(updated_at, 0) DESC, id DESC'
    )
    .all(lotId);
}

// Tính lại rating trung bình + số đánh giá của bãi sau khi review thay đổi
function recomputeLotRating(lotId) {
  const agg = db.prepare('SELECT COUNT(*) c, AVG(rating) a FROM reviews WHERE lot_id = ?').get(lotId);
  const rating = agg.c > 0 ? Math.round(agg.a * 10) / 10 : 0;
  db.prepare('UPDATE lots SET rating = ?, review_count = ? WHERE id = ?').run(rating, agg.c, lotId);
}

// GET /api/lots?lat=&lng=  → danh sách bãi + distance
router.get('/', (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const lots = db.prepare('SELECT * FROM lots').all().map(serializeLot);
  const withDistance = lots.map((lot) => ({
    ...lot,
    distance:
      Number.isFinite(lat) && Number.isFinite(lng)
        ? haversineKm(lat, lng, lot.lat, lot.lng)
        : null,
  }));
  res.json({ lots: withDistance });
});

// GET /api/lots/:id → chi tiết + reviews
router.get('/:id', (req, res) => {
  const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(req.params.id);
  if (!lot) return res.status(404).json({ error: 'Không tìm thấy bãi' });
  res.json({ lot: { ...serializeLot(lot), reviews: loadReviews(lot.id) } });
});

// POST /api/lots/:id/reviews → tạo HOẶC sửa đánh giá (mỗi commuter 1 đánh giá / bãi)
router.post('/:id/reviews', requireRole('commuter'), (req, res) => {
  const lotId = Number(req.params.id);
  const lot = db.prepare('SELECT id FROM lots WHERE id = ?').get(lotId);
  if (!lot) return res.status(404).json({ error: 'Không tìm thấy bãi' });

  const rating = Math.round(Number(req.body?.rating));
  const comment = (req.body?.comment || '').toString().slice(0, 500);
  if (!(rating >= 1 && rating <= 5))
    return res.status(400).json({ error: 'Số sao phải từ 1 đến 5' });

  const existing = db
    .prepare('SELECT id FROM reviews WHERE lot_id = ? AND user_id = ?')
    .get(lotId, req.user.id);
  const now = Date.now();
  if (existing) {
    db.prepare('UPDATE reviews SET rating = ?, comment = ?, user_name = ?, updated_at = ? WHERE id = ?')
      .run(rating, comment, req.user.name, now, existing.id);
  } else {
    db.prepare(
      'INSERT INTO reviews (lot_id, user_id, user_name, rating, comment, updated_at) VALUES (?,?,?,?,?,?)'
    ).run(lotId, req.user.id, req.user.name, rating, comment, now);
  }
  recomputeLotRating(lotId);

  const updated = db.prepare('SELECT * FROM lots WHERE id = ?').get(lotId);
  res.json({ lot: { ...serializeLot(updated), reviews: loadReviews(lotId) }, edited: !!existing });
});

export default router;

// Owner lots router (mounted riêng dưới /api/owner)
export const ownerRouter = Router();

ownerRouter.get('/lots', requireRole('owner'), (req, res) => {
  const lots = db
    .prepare('SELECT * FROM lots WHERE owner_id = ?')
    .all(req.user.id)
    .map(serializeLot);
  res.json({ lots });
});

// Mỗi owner gắn đúng 1 bãi
ownerRouter.get('/lot', requireRole('owner'), (req, res) => {
  const lot = db.prepare('SELECT * FROM lots WHERE owner_id = ? ORDER BY id LIMIT 1').get(req.user.id);
  if (!lot) return res.status(404).json({ error: 'Owner chưa gắn bãi nào' });
  res.json({ lot: serializeLot(lot) });
});

// Cập nhật thủ công số chỗ trống (manual capacity input)
ownerRouter.patch('/lot/capacity', requireRole('owner'), (req, res) => {
  const lot = db.prepare('SELECT * FROM lots WHERE owner_id = ? ORDER BY id LIMIT 1').get(req.user.id);
  if (!lot) return res.status(404).json({ error: 'Owner chưa gắn bãi nào' });
  const { available_spots } = req.body || {};
  const val = Number(available_spots);
  if (!Number.isFinite(val)) return res.status(400).json({ error: 'Giá trị không hợp lệ' });
  const clamped = Math.max(0, Math.min(lot.total_spots, Math.round(val)));
  db.prepare('UPDATE lots SET available_spots = ? WHERE id = ?').run(clamped, lot.id);
  broadcastLot(lot.id); // đẩy real-time tới commuter
  res.json({ lot: serializeLot({ ...lot, available_spots: clamped }) });
});

// Thống kê / analytics cho bãi của owner
ownerRouter.get('/stats', requireRole('owner'), (req, res) => {
  const lot = db.prepare('SELECT * FROM lots WHERE owner_id = ? ORDER BY id LIMIT 1').get(req.user.id);
  if (!lot) return res.status(404).json({ error: 'Owner chưa gắn bãi nào' });

  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();

  const all = db.prepare('SELECT * FROM sessions WHERE lot_id = ?').all(lot.id);
  const completed = all.filter((s) => s.status === 'completed');
  const active = all.filter((s) => s.status === 'active');

  const todayCompleted = completed.filter((s) => (s.checkout_at ?? 0) >= todayMs);
  const todayEarnings = todayCompleted.reduce((sum, s) => sum + (s.fee || 0), 0);
  const checkinsToday = all.filter((s) => s.checkin_at >= todayMs).length;

  const avgStayMs =
    completed.length > 0
      ? completed.reduce((sum, s) => sum + ((s.checkout_at || s.checkin_at) - s.checkin_at), 0) /
        completed.length
      : 0;

  // Doanh thu hôm qua (để so sánh % với hôm nay)
  const yMs = todayMs - 24 * 3600 * 1000;
  const yEarnings = completed
    .filter((s) => (s.checkout_at ?? 0) >= yMs && (s.checkout_at ?? 0) < todayMs)
    .reduce((sum, s) => sum + (s.fee || 0), 0);
  const earningsDeltaPct =
    yEarnings > 0
      ? Math.max(-95, Math.min(200, Math.round(((todayEarnings - yEarnings) / yEarnings) * 100)))
      : null;

  // Lượt xe vào theo từng giờ trong 24h gần nhất (12 mốc, mỗi mốc 2 giờ)
  const buckets = [];
  for (let i = 11; i >= 0; i--) {
    const end = now - i * 2 * 3600 * 1000;
    const start = end - 2 * 3600 * 1000;
    const count = all.filter((s) => s.checkin_at >= start && s.checkin_at < end).length;
    const hourLabel = new Date(end).getHours();
    buckets.push({ label: `${String(hourLabel).padStart(2, '0')}h`, count });
  }

  // Hoạt động gần đây: gộp các sự kiện check-in / check-out
  const events = [];
  for (const s of all) {
    events.push({ type: 'checkin', plate: s.plate, slot: s.slot_label, ts: s.checkin_at, status: s.status });
    if (s.checkout_at) {
      events.push({ type: 'checkout', plate: s.plate, slot: s.slot_label, ts: s.checkout_at, fee: s.fee });
    }
  }
  events.sort((a, b) => b.ts - a.ts);
  const recent = events.slice(0, 8);

  res.json({
    lot: serializeLot(lot),
    stats: {
      available: lot.available_spots,
      total: lot.total_spots,
      occupancyPct: lot.total_spots > 0 ? Math.round(((lot.total_spots - lot.available_spots) / lot.total_spots) * 100) : 0,
      currentVehicles: active.length,
      todayEarnings,
      earningsDeltaPct,
      checkinsToday,
      avgStayHours: Math.round((avgStayMs / 3600000) * 10) / 10,
      hourly: buckets,
      recent,
    },
  });
});
