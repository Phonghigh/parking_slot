# UI/UX - Design System

**Last updated:** 2026-06-27  
**Related PRD section:** Platform - Web App (responsive, mobile-first)

---

## Design Philosophy

| Principle | Rationale |
|---|---|
| **Mobile-first** | Vietnamese commuters primarily access on phone browsers |
| **Speed over decoration** | Users are in transit - 3-tap max to complete any core action |
| **Trust signals everywhere** | B2G context; must feel official, not startup-y |
| **Vietnamese-native** | All copy, date formats, currency in Vietnamese convention |

---

## Color Palette

### Primary - Grab Green
| Token | Hex | Usage |
|---|---|---|
| `primary-500` | `#00B14F` | Main brand color - CTA buttons, active nav, links |
| `primary-600` | `#009A45` | Hover states, pressed buttons |
| `primary-700` | `#007A35` | Dark variant - text on light bg, focus rings |
| `primary-50`  | `#E6F9EE` | Light backgrounds, selected states, success tint |

### Capacity Status (critical - used on map markers + badges)
| Token | Hex | Meaning |
|---|---|---|
| `status-green` | `#0E9F6E` | >50% slots available |
| `status-yellow` | `#FACA15` | 10–50% slots available |
| `status-red` | `#E02424` | <10% or full |
| `status-gray` | `#9CA3AF` | Lot closed / unavailable |

### Neutral
| Token | Hex | Usage |
|---|---|---|
| `gray-900` | `#111827` | Primary text |
| `gray-600` | `#4B5563` | Secondary text, labels |
| `gray-200` | `#E5E7EB` | Dividers, borders |
| `gray-50` | `#F9FAFB` | Page backgrounds |
| `white` | `#FFFFFF` | Cards, modals |

### Semantic
| Token | Hex | Usage |
|---|---|---|
| `success` | `#057A55` | Confirmation states |
| `warning` | `#C27803` | Cautionary messages |
| `error` | `#C81E1E` | Errors, blocks |
| `info` | `#1C64F2` | Informational notices |

---

## Typography

**Primary font:** `Inter` (Latin) + `Be Vietnam Pro` (Vietnamese - better diacritic rendering)  
**Fallback:** System UI sans-serif stack

### Scale
| Token | Size | Weight | Line height | Usage |
|---|---|---|---|---|
| `text-2xl` | 24px | 700 | 32px | Page titles |
| `text-xl` | 20px | 600 | 28px | Section headers |
| `text-lg` | 18px | 600 | 26px | Card titles, lot names |
| `text-base` | 16px | 400 | 24px | Body text |
| `text-sm` | 14px | 400 | 20px | Labels, meta info |
| `text-xs` | 12px | 400 | 16px | Captions, timestamps |
| `text-fee` | 28px | 700 | 36px | Fee amounts (custom) |

---

## Spacing System

Base unit: `4px`

| Token | Value | Common use |
|---|---|---|
| `space-1` | 4px | Icon padding |
| `space-2` | 8px | Inline gaps |
| `space-3` | 12px | Tag padding |
| `space-4` | 16px | Card padding, section gaps |
| `space-6` | 24px | Between sections |
| `space-8` | 32px | Page margins |

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `rounded-sm` | 4px | Badges, tags |
| `rounded-md` | 8px | Buttons, inputs |
| `rounded-lg` | 12px | Cards |
| `rounded-xl` | 16px | Bottom sheets, modals |
| `rounded-full` | 9999px | Avatars, pills, map markers |

---

## Elevation / Shadow

| Level | CSS | Usage |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Inputs, subtle cards |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.08)` | Cards, dropdowns |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Bottom sheets, floating panels |
| `shadow-xl` | `0 20px 25px rgba(0,0,0,0.12)` | Modals |

---

## Breakpoints

| Name | Min width | Target device |
|---|---|---|
| `sm` | 375px | Small phones (base) |
| `md` | 390px | iPhone standard |
| `lg` | 768px | Tablet |
| `xl` | 1280px | Desktop (partner dashboard) |

Mobile (`sm`–`md`) is the primary target for commuter flows.  
Desktop (`xl`) is the primary target for Partner and Admin dashboards.
