# ParkHub Backend

Fastify + TypeScript backend for the ParkHub MVP.

## Local setup

1. Copy `.env.example` to `.env` and fill production credentials when available.
2. Start infrastructure:
   ```sh
   docker compose up -d
   ```
3. Install dependencies and prepare Prisma:
   ```sh
   npm install
   npm run prisma:generate
   npm run prisma:migrate
   ```
4. Start API:
   ```sh
   npm run dev
   ```

Notification jobs run separately:

```sh
npm run worker:notifications
```

## MVP notes

- OTP uses eSMS when `OTP_PROVIDER=esms`; use `OTP_PROVIDER=mock` for local development.
- Static QR payloads are base64/base64url JSON. Commuter QR: `{ "uid": "...", "plate": "..." }`. Checkout QR: `{ "uid": "...", "sessionId": "..." }`.
- Capacity is stored authoritatively in PostgreSQL and mirrored to Redis for SSE.
- Online payment, booking, BusMap, metro tickets, and admin analytics are intentionally out of MVP scope.
