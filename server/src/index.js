import express from 'express';
import cors from 'cors';
import { initSchema, db } from './db.js';
import authRouter from './routes/auth.js';
import lotsRouter, { ownerRouter } from './routes/lots.js';
import sessionsRouter from './routes/sessions.js';
import bookingsRouter from './routes/bookings.js';
import { sseHandler, broadcastLot } from './events.js';

initSchema();

function expireStaleBookings() {
  const now = Date.now();
  const expired = db.prepare(
    "SELECT * FROM bookings WHERE status = 'pending' AND expires_at < ?"
  ).all(now);
  for (const b of expired) {
    db.prepare("UPDATE bookings SET status = 'expired' WHERE id = ?").run(b.id);
    db.prepare('UPDATE lots SET available_spots = MIN(total_spots, available_spots + 1) WHERE id = ?').run(b.lot_id);
    broadcastLot(b.lot_id);
  }
}

expireStaleBookings();
setInterval(expireStaleBookings, 30_000);

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/events', sseHandler); // SSE: cập nhật capacity real-time
app.use('/api/auth', authRouter);
app.use('/api/lots', lotsRouter);
app.use('/api/owner', ownerRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/bookings', bookingsRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`GoPark API đang chạy tại http://localhost:${PORT}`);
});
