# Integrations - Maps & BusMap

**Summary:** How ParkHub integrates with Google Maps and BusMap for park-and-ride routing.  
**Last updated:** 2026-06-27  
**Related PRD section:** F5 - Maps & Transit Integration (Phase 2)

---

## Google Maps

### In-app map view (MVP)
- Embedded Google Maps JavaScript SDK
- Parking lot markers overlaid with custom icons
- Marker tap → lot detail panel slides up

### Routing deeplink (Phase 2)
- **"Chỉ đường"** button on lot detail → opens Google Maps app/web
- Pre-fills destination as the lot's coordinates
- URL format: `https://maps.google.com/?q={lat},{lng}&travelmode=driving`

### Combined park-and-ride routing (Phase 2)
- Route card: **Drive → [Lot] → Walk → [Metro Station] → Ride → [Destination]**
- Constructed by chaining: driving directions to lot + walking directions to nearest station + transit directions onward

---

## BusMap

- BusMap integration surfaces bus route options from parking lot to destination
- Deeplink: `busmap://route?from={lot_coords}&to={destination}`
- Fallback: open BusMap web if app not installed

---

## Data Required per Lot (for routing)

```
Lot {
  coords:           { lat, lng }
  nearestStation:   { name, coords, lines[] }   // pre-computed at registration
  walkingMinutes:   int                         // lot → nearest station
}
```

`nearestStation` is computed when the lot is approved and cached; updated if transit network changes.
