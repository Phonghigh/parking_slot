import { db, initSchema } from './db.js';
import { computeFee, generateSlotLabel, randomToken, shortCode } from './lib.js';
import { pathToFileURL } from 'node:url';

// Seed toàn bộ dữ liệu demo (xoá sạch rồi tạo lại). Gọi từ CLI hoặc auto-seed khi DB rỗng.
export function runSeed() {
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

// ---- Lots (quanh trung tâm TP.HCM) - MỖI BÃI 1 OWNER RIÊNG ----
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

// ===== Sinh thêm bãi đỗ phủ khắp TP.HCM (đậm đặc quanh Metro Line 1) tới 150 bãi =====
// 14 ga Metro Line 1 (Bến Thành – Suối Tiên)
const METRO = [
  { n: 'Bến Thành', lat: 10.7722, lng: 106.6979 },
  { n: 'Nhà hát Thành phố', lat: 10.7765, lng: 106.7030 },
  { n: 'Ba Son', lat: 10.7855, lng: 106.7065 },
  { n: 'Công viên Văn Thánh', lat: 10.7975, lng: 106.7155 },
  { n: 'Tân Cảng', lat: 10.7980, lng: 106.7220 },
  { n: 'Thảo Điền', lat: 10.8030, lng: 106.7335 },
  { n: 'An Phú', lat: 10.8040, lng: 106.7430 },
  { n: 'Rạch Chiếc', lat: 10.8175, lng: 106.7560 },
  { n: 'Phước Long', lat: 10.8290, lng: 106.7640 },
  { n: 'Bình Thái', lat: 10.8410, lng: 106.7720 },
  { n: 'Thủ Đức', lat: 10.8490, lng: 106.7790 },
  { n: 'Khu Công nghệ cao', lat: 10.8580, lng: 106.7880 },
  { n: 'Đại học Quốc gia', lat: 10.8720, lng: 106.7980 },
  { n: 'Bến xe Suối Tiên', lat: 10.8790, lng: 106.8140 },
];

// Các quận/khu vực + tên đường thật để rải đều
const AREAS = [
  { d: 'Quận 1', lat: 10.7740, lng: 106.6990, streets: ['Lê Lợi', 'Hàm Nghi', 'Lê Thánh Tôn', 'Pasteur', 'Nam Kỳ Khởi Nghĩa', 'Lý Tự Trọng', 'Calmette', 'Cô Giang', 'Tôn Đức Thắng'] },
  { d: 'Quận 3', lat: 10.7820, lng: 106.6850, streets: ['Võ Văn Tần', 'Nguyễn Đình Chiểu', 'Cách Mạng Tháng 8', 'Lê Văn Sỹ', 'Trần Quốc Thảo', 'Bà Huyện Thanh Quan', 'Nguyễn Thị Minh Khai'] },
  { d: 'Quận 4', lat: 10.7570, lng: 106.7050, streets: ['Khánh Hội', 'Hoàng Diệu', 'Nguyễn Tất Thành', 'Đoàn Văn Bơ', 'Tôn Đản', 'Bến Vân Đồn'] },
  { d: 'Quận 5', lat: 10.7540, lng: 106.6630, streets: ['Trần Hưng Đạo', 'Nguyễn Trãi', 'An Dương Vương', 'Châu Văn Liêm', 'Hải Thượng Lãn Ông', 'Sư Vạn Hạnh'] },
  { d: 'Quận 6', lat: 10.7460, lng: 106.6350, streets: ['Kinh Dương Vương', 'Hậu Giang', 'Hồng Bàng', 'Bà Hom', 'Phạm Văn Chí'] },
  { d: 'Quận 7', lat: 10.7340, lng: 106.7220, streets: ['Nguyễn Văn Linh', 'Nguyễn Thị Thập', 'Tôn Dật Tiên', 'Huỳnh Tấn Phát', 'Lê Văn Lương', 'Phú Mỹ Hưng'] },
  { d: 'Quận 8', lat: 10.7240, lng: 106.6280, streets: ['Phạm Thế Hiển', 'Tạ Quang Bửu', 'Dương Bá Trạc', 'Âu Dương Lân'] },
  { d: 'Quận 10', lat: 10.7730, lng: 106.6670, streets: ['3 Tháng 2', 'Sư Vạn Hạnh', 'Lý Thường Kiệt', 'Cao Thắng', 'Hòa Hảo', 'Thành Thái', 'Tô Hiến Thành'] },
  { d: 'Quận 11', lat: 10.7640, lng: 106.6430, streets: ['Lạc Long Quân', '3 Tháng 2', 'Lãnh Binh Thăng', 'Hòa Bình', 'Minh Phụng'] },
  { d: 'Quận 12', lat: 10.8670, lng: 106.6540, streets: ['Quang Trung', 'Nguyễn Ảnh Thủ', 'Tô Ký', 'Hà Huy Giáp', 'Lê Văn Khương'] },
  { d: 'Bình Thạnh', lat: 10.8100, lng: 106.7090, streets: ['Bạch Đằng', 'Phan Đăng Lưu', 'Đinh Bộ Lĩnh', 'Nguyễn Xí', 'Xô Viết Nghệ Tĩnh', 'Nơ Trang Long'] },
  { d: 'Phú Nhuận', lat: 10.7990, lng: 106.6800, streets: ['Phan Xích Long', 'Hoàng Văn Thụ', 'Nguyễn Văn Trỗi', 'Huỳnh Văn Bánh', 'Đặng Văn Ngữ'] },
  { d: 'Tân Bình', lat: 10.8010, lng: 106.6520, streets: ['Cộng Hòa', 'Trường Chinh', 'Hoàng Văn Thụ', 'Lý Thường Kiệt', 'Âu Cơ', 'Trường Sơn'] },
  { d: 'Tân Phú', lat: 10.7900, lng: 106.6280, streets: ['Lũy Bán Bích', 'Tân Kỳ Tân Quý', 'Gò Dầu', 'Hòa Bình', 'Âu Cơ'] },
  { d: 'Gò Vấp', lat: 10.8380, lng: 106.6650, streets: ['Quang Trung', 'Nguyễn Oanh', 'Phan Văn Trị', 'Lê Đức Thọ', 'Nguyễn Văn Nghi', 'Phạm Văn Đồng'] },
  { d: 'Bình Tân', lat: 10.7650, lng: 106.6020, streets: ['Kinh Dương Vương', 'Tên Lửa', 'Vành Đai Trong', 'Tỉnh Lộ 10', 'Lê Văn Quới'] },
  { d: 'TP Thủ Đức', lat: 10.8300, lng: 106.7600, streets: ['Võ Văn Ngân', 'Kha Vạn Cân', 'Đặng Văn Bi', 'Đỗ Xuân Hợp', 'Lê Văn Việt', 'Man Thiện', 'Tô Ngọc Vân'] },
  { d: 'Nhà Bè', lat: 10.6950, lng: 106.7330, streets: ['Nguyễn Hữu Thọ', 'Lê Văn Lương', 'Huỳnh Tấn Phát', 'Phạm Hữu Lầu'] },
];

const PREFIX = ['Bãi xe', 'Bãi giữ xe', 'Nhà xe', 'Bãi đỗ xe', 'Điểm giữ xe', 'Bãi xe máy'];
const HOURS = ['24/7', '06:00 - 22:00', '05:00 - 23:00', '07:00 - 21:00', '06:00 - 24:00', '05:30 - 22:30'];
const AMEN_POOL = [AM.cam, AM.mai, AM.app, AM.sac, AM.bv, AM.rua];
const FLAT_PRICES = [3000, 4000, 5000, 6000, 7000, 10000];
const HOURLY_PRICES = [3000, 4000, 5000, 6000, 8000];
const SPOT_SIZES = [20, 30, 40, 50, 60, 80, 100, 120, 150, 200];

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const jit = (v) => v + (Math.random() - 0.5) * 0.009; // ~±500m
const houseNo = () => Math.floor(Math.random() * 400) + 1;
const usedNames = new Set(lots.map((l) => l.name));

function genLot(name, lat, lng, address) {
  if (usedNames.has(name)) name = `${name} ${Math.floor(Math.random() * 90) + 10}`;
  usedNames.add(name);
  const flat = Math.random() < 0.6;
  const total = rnd(SPOT_SIZES);
  const amenN = 1 + Math.floor(Math.random() * 4);
  const amenities = [...AMEN_POOL].sort(() => Math.random() - 0.5).slice(0, amenN).join('|');
  return {
    name,
    lat: +lat.toFixed(6),
    lng: +lng.toFixed(6),
    address,
    image_url: Math.random() < 0.5 ? IMG : IMG2,
    pricing_type: flat ? 'flat' : 'hourly',
    price_per_hour: flat ? 0 : rnd(HOURLY_PRICES),
    flat_price: flat ? rnd(FLAT_PRICES) : 0,
    total_spots: total,
    available_spots: Math.floor(Math.random() * (total + 1)),
    covered: Math.random() < 0.5 ? 1 : 0,
    rating: 0,
    review_count: 0,
    amenities,
    open_hours: rnd(HOURS),
    is_open: Math.random() < 0.92 ? 1 : 0,
  };
}

const TARGET_LOTS = 150;
while (lots.length < TARGET_LOTS) {
  if (Math.random() < 0.45) {
    // quanh ga Metro
    const s = rnd(METRO);
    lots.push(genLot(`${rnd(PREFIX)} Ga Metro ${s.n}`, jit(s.lat), jit(s.lng), `Gần Ga Metro ${s.n}, TP.HCM`));
  } else {
    // rải các quận
    const a = rnd(AREAS);
    const st = rnd(a.streets);
    lots.push(genLot(`${rnd(PREFIX)} ${st}`, jit(a.lat), jit(a.lng), `${houseNo()} ${st}, ${a.d}, TP.HCM`));
  }
}

// Mỗi bãi gắn 1 owner riêng: owner1 -> bãi 1 (Vincom), owner2 -> bãi 2, ...
const lotRecords = lots.map((l, i) => {
  const ownerId = Number(
    insertUser.run(`Chủ bãi #${i + 1}`, `owner${i + 1}`, '123456', 'owner', 0).lastInsertRowid
  );
  const id = Number(insertLot.run({ ...l, owner_id: ownerId }).lastInsertRowid);
  return { id, ownerId, ...l };
});

// ---- Reviews ---- (user_id = NULL: đánh giá mẫu, không gắn tài khoản)
const insertReview = db.prepare(
  'INSERT INTO reviews (lot_id, user_name, rating, comment, updated_at) VALUES (?,?,?,?,?)'
);
const sampleReviews = [
  ['Hoàng Nam', 5, 'Bãi rộng, có mái che, bảo vệ thân thiện.'],
  ['Minh Anh', 4, 'Giá ổn, gần trung tâm, dễ tìm chỗ.'],
  ['Quốc Bảo', 5, 'Thanh toán qua app rất tiện, không cần vé giấy.'],
  ['Thuỳ Linh', 4, 'Sạch sẽ, có chỗ sạc xe điện.'],
  ['Đức Anh', 5, 'Nhân viên nhiệt tình, ra vào nhanh.'],
  ['Phương Vy', 3, 'Giờ cao điểm hơi đông, cần chờ.'],
  ['Tuấn Kiệt', 4, 'Có camera an ninh, yên tâm để xe.'],
  ['Bảo Trân', 5, 'Quá tiện, không cần vé giấy nữa.'],
  ['Gia Hân', 4, 'Vị trí dễ tìm, giá hợp lý.'],
];
lotRecords.forEach((lot, i) => {
  const n = 3 + (i % 4); // 3–6 đánh giá mỗi bãi
  for (let k = 0; k < n; k++) {
    const r = sampleReviews[(i * 3 + k) % sampleReviews.length];
    insertReview.run(lot.id, r[0], r[1], r[2], Date.now() - (k + 1) * 86400000);
  }
  // rating + review_count khớp số đánh giá thực (nhất quán khi user thêm/sửa sau này)
  const agg = db.prepare('SELECT COUNT(*) c, AVG(rating) a FROM reviews WHERE lot_id = ?').get(lot.id);
  db.prepare('UPDATE lots SET rating = ?, review_count = ? WHERE id = ?')
    .run(Math.round(agg.a * 10) / 10, agg.c, lot.id);
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
}

// Chạy seed khi gọi trực tiếp: `node src/seed.js`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSeed();
}
