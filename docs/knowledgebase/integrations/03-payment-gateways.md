# Integrations - Payment Gateways

**Summary:** Online payment integration for checkout fees (Phase 2).  
**Last updated:** 2026-06-27  
**Related PRD section:** F4 - Online Payment (Phase 2)

---

## Supported Gateways

| Gateway | Type | Notes |
|---|---|---|
| MoMo | E-wallet | Dominant in VN, deeplink + QR |
| VNPay | E-wallet + bank QR | Government-preferred gateway |
| ZaloPay | E-wallet | Zalo ecosystem integration |
| Domestic bank cards | Debit/credit | Via VNPay or Napas |
| International cards | Visa/Mastercard | Via Stripe or PayOS |

## Payment Trigger (MVP → Phase 2)

- **MVP:** App displays fee; staff collects cash. No gateway integration.
- **Phase 2:** At checkout, app presents payment screen. Commuter selects gateway, pays in-app. Staff confirms after payment success event received.

## Flow

```
Session closes
    → Fee calculated
    → Payment screen shown to commuter
    → Commuter selects gateway
    → Gateway SDK/deeplink opens
    → Payment processed
    → Callback received by ParkHub server
    → Session marked PAID
    → Receipt dispatched
    → Barrier opens (Mode B) or staff notified (Mode A)
```

## Settlement to Partners

- Platform aggregates daily collections
- Partners receive settlement weekly or monthly to registered bank account
- Commission structure: TBD pending government B2G agreement
- Settlement via bank transfer (Napas domestic)

## Security Notes

- ParkHub never stores raw card numbers - all tokenized via gateway SDK
- PCI DSS compliance delegated to gateway provider
- Server-side payment verification required before closing barrier (prevent race condition)
