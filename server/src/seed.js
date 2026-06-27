import { db, initSchema } from './db.js';
import { computeFee, generateSlotLabel, randomToken, shortCode } from './lib.js';

initSchema();

// Xoá dữ liệu cũ (giữ schema)
db.exec('DELETE FROM sessions; DELETE FROM reviews; DELETE FROM lots; DELETE FROM tokens; DELETE FROM users;');
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('sessions','reviews','lots','users');");

const insertUser = db.prepare(
  'INSERT INTO users (name, username, password, role, wallet_balance) VALUES (?,?,?,?,?)'
);

// ---- Commuters demo ----
insertUser.run('Nguyễn Văn A', 'commuter1', '123456', 'commuter', 120000);
insertUser.run('Trần Thị B', 'commuter2', '123456', 'commuter', 80000);

// ---- Guest commuters (chủ các phiên seed, để commuter1/2 sạch khi demo) ----
const guestIds = [];
for (let i = 1; i <= 6; i++) {
  guestIds.push(Number(insertUser.run(`Khách ${i}`, `guest${i}`, '123456', 'commuter', 50000).lastInsertRowid));
}

// ---- Lots (quanh trung tâm TP.HCM) — MỖI BÃI 1 OWNER RIÊNG ----
const AM = {
  cam: 'Camera an ninh',
  mai: 'Có mái che',
  app: 'Thanh toán qua App',
  sac: 'Sạc xe điện',
  bv: 'Bảo vệ 24/7',
  rua: 'Rửa xe',
};
const IMG = 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=60';
const IMG2 = 'https://images.unsplash.com/photo-1545179605-1296651e9d43?auto=format&fit=crop&w=800&q=60';

const insertLot = db.prepare(`
  INSERT INTO lots
   (owner_id, name, lat, lng, address, image_url, pricing_type, price_per_hour, flat_price,
    total_spots, available_spots, covered, rating, review_count, amenities, open_hours, is_open)
  VALUES (@owner_id,@name,@lat,@lng,@address,@image_url,@pricing_type,@price_per_hour,@flat_price,
    @total_spots,@available_spots,@covered,@rating,@review_count,@amenities,@open_hours,@is_open)
`);

const lots = [
  { name: 'Bãi Đỗ Xe Vincom Center', lat: 10.7785, lng: 106.7009, address: '72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP.HCM', image_url: IMG, pricing_type: 'hourly', price_per_hour: 5000, flat_price: 0, total_spots: 25, available_spots: 12, covered: 1, rating: 4.8, review_count: 128, amenities: [AM.cam, AM.mai, AM.app, AM.sac].join('|'), open_hours: '06:00 - 23:00', is_open: 1 },
  { name: 'Bãi Xe Chợ Bến Thành', lat: 10.7720, lng: 106.6980, address: 'Lê Lợi, Bến Thành, Quận 1, TP.HCM', image_url: IMG2, pricing_type: 'flat', price_per_hour: 0, flat_price: 5000, total_spots: 40, available_spots: 8, covered: 0, rating: 4.2, review_count: 86, amenities: [AM.cam, AM.bv].join('|'), open_hours: '05:00 - 22:00', is_open: 1 },
  { name: 'Bãi Xe Nhà Thờ Đức Bà', lat: 10.7798, lng: 106.6990, address: '01 Công xã Paris, Bến Nghé, Quận 1', image_url: IMG, pricing_type: 'flat', price_per_hour: 0, flat_price: 6000, total_spots: 30, available_spots: 0, covered: 0, rating: 3.9, review_count: 41, amenities: [AM.bv].join('|'), open_hours: '06:00 - 21:00', is_open: 1 },
  { name: 'Saigon Centre Parking', lat: 10.7715, lng: 106.7012, address: '65 Lê Lợi, Bến Nghé, Quận 1', image_url: IMG2, pricing_type: 'hourly', price_per_hour: 6000, flat_price: 0, total_spots: 35, available_spots: 20, covered: 1, rating: 4.6, review_count: 154, amenities: [AM.cam, AM.mai, AM.app, AM.sac, AM.bv].join('|'), open_hours: '24/7', is_open: 1 },
  { name: 'Bãi Xe Bùi Viện', lat: 10.7670, lng: 106.6930, address: 'Bùi Viện, Phạm Ngũ Lão, Quận 1', image_url: IMG, pricing_type: 'flat', price_per_hour: 0, flat_price: 7000, total_spots: 25, available_spots: 14, covered: 0, rating: 4.0, review_count: 67, amenities: [AM.cam, AM.app].join('|'), open_hours: '10:00 - 02:00', is_open: 1 },
  { name: 'Bãi Xe Hồ Con Rùa', lat: 10.7830, lng: 106.6960, address: 'Công trường Quốc tế, Quận 3', image_url: IMG2, pricing_type: 'hourly', price_per_hour: 4000, flat_price: 0, total_spots: 20, available_spots: 6, covered: 1, rating: 4.3, review_count: 59, amenities: [AM.mai, AM.app].join('|'), open_hours: '06:00 - 23:00', is_open: 1 },
  { name: 'Bãi Xe Vạn Hạnh Mall', lat: 10.7710, lng: 106.6700, address: '11 Sư Vạn Hạnh, Phường 12, Quận 10', image_url: IMG, pricing_type: 'flat', price_per_hour: 0, flat_price: 4000, total_spots: 60, available_spots: 38, covered: 1, rating: 4.7, review_count: 210, amenities: [AM.cam, AM.mai, AM.app, AM.sac].join('|'), open_hours: '08:00 - 22:00', is_open: 1 },
  { name: 'Bãi Xe Bệnh viện Chợ Rẫy', lat: 10.7560, lng: 106.6590, address: '201B Nguyễn Chí Thanh, Quận 5', image_url: IMG2, pricing_type: 'flat', price_per_hour: 0, flat_price: 5000, total_spots: 50, available_spots: 5, covered: 0, rating: 3.6, review_count: 98, amenities: [AM.bv, AM.cam].join('|'), open_hours: '24/7', is_open: 1 },
  { name: 'Bãi Xe Landmark 81', lat: 10.7951, lng: 106.7218, address: '720A Điện Biên Phủ, Bình Thạnh', image_url: IMG, pricing_type: 'hourly', price_per_hour: 8000, flat_price: 0, total_spots: 80, available_spots: 50, covered: 1, rating: 4.9, review_count: 320, amenities: [AM.cam, AM.mai, AM.app, AM.sac, AM.bv, AM.rua].join('|'), open_hours: '24/7', is_open: 1 },
  { name: 'Bãi Xe Thảo Cầm Viên', lat: 10.7875, lng: 106.7055, address: '2 Nguyễn Bỉnh Khiêm, Quận 1', image_url: IMG2, pricing_type: 'flat', price_per_hour: 0, flat_price: 5000, total_spots: 30, available_spots: 18, covered: 0, rating: 4.1, review_count: 52, amenities: [AM.bv].join('|'), open_hours: '07:00 - 18:00', is_open: 1 },
  { name: 'Bãi Xe Phố đi bộ Nguyễn Huệ', lat: 10.7740, lng: 106.7040, address: 'Nguyễn Huệ, Bến Nghé, Quận 1', image_url: IMG, pricing_type: 'hourly', price_per_hour: 5000, flat_price: 0, total_spots: 45, available_spots: 28, covered: 0, rating: 4.4, review_count: 143, amenities: [AM.cam, AM.app].join('|'), open_hours: '06:00 - 24:00', is_open: 1 },
  { name: 'Bãi Xe Diamond Plaza', lat: 10.7805, lng: 106.6985, address: '34 Lê Duẩn, Bến Nghé, Quận 1', image_url: IMG2, pricing_type: 'hourly', price_per_hour: 7000, flat_price: 0, total_spots: 55, available_spots: 30, covered: 1, rating: 4.5, review_count: 176, amenities: [AM.cam, AM.mai, AM.app, AM.sac].join('|'), open_hours: '08:00 - 22:00', is_open: 1 },
];

// Mỗi bãi gắn 1 owner riêng: owner1 -> bãi 1 (Vincom), owner2 -> bãi 2, ...
const lotRecords = lots.map((l, i) => {
  const ownerId = Number(
    insertUser.run(`Chủ bãi #${i + 1}`, `owner${i + 1}`, '123456', 'owner', 0).lastInsertRowid
  );
  const id = Number(insertLot.run({ ...l, owner_id: ownerId }).lastInsertRowid);
  return { id, ownerId, ...l };
});

// ---- Reviews ----
const insertReview = db.prepare(
  'INSERT INTO reviews (lot_id, user_name, rating, comment) VALUES (?,?,?,?)'
);
const sampleReviews = [
  ['Hoàng Nam', 5, 'Bãi rộng, có mái che, bảo vệ thân thiện.'],
  ['Minh Anh', 4, 'Giá ổn, gần trung tâm, dễ tìm chỗ.'],
  ['Quốc Bảo', 5, 'Thanh toán qua app rất tiện, không cần vé giấy.'],
  ['Thuỳ Linh', 4, 'Sạch sẽ, có chỗ sạc xe điện.'],
];
lotRecords.forEach((lot, i) => {
  const n = (i % 3) + 1;
  for (let k = 0; k < n; k++) {
    const r = sampleReviews[(i + k) % sampleReviews.length];
    insertReview.run(lot.id, r[0], r[1], r[2]);
  }
});

// ---- Seed phiên gửi xe cho bãi của owner1 (lot đầu tiên) để dashboard có số ----
const demoLot = lotRecords[0];
const insertSession = db.prepare(`
  INSERT INTO sessions (lot_id, user_id, plate, slot_label, checkin_at, checkout_at, status, checkout_token, short_code, fee, payment_method)
  VALUES (?,?,?,?,?,?,?,?,?,?,?)
`);

const HOUR = 60 * 60 * 1000;
const now = Date.now();
const methods = ['momo', 'wallet', 'cash'];

// Sinh biển số DUY NHẤT cho mỗi phiên (tránh 1 xe vừa "đã ra" vừa "đang gửi")
const platePrefixes = ['51F', '59P1', '60B2', '72H1', '29X3', '43K1', '51G', '63B5',
  '92F1', '50A', '77M1', '38H2', '66C1', '47P3', '30F', '61C', '86B', '79N', '43A', '51H'];
let plateSeq = 0;
const nextPlate = () => {
  const pre = platePrefixes[plateSeq % platePrefixes.length];
  const num = 100 + plateSeq; // duy nhất theo từng phiên
  const dd = 10 + (plateSeq * 13) % 90;
  plateSeq++;
  return `${pre}-${num}.${dd}`;
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 26 phiên đã hoàn tất rải đều trong 48h qua (để có dữ liệu cả hôm nay & hôm qua)
for (let i = 0; i < 26; i++) {
  const checkinAt = now - Math.floor(Math.random() * 47 * HOUR) - HOUR;
  const stay = Math.floor((0.5 + Math.random() * 4.5) * HOUR);
  const checkoutAt = Math.min(now - 5 * 60 * 1000, checkinAt + stay);
  const fee = computeFee(demoLot, checkinAt, checkoutAt);
  insertSession.run(
    demoLot.id, pick(guestIds), nextPlate(), generateSlotLabel(),
    checkinAt, checkoutAt, 'completed', randomToken(), null, fee, pick(methods)
  );
}

// 3 phiên đang hoạt động (xe đang gửi) -> giảm chỗ trống tương ứng
let activeCount = 0;
for (let i = 0; i < 3; i++) {
  const checkinAt = now - Math.floor((0.3 + Math.random() * 3) * HOUR);
  insertSession.run(
    demoLot.id, guestIds[i], nextPlate(), generateSlotLabel(),
    checkinAt, null, 'active', randomToken(), shortCode(), null, null
  );
  activeCount++;
}
db.prepare('UPDATE lots SET available_spots = MAX(0, total_spots - ?) WHERE id = ?')
  .run(activeCount, demoLot.id);

// commuter1 đang gửi 2 XE KHÁC NHAU ở 2 bãi (demo: 1 người - nhiều xe/nhiều biển)
const commuter1Id = 1;
const c1 = [
  { lot: lotRecords[0], plate: '59X2-456.78', ago: 1.5 },   // Vincom (bãi của owner1)
  { lot: lotRecords[3], plate: '51K9-222.33', ago: 0.8 },   // Saigon Centre
];
c1.forEach(({ lot, plate, ago }) => {
  insertSession.run(
    lot.id, commuter1Id, plate, generateSlotLabel(),
    now - Math.floor(ago * HOUR), null, 'active', randomToken(), shortCode(), null, null
  );
  db.prepare('UPDATE lots SET available_spots = MAX(0, available_spots - 1) WHERE id = ?').run(lot.id);
});

console.log(`Seed xong: ${lots.length} bãi (mỗi bãi 1 owner), ${guestIds.length} guest, 29 phiên cho bãi "${demoLot.name}".`);
console.log('commuter1 đang gửi 2 xe:', c1.map((x) => x.plate).join(', '));
console.log('Demo: commuter1/123456 · owner1/123456 (quản lý "' + demoLot.name + '") · owner2..owner12/123456');
