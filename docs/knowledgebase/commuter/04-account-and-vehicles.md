# Commuter — Account & Vehicles

**Summary:** Commuter registration, profile management, and multi-vehicle support.  
**Last updated:** 2026-06-27  
**Related PRD section:** User Account Features — Commuter

---

## Registration

- Phone number + OTP verification
- Name (display only)
- At least one vehicle must be added before first check-in

## Vehicle Management

- User can register **N vehicles** (no hard cap in MVP)
- Each vehicle: plate number + type (motorbike | car)
- At check-in: user selects which vehicle is being parked today
- Pricing and capacity filters apply based on selected vehicle type

## Profile Features

| Feature | MVP | Phase 2 |
|---|---|---|
| Register / add vehicle | ✅ | — |
| View active session | ✅ | — |
| View parking history | ✅ | — |
| Push notifications | ✅ | — |
| Rate & review lots | — | ✅ |
| View receipts | — | ✅ |
| In-app payment methods | — | ✅ |

## Fallback Identity

If user cannot present QR (no phone / dead battery), lot staff can look up account by:
1. CCCD (national ID card number)
2. License plate number

Both are stored against the user profile and searchable by partner staff.
