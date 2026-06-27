# ParkHub — Knowledgebase

Living documentation for the ParkHub platform, organized by product module. Each file is updated whenever the corresponding feature changes.

## Modules

| Module | Description |
| --- | --- |
| [commuter/](commuter/) | End-user flows: search, check-in, check-out, account |
| [parking-partner/](parking-partner/) | Partner onboarding, capacity management, scheduling |
| [parking-staff/](parking-staff/) | Attendant flows for check-in and check-out |
| [core/](core/) | Shared logic: data model, QR session lifecycle, fallback |
| [integrations/](integrations/) | Maps, metro tickets, payment gateways |
| [admin/](admin/) | Government dashboard (Phase 3 roadmap) |
| [ui-ux/](ui-ux/) | Design system, screen specs, components, interaction patterns |

## Contribution Guide

- Update the relevant module doc **immediately** after any feature, flow, or schema change.
- Keep each file under ~150 lines — split into sub-files if needed.
- Update the **Last updated** field on every edit.
- Use the **Related PRD section** link to trace back to requirements.
