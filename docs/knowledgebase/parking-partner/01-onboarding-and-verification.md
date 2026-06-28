# Parking Partner - Onboarding & Verification

**Summary:** How a household or commercial lot registers as a ParkHub partner and gets verified.  
**Last updated:** 2026-06-27  
**Related PRD section:** Parking Partner - Onboarding & Management

---

## Partner Types

| Type | Examples |
|---|---|
| Household | Private home with garage/yard near a transit hub |
| Commercial | Shopping center, office building, standalone parking lot |

## Registration Form Fields

- Lot name
- Address (geocoded on submit)
- Photos (exterior + interior - minimum 2)
- Vehicle types accepted: motorbike | car | both
- Total capacity (number of slots)
- Operating hours (per-day schedule - see [03-scheduling.md](03-scheduling.md))
- Fixed parking rate: per hour for motorbike, per hour for car
- Check-in mode: Staff-assisted (Mode A) | Automated (Mode B)
- Bank account for revenue settlement

## Automated Verification Steps

1. **Geocoding check** - address confirmed within acceptable proximity to a transit hub
2. **Photo completeness** - minimum photo count validated
3. **CCCD scan** - identity document of lot owner uploaded and parsed
4. **Auto-approve** if all checks pass → lot appears in search within minutes
5. **Flag for manual review** if any check fails → partner notified

## Post-Approval

- Partner receives access to Partner Dashboard
- Lot appears in commuter search with `status: ACTIVE`
- Capacity defaults to the declared total; updates via barrier/staff
