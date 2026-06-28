# Admin - Government Dashboard

**Summary:** Analytics dashboard for urban management bodies (Phase 3 roadmap).  
**Last updated:** 2026-06-27  
**Related PRD section:** F9 - Admin / Government Dashboard (Future Roadmap)

---

> **Status: Phase 3 - Not in MVP or Phase 2 scope.**  
> This file is a placeholder. Flesh out when Phase 3 development begins.

---

## Planned Features

### Congestion Heatmap
- Geographic heatmap of parking demand by area and time of day
- Overlay with transit hub locations
- Filterable by: date range, vehicle type, district

### Capacity Analytics
- Hourly slot utilization per lot
- Peak hour identification per station corridor
- Underserved zone detection (high demand, low supply)

### Export
- CSV / PDF export for urban planning reports
- Scheduled email reports (weekly/monthly)

---

## Data Access Model

- Government dashboard is **read-only**
- Data is aggregated and anonymized (no individual user data exposed)
- Access controlled by admin accounts provisioned by ParkHub

---

## Open Questions (resolve before Phase 3)

- Which government agency owns the dashboard? (Sở GTVT? MAUR? City Digital Office?)
- What data retention period is required?
- Are raw session counts sufficient, or is vehicle-type breakdown needed?
