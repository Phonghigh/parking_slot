# ParkHub

Centralized parking management platform for Vietnamese commuters near Metro and bus stations. Digitalizes parking sessions via QR codes and encourages park-and-ride behavior.

## What it does

Commuters find nearby parking lots on a map, check in with a QR code (no paper ticket), and check out with fee calculated automatically. Parking lot owners register their space and manage sessions via a partner interface. Everything runs in the browser - no native app required.

**MVP scope:**
- Real-time map search with capacity indicators
- QR-based check-in / check-out (staff scans, or camera auto-reads plate)
- Multi-vehicle support (user selects active plate at check-in)
- Cash payment at checkout (online payment is Phase 2)

## Markets

Phase 1: Ho Chi Minh City (Metro Line 1 corridor) + Hà Nội

## User Roles

| Role | Interface |
| --- | --- |
| Commuter | Mobile web app |
| Parking Partner | Mobile web app (lot owner) |
| Parking Staff | PWA on-site tablet/phone |
| Admin / Government | Dashboard (Phase 3) |

## Tech Stack

> MVP implemented in `server/` + `web/` (see **Running the MVP** below).

- **Frontend:** React + Vite + TypeScript + Tailwind CSS, PWA (commuter), react-leaflet + OpenStreetMap
- **Backend:** Node + Express + `node:sqlite` (built-in SQLite, no native build)
- **Design system:** Grab Green (`#00B14F`) primary, Inter + Be Vietnam Pro fonts
- **Map:** OpenStreetMap + Nominatim search (Google Maps / BusMap planned for Phase 2)

## Running the MVP

Needs **Node ≥ 22.5** (for `node:sqlite`; tested on Node 25).

```bash
# Backend
cd server && npm install && npm run seed && npm run dev   # http://localhost:4000

# Frontend (separate terminal)
cd web && npm install && npm run dev                      # http://localhost:5173
```

Demo accounts (password `123456`): `commuter1` (người gửi xe). Mỗi owner gắn **đúng 1 bãi** -
`owner1` quản lý "Bãi Đỗ Xe Vincom Center" (có sẵn dữ liệu cho dashboard analytics); `owner2`…`owner12`
cho các bãi còn lại.
Full demo walkthrough + notes: see [`web`](web/) and the plan at
[`.claude/plans/t-i-c-n-build-1-breezy-graham.md`](.claude/plans/t-i-c-n-build-1-breezy-graham.md).

## Project Structure

```
docs/
  knowledgebase/          # Living documentation by module
    commuter/             # Search, check-in, check-out, account flows
    parking-partner/      # Onboarding, capacity management, scheduling
    parking-staff/        # Attendant check-in/out flows
    core/                 # Data model, QR lifecycle, fallback handling
    integrations/         # Maps, metro tickets, payment gateways
    admin/                # Government dashboard (Phase 3)
    ui-ux/                # Design system, screens, components, patterns
CLAUDE.md                 # Project context for AI-assisted development
```

## Core Flows

### Check-In
1. Commuter selects vehicle (multiple plates per account)
2. App shows static QR tied to account + plate
3. Staff scans QR → system opens session `{ userID, lotID, plate, checkInTime }`
4. Push notification sent to commuter

### Check-Out (MVP - cash)
1. Commuter opens Active Session → sees elapsed time + running fee
2. App shows Checkout QR
3. Staff scans → fee displayed → staff collects cash → confirms
4. Session closes, capacity updates, receipt pushed to commuter

### Fallback (no phone)
Staff looks up account by CCCD (national ID) or license plate number.

## Data Model

```
User        { userID, phone, name, vehicles[] }
Vehicle     { vehicleID, userID, plate, type: bike|car }
Lot         { lotID, name, address, coords, capacity,
              pricePerHour{bike,car}, hours, mode: A|B }
Session     { sessionID, userID, vehicleID, lotID,
              checkInTime, checkOutTime, fee, status }
```

## Roadmap

| Phase | Features |
| --- | --- |
| MVP | Map search, QR check-in/out |
| Phase 2 | Advance booking, online payment (MoMo/VNPay/ZaloPay), Maps + BusMap, metro combo ticket |
| Phase 3 | Government analytics dashboard, congestion heatmap |

## Documentation

Full product requirements: [`.claude/plans/nh-m-1-scope-reflective-haven.md`](.claude/plans/nh-m-1-scope-reflective-haven.md)

UI/UX specifications: [`docs/knowledgebase/ui-ux/`](docs/knowledgebase/ui-ux/)

- [Design System](docs/knowledgebase/ui-ux/01-design-system.md) - colors, typography, spacing
- [Commuter Screens](docs/knowledgebase/ui-ux/02-screens-commuter.md) - 7 screens with wireframes
- [Partner Screens](docs/knowledgebase/ui-ux/03-screens-partner.md) - dashboard, scanner, session list
- [Components](docs/knowledgebase/ui-ux/04-components.md) - buttons, QR display, capacity bar, toasts
- [Interaction Patterns](docs/knowledgebase/ui-ux/05-interaction-patterns.md) - animations, Vietnamese UX, offline behavior
