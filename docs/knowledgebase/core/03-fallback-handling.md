# Core - Fallback Handling

**Summary:** All fallback paths when the primary QR/automated flow cannot be used.  
**Last updated:** 2026-06-27  
**Related PRD section:** F2 - Fallback (no phone / dead battery)

---

## Trigger Conditions

| Condition | Fallback triggered |
|---|---|
| Commuter has no phone | CCCD or plate lookup |
| Phone battery dead | CCCD or plate lookup |
| QR unreadable / app crash | CCCD or plate lookup |
| Camera/barrier offline (Mode B) | Falls back to staff Mode A |
| No internet at lot | Offline queue (see below) |

---

## Identity Lookup Fallback

Staff opens **"Tìm tài khoản"** in Partner app:

1. Enter CCCD number → system returns matching User
2. OR enter license plate → system returns matching User + Vehicle
3. Staff confirms identity visually (check ID card)
4. Proceeds with normal check-in or check-out flow

**Security note:** Staff can only look up; they cannot modify account details.

---

## Offline Mode

If the lot has no internet connectivity:

- **Check-in:** App queues the session open event locally; syncs to server when connectivity returns. Local session token issued to commuter as temporary proof.
- **Check-out:** App queues the session close event; syncs on reconnect. Fee shown is estimated; finalized on sync.
- **Capacity:** Cannot update in real time; shows last-known value to commuters with a "stale data" indicator.

---

## Mode B → Mode A Escalation

If the automated camera/barrier fails:

1. Barrier stays closed
2. Staff app receives alert: "Camera offline - switch to manual"
3. Staff proceeds with QR scan (Mode A) until hardware is restored
4. Lot automatically reverts to Mode B when hardware comes back online
