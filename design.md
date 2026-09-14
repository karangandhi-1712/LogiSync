# Project Specification & Prompt: LogiSync v2.0 — Port Logistics Command Center

Build a high-performance, production-grade desktop web application for "LogiSync v2.0", an AI-powered port logistics and container terminal command console. The app must implement a **dual-theme system (Light Theme as DEFAULT with an instant toggle to Dark Theme)**, custom Google Maps API integration, real-time dispatch telemetry, automated gate slot allocation, fleet telematics, and predictive analytics.

---

## 1. THEME ARCHITECTURE & DESIGN TOKENS

Implement theme switching using Tailwind CSS (`class="dark"` on `<html>` or `<body>`) or CSS custom properties. Store theme preference in `localStorage` with system preference fallback, defaulting to **Light Mode**.

### A. Theme Variables & Color Palette

| Token Role | Light Theme (DEFAULT) | Dark Theme (`.dark`) | Notes |
| :--- | :--- | :--- | :--- |
| **App Canvas / Page BG** | `#f8fafc` (slate-50) | `#0a0f1e` / `#051424` | Crisp light vs. deep maritime navy |
| **Surface / Card Background** | `#ffffff` (pure white) | `rgba(15, 23, 42, 0.85)` | Dark uses frosted glass (`backdrop-blur: 24px`) |
| **Surface Container / Sub-cards** | `#f1f5f9` (slate-100) | `#0d1c2d` / `rgba(30, 41, 59, 0.7)` | Filter bars, table headers, mini stats |
| **Border / Dividers** | `1px solid #e2e8f0` | `1px solid rgba(100, 130, 200, 0.15)` | Subtle technical hairline borders |
| **Primary Accent** | `#0284c7` (sky-600) / `#2563eb` | `#06b6d4` (electric cyan) | Primary CTAs, active states, glowing indicators |
| **Primary Accent Hover/Glow** | `#0369a1` | `rgba(6, 182, 212, 0.25)` glow | Button states |
| **Text Primary (Headings/Data)** | `#0f172a` (slate-900) | `#f1f5f9` (slate-100) | High contrast, maximum legibility |
| **Text Secondary (Labels/Sub)** | `#475569` (slate-600) | `#94a3b8` (slate-400) | 12px-14px uppercase/subtitles |
| **Text Muted (Microcopy)** | `#94a3b8` (slate-400) | `#64748b` (slate-500) | Timestamps, sensor serials |
| **Success / Available / Positive** | `#059669` (emerald-600) | `#10b981` (emerald-400) | Optimal slots, in-transit status, on-time KPIs |
| **Warning / Moderate / Attention** | `#d97706` (amber-600) | `#f59e0b` (amber-400) | Gate queues, reefer temperature alert |
| **Danger / Bottleneck / Peak** | `#dc2626` (red-600) | `#ef4444` (red-400) | Heavy congestion, missed appointments |
| **Card Drop Shadows** | `0 4px 20px -2px rgba(0,0,0,0.05)` | `0 8px 32px rgba(6, 182, 212, 0.08)` | Clean soft shadow vs. cyan neon glow |

### B. Typography & Radii

- **Font Family**: `Inter`, `-apple-system`, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif. Use `font-mono` / tabular numbers (`font-variant-numeric: tabular-nums`) for coordinates, speeds, timestamps, and TEU counters.
- **Corner Radii**:
  - Cards & Modal Panels: `rounded-2xl` (16px)
  - Interactive Buttons, Pills, Inputs: `rounded-xl` (12px)
  - Outer Viewport Chrome / Modals: `rounded-3xl` (24px)
  - Status Indicators & Badges: `rounded-full` (9999px)

---

## 2. GLOBAL SHELL & PERSISTENT NAVIGATION

Every screen except Screen 1 (Login) shares a persistent, responsive shell:

### A. Top Navigation Bar (Height: 60px)

- **Brand**: Square gradient icon with white delivery truck glyph + "**LogiSync**" (bold) + `v2.0 PRO` / `LIGHT V2.5` badge.
- **Subtext**: "PORT OPS CONSOLE / TERMINAL COMMAND / LIVE TELEMETRY".
- **Global KPI Telemetry Strip**:
  - `Fleet: 24 Online` (pulsing green dot)
  - `Gate Queue: 4 Trucks` (cyan/amber icon)
  - `Uptime: 99.98%` (shield checkmark)
  - `GNSS RTK LOCK: 28 Satellites Locked`
- **Utility Actions (Right)**:
  - **Theme Toggle Button**: Sun (`☀️`) / Moon (`🌙`) icon button that toggles `.dark` mode across the document with a smooth 200ms background transition.
  - Notification bell with counter badge `4`.
  - User profile chip: Avatar photo of "Karanesh G. • Port Admin" with status dropdown.

### B. Left Navigation Sidebar (Width: 260px, collapsible to 68px)

- Navigation links with active state indicator (pill background + left border accent):
  1. **Dashboard** (Command Center & Port Map) — Active by default
  2. **Slot Booking** (Gate Allocation & AI Recommendation)
  3. **Fleet Tracker** (Telematics & Live GIS Stream)
  4. **Analytics** (Heatmaps, Turnaround Trends & ROI)
  5. **Settings** (Sensors, OCR Gates & Cognito API)
- Bottom footer: Operator session card (`Karanesh G. • VOC Port Admin`), `COGNITO AES-256 VERIFIED` security tag, and logout icon.

---

## 3. SCREEN-BY-SCREEN SPECIFICATIONS

### SCREEN 1: Login & Authentication (`/login`)

- **Layout**: Centered authentication card (max-width: 440px) over a subtle grid background pattern (`4rem` gridlines in light slate or dark navy) with soft radial ambient glow orbs.
- **Card Elements**:
  - App Logo: Rounded gradient icon (cyan-to-blue) with truck glyph.
  - Title: "**LogiSync**" with version tag, Subtitle: "AI-Powered Port Logistics Command Center".
  - **Operational Role Switcher**: 3 horizontal segment tabs: `Port Admin` (active), `Fleet Mgr`, `Dispatcher`.
  - **Input 1**: Terminal ID / Security Email (`dispatcher@logisync.ai`) with building/user icon.
  - **Input 2**: Security Passcode / Token with lock icon and reveal eye button.
  - Checkbox: "Remember device" + "Reset token?" text link.
  - **CTA Button**: Full-width primary button "Sign In to Command Center →" with hover scale/glow.
  - Divider: Thin line with "OR" text.
  - **Demo Bypass Button**: Outline/ghost button "⚡ Launch Demo Session [INSTANT BYPASS]".
  - Footer security note: "Secured by AWS Cognito • AES-256 Encrypted • SOC2 Type II".

### SCREEN 2: Command Center Dashboard (`/dashboard`)

- **Layout**: 3-column operational cockpit: Left sidebar (260px) + Center full-height Google Maps canvas + Right contextual slide-over panel (380px).
- **Sub-Header Strip**:
  - Terminal identifier: `Terminal: V.O. Chidambaranar (VOC Port)` with live radar sweep pill (`3.2s Sweep`, `Berths 1-8 Normal`).
  - Quick metrics: `AIS Vessels: 12`, `Yard Density: 74.2%`, `Avg Gate Wait: 11m`.
  - "Telemetry Layers" toggle button.
- **Google Maps Canvas**:
  - Integrate Google Maps JavaScript API (or Mapbox GL JS fallback).
  - **Map Styling**:
    - **Light Mode**: Clean vector map with desaturated roads, light blue water `#cce5ff`, emerald green terminal yards.
    - **Dark Mode**: Midnight navy custom JSON style (`#051424` background, `#0a1c30` water, `#1e293b` arterial roads).
  - Map controls: Mode toggles (`Road`, `Satellite`, `Hybrid`, `Terrain`), zoom buttons, re-center target button.
  - **Custom Overlays**:
    - VOC Port outer geofence boundary (dashed cyan/red polygon).
    - Terminal operational zones: `Cold Storage Alpha`, `CY-Block B`, `HazMat Yard 2`, `WH-East Berth 4`.
    - Live Gate Markers: Pulsing rings on Gates 1-4 with live queue counts (e.g. `Gate 1: 8 trucks [HOLD]`).
    - Moving Vehicle Marker (`TRK-8821`): Truck glyph with heading angle arrow, live speed badge (`58 km/h`), and glowing historical telemetry trail polyline.
- **Right Slide-in Inspector ("Active Dispatch & Telemetry")**:
  - Vehicle tag: `TRK-8821` (`IN TRANSIT`), Scania R500 • High Cube 40ft • VIN #SC-990812.
  - Driver card: Photo avatar of "Rajesh Kumar" (Rating: 4.9 ★, Duty: 4h 12m) with live call trigger.
  - Real-time telemetry 2x2 grid:
    - Speed: `58 km/h` (Limit: 70 km/h OK)
    - Heading: `114° ESE` (Waypoint D Vector)
    - Fuel Tank: `78%` (420L reserve, circular or linear gauge)
    - Reefer Temp: `-18°C` (Set: -20°C, Status: STABLE OK with snowflake icon)
  - Active corridor tracker: `Chennai CFS → VOC Port Gate 3` with 68% progress bar (184 km cleared, 42 km remaining, ETA 14:15 ON TIME).
  - **AI Route Optimizer Card**: Alert banner highlighting Gate 1 bottleneck (+32m delay) and recommended diversion to Gate 3 via Coastal Bypass. "Saved: 26 mins".
  - Sparkline: GNSS / IMU Telemetry SNR (99.84% accuracy curve).
  - Primary Action: "⚡ Trigger Live Reroute" button.

### SCREEN 3: Gate Slot Booking & AI Dispatch (`/slots`)

- **Layout**: 60% Left gate schedule timeline + 40% Right booking panel with AI Fleet Optimizer recommendation.
- **Top Gate Vector Matrix**:
  - Gate 1: Main Entry — `45M wait` [CONGESTED] (14 in queue)
  - Gate 2: Container Term — `18M wait` [NORMAL] (6 in queue)
  - Gate 3: Bulk & Express — `11M wait` [OPTIMAL / FAST-PASS] (2 in queue)
  - Gate 4: Export Yard — `22M wait` [MODERATE] (9 in queue)
- **Timeline Grid (Left)**:
  - Date selector: `Today — 14 Sep 2026` with prev/next arrows and slot interval toggles (`15M`, `30M`, `1H`).
  - Legend: `Available`, `Booked`, `Active at Gate`, `Bottleneck / Peak`, `Completed`.
  - 15-minute slot rows from 14:00 to 16:00:
    - 14:00: `TRUCK AT GATE — Inspection & Weighbridge` (04m left, eye preview)
    - 14:15: `TARGET SLOT: Bulk Cargo Gate 3` [AI TOP PICK] — `₹500 Express Locked` [Claimed]
    - 14:30: `TN-04-E-8821 • Rajesh Kumar` (Booked Express, 40FT High Cube)
    - 14:45: `HIGH QUEUE SPIKE — 8 Trucks Waiting` [SURGE PEAK] (Divert recommended)
    - 15:00 & 15:15: `Standard Priority • 9-12 Open Windows` [Quick Claim buttons]
- **AI Congestion Delay Forecast (Bottom Left)**:
  - Hourly vertical bar chart (06:00 to 22:00) comparing Gate 1 (Amber/Red bars) vs. Gate 3 (Cyan/Emerald bars), pinpointing the 14:00 peak spike (48m).
- **Right Booking & Driver e-Pass Transmission Panel**:
  - Target gate picker: `Gate 3 — Bulk Cargo & Express Container` (11m avg dwell).
  - Time window: `14 Sep 2026, 14:15 - 14:30`.
  - Assigned Fleet Asset: `TRK-8821 • Rajesh Kumar` with verified KYC badge.
  - Cargo: `Refrigerated Container • High Priority` (-18.4°C monitored).
  - Dwell time slider: `45 mins` (Unload + Crane Sync).
  - Protocol tier selector: `Standard (₹0)`, `Express (+₹500)` [Selected], `Critical (+₹1,200)`.
  - **AI Fleet Dispatch Optimizer Card**: Highlighted callout explaining: "Optimal entry: Gate 3 at 14:15. Bypasses Main Arterial construction. SAVINGS: 34 Mins Faster".
  - Buttons: "Accept Route" vs. "Override".
  - Main CTA: "Confirm Slot & Transmit Driver e-Pass" (with RFID fast-pass sync).

### SCREEN 4: Fleet Tracker & Telematics (`/fleet`)

- **Layout**: 40% Left Vehicle List with search and multi-state filters + 60% Right GIS Tracking Map with overlay inspector.
- **Vehicle Filter Bar**: Search input (`Search plate, driver, container ID...`) + status pills with counts: `All (24)`, `In Transit (12)`, `At Gate (5)`, `Delayed (3)`.
- **Truck List Cards**:
  - Status badge, plate number (e.g. `TRK-8821`, `TRK-3019`, `TRK-1102`), driver name, mission corridor, current speed, fuel level progress bar, and slot sync indicator.
  - Visual alert tag on delayed trucks (e.g. `NH-44 Bypass Bottleneck • Missed Window`).
- **Right Interactive Map**:
  - Display all 24 trucks as custom directional markers.
  - Show a 2.0 km geofence approach ring around the VOC Port entrance.
  - Floating radar stream telemetry status: `GNSS: 28 Locked`, `5G NR: 4.2ms latency`.
- **Vehicle Inspector Overlay**:
  - Displays speed gauge, heading compass (`118° ESE`), fuel tank level, reefer temperature (-18.2°C), 4-stage mission breadcrumb milestones (`Chennai CFS` → `Tambaram Toll` → `VOC Gate 3` → `Berth 4 STS`), and action buttons: `AI Reroute`, `Dispatch`, `Reassign`.
- **Bottom Corridor & Gate Analytics**:
  - Velocity index line chart (average 65 km/h vs actual).
  - Gate dwell time progress bars (Gate 1: 3.8m, Gate 2: 2.2m, Gate 3: 5.1m).

### SCREEN 5: Logistics Analytics & BI (`/analytics`)

- **Top Filter Strip**: Time ranges (`LIVE 24H` [Active], `LAST 7D`, `MONTHLY`), peak hours tag (`08:00 - 20:00`), and `Export Telemetry` button.
- **Top 4 Metric Summary Cards**:
  1. `Avg Queue Wait Time`: **34 min** (↓ 18% vs last week) + mini sparkline trend.
  2. `Gate Utilization`: **78%** (390/500 Trucks/Hr) + radial progress ring.
  3. `Reroutes Triggered`: **23 today** [AUTOMATED] + time saved: `4.2 hrs`, fuel saved: `₹84,000`, CO2 mitigated: `480 kg`.
  4. `Slot Adherence`: **89% OPTIMAL** (342/384 slots) with 3-segment color breakdown (76% exact, 13% grace, 11% variance).
- **2x2 Visualization Grid**:
  - **Top-Left**: *Gate Congestion Heatmap Matrix* (Gates G-01 through G-04 across 2-hour intervals from 06:00 to 18:00, color-graded from low green to critical coral).
  - **Top-Right**: *Turnaround Time — Actual vs. AI Predicted* (Line chart comparing 30-day continuous vessel-to-gate cycle with a -35.3% reduction curve).
  - **Bottom-Left**: *Live Queue Depth & Throughput Today* (Stacked area chart plotting truck accumulation peaking at 12:30 with 38 trucks, tapering down to optimal levels).
  - **Bottom-Right**: *Reroute Impact — Estimated Delay Savings* (Horizontal grouped bar chart comparing Monday-Friday "Without AI" [red/pink bars] vs. "With AI" [emerald bars] showing +28% throughput gain).
- **Bottom Policy Engine Card**:
  - `Autonomous Optimizer Auto-Throttle Policy v4.2` [HEALTHY].
  - Parameters: Queue Slack (4.5 min), Divert Threshold (>12 Trucks), OCR Confidence (99.4%), Simulation Score (0.96 AUC).
  - Action buttons: `Tune Weights` and `Run Monte Carlo Sim`.

---

## 4. CODE & IMPLEMENTATION GUIDELINES

1. **Clean Semantic Markup**: Use semantic tags (`<header>`, `<nav>`, `<main>`, `<aside>`, `<section>`).
2. **Framework Compatibility**: Ensure code is ready for React/Next.js (Tailwind CSS + Lucide-react icons) or pure vanilla HTML5/Tailwind CDN.
3. **Responsive Execution**: Desktop first (1440px wide viewport), gracefully adapting down to 1024px with collapsible sidebars and floating context panels.
4. **Theme Persistence Script**:
   ```javascript
   // Light theme is default
   if (localStorage.theme === 'dark') {
     document.documentElement.classList.add('dark');
   } else {
     document.documentElement.classList.remove('dark');
   }
   function toggleTheme() {
     const isDark = document.documentElement.classList.toggle('dark');
     localStorage.setItem('theme', isDark ? 'dark' : 'light');
   }
   ```
5. **No Placeholders**: Render all UI with realistic Tamil Nadu / VOC Port terminal logistics data (plates like `TN-04-E-8821`, `KA-01-MJ-9941`, INR currency `₹`, reefer temperatures in Celsius, and accurate TEU metrics).
