import { randomBytes } from 'node:crypto';

export function randomToken(bytes = 16) {
  return randomBytes(bytes).toString('hex');
}

// Khoảng cách Haversine (km)
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Tính phí theo kiểu giá của bãi.
// hourly: làm tròn lên số giờ (tối thiểu 1 giờ) * price_per_hour
// flat: flat_price cố định mỗi lượt
export function computeFee(lot, checkinAt, checkoutAt) {
  if (lot.pricing_type === 'flat') {
    return lot.flat_price;
  }
  const ms = Math.max(0, checkoutAt - checkinAt);
  const hours = Math.max(1, Math.ceil(ms / (60 * 60 * 1000)));
  return hours * lot.price_per_hour;
}

// Sinh nhãn vị trí slot ngẫu nhiên (demo)
const FLOORS = ['Tầng hầm B1', 'Tầng hầm B2', 'Tầng trệt', 'Tầng 2'];
const ZONES = ['Khu A', 'Khu B', 'Khu C'];
export function generateSlotLabel() {
  const floor = FLOORS[Math.floor(Math.random() * FLOORS.length)];
  const zone = ZONES[Math.floor(Math.random() * ZONES.length)];
  const slot = Math.floor(Math.random() * 80) + 1;
  return `${floor} - ${zone} - Vị trí ${slot}`;
}
