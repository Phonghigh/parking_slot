# Integrations - Metro / Transit Ticket

**Summary:** How commuters can access metro and bus tickets from within ParkHub.  
**Last updated:** 2026-06-27  
**Related PRD section:** F6 - Metro / Public Transit Ticket (Phase 2)

---

## Two Options (both shipped in Phase 2)

### Option A - In-app ticket purchase
- Requires integration with metro operator API (MAUR for TP.HCM, Hanoi Metro for HN)
- Commuter selects route → pays within ParkHub → receives digital ticket (QR or barcode)
- **Dependency:** MOU with metro authority required before development starts
- **Risk:** API availability not confirmed - see Open Questions in PRD

### Option B - Deeplink to official metro app
- "Mua vé Metro" button → opens official metro app (or web) with pre-filled destination
- No API integration needed; simpler to ship
- Lower friction than Option A for users who already have the metro app

---

## Recommended Approach

Ship **Option B first** (no dependency), then add Option A once the government MOU is signed.

---

## Combo Ticket Concept

Future: a single purchase covers both parking + transit:
- User pays one fee
- Receives: parking session confirmation + metro ticket
- Discount incentive for park-and-ride behavior (government subsidy)
- Requires billing integration with transit authority
