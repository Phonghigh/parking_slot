import { db, initSchema } from './db.js';

initSchema();

// Xoá dữ liệu cũ (giữ schema)
db.exec('DELETE FROM sessions; DELETE FROM reviews; DELETE FROM lots; DELETE FROM tokens; DELETE FROM users;');
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('sessions','reviews','lots','users');");

// ---- Users ----
const insertUser = db.prepare(
  'INSERT INTO users (name, username, password, role, wallet_balance) VALUES (?,?,?,?,?)'
);
const commuter1 = Number(insertUser.run('Nguyễn Văn A', 'commuter1', '123456', 'commuter', 120000).lastInsertRowid);
insertUser.run('Trần Thị B', 'commuter2', '123456', 'commuter', 80000);
const owner1 = Number(insertUser.run('Chủ bãi ParkSmart', 'owner1', '123456', 'owner', 0).lastInsertRowid);
const owner2 = Number(insertUser.run('Bãi xe Quận 3', 'owner2', '123456', 'owner', 0).lastInsertRowid);

// ---- Lots (quanh trung tâm TP.HCM) ----
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
  { owner_id: owner1, name: 'Bãi Đỗ Xe Vincom Center', lat: 10.7785, lng: 106.7009, address: '72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP.HCM', image_url: IMG, pricing_type: 'hourly', price_per_hour: 5000, flat_price: 0, total_spots: 60, available_spots: 50, covered: 1, rating: 4.8, review_count: 128, amenities: [AM.cam, AM.mai, AM.app, AM.sac].join('|'), open_hours: '06:00 - 23:00', is_open: 1 },
  { owner_id: owner1, name: 'Bãi Xe Chợ Bến Thành', lat: 10.7720, lng: 106.6980, address: 'Lê Lợi, Bến Thành, Quận 1, TP.HCM', image_url: IMG2, pricing_type: 'flat', price_per_hour: 0, flat_price: 5000, total_spots: 120, available_spots: 8, covered: 0, rating: 4.2, review_count: 86, amenities: [AM.cam, AM.bv].join('|'), open_hours: '05:00 - 22:00', is_open: 1 },
  { owner_id: owner1, name: 'Bãi Xe Nhà Thờ Đức Bà', lat: 10.7798, lng: 106.6990, address: '01 Công xã Paris, Bến Nghé, Quận 1', image_url: IMG, pricing_type: 'flat', price_per_hour: 0, flat_price: 6000, total_spots: 40, available_spots: 0, covered: 0, rating: 3.9, review_count: 41, amenities: [AM.bv].join('|'), open_hours: '06:00 - 21:00', is_open: 1 },
  { owner_id: owner1, name: 'Saigon Centre Parking', lat: 10.7715, lng: 106.7012, address: '65 Lê Lợi, Bến Nghé, Quận 1', image_url: IMG2, pricing_type: 'hourly', price_per_hour: 6000, flat_price: 0, total_spots: 80, available_spots: 35, covered: 1, rating: 4.6, review_count: 154, amenities: [AM.cam, AM.mai, AM.app, AM.sac, AM.bv].join('|'), open_hours: '24/7', is_open: 1 },
  { owner_id: owner1, name: 'Bãi Xe Bùi Viện', lat: 10.7670, lng: 106.6930, address: 'Bùi Viện, Phạm Ngũ Lão, Quận 1', image_url: IMG, pricing_type: 'flat', price_per_hour: 0, flat_price: 7000, total_spots: 50, available_spots: 22, covered: 0, rating: 4.0, review_count: 67, amenities: [AM.cam, AM.app].join('|'), open_hours: '10:00 - 02:00', is_open: 1 },
  { owner_id: owner2, name: 'Bãi Xe Hồ Con Rùa', lat: 10.7830, lng: 106.6960, address: 'Công trường Quốc tế, Quận 3', image_url: IMG2, pricing_type: 'hourly', price_per_hour: 4000, flat_price: 0, total_spots: 45, available_spots: 12, covered: 1, rating: 4.3, review_count: 59, amenities: [AM.mai, AM.app].join('|'), open_hours: '06:00 - 23:00', is_open: 1 },
  { owner_id: owner2, name: 'Bãi Xe Vạn Hạnh Mall', lat: 10.7710, lng: 106.6700, address: '11 Sư Vạn Hạnh, Phường 12, Quận 10', image_url: IMG, pricing_type: 'flat', price_per_hour: 0, flat_price: 4000, total_spots: 200, available_spots: 120, covered: 1, rating: 4.7, review_count: 210, amenities: [AM.cam, AM.mai, AM.app, AM.sac].join('|'), open_hours: '08:00 - 22:00', is_open: 1 },
  { owner_id: owner2, name: 'Bãi Xe Bệnh viện Chợ Rẫy', lat: 10.7560, lng: 106.6590, address: '201B Nguyễn Chí Thanh, Quận 5', image_url: IMG2, pricing_type: 'flat', price_per_hour: 0, flat_price: 5000, total_spots: 150, available_spots: 5, covered: 0, rating: 3.6, review_count: 98, amenities: [AM.bv, AM.cam].join('|'), open_hours: '24/7', is_open: 1 },
  { owner_id: owner2, name: 'Bãi Xe Landmark 81', lat: 10.7951, lng: 106.7218, address: '720A Điện Biên Phủ, Bình Thạnh', image_url: IMG, pricing_type: 'hourly', price_per_hour: 8000, flat_price: 0, total_spots: 300, available_spots: 180, covered: 1, rating: 4.9, review_count: 320, amenities: [AM.cam, AM.mai, AM.app, AM.sac, AM.bv, AM.rua].join('|'), open_hours: '24/7', is_open: 1 },
  { owner_id: owner2, name: 'Bãi Xe Thảo Cầm Viên', lat: 10.7875, lng: 106.7055, address: '2 Nguyễn Bỉnh Khiêm, Quận 1', image_url: IMG2, pricing_type: 'flat', price_per_hour: 0, flat_price: 5000, total_spots: 70, available_spots: 40, covered: 0, rating: 4.1, review_count: 52, amenities: [AM.bv].join('|'), open_hours: '07:00 - 18:00', is_open: 1 },
  { owner_id: owner1, name: 'Bãi Xe Phố đi bộ Nguyễn Huệ', lat: 10.7740, lng: 106.7040, address: 'Nguyễn Huệ, Bến Nghé, Quận 1', image_url: IMG, pricing_type: 'hourly', price_per_hour: 5000, flat_price: 0, total_spots: 90, available_spots: 28, covered: 0, rating: 4.4, review_count: 143, amenities: [AM.cam, AM.app].join('|'), open_hours: '06:00 - 24:00', is_open: 1 },
  { owner_id: owner1, name: 'Bãi Xe Diamond Plaza', lat: 10.7805, lng: 106.6985, address: '34 Lê Duẩn, Bến Nghé, Quận 1', image_url: IMG2, pricing_type: 'hourly', price_per_hour: 7000, flat_price: 0, total_spots: 110, available_spots: 60, covered: 1, rating: 4.5, review_count: 176, amenities: [AM.cam, AM.mai, AM.app, AM.sac].join('|'), open_hours: '08:00 - 22:00', is_open: 1 },
];

const lotIds = lots.map((l) => Number(insertLot.run(l).lastInsertRowid));

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
lotIds.forEach((id, i) => {
  // mỗi bãi gắn 1-3 review mẫu
  const n = (i % 3) + 1;
  for (let k = 0; k < n; k++) {
    const r = sampleReviews[(i + k) % sampleReviews.length];
    insertReview.run(id, r[0], r[1], r[2]);
  }
});

console.log(`Seed xong: ${lots.length} bãi xe, users (commuter1/owner1...), reviews.`);
console.log('Tài khoản demo: commuter1/123456, owner1/123456, owner2/123456');
