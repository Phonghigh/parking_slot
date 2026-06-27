# Backend Plan — ParkHub

**Last updated:** 2026-06-27
**Status:** Planning — not yet implemented

---

## Tech Stack

| Layer | Choice | Reason |
| --- | --- | --- |
| Runtime | Node.js 20 LTS | Large ecosystem, async I/O for real-time capacity |
| Framework | Fastify | Faster than Express, built-in schema validation |
| Language | TypeScript | Type safety across shared data model |
| Database | PostgreSQL 16 | ACID for session state, PostGIS for geo queries |
| ORM | Prisma | Type-safe queries, migration tooling |
| Cache / Pub-Sub | Redis | Capacity counters, session pub-sub, rate limiting |
| Auth | Custom OTP via Twilio/ESMS | Vietnam phone-first, no Google/Facebook required |
| Push Notifications | Firebase Cloud Messaging (FCM) | Cross-browser push for web app |
| File Storage | Cloudflare R2 | Lot photos, CCCD scans (S3-compatible) |
| Queue | BullMQ (Redis-backed) | Push notification jobs, receipt generation |
| Realtime | Server-Sent Events (SSE) | Capacity updates to commuter map — simpler than WS for MVP |
| Deployment | Docker + Railway / Render | Low ops overhead for MVP phase |

---

## Project Structure

```
backend/
  src/
    modules/
      auth/           # OTP send/verify, JWT issue
      users/          # Profile, vehicles CRUD
      lots/           # Lot search, detail, capacity
      sessions/       # Check-in, check-out, active session
      partner/        # Partner onboarding, lot management
      staff/          # QR scan, manual lookup, checkout confirm
      notifications/  # FCM push dispatch
    shared/
      prisma/         # Schema + migrations
      redis/          # Client + helpers
      queue/          # BullMQ workers
      middleware/     # Auth guard, role guard, rate limiter
      utils/          # Fee calc, QR decode, Vietnamese phone format
    app.ts            # Fastify bootstrap
    env.ts            # Zod-validated env schema
  prisma/
    schema.prisma
    migrations/
  Dockerfile
  docker-compose.yml  # Postgres + Redis for local dev
```

---

## Database Schema (Prisma)

```prisma
model User {
  id          String    @id @default(uuid())
  phone       String    @unique
  name        String
  cccd        String?   // encrypted at rest
  fcmToken    String?   // Firebase push token
  createdAt   DateTime  @default(now())
  vehicles    Vehicle[]
  sessions    Session[]
}

model Vehicle {
  id        String   @id @default(uuid())
  userId    String
  plate     String
  type      VehicleType  // BIKE | CAR
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  sessions  Session[]
  @@unique([userId, plate])
}

model Partner {
  id          String   @id @default(uuid())
  ownerName   String
  phone       String   @unique
  cccd        String   // encrypted
  bankAccount String?  // encrypted
  status      PartnerStatus @default(PENDING) // PENDING | VERIFIED | SUSPENDED
  verifiedAt  DateTime?
  createdAt   DateTime @default(now())
  lots        Lot[]
}

model Lot {
  id             String    @id @default(uuid())
  partnerId      String
  name           String
  address        String
  lat            Float
  lng            Float
  lotType        LotType   // HOUSEHOLD | COMMERCIAL
  totalCapacity  Int
  activeSessions Int       @default(0)
  priceBike      Int       // VND per hour
  priceCar       Int
  schedule       Json      // DaySchedule[]
  checkInMode    CheckInMode // STAFF | AUTOMATED
  status         LotStatus   @default(PENDING) // PENDING | ACTIVE | INACTIVE
  createdAt      DateTime  @default(now())
  partner        Partner   @relation(fields: [partnerId], references: [id])
  sessions       Session[]
}

model Session {
  id           String        @id @default(uuid())
  userId       String
  vehicleId    String
  lotId        String
  checkInTime  DateTime      @default(now())
  checkOutTime DateTime?
  durationMin  Int?
  fee          Int?          // VND
  status       SessionStatus @default(ACTIVE) // ACTIVE | COMPLETED | CANCELLED
  closedBy     ClosedBy?     // STAFF | AUTOMATED | SYSTEM
  user         User          @relation(fields: [userId], references: [id])
  vehicle      Vehicle       @relation(fields: [vehicleId], references: [id])
  lot          Lot           @relation(fields: [lotId], references: [id])
}

model OtpCode {
  id        String   @id @default(uuid())
  phone     String
  code      String   // hashed
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
  @@index([phone])
}
```

---

## API Design

Base URL: `/api/v1`

### Auth

| Method | Path | Description |
| --- | --- | --- |
| POST | `/auth/otp/send` | Send OTP to phone number |
| POST | `/auth/otp/verify` | Verify OTP → return JWT |
| POST | `/auth/refresh` | Refresh access token |

### Users

| Method | Path | Description |
| --- | --- | --- |
| GET | `/users/me` | Get own profile |
| PATCH | `/users/me` | Update name, FCM token |
| GET | `/users/me/vehicles` | List vehicles |
| POST | `/users/me/vehicles` | Add vehicle |
| DELETE | `/users/me/vehicles/:id` | Remove vehicle |

### Lots (Commuter)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/lots` | Search lots by coords + radius + filters |
| GET | `/lots/:id` | Lot detail (capacity, price, schedule) |
| GET | `/lots/:id/capacity/stream` | SSE stream — real-time capacity updates |

### Sessions (Commuter)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/sessions/active` | Get current active session (if any) |
| GET | `/sessions` | Session history (paginated) |
| GET | `/sessions/:id` | Session detail + receipt |

### Staff (Partner Staff App)

| Method | Path | Description |
| --- | --- | --- |
| POST | `/staff/checkin/qr` | Decode QR → return user + vehicle info |
| POST | `/staff/checkin/confirm` | Confirm check-in → open session |
| POST | `/staff/checkout/qr` | Decode QR → return session + fee |
| POST | `/staff/checkout/confirm` | Confirm cash collected → close session |
| POST | `/staff/lookup` | Find user by phone, plate, or CCCD |
| PATCH | `/staff/lots/:id/capacity` | Manual +1 / -1 capacity adjust |

### Partner

| Method | Path | Description |
| --- | --- | --- |
| POST | `/partner/register` | Submit lot registration |
| GET | `/partner/lots` | List own lots |
| GET | `/partner/lots/:id/sessions` | Sessions at lot (today / date range) |
| GET | `/partner/lots/:id/stats` | Daily stats: visits, avg duration, revenue |
| PATCH | `/partner/lots/:id` | Update schedule or status |

---

## Core Business Logic

### Fee Calculation

```typescript
function calculateFee(
  checkInTime: Date,
  checkOutTime: Date,
  vehicleType: VehicleType,
  lot: Lot
): number {
  const durationMin = Math.floor(
    (checkOutTime.getTime() - checkInTime.getTime()) / 60000
  );
  const hours = Math.ceil(durationMin / 60); // round up to nearest hour
  const pricePerHour = vehicleType === 'BIKE' ? lot.priceBike : lot.priceCar;
  return hours * pricePerHour; // VND
}
```

### Check-In Guards (must all pass before session opens)

1. Lot is `ACTIVE`
2. Lot is currently within schedule hours
3. `lot.activeSessions < lot.totalCapacity`
4. User has no existing `ACTIVE` session
5. Vehicle belongs to this user

### Capacity Counter (Redis)

```
Key: lot:capacity:{lotID}
Value: integer (active sessions count)
```

On check-in: `INCR lot:capacity:{lotID}`
On check-out: `DECR lot:capacity:{lotID}`
On server restart: re-hydrate from `COUNT(*) WHERE status = ACTIVE`

SSE endpoint polls Redis every 5 seconds and pushes delta to connected clients.

### QR Decode

QR payload (MVP static): base64-encoded JSON `{ uid: string, plate: string }`

Staff app sends raw QR string → `/staff/checkin/qr` decodes and returns:
```json
{
  "user": { "id": "...", "name": "...", "phone": "..." },
  "vehicle": { "plate": "51B-12345", "type": "BIKE" },
  "lot": { "hasCapacity": true, "isOpen": true }
}
```

---

## Auth Flow

```
Phone OTP (via eSMS / Twilio)
  └── POST /auth/otp/send     { phone }
  └── SMS: "Ma ParkHub: 123456. Het han sau 5 phut."
  └── POST /auth/otp/verify   { phone, code }
      └── Returns: { accessToken (15m), refreshToken (30d) }

JWT Payload:
  { sub: userId, role: "COMMUTER" | "PARTNER" | "STAFF" }
```

OTP rules:
- 6-digit code
- Expires in 5 minutes
- Max 3 attempts per OTP, then invalidate
- Rate limit: 3 OTP sends per phone per 10 minutes

---

## Push Notifications (FCM)

Events that trigger a push:

| Event | Recipient | Message (Vietnamese) |
| --- | --- | --- |
| Check-in confirmed | Commuter | "Đã vào bãi [Lot Name] lúc HH:MM" |
| Check-out confirmed | Commuter | "Ra bãi [Lot Name] · Phí: 15.000đ" |
| Receipt ready | Commuter | "Xem biên lai chuyến gửi xe" |
| Lot nearing full | (Phase 2) | — |

Push jobs dispatched via BullMQ to avoid blocking session confirm API response.

---

## Realtime Capacity (SSE)

```
GET /lots/:id/capacity/stream
Accept: text/event-stream

data: {"lotId":"...","available":7,"total":25,"status":"green"}

data: {"lotId":"...","available":2,"total":25,"status":"red"}
```

Redis pub-sub channel: `lot-capacity-updates`
Any check-in/out publishes to this channel → SSE handler forwards to connected clients.

Map clients subscribe only to lots currently visible in their viewport.

---

## Middleware Stack

```
Request
  → Rate limiter (Redis, per IP + per user)
  → JWT verify + attach user
  → Role guard (COMMUTER | PARTNER | STAFF)
  → Input validation (Zod schema)
  → Route handler
  → Error handler (structured JSON error)
Response
```

Error response format:
```json
{
  "error": {
    "code": "SESSION_ALREADY_ACTIVE",
    "message": "Bạn đang có phiên tại Bãi Nguyễn Huệ",
    "statusCode": 409
  }
}
```

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# JWT
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_TTL=900       # 15 minutes
JWT_REFRESH_TTL=2592000  # 30 days

# OTP
ESMS_API_KEY=
ESMS_SECRET_KEY=
OTP_TTL=300              # 5 minutes
OTP_MAX_ATTEMPTS=3

# Firebase
FCM_SERVICE_ACCOUNT_JSON=

# Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_BUCKET=parkhub-uploads

# App
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

---

## Implementation Order (MVP)

| Phase | Deliverable |
| --- | --- |
| 1 | Project scaffold, Prisma schema, DB migrations, docker-compose |
| 2 | Auth module (OTP send/verify, JWT) |
| 3 | Users + Vehicles CRUD |
| 4 | Lot search API (geo query with PostGIS), lot detail |
| 5 | Staff check-in flow (QR decode → confirm → session open) |
| 6 | Staff check-out flow (fee calc → confirm → session close) |
| 7 | Capacity counter in Redis + SSE stream |
| 8 | FCM push notifications (BullMQ workers) |
| 9 | Partner registration + lot management APIs |
| 10 | Session history + receipt endpoint |

---

## Open Technical Questions

| Question | Impact |
| --- | --- |
| eSMS vs Twilio for OTP in Vietnam | Cost + deliverability — eSMS preferred domestically |
| PostGIS or Postgres `earth_distance` for geo search | PostGIS is more powerful but heavier; can use cube+earthdistance extension for MVP |
| Camera/ANPR integration API contract | Needed for Mode B lots — hardware-dependent, discovery required |
| CCCD encryption key management | Must not store plaintext — use app-level AES-256 + KMS |
| Multi-lot partner accounts | Current model: 1 Partner → N Lots. Staff role scoped to which lots? |

