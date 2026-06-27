# Parking Partner — Scheduling

**Summary:** How partners configure their lot's operating hours and availability windows.  
**Last updated:** 2026-06-27  
**Related PRD section:** Parking Partner — Registration (operating hours field)

---

## Schedule Configuration

Partners set a **per-day schedule** during registration or via dashboard settings:

```
Schedule {
  monday:    { open: "07:00", close: "22:00" }
  tuesday:   { open: "07:00", close: "22:00" }
  ...
  saturday:  { open: "08:00", close: "18:00" }
  sunday:    null   // closed
}
```

- `null` = closed all day
- Times in local timezone (Vietnam, UTC+7)

## Use Cases

| Partner type | Typical schedule |
|---|---|
| Household | Mon–Fri 7:00–18:00 (during work hours only) |
| Commercial lot | Daily 06:00–23:00 |
| Shopping center | Mall hours + buffer |

## Visibility Rules

- Lots outside their scheduled hours are **hidden by default** in commuter search
- Commuters can toggle **"Show closed lots"** to see them grayed out
- Partner receives no new sessions outside their schedule (system blocks check-in)

## Future Enhancement

- Temporary closure (e.g., renovation): partner sets a date range override
- Holiday calendar integration
