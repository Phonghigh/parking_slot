# Commuter — Check-In

**Summary:** How a commuter opens a parking session when arriving at a lot.  
**Last updated:** 2026-06-27  
**Related PRD section:** F2 — Digital Check-In / Check-Out

---

## Pre-conditions

- Commuter has an account with at least one registered vehicle (plate + type)
- Lot is open and has available capacity

## Flow

1. Commuter opens app → taps **"Tạo mã vào bãi"**
2. If multiple vehicles registered → vehicle selector appears → commuter picks active vehicle
3. App shows **static QR code** (tied to userID + selected plate)
4. At lot entry — one of two modes:

### Mode A — Staff-assisted
- Staff opens Partner app → scans commuter's QR
- Staff confirms plate visually or via photo
- Staff submits → session opens

### Mode B — Automated (camera/barrier)
- Camera reads license plate
- System cross-references against registered plate on account
- Barrier opens, session opens automatically

5. System creates Session record (see [core/02-qr-session-lifecycle.md](../core/02-qr-session-lifecycle.md))
6. Commuter receives push notification: **"Đã vào bãi [Lot Name] lúc HH:MM"**
7. App displays active session with running timer

## QR Code Details

- Type: **Static** — permanent per account, not time-limited (MVP)
- Encodes: userID + primary plate (plate overridden by selection at check-in time)
- Future (Phase 2): time-limited dynamic QR with 5-min expiry for improved security

## Edge Cases

| Scenario | Behavior |
|---|---|
| User already has active session | Block + prompt: "Bạn đang có phiên tại [X]" |
| Plate mismatch (Mode B) | Flag → fall back to staff manual verify |
| Lot full when user arrives (walk-in) | Notify + suggest nearest available lot |
| No internet at lot | Offline QR still scannable; session syncs when connectivity returns |
