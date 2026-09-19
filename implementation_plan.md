# LogiSync — Slot Scheduling Tab Redesign

## Overview

A comprehensive redesign of the [`SlotBookingPage.tsx`](file:///e:/project/LogiSync/frontend/src/pages/SlotBookingPage.tsx) page. The existing layout is too dense and crams gate cards, timeline, congestion chart, and booking form into one overcrowded column. The redesign introduces a **port-selection gate** at the top of the flow, breaks the page into four clear vertical sections with breathing room, adds a rich expandable service/gate overview, a full multi-step booking form, a "My Bookings" list, and a dedicated Transit e-Pass artifact view — all while preserving the existing design system exactly.

---

## User Review Required

> [!IMPORTANT]
> **Port selection state model:** The existing `PortContext` already stores a selected port globally and persists it to `localStorage`. The redesign treats the in-page port selector as the *page-level* selection that starts "unselected" on first visit to the tab, even if a port is set globally. Should the globally selected port auto-populate the in-page selector on load, or must the user explicitly search/click a port every time they visit the tab?
>
> **Recommendation:** Auto-populate from the global `PortContext` if already set, but still show the selector bar so the user can change it within this tab. If nothing is set globally, start with the null/zero state.

> [!IMPORTANT]
> **"My Bookings" data source:** The existing API (`fetchSlots`) returns slots filtered by `gate + date + port`. There is no separate "my bookings" endpoint. For the My Bookings tab, we will use mock/local state seeded with a handful of dummy bookings per port (upcoming, in-progress, completed). Real bookings made during the session are prepended. Confirm this approach before implementation.

> [!WARNING]
> **"View Route" modal:** The prompt requires a route panel showing 2–3 routes from port to delivery destination. This would require the map library (currently used in `FleetTrackerPage`). The plan is to render a simplified route modal with static dummy route cards (distance, ETA, toll note) using the same visual styling — no live map tile rendering in a modal — to keep scope manageable. If a full embedded map is required, scope must expand.

---

## Open Questions

1. Should the Transit e-Pass PDF export use the browser `window.print()` approach (style a print-only view) or a library like `html2canvas` + `jsPDF`? The latter requires a new dependency.
2. The "Delivery Destination" field in the booking form — should it be a free-text input or an autocomplete tied to the existing map/geocoding service?
3. The "Vehicle Number & Type" tile picker — should it store state per-session only, or persist to `localStorage`?

---

## Proposed Changes

### Component Architecture Overview

```
SlotBookingPage.tsx (root page — full rewrite)
  ├── PortSelectorBar.tsx        [NEW] — inline search bar + modal
  ├── PortSelectorModal.tsx      [NEW] — centered overlay, 12 ports
  ├── ServiceGateOverview.tsx    [NEW] — 4 collapsible service cards + live clock
  ├── DateScrubber.tsx           [NEW] — extracted from current inline code; reusable
  ├── CongestionSection.tsx      [NEW] — date scrubber + chart + peak gate callout
  ├── SlotSchedulingZone.tsx     [NEW] — two-tab container
  │     ├── HowToBookTab.tsx     [NEW] — steps guide + booking form
  │     │     ├── StepsGuide.tsx [NEW] — numbered vertical guide
  │     │     └── BookingForm.tsx[NEW] — multi-section form
  │     └── MyBookingsTab.tsx    [NEW] — per-port bookings list
  └── EPassModal.tsx             [NEW] — transit e-pass artifact
```

All new components live in:
`e:\project\LogiSync\frontend\src\components\slot-booking\`

---

### Data Layer

#### [MODIFY] [`ports.ts`](file:///e:/project/LogiSync/frontend/src/data/ports.ts)
- Extend `PortInfo` to include:
  - `locode: string` — UN/LOCODE (e.g. `"INTUT"`)
  - `timezone: string` — IANA zone string (e.g. `"Asia/Kolkata"`) — all 12 ports are IST, so this is `"Asia/Kolkata"` for all, but the field makes the live clock label port-aware
  - `congestionLevel: 'low' | 'moderate' | 'high'` — dummy decorative per-port congestion for the selector modal
  - `serviceGateMap: ServiceGateMap` — **new critical field** — maps each of the 4 services to the gate numbers belonging to it, with distinct dummy wait/queue/status per port

#### [NEW] `e:\project\LogiSync\frontend\src\data\portServiceData.ts`
- `ServiceGateMap` type and per-port gate-to-service mapping for all 12 ports
- Dummy congestion chart data per port (arrays of 9 hourly values per gate)
- Dummy bookings per port (3–5 bookings, mix of Upcoming/In Progress/Completed)

#### [MODIFY] [`index.ts`](file:///e:/project/LogiSync/frontend/src/types/index.ts)
- Add types:
  - `ServiceType = 'bulk' | 'general' | 'container_reefer' | 'express_rail'`
  - `GateServiceInfo` — `{ gateNumber: number; waitMin: number; queue: number; status: GateStatus }`
  - `ServiceCardData` — `{ service: ServiceType; label: string; icon: string; totalWait: number; totalQueue: number; status: GateStatus; gates: GateServiceInfo[] }`
  - `BookingRecord` — full booking with `tokenNumber`, `destination`, `status: 'upcoming' | 'in_progress' | 'completed'`, `routeEnabled: boolean`
  - `EPassData` — structured pass data

---

### New Components

#### [NEW] `e:\project\LogiSync\frontend\src\components\slot-booking\PortSelectorBar.tsx`
- A full-width glass input bar with anchor icon and chevron
- Placeholder: "Search or select a port to begin..."
- Filled state: shows port name + LOCODE + "Change port" chip
- `onClick` → opens `PortSelectorModal`
- Null state handled by parent with muted styling

#### [NEW] `e:\project\LogiSync\frontend\src\components\slot-booking\PortSelectorModal.tsx`
- Centered overlay with dim backdrop (same `z-50`, `bg-black/40 backdrop-blur-sm` treatment as other modals)
- Framer Motion: `opacity 0→1` + `scale 0.95→1` on open, reverse on close
- Search input at top, live-filters the 12 port rows
- Each row: port name, LOCODE, city/state, congestion dot
- Click → calls `onSelect(portId)` → closes modal
- Keyboard: Escape closes, arrow keys navigate rows (a11y)

#### [NEW] `e:\project\LogiSync\frontend\src\components\slot-booking\ServiceGateOverview.tsx`
- Four service cards in a `grid grid-cols-4` row (tablet: `grid-cols-2`, mobile: swipeable row)
- Card collapsed: service icon + name, aggregate wait, queue count, status chip, "+N gates" + chevron
- Card expanded: smooth `height` animation (Framer Motion `AnimatePresence` + `motion.div` with `overflow: hidden`), chevron rotates 180°, reveals per-gate mini-cards
- Each gate mini-card styled like current gate cards (cream/amber/green/cyan ring per status)
- Null state (no port): cards render with `—` and desaturated bg, no color-coded dot

**Live Clock:**
- `useState` + `useEffect` with `setInterval(1000)` ticking
- Displayed as `HH:MM:SS IST` (all ports are IST)
- Label: if port selected → `"{port.short} LOCAL TIME"`; else → `"IST (Select port)"`
- Placed in the same row as the existing Refresh button (passed as sibling via flex layout in the page header utility row)

#### [NEW] `e:\project\LogiSync\frontend\src\components\slot-booking\DateScrubber.tsx`
- Extracted from the current inline date navigation in `SlotBookingPage`
- Shows 7-day chip row with colored density bar under each date
- Left/right scroll arrow buttons
- Density bar color: green (low) → amber (moderate) → red (high congestion), mapped from per-port/per-date dummy data
- Shared between `CongestionSection` and `BookingForm`
- Props: `selectedDate`, `onDateChange`, `portId`, `densityData` (array of 7 numbers 0–1)

#### [NEW] `e:\project\LogiSync\frontend\src\components\slot-booking\CongestionSection.tsx`
- Wraps `DateScrubber` + `CongestionChart` + Peak Gate Callout
- `CongestionChart` updated to accept `portId` + `date` props and render port-specific data from `portServiceData.ts`
- **Peak Gate Callout**: a small highlighted card below/beside chart — shows "Peak Gate Today: Gate X · {serviceName}", peak wait, peak time window
- Null state: chart frame with axis lines only + "Select a port to view live gate intelligence" centered message

#### [NEW] `e:\project\LogiSync\frontend\src\components\slot-booking\SlotSchedulingZone.tsx`
- Container with two tabs: "How to Book" and "My Bookings"
- Tab bar styled with the existing pill/underline treatment (matching the `AnalyticsPage` tab pattern)
- `activeTab` state; switching to "My Bookings" after successful booking is triggered by a callback from the parent page

#### [NEW] `e:\project\LogiSync\frontend\src\components\slot-booking\HowToBookTab.tsx`
- Desktop ≥1280px: `flex flex-row gap-6`; smaller: `flex flex-col`
- Left 35%: `StepsGuide` component
- Right 65%: `BookingForm` component

#### [NEW] `e:\project\LogiSync\frontend\src\components\slot-booking\StepsGuide.tsx`
- Numbered vertical guide (1–7) with connected step line
- Each step: small icon, bold title, short description
- Uses existing text sizing and spacing scale
- Steps listed exactly as in Section 6.1 of the prompt

#### [NEW] `e:\project\LogiSync\frontend\src\components\slot-booking\BookingForm.tsx`
Full multi-section form in the existing dark navy panel style:

1. **Service & Gate:** two cascading dropdowns — service type (filtered to port), then gate (shows live wait time)
2. **Date & Time:** `DateScrubber` (reused) + time-slot grid (3×N grid of 30-min slots, colored blue=booked/green=AI pick/gray=available)
3. **Vehicle Number & Type:** text input + tile picker (5 vehicle types)
4. **Delivery Destination:** free-text input with icon
5. **Dispatch Priority Tier:** 3 selectable cards (Standard ₹0 / Express ₹500 / Urgent ₹1,000)
6. **AI Slot Suggestions panel:** appears after fields are filled — green card, 3–5 ranked slots, Top Pick badge with amber shimmer
7. **Confirm CTA button:** teal/blue gradient, loading → checkmark morph → switches to My Bookings tab

Null state: form fields disabled/grayed, inline note "Select a port above to begin booking".

#### [NEW] `e:\project\LogiSync\frontend\src\components\slot-booking\MyBookingsTab.tsx`
- Per-port booking list
- Null state: "No port selected — bookings are shown per port"
- Each booking card/row: token, gate/service, date+time, vehicle, driver, destination, status chip
- Actions:
  - "View e-Pass" → opens `EPassModal`
  - "View Route" → opens route panel (only on Upcoming)
  - "Reschedule" → time picker dialog (only on Upcoming)
  - "Cancel" → confirm dialog (only on Upcoming)
- Status chips: Upcoming (cyan) / In Progress (amber) / Completed (slate)

#### [NEW] `e:\project\LogiSync\frontend\src\components\slot-booking\EPassModal.tsx`
- Full-screen overlay (z-60) or large centered card
- Framer Motion: upward slide + fade in (`y: 40 → 0, opacity: 0 → 1`)
- Visual design: dark navy card (`#141C2B`), amber/teal accents, perforated divider (CSS dashed border with `border-dashed` + clip path or SVG tearline between main stub and token stub)
- Contents per spec: LogiSync logo, "TRANSIT E-PASS" label, port name+LOCODE, large token number, QR code placeholder (SVG grid pattern), origin, destination, gate+service, window, vehicle, driver+KYC chip, priority tier + fee, validity note, issued timestamp, barcode strip (SVG linear barcode graphic)
- Download button: `window.print()` approach with a `@media print` CSS rule that shows only the e-pass container; styled consistently with other primary buttons

#### [NEW] `e:\project\LogiSync\frontend\src\components\slot-booking\RoutePanel.tsx`
- Modal showing 2–3 dummy route cards
- Each route: route name, distance (km), ETA (mins), toll note, congestion note
- "Select Route" button per card
- Styled with the existing liquid-glass + dark navy pattern

---

### Page Rewrite

#### [MODIFY] [`SlotBookingPage.tsx`](file:///e:/project/LogiSync/frontend/src/pages/SlotBookingPage.tsx)
Full rewrite assembling the new sections. The page:
- Preserves the **Page Header** block (title, badge, subtitle, Refresh button) exactly — only adds the live clock as a sibling of the Refresh button
- Below the header: renders sections A → B → C → D in a single scrollable column (`overflow-y-auto`)
- Manages top-level state: `selectedPortId | null`, `activeTab`, `bookings[]`
- Passes callbacks down to child components
- The existing `PortContext` auto-populates `selectedPortId` on mount if a port is already set

---

### CSS / Styling

#### [MODIFY] [`index.css`](file:///e:/project/LogiSync/frontend/src/index.css)
Additions only (no changes to existing rules):
- `.epass-card` — print-safe dark navy card styling
- `.epass-tearline` — dashed perforated divider
- `.epass-barcode` — bottom barcode strip placeholder
- `.step-connector` — vertical line between numbered steps in StepsGuide
- `.slot-time-grid` — time slot grid layout
- `.shimmer-ai` — subtle shimmer animation for AI Top Pick badge (reuses existing `@keyframes` pattern if present, else adds new)
- `@media print` — shows only `.epass-print-root`, hides everything else

---

## Verification Plan

### Automated Tests
- No existing test suite to run; manual verification only.

### Manual Verification

1. **Null state:** Load the Slot Booking tab with no port in `localStorage`. Confirm all sections B/C/D show zero/muted state with correct placeholder messages.
2. **Port selection modal:** Click the search bar, verify modal opens with fade+scale animation. Type to filter ports. Select "Chennai Port" — verify bar shows "Chennai Port · INCH", sections below populate.
3. **Service card expand/collapse:** Click a service card, verify gate sub-row slides down, chevron rotates. Click again to collapse.
4. **Live clock:** Confirm clock ticks in real time; label shows selected port's short name.
5. **Date scrubber:** Click through dates in Section C — verify chart data changes (different bar heights per port/date).
6. **Booking form:** Fill all fields → verify AI panel appears with ranked slots. Select a slot, click "Confirm Slot & Transmit e-Pass". Verify loading → success morph → tab switches to "My Bookings" with new booking at top.
7. **e-Pass modal:** Click "View e-Pass" on a booking. Verify modal slides in. Click Download — verify print dialog opens with only the e-pass visible.
8. **Route panel:** Click "View Route" on an Upcoming booking. Verify modal opens with 2–3 route cards. Verify button is absent/disabled on Completed bookings.
9. **Port switching:** Switch port mid-session — verify My Bookings list changes, gate map changes, chart data changes.
10. **Responsive:** Resize to tablet (768px) — service cards wrap 2×2, steps guide above form. Resize to mobile (375px) — port modal full-screen, service cards horizontal scroll, form is step-wizard.
11. **Dark mode:** Toggle dark mode — verify all new components respect the existing dark CSS variables.
12. **Global shell:** Confirm top navbar, left sidebar, bottom user block are completely unchanged.
