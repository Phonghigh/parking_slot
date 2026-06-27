# Commuter — Check-Out

**Summary:** How a commuter closes a parking session and is charged when retrieving their vehicle.  
**Last updated:** 2026-06-27  
**Related PRD section:** F2 — Digital Check-In / Check-Out

---

## Flow (MVP — Cash)

1. Commuter goes to retrieve vehicle
2. Opens app → **"Phiên hiện tại"** tab
3. App displays: check-in time · elapsed time · **live fee calculation**
4. Commuter taps **"Lấy mã ra bãi"** → Checkout QR shown (same static QR + active sessionID context)
5. At lot exit — Mode A or B:
   - **Mode A:** Staff scans checkout QR → app surfaces fee amount → staff collects cash → confirms in Partner app
   - **Mode B:** Camera reads plate → matches active session → barrier opens automatically
6. System closes session: `status → COMPLETED`
7. Lot capacity +1 (real-time update)
8. Commuter receives receipt via push notification

## Fee Calculation

```
duration = checkOutTime - checkInTime
billable_hours = ceil(duration / 1 hour)
fee = billable_hours × lot.pricePerHour[vehicleType]
```

- Minimum charge: 1 hour (configurable per lot — future)
- Fee shown in app is informational in MVP; payment is cash-only

## Phase 2 — Online Payment

- Fee confirmation screen in app
- Payment via MoMo / VNPay / ZaloPay / bank card
- Receipt stored in app history

## Edge Cases

| Scenario | Behavior |
|---|---|
| System down at exit | Staff uses manual override; session closed retroactively |
| Wrong vehicle at exit (Mode B) | Flag → staff verify manually |
| User has no phone (dead battery) | Staff looks up by CCCD or plate → manual close |
