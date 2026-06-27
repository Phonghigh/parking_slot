CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE "Role" AS ENUM ('COMMUTER', 'PARTNER', 'STAFF', 'ADMIN');
CREATE TYPE "VehicleType" AS ENUM ('BIKE', 'CAR');
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'VERIFIED', 'SUSPENDED');
CREATE TYPE "LotType" AS ENUM ('HOUSEHOLD', 'COMMERCIAL');
CREATE TYPE "CheckInMode" AS ENUM ('STAFF', 'AUTOMATED');
CREATE TYPE "LotStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ClosedBy" AS ENUM ('STAFF', 'AUTOMATED', 'SYSTEM');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH');
CREATE TYPE "OtpProvider" AS ENUM ('MOCK', 'ESMS', 'TWILIO');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "cccd" TEXT,
  "fcmToken" TEXT,
  "role" "Role" NOT NULL DEFAULT 'COMMUTER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Vehicle" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "plate" TEXT NOT NULL,
  "type" "VehicleType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Partner" (
  "id" TEXT NOT NULL,
  "ownerName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "cccd" TEXT NOT NULL,
  "bankAccount" TEXT,
  "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Staff" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffLot" (
  "staffId" TEXT NOT NULL,
  "lotId" TEXT NOT NULL,
  CONSTRAINT "StaffLot_pkey" PRIMARY KEY ("staffId","lotId")
);

CREATE TABLE "Lot" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "lotType" "LotType" NOT NULL,
  "totalCapacity" INTEGER NOT NULL,
  "activeSessions" INTEGER NOT NULL DEFAULT 0,
  "priceBike" INTEGER NOT NULL,
  "priceCar" INTEGER NOT NULL,
  "schedule" JSONB NOT NULL,
  "checkInMode" "CheckInMode" NOT NULL,
  "status" "LotStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Lot_location_idx" ON "Lot" USING GIST (ST_SetSRID(ST_MakePoint("lng", "lat"), 4326));

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "lotId" TEXT NOT NULL,
  "checkInTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "checkOutTime" TIMESTAMP(3),
  "durationMin" INTEGER,
  "fee" INTEGER,
  "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "closedBy" "ClosedBy",
  "paymentMethod" "PaymentMethod",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OtpCode" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "provider" "OtpProvider" NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefreshToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CapacityAdjustment" (
  "id" TEXT NOT NULL,
  "lotId" TEXT NOT NULL,
  "delta" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "staffId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CapacityAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "Vehicle_userId_plate_key" ON "Vehicle"("userId", "plate");
CREATE INDEX "Vehicle_plate_idx" ON "Vehicle"("plate");
CREATE UNIQUE INDEX "Partner_phone_key" ON "Partner"("phone");
CREATE UNIQUE INDEX "Staff_phone_key" ON "Staff"("phone");
CREATE INDEX "Lot_lat_lng_idx" ON "Lot"("lat", "lng");
CREATE INDEX "Lot_status_idx" ON "Lot"("status");
CREATE INDEX "Session_userId_status_idx" ON "Session"("userId", "status");
CREATE UNIQUE INDEX "Session_user_active_unique" ON "Session"("userId") WHERE "status" = 'ACTIVE';
CREATE INDEX "Session_lotId_status_idx" ON "Session"("lotId", "status");
CREATE INDEX "Session_vehicleId_status_idx" ON "Session"("vehicleId", "status");
CREATE INDEX "OtpCode_phone_used_idx" ON "OtpCode"("phone", "used");
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "CapacityAdjustment_lotId_createdAt_idx" ON "CapacityAdjustment"("lotId", "createdAt");

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffLot" ADD CONSTRAINT "StaffLot_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffLot" ADD CONSTRAINT "StaffLot_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CapacityAdjustment" ADD CONSTRAINT "CapacityAdjustment_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
