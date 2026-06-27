import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initSchema } from './db.js';
import authRouter from './routes/auth.js';
import lotsRouter, { ownerRouter } from './routes/lots.js';
import sessionsRouter from './routes/sessions.js';
import { sseHandler } from './events.js';

initSchema();

// Auto-seed khi DB rỗng (deploy lần đầu / sau khi disk ephemeral bị reset)
if (db.prepare('SELECT COUNT(*) c FROM lots').get().c === 0) {
  console.log('DB trống → đang auto-seed dữ liệu demo…');
  (await import('./seed.js')).runSeed();
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ── API ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/events', sseHandler); // SSE: cập nhật capacity real-time
app.use('/api/auth', authRouter);
app.use('/api/lots', lotsRouter);
app.use('/api/owner', ownerRouter);
app.use('/api/sessions', sessionsRouter);

// ── Phục vụ bản build PWA (single-service) + SPA fallback ─────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', '..', 'web', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next(); // để route /api không khớp trả 404 JSON
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`GoPark đang chạy tại http://localhost:${PORT}`);
});
