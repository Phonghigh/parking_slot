# UI/UX — Partner & Staff Screens

**Last updated:** 2026-06-27  
**Related PRD section:** Parking Partner features, Parking Staff flows

---

## Screen Map

```
Partner Login
    │
    └── Dashboard (Home)
            │
            ├── Scan: Check-In  (Mode A)
            ├── Scan: Check-Out (Mode A)
            ├── Session List
            ├── Lot Settings
            └── Register New Lot
```

---

## 1. Partner Dashboard — Home

**Purpose:** At-a-glance view of capacity and today's activity.  
**Target device:** Mobile (staff on floor) + Desktop (office manager)

```
┌─────────────────────────────────────┐
│ 🅿️ ParkHub Partner     [Logout]    │
│ Bãi Nguyễn Huệ                     │
│─────────────────────────────────────│
│                                     │
│  Chỗ còn trống                      │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │      18 / 25                  │  │  large number
│  │    ████████████░░░░░          │  │  capacity bar
│  │                               │  │
│  │  [  − 1  ]      [  + 1  ]    │  │  manual adjust (Mode A)
│  └───────────────────────────────┘  │
│                                     │
│  Hôm nay                            │
│  ┌────────┐  ┌────────┐  ┌───────┐ │
│  │  47    │  │ 3h 12m │  │  ---  │ │
│  │ Lượt   │  │TB gửi  │  │Doanh  │ │
│  │  xe    │  │        │  │ thu   │ │
│  └────────┘  └────────┘  └───────┘ │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  [  📷 QUÉT VÀO BÃI  ]       │  │  primary CTA
│  │  [  📷 QUÉT RA BÃI   ]       │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

**Interactions:**
- `+1` / `-1` buttons update capacity immediately (optimistic UI, sync to server)
- Tapping "Quét vào/ra bãi" opens camera scanner

---

## 2. QR Scanner — Check-In

**Purpose:** Scan commuter's QR to open a session.

```
┌─────────────────────────────┐
│ ← Quét vào bãi             │
│─────────────────────────────│
│                             │
│  ┌─────────────────────┐   │
│  │                     │   │
│  │   [CAMERA VIEWFINDER│   │
│  │    with scan frame] │   │
│  │                     │   │
│  └─────────────────────┘   │
│                             │
│  Hướng camera vào mã QR     │
│  của người gửi xe           │
│                             │
│  ─── hoặc ───               │
│                             │
│  [ 🔍 Tìm bằng biển số ]   │  ← fallback
│                             │
└─────────────────────────────┘
```

**After scan — Confirmation card:**

```
┌─────────────────────────────┐
│  Thông tin gửi xe           │
│─────────────────────────────│
│  👤 Nguyễn Văn A           │
│  🏍️  51B-12345 · Xe máy    │
│  ⏰ Vào lúc: 08:32          │
│─────────────────────────────│
│  Biển số khớp? ✅           │
│                             │
│  [ ✅ XÁC NHẬN VÀO BÃI ]  │  green, full-width
│  [    Huỷ    ]              │
└─────────────────────────────┘
```

---

## 3. QR Scanner — Check-Out

**Purpose:** Scan commuter's checkout QR to close a session and show fee.

**After scan — Fee card:**

```
┌─────────────────────────────┐
│  Xác nhận ra bãi            │
│─────────────────────────────│
│  👤 Nguyễn Văn A           │
│  🏍️  51B-12345              │
│                             │
│  Vào: 08:32 · Ra: 11:47    │
│  Thời gian: 3 giờ 15 phút  │
│                             │
│  ┌───────────────────────┐  │
│  │  Phí cần thu          │  │
│  │                       │  │
│  │      15.000đ          │  │  large, prominent
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  [ ✅ ĐÃ THU TIỀN — CHO RA]│  green, full-width
│  [    Huỷ    ]              │
└─────────────────────────────┘
```

---

## 4. Account Lookup (Fallback)

**Purpose:** Find a commuter account when QR is unavailable.

```
┌─────────────────────────────┐
│ ← Tìm tài khoản            │
│─────────────────────────────│
│ Tìm bằng:                  │
│ ┌──────────────────────┐   │
│ │  Số CCCD             │   │
│ │  [                ]  │   │
│ └──────────────────────┘   │
│                             │
│ ─── hoặc ───                │
│                             │
│ ┌──────────────────────┐   │
│ │  Biển số xe          │   │
│ │  [ 51B-         ]    │   │
│ └──────────────────────┘   │
│                             │
│ [       TÌM KIẾM      ]    │
│─────────────────────────────│
│ Kết quả:                   │
│ ┌──────────────────────┐   │
│ │ 👤 Nguyễn Văn A     │   │
│ │ 🏍️ 51B-12345         │   │
│ │ [ Chọn tài khoản ]  │   │
│ └──────────────────────┘   │
└─────────────────────────────┘
```

---

## 5. Session List

**Purpose:** View all active and recent sessions at the lot.

```
┌─────────────────────────────┐
│ ← Phiên hôm nay    [Lọc ▾] │
│─────────────────────────────│
│ Đang gửi (7)                │
│ ┌──────────────────────┐   │
│ │ 🏍️ 51B-12345         │   │
│ │ Vào 08:32 • 3h 14m  │   │
│ │ Tạm tính: 15.000đ   │   │
│ └──────────────────────┘   │
│ ┌──────────────────────┐   │
│ │ 🚗 51G-67890         │   │
│ │ Vào 09:15 • 2h 31m  │   │
│ │ Tạm tính: 45.000đ   │   │
│ └──────────────────────┘   │
│─────────────────────────────│
│ Đã ra (40)                  │
│  ...                        │
└─────────────────────────────┘
```

---

## Partner Desktop Dashboard (xl breakpoint)

At `≥1280px`, the layout shifts to a sidebar + main content pattern:

```
┌──────────┬──────────────────────────────┐
│          │  Bãi Nguyễn Huệ              │
│ 🅿️        │─────────────────────────────│
│ Dashboard│  ████████████░░░░  18/25    │
│          │                              │
│ 📷 Scan  │  [Quét vào]  [Quét ra]      │
│          │─────────────────────────────│
│ 📋 Phiên │  Hôm nay: 47 lượt           │
│          │  [Table: active sessions]    │
│ ⚙️ Cài   │                              │
│   đặt   │                              │
└──────────┴──────────────────────────────┘
```
