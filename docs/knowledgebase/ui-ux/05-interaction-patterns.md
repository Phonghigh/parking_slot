# UI/UX - Interaction Patterns

**Last updated:** 2026-06-27  
**Related PRD section:** Platform - Web App (responsive, mobile-first)

---

## Loading States

### Page / Screen load

1. Skeleton loader appears after 200ms
2. Real content fades in (`opacity-0 → opacity-100`, 200ms)
3. Never show empty screen for >200ms

### Button action

1. User taps → button shows spinner, disabled
2. If success → toast + navigate or update UI
3. If error → toast error, button re-enables
4. Timeout after 10s → error state ("Mạng chậm, thử lại")

### Map load

1. Gray placeholder tile
2. Markers animate in with `scale-0 → scale-100` stagger (50ms each)

---

## Error States

### Form validation

- Inline, below the field (not top-of-form summary)
- Show on blur (not while typing)
- Color: `error` text + `error`-colored border on input

### Network errors

```text
┌─────────────────────────────┐
│  ⚠️  Không có kết nối      │
│  Kiểm tra mạng và thử lại  │
│  [ Thử lại ]               │
└─────────────────────────────┘
```

- Full-screen overlay for critical actions (session open/close)
- Toast for non-critical (history refresh, etc.)

### Not found / no results

- Empty state illustration (see Components doc)

---

## Gestures (Mobile)

| Gesture | Action |
| --- | --- |
| Swipe up (bottom sheet) | Expand to full screen |
| Swipe down (bottom sheet) | Dismiss |
| Pinch on map | Zoom in/out |
| Long press on lot marker | Show quick info without navigating |
| Pull down (list) | Refresh |

---

## Transitions & Animations

| Element | Animation | Duration |
| --- | --- | --- |
| Screen push | Slide left-to-right | 250ms ease |
| Bottom sheet open | Slide up | 300ms ease-out |
| Bottom sheet close | Slide down | 200ms ease-in |
| Toast appear | Slide down + fade in | 200ms |
| Capacity bar fill | Width transition | 500ms ease |
| Success checkmark | Scale + draw (stroke) | 400ms |
| Map markers appear | Scale from 0 + stagger | 50ms each |

**Performance rule:** All animations use `transform` and `opacity` only (GPU-composited). No layout-triggering properties (`width`, `height`, `top`, `left`).

---

## Feedback Patterns

### Haptic feedback (mobile)

- Button tap: light impact
- Successful QR scan: success notification haptic
- Error: error haptic

### Sounds

- None by default (user is in transit, often muted)

### Confirmation dialogs

Use only for destructive or irreversible actions:

```text
Huỷ phiên gửi xe?
Bạn sẽ mất thông tin phiên hiện tại.

[ Huỷ phiên ]   [ Giữ lại ]
```

- Destructive action on the LEFT (unexpected - prevents accidental confirmation)

---

## Accessibility

| Requirement | Implementation |
| --- | --- |
| Tap target size | Minimum 44×44px for all interactive elements |
| Color contrast | AA minimum (4.5:1 for text, 3:1 for UI elements) |
| Don't rely on color alone | Status markers use color + icon + text |
| Font scaling | UI uses `rem` units; respects browser font size |
| Screen reader | Semantic HTML: `<button>`, `<nav>`, `aria-label`, `role` |
| Focus visible | Custom focus ring: `2px solid primary-500` (#00B14F) with 2px offset |

---

## Vietnamese UX Conventions

| Pattern | Vietnamese convention |
| --- | --- |
| Currency | `15.000đ` (period as thousands separator, đ suffix) |
| Date | `27/06/2026` (DD/MM/YYYY) |
| Time | `08:32` (24-hour, no AM/PM) |
| Phone | `0912 345 678` (spaced groups) |
| Plate | `51B-12345` (dash separator) |
| Greetings in UI | Avoid formal/informal ambiguity - use neutral phrasing |

---

## Navigation Rules

1. **Back button always visible** on sub-screens (never trap user)
2. **Tab bar always visible** on main screens (not hidden on scroll)
3. **No hamburger menu** for commuter app - all primary actions reachable in ≤2 taps
4. **Deep links** supported for lot detail: `/lot/{lotID}` (for BusMap/Maps integration)
5. **Session state persisted** - closing and reopening app resumes active session view

---

## Offline Behavior

| Feature | Offline behavior |
| --- | --- |
| QR display | Works (static QR cached) |
| Map | Shows cached tiles; markers grayed out |
| Session timer | Continues (client-side) |
| Check-in/out confirmation | Queued; syncs on reconnect |
| History | Shows cached data with "Dữ liệu có thể chưa cập nhật" banner |
