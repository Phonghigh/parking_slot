# GoPark — Parking Slot Central System

A centralized web platform aggregating public and private parking spaces near transit hubs (Metro, bus stations) in Vietnam. Digitalizes parking sessions via QR codes and encourages park-and-ride behavior.

**Phase 1 Markets:** Ho Chi Minh City (Metro Line 1 corridor) + Hà Nội
**Revenue Model:** B2G — pitched to government for public infrastructure funding

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [API Reference](#api-reference)
- [Core Flows](#core-flows)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Demo Accounts](#demo-accounts)
- [Roadmap](#roadmap)

---

## Features

### MVP (Shipped)

| Feature | Description |
|---------|-------------|
| **Map Search** | Find parking on Leaflet map with real-time capacity (red/yellow/green), distance, price, amenity filters |
| **QR Check-In/Out** | Digital parking sessions via static QR codes — no paper tickets |
| **Advance Booking** | 15-minute hold reservations with auto-expiry if no-show |
| **Multi-Vehicle** | Users register multiple plates; multiple concurrent active sessions supported |
| **Owner Dashboard** | Earnings stats, occupancy gauge, hourly histogram, activity feed |
| **Real-Time Capacity** | Server-Sent Events push lot availability to all connected clients instantly |
| **PWA** | Installable progressive web app with offline support |
| **Reviews & Ratings** | Commuters can rate lots after completing a session |
| **Wallet** | In-app ₫ wallet balance, deducted on checkout |

### User Roles

| Role | Access |
|------|--------|
| **Commuter** | Search lots, book, QR check-in/out, view history, manage vehicles |
| **Parking Partner (Owner)** | Manage lot capacity, process check-ins/outs, view earnings |
| **Parking Staff** | Scan QRs, look up plates, confirm sessions via owner interface |
| **Admin/Government** | Phase 3 roadmap — congestion heatmap, analytics dashboard |

---

## Tech Stack

### Backend

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js ≥ 22.5.0 (uses built-in `node:sqlite`) |
| Framework | Express.js 4.x |
| Database | SQLite via `node:sqlite` (zero native compilation) |
| Auth | Bearer token (stored in `tokens` table) |
| Real-Time | Server-Sent Events (SSE) — no WebSocket dependency |

### Frontend

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 5 + `vite-plugin-pwa` (service worker, offline) |
| Styling | Tailwind CSS 3 — Grab Green palette, glass shadows, spring animations |
| Fonts | Inter + Be Vietnam Pro |
| Routing | React Router DOM v6 |
| Maps | Leaflet 1.9 + react-leaflet + react-leaflet-cluster (OpenStreetMap, no API key needed) |
| QR Display | qrcode.react |
| QR Scanning | html5-qrcode (camera API) |
| OCR Fallback | Tesseract.js 7 (license plate recognition) |

### Infrastructure

| Layer | Technology |
|-------|-----------|
| Deploy | Render.com (single Express service, Singapore region) |
| Node Version | 22.11.0 |
| Static Files | Express serves Vite build from `web/dist` (no separate CDN) |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser / PWA                    │
│  React + Vite + Tailwind  (web/src)                 │
│                                                     │
│  CommuterLayout  ──  MapPage, TicketPage, Account   │
│  OwnerLayout     ──  Dashboard, Operations, Profile │
└──────────────────────────┬──────────────────────────┘
                           │ HTTP + SSE
                           ▼
┌─────────────────────────────────────────────────────┐
│             Express Server  (server/src)             │
│                                                     │
│  /api/auth      /api/lots      /api/sessions        │
│  /api/bookings  /api/vehicles  /api/owner           │
│  /api/events (SSE)             /api/health          │
│                                                     │
│  Static fallback → web/dist/index.html (SPA)        │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│           SQLite Database  (server/parking.db)      │
│  users · tokens · lots · sessions ·                 │
│  bookings · vehicles · reviews                      │
└─────────────────────────────────────────────────────┘
```

**Key architectural decisions:**

- **Single-service deploy** — Express handles both API and SPA fallback; no nginx or separate static host needed
- **Built-in SQLite** — `node:sqlite` (Node 22+) with zero native deps, runs anywhere
- **Static QR codes** — tied to `userID + plate`, reused across sessions; works offline
- **SSE for real-time** — simpler than WebSockets for one-way capacity broadcasts
- **No `.env` required** — all config has in-code defaults for zero-friction local dev

---

## Data Model

```sql
users (
  id, name, username, password, role ('commuter'|'owner'),
  wallet_balance    -- ₫ in-app wallet
)

tokens (
  token,            -- Bearer token (128-bit hex)
  user_id
)

lots (
  id, owner_id, name, lat, lng, address, image_url,
  pricing_type ('hourly'|'flat'),
  price_per_hour,   -- ₫/hr for hourly lots
  flat_price,       -- ₫ one-time for flat lots
  total_spots, available_spots,
  covered,          -- 1 = has roof
  rating, review_count,
  amenities,        -- Pipe-delimited: "Camera|Covered|EV Charging"
  open_hours, is_open
)

reviews (
  id, lot_id, user_id, user_name,
  rating,           -- 1–5 stars
  comment, updated_at
)

sessions (
  id, lot_id, user_id,
  plate,            -- Normalized uppercase vehicle plate
  slot_label,       -- e.g., "Tầng hầm B1 - Khu A - Vị trí 45"
  checkin_at, checkout_at,
  status ('active'|'completed'),
  checkout_token,   -- 128-bit hex, used in checkout QR
  short_code,       -- 6-char alphanumeric (excludes 0/O/1/I/L)
  fee,              -- ₫, NULL until checkout
  payment_method ('momo'|'wallet'|'cash')
)

bookings (
  id, lot_id, user_id, plate,
  scheduled_at,     -- Intended check-in time
  expires_at,       -- scheduled_at + 15 min (auto-expiry)
  booking_token, short_code,
  status ('pending'|'checked_in'|'cancelled'|'expired'),
  session_id,       -- Linked session after check-in
  created_at
)

vehicles (
  id, user_id,
  plate,            -- e.g., "79A-12345" (normalized uppercase)
  label,            -- e.g., "Car", "Xe máy"
  created_at
)
```

**Time storage:** All timestamps are milliseconds since epoch (`Date.now()`).

**Fee calculation:**
- Hourly: `Math.ceil(duration_ms / 3_600_000) × price_per_hour` (minimum 1 hour)
- Flat: fixed `flat_price` regardless of duration

---

## API Reference

All endpoints are prefixed `/api`. Protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | — | Register commuter or owner, returns token |
| `POST` | `/auth/login` | — | Login, returns token |
| `GET` | `/auth/me` | ✓ | Current user profile + vehicles |

### Lots

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/lots?lat=X&lng=Y` | — | All lots with distance & live capacity |
| `GET` | `/lots/:id` | — | Lot detail + reviews + `can_review` flag |
| `POST` | `/lots/:id/reviews` | ✓ commuter | Submit or edit review (requires a prior completed session) |

### Sessions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/sessions` | ✓ owner | Create session `{ lotId, userId, plate }` |
| `GET` | `/sessions/active` | ✓ commuter | Latest active session |
| `GET` | `/sessions/active-list` | ✓ commuter | All active sessions (multi-vehicle) |
| `GET` | `/sessions/history` | ✓ commuter | Completed sessions |
| `GET` | `/sessions/:id` | ✓ | Session detail + estimated fee |
| `GET` | `/sessions/lookup?q=TOKEN\|CODE` | ✓ owner | Look up by checkout token or short code |
| `GET` | `/sessions/find?plate=PLATE` | ✓ owner | Fallback lookup by license plate |
| `PATCH` | `/sessions/:id/payment` | ✓ commuter | Set payment method before checkout |
| `POST` | `/sessions/:id/checkout` | ✓ owner | Complete session + finalize fee |

### Bookings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/bookings` | ✓ commuter | Create booking `{ lotId, plate, scheduledAt }` |
| `GET` | `/bookings/active` | ✓ commuter | Pending bookings |
| `GET` | `/bookings/history` | ✓ commuter | Past bookings |
| `DELETE` | `/bookings/:id` | ✓ commuter | Cancel booking |
| `GET` | `/bookings/lookup?q=TOKEN\|CODE` | ✓ owner | Look up booking by token or short code |
| `POST` | `/bookings/:id/checkin` | ✓ owner | Convert booking → active session |

### Vehicles

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/vehicles` | ✓ commuter | List user's vehicles |
| `POST` | `/vehicles` | ✓ commuter | Add vehicle `{ plate, label? }` |
| `DELETE` | `/vehicles/:id` | ✓ commuter | Remove vehicle |

### Owner Dashboard

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/owner/lots` | ✓ owner | Owner's lots |
| `GET` | `/owner/lot` | ✓ owner | Primary lot details |
| `PATCH` | `/owner/lot/capacity` | ✓ owner | Manual capacity adjustment |
| `GET` | `/owner/stats` | ✓ owner | Earnings, occupancy, hourly histogram, activity feed |

### Real-Time & Utility

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/events` | — | SSE stream — `lot-update` events + 25s heartbeat |
| `GET` | `/health` | — | `{ ok: true }` health check |

**SSE event format:**
```json
{
  "type": "lot-update",
  "lot": { "id": 1, "available_spots": 12, "total_spots": 50, "is_open": 1 },
  "at": 1735000000000
}
```

---

## Core Flows

### Check-In (Staff scans QR)

```
Commuter                    Staff (OwnerOperations)          Server
   │                               │                           │
   │  Selects vehicle              │                           │
   │  Opens /checkin               │                           │
   │  Static QR shown on screen    │                           │
   │                               │  Scans QR                 │
   │                               │─── POST /sessions ───────►│
   │                               │                           │  Creates session
   │                               │                           │  Decrements available_spots
   │                               │                           │  Broadcasts SSE lot-update
   │◄── Push notification ─────────│◄── 200 OK ───────────────│
   │  Ticket appears in /ticket    │                           │
```

### Check-Out (Cash)

```
Commuter                    Staff (OwnerOperations)          Server
   │                               │                           │
   │  Opens /ticket                │                           │
   │  Sees elapsed time + live fee │                           │
   │  Optional: sets payment method│                           │
   │  Checkout QR shown            │                           │
   │                               │  Scans checkout QR        │
   │                               │── GET /sessions/lookup ──►│
   │                               │◄── session + fee ─────────│
   │                               │  Collects cash            │
   │                               │── POST /sessions/checkout►│
   │                               │                           │  Finalizes fee
   │                               │                           │  Increments available_spots
   │                               │                           │  Broadcasts SSE lot-update
   │◄── Receipt push notification ─│◄── 200 OK ───────────────│
```

### Fallback (No Phone)

Staff uses the **OwnerOperations** page to search by license plate via `GET /sessions/find?plate=PLATE`, then processes checkout manually.

### Advance Booking

1. Commuter picks lot + time → `POST /bookings` → capacity held
2. `expires_at = scheduledAt + 15 minutes`
3. Auto-expiry daemon runs every 30 seconds — marks expired bookings, releases capacity
4. Owner scans booking QR or short code → `POST /bookings/:id/checkin` → creates session

---

## Project Structure

```
parking_slot/
├── server/                       # Node.js + Express backend
│   └── src/
│       ├── index.js              # Server entry, route wiring, SPA fallback
│       ├── db.js                 # SQLite schema init
│       ├── auth.js               # Token issuance & validation middleware
│       ├── lib.js                # Fee calculation, token/code generation
│       ├── events.js             # SSE broadcaster (lot-update events)
│       ├── seed.js               # Demo data generator (150+ lots, users, sessions)
│       └── routes/
│           ├── auth.js
│           ├── lots.js
│           ├── sessions.js
│           ├── bookings.js
│           └── vehicles.js
│
├── web/                          # React + Vite + TypeScript frontend (PWA)
│   ├── vite.config.ts            # Vite + PWA plugin (manifest, service worker)
│   ├── tailwind.config.js        # Grab Green brand palette, custom animations
│   └── src/
│       ├── App.tsx               # Route definitions
│       ├── api.ts                # API client + TypeScript type definitions
│       ├── auth/
│       │   ├── AuthContext.tsx   # Global auth state (React context)
│       │   └── ProtectedRoute.tsx
│       ├── components/
│       │   ├── MapView.tsx       # Leaflet map + clustering + live capacity colors
│       │   ├── QrDisplay.tsx     # Static QR tied to user + plate
│       │   ├── QrScanner.tsx     # Camera QR scan + manual short-code fallback
│       │   ├── LotCard.tsx       # Lot card (name, distance, price, capacity bar)
│       │   ├── BookingCard.tsx   # Booking status card with cancel button
│       │   ├── PaymentSelector.tsx
│       │   ├── PlateDisplay.tsx
│       │   └── icons.tsx         # 20+ inline SVG icons
│       ├── layouts/
│       │   ├── CommuterLayout.tsx    # PWA bottom tab nav (map/ticket/history/account)
│       │   ├── CommuterPlain.tsx     # Full-screen layout (lot detail, booking)
│       │   └── OwnerLayout.tsx       # Desktop sidebar layout
│       ├── pages/
│       │   ├── MapPage.tsx           # Map search + amenity/price filters
│       │   ├── LotDetail.tsx         # Lot info + reviews + book/checkin CTAs
│       │   ├── CheckinQrPage.tsx     # Commuter check-in QR display
│       │   ├── TicketPage.tsx        # Active sessions & bookings carousel
│       │   ├── BookingPage.tsx       # Advance booking date/time form
│       │   ├── HistoryPage.tsx       # Past sessions with receipts
│       │   ├── AccountPage.tsx       # Vehicle management, wallet, profile
│       │   ├── SearchPage.tsx        # Advanced search + distance/price filters
│       │   ├── OwnerDashboard.tsx    # Capacity gauge + earnings stats
│       │   ├── OwnerOperations.tsx   # Check-in/out UI, QR scan, plate lookup
│       │   ├── OwnerProfile.tsx      # Lot settings (hours, amenities, pricing)
│       │   ├── LoginPage.tsx
│       │   └── RegisterPage.tsx
│       └── lib/
│           ├── liveEvents.ts     # SSE client with auto-reconnect
│           ├── format.ts         # ₫ currency, date/duration formatting
│           └── ocr.ts            # Tesseract.js OCR for plate recognition
│
├── docs/knowledgebase/           # Living documentation by module
│   ├── commuter/                 # Search, check-in, check-out, account flows
│   ├── parking-partner/          # Onboarding, capacity management, scheduling
│   ├── parking-staff/            # Attendant workflows
│   ├── core/                     # Data model, QR lifecycle, fallback handling
│   ├── integrations/             # Maps, metro tickets, payment gateways
│   ├── admin/                    # Government dashboard (Phase 3)
│   └── ui-ux/                    # Design system, screen wireframes, components
│
├── sample-plates/                # Sample license plate images for OCR testing
├── render.yaml                   # Render.com deployment blueprint
├── CLAUDE.md                     # AI-assisted development context
└── package.json                  # Root monorepo scripts
```

### Frontend Routes

| Route | Page | Layout | Description |
|-------|------|---------|-------------|
| `/` | MapPage | Commuter (bottom nav) | Map search + filters |
| `/ticket` | TicketPage | Commuter | Active sessions & bookings, QR display |
| `/history` | HistoryPage | Commuter | Past sessions + receipts |
| `/account` | AccountPage | Commuter | Vehicles, wallet, profile |
| `/lot/:id` | LotDetail | Commuter Plain | Lot info + reviews |
| `/booking/:lotId` | BookingPage | Commuter Plain | Advance booking form |
| `/checkin` | CheckinQrPage | Commuter Plain | Check-in QR display |
| `/search` | SearchPage | Commuter Plain | Advanced search |
| `/owner` | OwnerDashboard | Owner (sidebar) | Capacity gauge + stats |
| `/owner/operations` | OwnerOperations | Owner | Check-in/out UI |
| `/owner/profile` | OwnerProfile | Owner | Lot settings |
| `/login` | LoginPage | — | Login |
| `/register` | RegisterPage | — | Register |

---

## Getting Started

### Prerequisites

- **Node.js 22.5.0 or later** — required for built-in `node:sqlite`
- npm 9+

### Install & Run

```bash
# 1. Clone the repo
git clone <repo-url>
cd parking_slot

# 2. Install and seed the backend
cd server
npm install
npm run seed      # Creates parking.db with 150+ lots + demo accounts + sample sessions

# 3. Start the backend (port 4000)
npm run dev

# 4. In a separate terminal, install and start the frontend
cd ../web
npm install
npm run dev       # Vite dev server at http://localhost:5173
```

In dev mode, Vite proxies all `/api` requests to `http://localhost:4000` automatically.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Backend server port |
| `VITE_API_URL` | `http://localhost:4000/api` (dev) / `/api` (prod) | API base URL |

No `.env` file is required — all defaults work out of the box.

### Re-seed Demo Data

```bash
cd server && npm run seed
```

This drops and recreates all tables, then inserts all demo lots, users, vehicles, sessions, bookings, and reviews.

---

## Deployment

### Production Build (Single Service)

```bash
# From repo root:
npm run build    # Installs all deps, type-checks, builds web to web/dist
npm start        # Express serves API + SPA on $PORT (default 4000)
```

Express serves:
- `/api/*` — all backend routes
- `*` — `web/dist/index.html` (React SPA fallback)

### Render.com

Configured via `render.yaml`:

| Setting | Value |
|---------|-------|
| Region | Singapore (ap-southeast-1) |
| Plan | Free tier |
| Node version | 22.11.0 |
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Health check | `GET /api/health` |

> **Note on persistence:** The free Render.com tier uses ephemeral disk — SQLite data (`parking.db`) is lost on each redeploy. For production use, upgrade to a paid plan with a persistent disk, or migrate to PostgreSQL.

---

## Demo Accounts

All demo accounts use password `123456`.

### Commuters

| Username | Description |
|----------|-------------|
| `commuter1` | Nguyễn Văn A — wallet: 120,000 ₫, has sample sessions |
| `commuter2` | Trần Thị B |

### Parking Owners

| Username | Lot |
|----------|-----|
| `owner1` | Bãi Đỗ Xe Vincom Center Đồng Khởi (full analytics demo data) |
| `owner2` | Bến Thành Market |
| `owner3`–`owner12` | Various HCM City lots |

### Seeded Data Summary

- **150+ parking lots** — 12 handcrafted iconic locations + 138 procedurally generated across Metro Line 1 corridor and all HCM districts
- **Sample sessions** — pre-seeded check-ins and checkouts for dashboard analytics demo
- **Reviews** — sample star ratings on major lots

---

## Roadmap

### Phase 2

| Feature | Description |
|---------|-------------|
| **Online Payment** | MoMo, VNPay, ZaloPay, bank cards |
| **Route Integration** | Google Maps + BusMap (combined park-and-ride routing) |
| **Metro Combo Ticket** | In-app ticket purchase + deeplink to metro app |
| **AI Chatbot** | Natural language: find parking, price inquiry, complaint handling |
| **Enhanced Reviews** | Photos, owner responses, helpfulness votes |

### Phase 3

| Feature | Description |
|---------|-------------|
| **Government Dashboard** | Congestion heatmap, hourly capacity stats per metro corridor |
| **API for Metro Operators** | Integrate with MAUR (Metro Authority) for combined ticketing |

### Open Questions

| Item | Status |
|------|--------|
| Metro operator API (MAUR) | Needs MOU |
| Cancellation & refund policy | Pending business decision |
| Government commission structure | Pending pitch outcome |
| Camera/barrier hardware compatibility | Needs vendor discovery |
| Pricing brackets (government vs free market) | Policy decision pre-Phase 2 |
| Password hashing | Demo uses plaintext — add bcrypt before production |

---

## Documentation

- **Full PRD:** [`.claude/plans/nh-m-1-scope-reflective-haven.md`](.claude/plans/nh-m-1-scope-reflective-haven.md)
- **Design System:** [`docs/knowledgebase/ui-ux/01-design-system.md`](docs/knowledgebase/ui-ux/01-design-system.md)
- **Commuter Screens:** [`docs/knowledgebase/ui-ux/02-screens-commuter.md`](docs/knowledgebase/ui-ux/02-screens-commuter.md)
- **Partner Screens:** [`docs/knowledgebase/ui-ux/03-screens-partner.md`](docs/knowledgebase/ui-ux/03-screens-partner.md)
- **Component Library:** [`docs/knowledgebase/ui-ux/04-components.md`](docs/knowledgebase/ui-ux/04-components.md)
- **Interaction Patterns:** [`docs/knowledgebase/ui-ux/05-interaction-patterns.md`](docs/knowledgebase/ui-ux/05-interaction-patterns.md)

---

## License

Private — GoPark / ParkHub project. All rights reserved.
