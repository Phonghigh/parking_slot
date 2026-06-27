import express from 'express';
import cors from 'cors';
import { initSchema } from './db.js';
import authRouter from './routes/auth.js';
import lotsRouter, { ownerRouter } from './routes/lots.js';
import sessionsRouter from './routes/sessions.js';
import { sseHandler } from './events.js';

initSchema();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/events', sseHandler); // SSE: cập nhật capacity real-time
app.use('/api/auth', authRouter);
app.use('/api/lots', lotsRouter);
app.use('/api/owner', ownerRouter);
app.use('/api/sessions', sessionsRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`GoPark API đang chạy tại http://localhost:${PORT}`);
});
