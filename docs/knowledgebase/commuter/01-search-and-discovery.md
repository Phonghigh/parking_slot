# Commuter — Search & Discovery

**Summary:** How commuters find available parking lots near a transit station or location in real time.  
**Last updated:** 2026-06-27  
**Related PRD section:** F1 — Parking Space Search & Real-Time Capacity

---

## Input Methods

| Method | Description |
|---|---|
| Text search | Address, station name (e.g. "Metro Bến Thành") |
| GPS / current location | Auto-detect and search within radius |
| Free map browse | User drags map, results update on viewport |

## Results Display

- **Map view:** Markers color-coded by capacity
  - 🟢 Green: >50% slots available
  - 🟡 Yellow: 10–50% slots available
  - 🔴 Red: <10% or full
- **List view:** Below the map, sortable by distance / price / availability

## Filters

- Vehicle type: motorbike | car
- Distance radius
- Open now (hides lots outside current operating hours by default; toggle to show)

## Edge Cases

| Scenario | Behavior |
|---|---|
| No lots in radius | Auto-expand radius, show notification |
| All lots full | Show "full" lots with badge, surface nearest available with arrow |
| Lot temporarily closed | Filtered out by default ("Open now" toggle) |
| No GPS permission | Fall back to text search, prompt user |
