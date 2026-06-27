# UI/UX — Commuter Screens

**Last updated:** 2026-06-27  
**Related PRD section:** F1, F2 — Commuter features

---

## Screen Map

```
Splash / Onboarding
    │
    ├── Register → OTP verify → Add Vehicle → Home
    │
    └── Login → Home
                │
                ├── [Tab] Map Search ←── default
                ├── [Tab] Active Session
                ├── [Tab] History
                └── [Tab] Profile
```

---

## 1. Home — Map Search

**Purpose:** Find a parking lot near a transit station.

```
┌─────────────────────────────┐
│ 🔍 Tìm bãi xe gần...        │  ← search bar (sticky top)
│ [Filter: 🏍️ Xe máy ▾] [Mở cửa ✓]│
├─────────────────────────────┤
│                             │
│   [    GOOGLE MAP      ]    │  ← full-width map
│   🟢P  🟡P    🔴P           │  ← colored lot markers
│                             │
├─────────────────────────────┤
│ Gần bạn • 4 bãi còn chỗ    │  ← bottom sheet (drag up)
│ ┌──────────────────────┐    │
│ │ 🟢 Bãi Nguyễn Huệ   │    │
│ │ 350m • 5.000đ/h • 8 chỗ │ │
│ └──────────────────────┘    │
│ ┌──────────────────────┐    │
│ │ 🟡 Bãi Lê Lợi       │    │
│ │ 600m • 4.000đ/h • 2 chỗ │ │
│ └──────────────────────┘    │
└─────────────────────────────┘
```

**Interactions:**
- Tap marker → lot preview card pops up
- Tap list item → navigate to Lot Detail
- Drag bottom sheet up → full list view, map minimizes to header strip
- Marker colors update in real time (WebSocket or polling every 30s)

---

## 2. Lot Detail

**Purpose:** Show full lot info and primary CTA.

```
┌─────────────────────────────┐
│ ← Back            ⭐ 4.2   │
│ [  Photo carousel  ]        │
│ Bãi Xe Nguyễn Huệ          │  text-xl bold
│ 📍 12 Nguyễn Huệ, Q.1      │  text-sm gray
│ 🕐 07:00 – 22:00            │  text-sm
│─────────────────────────────│
│ 🏍️ 5.000đ/h   🚗 15.000đ/h │
│─────────────────────────────│
│ Chỗ còn trống               │
│ ████████░░  18 / 25 chỗ    │  capacity bar
│─────────────────────────────│
│ Cách bạn 350m • ~4 phút đi │
│ 🚇 Metro Bến Thành: 200m   │
│─────────────────────────────│
│ [  🗺️ Chỉ đường  ] [ ⭐ Đánh giá ]│
│                             │
│ [     VÀO BÃI GỬI XE     ] │  ← primary CTA (blue, full-width)
└─────────────────────────────┘
```

**Interactions:**
- "Vào bãi gửi xe" → vehicle selector (if multiple) → QR screen
- "Chỉ đường" → deeplink to Google Maps / BusMap
- Capacity bar animates on load

---

## 3. Vehicle Selector (Modal)

**Shown when:** User has >1 registered vehicle.

```
┌─────────────────────────────┐
│ Chọn xe bạn đang đi         │
│─────────────────────────────│
│ ○  🏍️  51B-12345            │
│    Xe máy                   │
│─────────────────────────────│
│ ○  🚗  51G-67890            │
│    Ô tô                     │
│─────────────────────────────│
│        [ Tiếp tục ]         │
└─────────────────────────────┘
```

Bottom sheet on mobile. Full modal on desktop.

---

## 4. QR Check-In Screen

**Purpose:** Display the QR for staff to scan at entry.

```
┌─────────────────────────────┐
│ ← Huỷ                      │
│                             │
│   Đưa mã này cho nhân viên  │
│                             │
│   ┌─────────────────┐       │
│   │                 │       │
│   │   [QR CODE]     │       │  large, centered
│   │                 │       │
│   └─────────────────┘       │
│                             │
│   🏍️  51B-12345             │  plate displayed below QR
│   Bãi Nguyễn Huệ           │
│                             │
│ ⚡ Giữ màn hình sáng        │  auto-wakelock hint
│                             │
│ [ Không có điện thoại? ]   │  → fallback info
└─────────────────────────────┘
```

**Behavior:**
- Screen brightness forced to max
- Wakelock API prevents screen sleep
- QR is static — always the same image (cached, works offline)
- Tap "Không có điện thoại?" → modal explaining CCCD/cà vẹt fallback

---

## 5. Active Session Screen

**Purpose:** Show live parking timer and enable checkout.

```
┌─────────────────────────────┐
│ Đang gửi xe                 │
│─────────────────────────────│
│                             │
│ Bãi Nguyễn Huệ              │  lot name
│ 📍 12 Nguyễn Huệ, Q.1      │
│                             │
│        01 : 23 : 47         │  HH:MM:SS live timer (large)
│        Thời gian gửi        │
│                             │
│   Vào lúc 08:32 hôm nay    │
│                             │
│   🏍️  51B-12345             │
│─────────────────────────────│
│   Tạm tính:  12.000đ        │  updates every minute
│   (2 giờ × 5.000đ + 1 giờ) │  breakdown below
│─────────────────────────────│
│                             │
│  [    LẤY XE — XUẤT BÃI   ]│  ← primary CTA
│                             │
└─────────────────────────────┘
```

**Behavior:**
- Timer ticks live (client-side from checkInTime)
- Fee recalculates every minute using `ceil(elapsed / 60min) × rate`
- "Lấy xe" → Checkout QR screen

---

## 6. Checkout QR Screen

**Purpose:** Display checkout QR; show fee for staff to collect.

```
┌─────────────────────────────┐
│ ← Quay lại                 │
│                             │
│   Đưa mã cho nhân viên      │
│   để xác nhận ra bãi        │
│                             │
│   ┌─────────────────┐       │
│   │   [QR CODE]     │       │
│   └─────────────────┘       │
│                             │
│  ┌───────────────────────┐  │
│  │  💳 Phí cần trả       │  │
│  │                       │  │
│  │      15.000đ          │  │  text-fee (28px bold)
│  │                       │  │
│  │  3 giờ × 5.000đ/h    │  │
│  │  Xe máy · 51B-12345  │  │
│  └───────────────────────┘  │
│                             │
│  Trả tiền mặt tại quầy     │  MVP note
│                             │
└─────────────────────────────┘
```

---

## 7. Session Confirmed / Receipt

**Shown after:** Staff confirms checkout.

```
┌─────────────────────────────┐
│                             │
│         ✅                  │  large checkmark, animated
│                             │
│    Đã lấy xe thành công!   │
│                             │
│  Bãi Nguyễn Huệ            │
│  Vào: 08:32 · Ra: 11:47    │
│  Thời gian: 3 giờ 15 phút  │
│  Phí: 15.000đ              │
│                             │
│  [  📋 Lưu hóa đơn  ]     │
│  [  🔍 Tìm bãi khác  ]    │
│                             │
└─────────────────────────────┘
```

---

## Tab Bar (Bottom Navigation)

```
┌──────┬──────┬──────┬──────┐
│  🗺️  │  ⏱️  │  📋  │  👤  │
│ Tìm  │Phiên │Lịch sử│Tôi  │
└──────┴──────┴──────┴──────┘
```

- "Phiên" tab shows badge dot when there is an active session
- "Lịch sử" shows total sessions count
