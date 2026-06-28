# Parking Partner - Capacity Management

**Summary:** How a partner's lot capacity is tracked and updated in real time.  
**Last updated:** 2026-06-27  
**Related PRD section:** Parking Partner - Capacity Management

---

## Two Update Modes

### Mode A - Staff-assisted (manual)
- Staff uses Partner app to manually +/- slot count
- Triggered when a vehicle enters or exits
- UI: large +1 / -1 buttons on the Partner dashboard home screen

### Mode B - Automated (barrier/camera)
- Hardware barrier or camera system sends events to Partner API
- System auto-increments/decrements slot count on each trigger
- No staff action required

Mode is selected per lot at registration and can be changed by contacting support.

## Real-Time Sync

- Capacity updates propagate to commuter-facing search within **< 30 seconds**
- Commuter map markers re-color based on updated slot count
- `available_slots = total_capacity - active_sessions`

## Capacity Fields

```
Lot {
  total_capacity: int        // declared at registration
  active_sessions: int       // derived from open Session records
  available_slots: int       // computed: total - active
}
```

## Edge Cases

| Scenario | Behavior |
|---|---|
| Barrier fires twice (double-count) | Partner staff can manually correct via dashboard |
| Capacity goes negative | Capped at 0; alert sent to partner |
| Hardware offline | Falls back to staff manual mode automatically |
