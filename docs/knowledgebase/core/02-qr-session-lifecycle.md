# Core — QR & Session Lifecycle

**Summary:** How QR codes are structured and how a parking session moves through its states.  
**Last updated:** 2026-06-27  
**Related PRD section:** F2 — Digital Check-In / Check-Out

---

## QR Code

### Type (MVP)
- **Static QR** — generated once per account, permanent
- Encodes: `{ userID, defaultPlate }`
- At check-in, the plate used is the one selected by the commuter in the app (not necessarily the default)

### Scan Behavior
- Staff Partner app decodes QR → extracts `userID`
- System fetches user + selected vehicle from active session context
- QR alone does not open a session — staff confirmation (Mode A) or plate match (Mode B) is required

### Phase 2 Upgrade
- Dynamic QR: generated per check-in attempt, expires after 5 minutes
- Encodes: `{ userID, vehicleID, timestamp, signature }`
- Prevents screenshot/replay attacks

---

## Session State Machine

```
                  ┌─────────┐
                  │ PENDING │  (future: advance booking)
                  └────┬────┘
                       │ check-in confirmed
                       ▼
                  ┌────────┐
    ┌────────────►│ ACTIVE │
    │             └────┬───┘
    │                  │ check-out confirmed
    │                  ▼
    │           ┌───────────┐
    │           │ COMPLETED │
    │           └───────────┘
    │
    │           ┌───────────┐
    └───────────│ CANCELLED │  (booking expired / manual cancel)
                └───────────┘
```

## Session Open (Check-In)
1. System verifies lot is open + has capacity
2. System checks user has no existing ACTIVE session
3. `Session.status = ACTIVE`, `Session.checkInTime = now()`
4. `Lot.active_sessions += 1`

## Session Close (Check-Out)
1. Staff confirms or barrier triggers
2. `Session.checkOutTime = now()`
3. `Session.durationMin = (checkOutTime - checkInTime) in minutes`
4. `Session.fee = ceil(durationMin / 60) × Lot.pricePerHour[vehicleType]`
5. `Session.status = COMPLETED`
6. `Lot.active_sessions -= 1`
7. Receipt event dispatched → push notification to commuter
