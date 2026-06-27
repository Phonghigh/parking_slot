import { Router } from 'express';
import { db } from '../db.js';
import { haversineKm } from '../lib.js';
import { requireRole } from '../auth.js';

const router = Router();

function serializeLot(lot) {
  return {
    ...lot,
    covered: !!lot.covered,
    is_open: !!lot.is_open,
    amenities: lot.amenities ? lot.amenities.split('|').filter(Boolean) : [],
  };
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
  const reviews = db
    .prepare('SELECT id, user_name, rating, comment FROM reviews WHERE lot_id = ?')
    .all(lot.id);
  res.json({ lot: { ...serializeLot(lot), reviews } });
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
