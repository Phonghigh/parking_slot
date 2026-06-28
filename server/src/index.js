import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initSchema } from './db.js';
import authRouter from './routes/auth.js';
import lotsRouter, { ownerRouter } from './routes/lots.js';
import sessionsRouter from './routes/sessions.js';
import bookingsRouter from './routes/bookings.js';
import vehiclesRouter from './routes/vehicles.js';
import { sseHandler, broadcastLot } from './events.js';

initSchema();

// Auto-seed khi DB rỗng (deploy lần đầu / sau khi disk ephemeral bị reset)
if (db.prepare('SELECT COUNT(*) c FROM lots').get().c === 0) {
  console.log('DB trống → đang auto-seed dữ liệu demo…');
  (await import('./seed.js')).runSeed();
}

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

// ── Request / response logger ─────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  const { method, path: p, query, body } = req;

  res.on('finish', () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    const reset = '\x1b[0m';
    const dim = '\x1b[2m';
    const tag = `${color}${status}${reset}`;
    const qs = Object.keys(query).length ? ` ${dim}?${new URLSearchParams(query).toString()}${reset}` : '';
    console.log(`${dim}[API]${reset} ${method} ${p}${qs} → ${tag} ${dim}(${ms}ms)${reset}`);
    if (status >= 400 && body && Object.keys(body).length) {
      console.log(`      ${dim}body:${reset}`, JSON.stringify(body));
    }
  });

  next();
});

// ── API ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/events', sseHandler); // SSE: cập nhật capacity real-time
app.use('/api/auth', authRouter);
app.use('/api/lots', lotsRouter);
app.use('/api/owner', ownerRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/vehicles', vehiclesRouter);

// ── Phục vụ bản build PWA (single-service) + SPA fallback ─────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', '..', 'web', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next(); // để route /api không khớp trả 404 JSON
  res.sendFile(path.join(distPath, 'index.html'));
});

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  const dim = '\x1b[2m';
  const red = '\x1b[31m';
  const reset = '\x1b[0m';
  console.error(`${red}[ERROR]${reset} ${req.method} ${req.path}`);
  console.error(`        ${dim}${err.stack || err.message}${reset}`);
  if (!res.headersSent) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`GoPark đang chạy tại http://localhost:${PORT}`);
});
