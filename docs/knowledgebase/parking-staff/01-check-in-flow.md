# Parking Staff — Check-In Flow

**Summary:** Step-by-step flow for a lot attendant processing a commuter's vehicle entry.  
**Last updated:** 2026-06-27  
**Related PRD section:** F2 — Mode A (Staff-assisted check-in)

---

## Pre-conditions

- Staff is logged into Partner app on their device
- Lot is open and has available capacity

## Steps

1. Commuter presents app QR code at entry
2. Staff opens **"Quét mã vào"** in Partner app
3. Camera/scanner reads commuter's QR
4. App displays: commuter name · vehicle plate · vehicle type
5. Staff visually confirms plate matches the physical vehicle
6. Staff taps **"Xác nhận vào bãi"**
7. System creates Session; lot capacity decrements by 1
8. Staff sees confirmation: "Đã vào — [Plate] lúc HH:MM"

## Fallback: No QR Available

If commuter cannot show QR (no phone, dead battery):

1. Staff taps **"Tìm tài khoản"**
2. Staff enters either:
   - CCCD number
   - License plate number
3. System returns matching account
4. Staff selects correct account → proceeds from step 5 above

## Error States

| Error | Action |
|---|---|
| QR not recognized | Ask commuter to refresh app; try fallback |
| Plate mismatch | Do not admit; ask commuter to verify account vehicles |
| Lot at full capacity | Inform commuter; do not open session |
| No internet | App queues action; syncs when connectivity returns |
