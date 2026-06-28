# UI/UX - Component Library

**Last updated:** 2026-06-27  
**Related PRD section:** Platform - Web App

---

## Buttons

### Primary

- Background: `primary-500` (#00B14F) → hover `primary-600` (#009A45)
- Text: white, `text-base`, `font-600`
- Padding: `12px 24px`
- Radius: `rounded-md` (8px)
- Full-width on mobile for main CTAs

### Secondary

- Background: white, border `1px solid gray-200`
- Text: `gray-900`

### Destructive

- Background: `error` (`#C81E1E`)
- For: cancel session, remove vehicle

### States

```text
Default   → Hover    → Active   → Disabled
[Button]     [Button]   [Button]   [Button]
bg-500       bg-600     scale-98   opacity-50, cursor-not-allowed
```

### Loading state

- Replace button text with spinner (`animate-spin` 16px icon)
- Disable pointer events during loading
- Never show two loading buttons simultaneously

---

## Capacity Bar

Used on: Map markers (mini), Lot Detail (full), Partner Dashboard (full)

```text
Chỗ còn trống
████████████░░░░  18 / 25
```

- Fill color: `status-green` if >50%, `status-yellow` if 10–50%, `status-red` if <10%
- Transition: smooth color change (`transition-colors 500ms`)
- Text: `{available} / {total}` right-aligned

---

## Map Markers

Circular with color fill + white P icon:

```text
🟢  Available (>50%)
🟡  Filling (10–50%)
🔴  Full (<10%)
⚫  Closed
```

- Size: 32×32px default, 40×40px when selected
- Selected state: drop shadow + slight scale-up (`scale-110`)
- Tap: show lot preview card (see Lot Card below)

---

## Lot Card (Preview)

Appears when tapping a map marker:

```text
┌────────────────────────────┐
│ Bãi Xe Nguyễn Huệ   🟢    │
│ 📍 350m · 5.000đ/h         │
│ 🕐 07:00–22:00 · 18 chỗ   │
│ [ Xem chi tiết → ]         │
└────────────────────────────┘
```

- Bottom of map, slides up on tap
- Dismisses on swipe down or tap outside

---

## QR Display

Used on: Check-in screen, Checkout screen

- Size: fills container minus 48px padding (max 280×280px)
- White padding: 12px around QR itself
- Border: `1px solid gray-200`, `rounded-lg`
- Background: white (ensures contrast on any device brightness)

---

## Session Timer

```text
  01 : 23 : 47
  Thời gian gửi
```

- Font: `text-4xl` (36px), `font-700`, `tabular-nums` (fixed width digits)
- Updates every second via `setInterval`
- Color: `gray-900` default → `error` if session >12h (unusual alert)

---

## Fee Display

```text
15.000đ
3 giờ × 5.000đ/h
```

- Amount: `text-fee` (28px bold), `primary-500` (#00B14F)
- Breakdown: `text-sm`, `gray-600`
- Vietnamese currency format: `{amount}.000đ` (not `15,000 VND`)

---

## Toast Notifications

```text
┌─────────────────────────────┐
│ ✅ Đã vào bãi Nguyễn Huệ  │  ← success
│ ⚠️  Bãi sắp đầy (2 chỗ)   │  ← warning
│ ❌ Không tìm thấy tài khoản│  ← error
└─────────────────────────────┘
```

- Position: top-center on mobile, top-right on desktop
- Auto-dismiss: 4s for success/info, 6s for warning, 8s for error (or manual dismiss)
- Stack: max 3 toasts visible at once

---

## Empty States

Used in: Session List (no active sessions), History (first use)

```text
        🅿️
  Chưa có phiên gửi xe
  Tìm bãi xe gần bạn để bắt đầu

  [  Tìm bãi xe  ]
```

- Icon: large (48px), `gray-300`
- Message: `text-base`, `gray-600`
- CTA: only when action is available

---

## Skeleton Loaders

Used during: map load, lot list fetch, session data fetch

- Same shape as target content
- Background: `gray-100` → `gray-200` pulse animation (`animate-pulse`)
- Show after 200ms delay (prevent flash on fast loads)

---

## Bottom Sheet

Used for: vehicle selector, lot preview card, fallback info

- Slides up from bottom: `translate-y-0` from `translate-y-full`
- Transition: `300ms ease-out`
- Drag handle: 4×32px gray pill, centered at top
- Backdrop: `rgba(0,0,0,0.4)`, tap to dismiss
- Max height: 85vh; scrollable content inside if taller
