# Parking Staff — Check-Out Flow

**Summary:** Step-by-step flow for a lot attendant processing a commuter's vehicle exit (MVP cash model).  
**Last updated:** 2026-06-27  
**Related PRD section:** F2 — Mode A (Staff-assisted check-out)

---

## Steps (MVP — Cash)

1. Commuter presents checkout QR at exit
2. Staff opens **"Quét mã ra"** in Partner app
3. Camera/scanner reads QR
4. App displays:
   - Commuter name · plate
   - Check-in time
   - Duration
   - **Fee: X.000đ**
5. Staff collects cash from commuter
6. Staff taps **"Xác nhận thu tiền"**
7. System closes Session; lot capacity increments by 1
8. Commuter receives receipt push notification
9. Staff sees: "Đã ra — [Plate] · [Fee]"

## Phase 2 — Online Payment

Steps 4–6 are replaced by:
- App shows payment status (paid / pending)
- If paid via app: staff just confirms exit
- If unpaid: commuter pays in-app; staff waits for payment confirmation

## Fallback: No QR Available

1. Staff taps **"Tìm phiên"**
2. Searches by plate number
3. System returns active session for that plate
4. Staff proceeds from step 4 above

## Error States

| Error | Action |
|---|---|
| No active session found for plate | Check if check-in was recorded; manual entry if needed |
| QR not recognized | Use plate-based fallback |
| Payment dispute | Escalate to supervisor; session can be force-closed with note |
