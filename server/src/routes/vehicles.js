import { Router } from 'express';
import { db } from '../db.js';
import { requireRole } from '../auth.js';

const router = Router();

// GET /api/vehicles
router.get('/', requireRole('commuter'), (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at ASC'
  ).all(req.user.id);
  res.json({ vehicles: rows });
});

// POST /api/vehicles  { plate, label? }
router.post('/', requireRole('commuter'), (req, res) => {
  const { plate, label } = req.body || {};
  if (!plate) return res.status(400).json({ error: 'Thiếu biển số xe' });

  const plateNorm = plate.toUpperCase().replace(/\s/g, '').trim();
  if (!/^[A-Z0-9\-\.]+$/.test(plateNorm))
    return res.status(400).json({ error: 'Biển số không hợp lệ' });

  try {
    const info = db.prepare(
      'INSERT INTO vehicles (user_id, plate, label, created_at) VALUES (?,?,?,?)'
    ).run(req.user.id, plateNorm, label?.trim() || null, Date.now());
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(Number(info.lastInsertRowid));
    res.json({ vehicle });
  } catch {
    res.status(409).json({ error: `Xe ${plateNorm} đã được thêm rồi` });
  }
});

// DELETE /api/vehicles/:id
router.delete('/:id', requireRole('commuter'), (req, res) => {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Không tìm thấy xe' });
  if (vehicle.user_id !== req.user.id) return res.status(403).json({ error: 'Không có quyền' });
  db.prepare('DELETE FROM vehicles WHERE id = ?').run(vehicle.id);
  res.json({ ok: true });
});

export default router;
