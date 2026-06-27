const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface LotUpdate {
  id: number;
  available_spots: number;
  total_spots: number;
  is_open: boolean;
}

/**
 * Lắng nghe cập nhật capacity bãi đỗ theo thời gian thực (SSE).
 * Trả về hàm hủy đăng ký. EventSource tự kết nối lại khi rớt mạng.
 */
export function subscribeLotUpdates(onLot: (lot: LotUpdate) => void): () => void {
  let es: EventSource | null = null;
  try {
    es = new EventSource(`${BASE}/events`);
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'lot-update' && msg.lot) onLot(msg.lot as LotUpdate);
      } catch {
        /* bỏ qua message lỗi */
      }
    };
    // onerror: EventSource tự reconnect, không cần xử lý thêm
  } catch {
    /* EventSource không khả dụng -> bỏ qua, app vẫn chạy */
  }
  return () => es?.close();
}
