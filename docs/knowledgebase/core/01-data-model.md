# Core — Data Model

**Summary:** Canonical entity definitions for the ParkHub platform.  
**Last updated:** 2026-06-27  
**Related PRD section:** Data Model (Core Entities)

---

## Entities

### User
```
User {
  userID:      uuid
  phone:       string (unique, OTP-verified)
  name:        string
  cccd:        string (encrypted — fallback identity)
  vehicles:    Vehicle[]
  createdAt:   datetime
}
```

### Vehicle
```
Vehicle {
  vehicleID:   uuid
  userID:      uuid (FK → User)
  plate:       string (unique per user)
  type:        enum { bike, car }
  createdAt:   datetime
}
```

### Lot
```
Lot {
  lotID:         uuid
  partnerID:     uuid (FK → Partner)
  name:          string
  address:       string
  coords:        { lat: float, lng: float }
  lotType:       enum { household, commercial }
  totalCapacity: int
  pricePerHour:  { bike: int, car: int }   // VND
  schedule:      DaySchedule[]
  checkInMode:   enum { staff, automated }
  status:        enum { active, inactive, pending }
  createdAt:     datetime
}
```

### Session
```
Session {
  sessionID:     uuid
  userID:        uuid (FK → User)
  vehicleID:     uuid (FK → Vehicle)
  lotID:         uuid (FK → Lot)
  checkInTime:   datetime
  checkOutTime:  datetime | null
  durationMin:   int | null           // computed on close
  fee:           int | null           // VND, computed on close
  status:        enum { active, completed, cancelled }
  closedBy:      enum { staff, automated, system } | null
}
```

### Partner
```
Partner {
  partnerID:     uuid
  ownerName:     string
  cccd:          string (encrypted)
  bankAccount:   string (encrypted)
  lots:          Lot[]
  verifiedAt:    datetime | null
  status:        enum { pending, verified, suspended }
}
```

## Relationships

```
User       1 ──< N  Vehicle
Partner    1 ──< N  Lot
Lot        1 ──< N  Session
User       1 ──< N  Session
Vehicle    1 ──< N  Session
```
