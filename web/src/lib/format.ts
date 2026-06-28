export function formatVnd(amount: number | null | undefined): string {
  if (amount == null) return '-';
  return amount.toLocaleString('vi-VN') + 'đ';
}

// "5k/lượt" hoặc "3k/giờ"
export function priceLabel(lot: {
  pricing_type: 'hourly' | 'flat';
  price_per_hour: number;
  flat_price: number;
}): string {
  if (lot.pricing_type === 'flat') {
    return `${Math.round(lot.flat_price / 1000)}k/lượt`;
  }
  return `${Math.round(lot.price_per_hour / 1000)}k/giờ`;
}

// Mức giá để so sánh khi sort theo "rẻ nhất"
export function effectivePrice(lot: {
  pricing_type: 'hourly' | 'flat';
  price_per_hour: number;
  flat_price: number;
}): number {
  return lot.pricing_type === 'flat' ? lot.flat_price : lot.price_per_hour;
}

export function formatDistance(km?: number | null): string {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

// Đếm thời gian đỗ dạng HH:MM:SS
export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// Màu theo capacity (theo design-system: green >50%, yellow 10-50%, red <10%/đầy)
export function capacityColor(available: number, total: number): {
  key: 'high' | 'medium' | 'full';
  color: string;
  label: string;
} {
  const ratio = total > 0 ? available / total : 0;
  if (available <= 0 || ratio < 0.1) return { key: 'full', color: '#E02424', label: available <= 0 ? 'Đầy' : 'Sắp đầy' };
  if (ratio <= 0.5) return { key: 'medium', color: '#FACA15', label: 'Sắp đầy' };
  return { key: 'high', color: '#0E9F6E', label: 'Còn nhiều chỗ' };
}
