# ParkHub — Parking Slot Central System

## Project Overview

A centralized web platform that aggregates public and private parking spaces near transit hubs (Metro, bus stations) in Vietnam. Digitalizes parking sessions via QR codes and encourages park-and-ride behavior.

## Markets

- Phase 1: TP.HCM (Metro Line 1 corridor) + Hà Nội

## User Roles

| Role             | Description                                         |
| ---------------- | --------------------------------------------------- |
| Commuter         | Searches, books, checks in/out of parking           |
| Parking Partner  | Household or commercial lot registering their space |
| Parking Staff    | Lot attendant using Partner app to manage sessions  |
| Admin/Government | Future roadmap — analytics dashboard                |

## Platform

- **Web App** (responsive, mobile-first)
- Partner Staff: Separate PWA interface

## MVP Features (Must Ship)

- **F1** — Search parking on map + real-time capacity
- **F2** — QR check-in / check-out (digital parking session, no paper ticket)

## Core Check-In/Out Logic

### Check-In

1. User selects vehicle (supports multiple plates per account)
2. App generates static QR (tied to userID + selected plateNumber)
3. Staff scans QR OR camera auto-reads plate (Mode A / Mode B)
4. System opens Session `{ userID, lotID, plate, checkInTime }`
5. Push notification sent to user

### Check-Out (MVP — cash)

1. User opens "Active Session" → sees elapsed time + fee calculated
2. App shows Checkout QR (static QR + active sessionID)
3. Staff scans / camera reads plate → app displays fee amount
4. Staff collects cash → confirms → session closes
5. Capacity +1, receipt pushed to user

### Fallback (no phone)

- User presents CCCD or cà vẹt xe → staff looks up account by ID/plate manually

## Phase 2 Features (Roadmap)

- F3: Advance booking (15-min hold, auto-cancel if no-show)
- F4: Online payment (MoMo, VNPay, ZaloPay, bank cards)
- F5: Google Maps + BusMap integration (combined park-and-ride routing)
- F6: Metro/bus combo ticket (in-app purchase + deeplink)
- F7: AI Chatbot (find parking, price inquiry, complaint handling)
- F8: Reviews & Ratings

## Phase 3 (Future)

- F9: Government dashboard (congestion heatmap, hourly capacity stats)

## Key Decisions

- QR type: **Static** (tied to account, reused) — MVP simplicity
- Multi-vehicle: **Yes** — user selects active vehicle at check-in
- Partner pricing: Set at registration, not dynamic
- Revenue model: **B2G** — pitched to government for funding
- Verification: **Automated** (geocoding + photo + CCCD scan)
- Capacity update: Auto via barrier/camera OR manual staff input

## Data Model (Core Entities)

```
User        { userID, phone, name, vehicles[] }
Vehicle     { vehicleID, userID, plate, type: bike|car }
Lot         { lotID, name, address, coords, capacity,
              pricePerHour{bike,car}, hours, mode: A|B }
Session     { sessionID, userID, vehicleID, lotID,
              checkInTime, checkOutTime, fee, status }
```

## Open Questions / Risks

| Item                                         | Status                      |
| -------------------------------------------- | --------------------------- |
| Metro operator API for in-app tickets        | Needs MOU with MAUR         |
| Cancellation & refund policy                 | Pending business decision   |
| Government commission structure              | Pending pitch outcome       |
| Camera/barrier hardware compatibility        | Needs vendor discovery      |
| Pricing brackets (government vs free market) | Policy decision pre-Phase 2 |

## PRD File

Full requirements doc: `.claude/plans/nh-m-1-scope-reflective-haven.md`
