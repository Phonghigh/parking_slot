# GoPark — Parking Slot Central System

---

## Problem Statement

Vietnam's rapid metro expansion (Ho Chi Minh City Metro Line 1, Hà Nội Metro) is creating a surge in park-and-ride demand — commuters drive to a metro station, park, then continue by train. But today's parking experience is entirely analog:

- **No visibility** — drivers circle lots not knowing if spaces are available
- **Paper tickets** — lost tickets cause disputes; no digital record of sessions
- **No booking** — first-come-first-served leads to missed trains during peak hours
- **Fragmented supply** — hundreds of household lots near stations go unregistered and underutilized
- **Zero data** — city planners have no real-time capacity data to optimize infrastructure

The result: congestion near transit hubs, frustrated commuters, and wasted urban space.

---

## Solution Overview & Features

GoPark is a centralized web platform that connects commuters with public and private parking lots near transit hubs. It replaces paper tickets with QR-based digital sessions and gives city planners real-time occupancy data.

### Core Features (MVP)

| Feature | Description |
|---------|-------------|
| **Map Search** | Interactive map with real-time capacity indicators (green/yellow/red), distance sorting, and amenity filters (covered, camera, EV charging) |
| **QR Check-In / Check-Out** | Staff scans a commuter's static QR code to open a session; checkout QR closes it and calculates the fee automatically — no paper tickets |
| **Advance Booking** | Reserve a spot up to hours ahead; 15-minute hold window auto-cancels if commuter doesn't arrive |
| **Multi-Vehicle** | Register multiple license plates per account; run concurrent active sessions on different vehicles |
| **Live Capacity** | Server-Sent Events broadcast lot availability to all connected users instantly when sessions open or close |
| **Owner Dashboard** | Parking partners see earnings, occupancy gauge, hourly histogram, and a live activity feed |
| **In-App Wallet** | Pre-loaded ₫ balance deducted automatically at checkout (alongside cash and MoMo options) |
| **Reviews & Ratings** | Commuters rate lots after completing a session |
| **PWA** | Installable on Android/iOS home screen; works offline via service worker cache |

### User Roles

| Role | What They Do |
|------|-------------|
| **Commuter** | Searches lots, books in advance, shows QR at entry/exit, views history |
| **Parking Partner** | Registers their lot, manages capacity, processes check-ins and checkouts |
| **Parking Staff** | On-site attendant — scans QRs, looks up plates, confirms sessions |
| **Admin / Government** | Phase 3 — congestion heatmaps and corridor-level analytics |

### Check-In Flow

```
1. Commuter opens app → selects active vehicle
2. Static QR displayed on screen (tied to account + plate)
3. Staff scans QR on their device
4. Session opens: { userID, lotID, plate, checkInTime }
5. Lot capacity decrements → live update broadcast to all users
6. Commuter receives push notification with session details
```

### Check-Out Flow (Cash)

```
1. Commuter opens Ticket tab → sees elapsed time + running fee
2. Optionally sets payment method (cash / wallet / MoMo)
3. Checkout QR shown on screen
4. Staff scans checkout QR → fee displayed
5. Staff collects payment → confirms checkout
6. Session closes, capacity increments, receipt sent to commuter
```

### Fallback (No Phone)

Staff looks up the commuter's account by license plate via the OwnerOperations search page — no phone required on either side.

---

## Setup / Installation

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | **≥ 22.5.0** | Required for built-in `node:sqlite` — will not work on older versions |
| npm | ≥ 9 | Comes with Node |
| Git | Any | — |

> **Why Node 22?** GoPark uses Node's built-in `node:sqlite` module (no native compilation, no `better-sqlite3`). This module is only available from Node 22.5.0 onward.

### Clone the Repo

```bash
git clone <repo-url>
cd parking_slot
```

### Install Dependencies

The project is a monorepo with two packages — install them separately:

```bash
# Backend
cd server && npm install

# Frontend
cd ../web && npm install
```

### Seed the Database

The backend uses SQLite and auto-creates `server/parking.db` on first run. To populate it with demo lots, users, and sample sessions:

```bash
cd server && npm run seed
```

This creates:
- **150+ parking lots** across Ho Chi Minh City (Metro Line 1 corridor + all districts)
- **Demo commuter and owner accounts** (see [User Guide](#user-guide) for credentials)
- **Sample sessions and reviews** for dashboard analytics demo

Re-run `npm run seed` at any time to reset all data to the demo state.

---

## Run Instructions

### Development (Two Terminals)

**Terminal 1 — Backend** (API server on port 4000):

```bash
cd server
npm run dev
```

**Terminal 2 — Frontend** (Vite dev server on port 5173):

```bash
cd web
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

In dev mode, Vite automatically proxies all `/api` requests to `http://localhost:4000` — no manual configuration needed.

### Production Build (Single Service)

```bash
# From repo root — builds frontend and wires everything together
npm run build

# Start the server (serves API + built frontend on one port)
npm start
```

The production Express server serves:
- `/api/*` — all backend API routes
- `*` — `web/dist/index.html` (React SPA fallback for client-side routing)

Default port is `4000`. Override with the `PORT` environment variable.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Backend server port |
| `VITE_API_URL` | `http://localhost:4000/api` (dev) / `/api` (prod) | API base URL override |

No `.env` file is required — all defaults work out of the box for local development.

### Deployment (Render.com)

The repo includes `render.yaml` for one-click deploy to Render.com:

- **Region:** Singapore (ap-southeast-1)
- **Node:** 22.11.0
- **Build:** `npm install && npm run build`
- **Start:** `npm start`
- **Health check:** `GET /api/health`

> **Persistence note:** Render's free tier uses ephemeral disk — `parking.db` resets on each redeploy. For production persistence, use a paid plan with a mounted disk or migrate to PostgreSQL.

---

## User Guide

### Demo Accounts

All demo accounts use password **`123456`**.

**Commuter accounts:**

| Username | Description |
|----------|-------------|
| `commuter1` | Nguyễn Văn A — has wallet balance (120,000 ₫) and sample session history |
| `commuter2` | Trần Thị B — clean account for testing from scratch |

**Parking owner accounts:**

| Username | Lot |
|----------|-----|
| `owner1` | Vincom Center Đồng Khởi — pre-loaded with full analytics data |
| `owner2` | Bến Thành Market |
| `owner3` – `owner12` | Various lots across HCM City |

---

### Commuter Walkthrough

#### Finding Parking

1. Log in as `commuter1`
2. The **Map** tab opens by default — green/yellow/red markers show live capacity
3. Tap a marker or lot card to open the lot detail page
4. See price, amenities, distance, and reviews
5. Tap **Book** to reserve in advance or **Check In QR** to get your QR now

#### Checking In

1. Go to **Account** tab → confirm your vehicle is listed (or add one)
2. Tap **Show QR** or navigate to a lot and tap **Check In QR**
3. Show the QR on screen to the parking attendant
4. The attendant scans it — your **Ticket** tab activates with a live timer

#### Checking Out

1. Open the **Ticket** tab → select the active session
2. Optionally tap **Set Payment** to choose wallet, MoMo, or cash
3. Show the **Checkout QR** to the attendant
4. Attendant scans, confirms payment — session closes and you receive a receipt

#### Booking in Advance

1. Open a lot → tap **Book a Spot**
2. Select date and time → confirm
3. Booking appears in the **Ticket** tab with a countdown
4. Arrive within 15 minutes of your scheduled time — attendant scans the booking QR to open your session

#### Managing Vehicles

1. Go to **Account** → **Vehicles**
2. Tap **Add Vehicle** → enter plate number and an optional label (e.g., "Car", "Xe máy")
3. Multiple vehicles can each have their own concurrent active session

---

### Parking Owner / Staff Walkthrough

#### Checking In a Commuter (QR Scan)

1. Log in as `owner1` (or any owner account)
2. Go to **Operations** tab
3. Tap **Scan QR** → point camera at the commuter's check-in QR
4. Session opens — capacity updates automatically

#### Checking Out a Commuter

1. In **Operations**, tap **Scan QR** → scan the commuter's checkout QR
2. Fee is displayed — collect payment from commuter
3. Tap **Confirm Checkout** — session closes, receipt sent to commuter

#### Fallback — No QR (Plate Lookup)

1. In **Operations**, use the **Search by Plate** field
2. Enter the license plate number → active session appears
3. Process checkout as normal

#### Viewing Dashboard Stats

1. Go to the **Dashboard** tab
2. See: live occupancy gauge, today's earnings, hourly session histogram, and recent activity feed

---

## Tech Stack

### Backend

| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | **Node.js 22.5+** | Built-in `node:sqlite` — zero native compilation |
| Framework | **Express.js 4** | Minimal, well-understood, fast to ship |
| Database | **SQLite** (`node:sqlite`) | Single file, no server process, ideal for MVP |
| Auth | **Bearer tokens** | Stateless, simple to implement without a library |
| Real-Time | **Server-Sent Events (SSE)** | One-way capacity push without WebSocket overhead |

### Frontend

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | **React 18 + TypeScript 5** | Component model fits the multi-screen PWA layout |
| Build | **Vite 5** | Fast HMR, native ESM, PWA plugin built-in |
| Styling | **Tailwind CSS 3** | Utility-first; custom Grab Green palette + glass design system |
| Fonts | **Inter + Be Vietnam Pro** | Legibility at small sizes on mobile |
| Routing | **React Router DOM v6** | File-level routes; nested layouts for commuter vs owner |
| Maps | **Leaflet + react-leaflet** | No API key; OpenStreetMap tiles; supports clustering |
| QR Display | **qrcode.react** | Lightweight, works offline |
| QR Scanning | **html5-qrcode** | Camera API wrapper with broad device support |
| OCR Fallback | **Tesseract.js 7** | Client-side license plate recognition — no server round-trip |
| PWA | **vite-plugin-pwa** | Service worker + manifest; installable on Android/iOS |

### Infrastructure

| Layer | Technology |
|-------|-----------|
| Hosting | Render.com (free tier, Singapore region) |
| Deploy model | Single Express service — API + static SPA, no CDN |
| Database file | `server/parking.db` (SQLite, ephemeral on free tier) |
| Node version | 22.11.0 (pinned in `render.yaml`) |

### Data Flow

```
Browser
  │
  ├── HTTP requests ──────────► Express /api/* routes
  │                                    │
  ├── GET /api/events (SSE) ──────────►│ pushes lot-update events
  │◄─────────────────────────────────── on every check-in/out
  │
  └── Static files ◄─────────── Express serves web/dist (SPA)
```

All timestamps are stored as milliseconds since epoch (`Date.now()`). Fees are in Vietnamese Đồng (₫), stored as integers. No floating-point currency arithmetic.
