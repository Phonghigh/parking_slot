// Server-Sent Events (SSE) - đẩy cập nhật capacity bãi đỗ tới client theo thời gian thực.
import { db } from './db.js';

const clients = new Set();

export function sseHandler(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 3000\n\n');
  res.write(': connected\n\n');
  clients.add(res);

  // heartbeat giữ kết nối sống (proxy không tự đóng)
  const hb = setInterval(() => {
    try {
      res.write(': hb\n\n');
    } catch {
      /* ignore */
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(hb);
    clients.delete(res);
  });
}

export function broadcast(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

// Phát cập nhật capacity của 1 bãi (đọc lại từ DB để chắc chắn số mới nhất).
export function broadcastLot(lotId) {
  const lot = db.prepare('SELECT id, available_spots, total_spots, is_open FROM lots WHERE id = ?').get(lotId);
  if (!lot) return;
  broadcast({
    type: 'lot-update',
    lot: {
      id: lot.id,
      available_spots: lot.available_spots,
      total_spots: lot.total_spots,
      is_open: !!lot.is_open,
    },
    at: Date.now(),
  });
}
