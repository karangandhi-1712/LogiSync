# LogiSync v2.0 - Implemented Features and Usage Guide

LogiSync is a port logistics command center for V.O. Chidambaranar (VOC) Port, Thoothukudi. The project contains a React frontend, a FastAPI backend, a SQLAlchemy database layer, logistics decision services, mapping support, and AWS-oriented deployment configuration.

This document describes the features currently implemented in the repository and how they are used.

## 1. Application Architecture

```text
React + TypeScript + Vite frontend
        |
        | REST through Axios and telemetry WebSocket
        v
FastAPI backend
        |
        +-- SQLAlchemy database (SQLite by default)
        +-- Slot allocation service
        +-- Live rerouting service
        +-- Fuel and emissions model
        +-- Google Maps proxy service
        +-- Cognito, SNS, and CloudWatch adapters
```

The backend application is assembled in `backend/app/main.py`. It creates database tables and seed data at startup, registers middleware, includes all API routers under `/api`, and exposes health and WebSocket endpoints.

The frontend route structure is defined in `frontend/src/App.tsx`:

- `/login` - public login and demo entry screen
- `/dashboard` - command center map and active telemetry inspector
- `/slots` - gate slot allocation and booking interface
- `/fleet` - fleet tracking and telematics interface
- `/analytics` - operational analytics and charts
- `/settings` - user preferences, notifications, tutorial, map defaults, and units

Authenticated pages are wrapped by `ProtectedRoute` and `AppShell`.

## 2. Frontend Features

### 2.1 Login and role selection

Implemented in:

- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/services/auth.ts`

Features and uses:

- Email and password login form for Cognito users.
- Role tabs for Port Admin, Fleet Manager, and Dispatcher.
- Password visibility toggle.
- Remember-terminal checkbox UI.
- Login error display.
- Loading state during authentication.
- AWS Cognito signup and login support when Cognito settings exist.
- Instant demo login when Cognito is not configured.
- Redirect to `/dashboard` after successful login.
- Logout from the profile menu or sidebar.

In demo mode, the frontend creates a local user object and uses a demo token. In configured mode, the Cognito Identity JS SDK retrieves the user session and JWT token.

### 2.2 Protected application shell

Implemented in:

- `frontend/src/components/layout/AppShell.tsx`
- `frontend/src/components/layout/TopBar.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/layout/ProtectedRoute.tsx`

Features and uses:

- Persistent top navigation bar.
- Collapsible left navigation sidebar.
- Active navigation state for operational pages.
- User profile dropdown.
- Sign-out action.
- Global fleet, queue, uptime, and GNSS status indicators.
- Notification badge display.
- Responsive layout for the command center pages.
- Protected-route redirect to `/login` when there is no authenticated user.

The Settings page is registered at `/settings` and is available from the sidebar.

### 2.3 Light and dark themes

Implemented in:

- `frontend/src/context/ThemeContext.tsx`
- `frontend/src/index.css`
- `frontend/src/components/layout/TopBar.tsx`

Features and uses:

- Light theme is the default.
- Dark theme can be toggled from the top bar.
- Theme preference is stored in `localStorage` under `logisync-theme`.
- The `dark` class is applied to the document root.
- CSS custom properties define canvas, surface, text, border, accent, status, and shadow colors.
- Map tiles and chart colors respond to the active theme.
- Glass and neumorphic UI styles are shared across the application.

### 2.4 Command center dashboard

Implemented in:

- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/components/dashboard/SubHeaderStrip.tsx`
- `frontend/src/components/dashboard/TelemetryInspector.tsx`

Features and uses:

- VOC Port terminal header and operational status strip.
- AIS vessel count, yard density, average gate wait, and berth status display.
- Interactive Leaflet map centered on Thoothukudi.
- Port geofence and terminal operational zone overlays.
- Gate markers with queue counts and status labels.
- Directional truck markers with status colors and speed badges.
- Clickable truck markers that open the telemetry inspector.
- Layer visibility toggle.
- Inspector open and close controls.
- Driver profile, vehicle details, fuel, reefer temperature, speed, heading, mission progress, and ETA display.
- AI route recommendation display for a gate bottleneck.
- Live reroute action UI.

The dashboard loads fleet records through `GET /api/fleet/trucks`, applies live WebSocket position updates, and calls the backend reroute endpoint. Successful reroutes are shown in an in-app result modal and toast notification.

### 2.5 Maps, markers, and GIS overlays

Implemented in:

- `frontend/src/components/map/GoogleMapCanvas.tsx`
- `frontend/src/components/map/TruckMarker.tsx`
- `frontend/src/components/map/GeofenceOverlay.tsx`

Features and uses:

- Leaflet map initialization and cleanup.
- Bright road map and satellite map modes.
- Light/dark tile switching through Geoapify tiles.
- Esri satellite imagery.
- Zoom in, zoom out, and recenter controls.
- VOC Port geofence polygon.
- Cold Storage Alpha zone.
- CY-Block B zone.
- HazMat Yard 2 zone.
- WH-East Berth 4 zone.
- Gate 1 through Gate 4 markers.
- Gate queue and status popups.
- Truck direction arrows based on heading.
- Truck marker status colors for in-transit, at-gate, loading, delayed, idle, and outbound states.
- Truck tooltips showing ID, driver, plate, and status.

Although the component is named `GoogleMapCanvas`, the current implementation uses Leaflet and Geoapify/Esri tiles for the frontend map.

### 2.6 Gate slot booking interface

Implemented in `frontend/src/pages/SlotBookingPage.tsx`.

Features and uses:

- Four-gate status matrix.
- Gate wait time and queue count display.
- Congested, normal, optimal, and moderate gate states.
- Gate selection.
- Date selector UI.
- 15-minute, 30-minute, and 1-hour interval controls.
- Slot timeline for active, AI-selected, booked, surge, and available slots.
- AI Top Pick display.
- Surge warning and diversion recommendation display.
- Quick Claim buttons for available slots.
- Congestion forecast chart using ECharts.
- Booking panel with target gate, cargo, driver, and dwell-time controls.
- Standard, Express, and Critical booking tiers.
- Express and Critical pricing display.
- Driver e-pass and RFID synchronization presentation.
- AI optimizer explanation with estimated time savings.

The page loads congestion and slot data from the backend, refreshes AI recommendations when the selected gate/time changes, creates bookings, refreshes the timeline after booking, and supports rescheduling and confirmed cancellation of booked slots.

### 2.7 Fleet tracker

Implemented in `frontend/src/pages/FleetTrackerPage.tsx`.

Features and uses:

- Backend fleet loading with the seeded 24-truck fleet as the initial visual fallback.
- Search by truck ID, registration plate, or driver.
- Status filters for all, in transit, at gate, loading, delayed, idle, and outbound.
- Status count pills.
- Truck cards with driver, mission, speed, status, and fuel level.
- Delayed-truck alert labels.
- Interactive map showing filtered trucks.
- Map focus when a truck is selected.
- GNSS lock indicator.
- 5G latency indicator.
- Vehicle detail inspector overlay.
- Mission breadcrumb from origin to berth.
- Fuel and reefer data display.
- Framer Motion transitions for the inspector.
- Live `truck_update` WebSocket updates with reconnecting connection status.

The fleet page requests `GET /api/fleet/trucks`; the existing local fleet snapshot is retained only while the initial request is unavailable.

### 2.8 Analytics and business intelligence screen

Implemented in `frontend/src/pages/AnalyticsPage.tsx`.

Features and uses:

- Live 24-hour, last 7 days, and monthly period controls.
- Average queue wait KPI.
- Gate utilization KPI.
- Reroutes triggered KPI.
- Fuel and CO2 savings display.
- Slot adherence KPI.
- Gate congestion heatmap.
- Actual versus AI-predicted turnaround chart.
- Queue depth and throughput chart.
- Reroute impact comparison chart.
- Policy engine status panel.
- Export telemetry UI.
- Tune weights and Monte Carlo simulation UI.

The charts use ECharts and now load from the backend chart endpoints when available, with a visual loading state and a toast error when chart data cannot be retrieved. KPI cards are populated from `GET /api/analytics/kpis`.

## 3. Backend API Features

### 3.1 System endpoints

Implemented in `backend/app/main.py`.

- `GET /` - returns API welcome information, documentation path, and health path.
- `GET /healthz` - returns service status, application name, version, and AWS region.
- `GET /docs` - FastAPI interactive API documentation.
- `GET /openapi.json` - generated OpenAPI specification.

### 3.2 Authentication endpoints

Implemented in `backend/app/routers/auth.py`.

- `POST /api/auth/signup` - registers a user through Cognito or returns a simulated demo registration.
- `POST /api/auth/login` - authenticates through Cognito or returns simulated demo tokens.
- `POST /api/auth/refresh` - refreshes access and ID tokens through Cognito or the demo fallback.
- `GET /api/auth/me` - returns the currently authenticated Cognito claims or development user.

The backend authentication dependency supports:

- Bearer-token extraction.
- Cognito JWKS retrieval and caching.
- JWT signature and issuer validation.
- Expiration and audience validation.
- Development fallback users.
- Role and group checks through `require_role()`.

Analytics, GIS, maps, operations, notifications, fleet reads, and state-changing fleet/slot actions now require authenticated users. Role guards restrict booking, cancellation, rescheduling, telemetry, and reroute actions.

### 3.3 Fleet and telemetry endpoints

Implemented in `backend/app/routers/fleet.py`.

- `GET /api/fleet/trucks` - returns all seeded trucks.
- `GET /api/fleet/trucks/{truck_id}` - returns one truck.
- `POST /api/fleet/trucks/{truck_id}/telemetry` - updates live truck telemetry.
- `POST /api/fleet/trucks/{truck_id}/reroute` - marks a truck as in transit and returns a reroute instruction.

Telemetry update behavior:

1. Finds the requested truck.
2. Updates latitude, longitude, speed, heading, fuel, and reefer temperature.
3. Commits the changes to the database.
4. Evaluates the position against congestion hotspots.
5. Publishes an SNS reroute alert when required.
6. Returns the reroute evaluation to the caller.

### 3.4 Slot endpoints

Implemented in `backend/app/routers/slots.py`.

- `GET /api/slots` - lists slots and optionally filters by gate and date.
- `GET /api/slots/congestion` - returns congestion information for all four gates.
- `POST /api/slots/ai-suggest` - recommends an available slot near a preferred time.
- `POST /api/slots/book` - creates a booked slot and sends a notification.
- `PUT /api/slots/{slot_id}/reschedule` - changes a slot time and marks it rescheduled.
- `DELETE /api/slots/{slot_id}` - removes a slot.

The booking request supports gate, date, time, truck plate, driver, phone, cargo, container number, and dwell estimate.

### 3.5 Operations endpoints

Implemented in `backend/app/routers/operations.py`.

- `GET /api/operations/containers` - returns seeded yard container inventory.
- `GET /api/operations/shipments` - returns seeded multimodal shipment records.

Container data includes container number, ISO code, status, yard location, weight, cargo type, and seal number.

Shipment data includes tracking number, origin, destination, status, carrier, assigned truck, and ETA.

### 3.6 Analytics endpoints

Implemented in `backend/app/routers/analytics.py`.

- `GET /api/analytics/kpis` - returns port performance KPIs.
- `GET /api/analytics/fuel-savings` - calculates fuel, cost, and emissions for a trip.
- `GET /api/analytics/charts/congestion-heatmap` - returns hourly gate congestion data.
- `GET /api/analytics/charts/turnaround` - returns actual and predicted turnaround series.
- `GET /api/analytics/charts/queue-depth` - returns queue depth and throughput series.
- `GET /api/analytics/charts/reroute-impact` - returns before/after reroute comparisons.
- `GET /api/analytics/telemetry-stats` - returns aggregate fleet telemetry statistics.
- `POST /api/analytics/simulate` - runs the rate-limited Monte Carlo queue simulation.

The KPI response includes queue wait, gate utilization, reroutes, fuel savings, CO2 savings, slot adherence, active truck count, and turnaround comparison.

### 3.7 GIS endpoint

Implemented in `backend/app/routers/gis.py`.

- `GET /api/gis/layers` - returns a GeoJSON-style collection of the VOC Port boundary, terminal zones, and gates.
- `GET /api/gis/gates` - returns gate IDs, coordinates, queue counts, wait times, and statuses.

### 3.8 User preferences and notifications

Implemented in `backend/app/routers/settings.py` and `backend/app/routers/notifications.py`.

- `GET /api/settings` - loads the authenticated user's settings.
- `PUT /api/settings` - persists theme, tutorial, notification, map, zoom, unit, and preference values.
- `GET /api/notifications` - lists terminal notifications.
- `POST /api/notifications/{id}/read` - marks an individual notification as read.

### 3.9 Map proxy endpoints

Implemented in:

- `backend/app/routers/maps.py`
- `backend/app/services/google_maps.py`

Endpoints:

- `POST /api/maps/directions` - calculates a route through supplied latitude/longitude waypoints.
- `GET /api/maps/geocode` - resolves an address into coordinates.
- `GET /api/maps/places/autocomplete` - searches for port terminals and locations.
- `GET /api/maps/places/{place_id}` - resolves a place ID through the live or simulated lookup.
- `POST /api/maps/distance-matrix` - compares distances and ETAs for multiple origins and destinations.

When `GOOGLE_MAPS_SERVER_API_KEY` is absent, the service returns simulated Thoothukudi data. Directions and geocoding responses are cached for five minutes.

### 3.9 Telemetry WebSocket

Implemented in `backend/app/main.py`.

- `WS /ws/telemetry` - accepts JSON telemetry messages and broadcasts them to all connected clients.

The server broadcasts typed messages in these forms:

```json
{
        "type": "truck_update",
        "data": {}
}
```

The server also emits periodic `stats` messages. Incoming telemetry messages are persisted and evaluated by the rerouter. The frontend reconnects with exponential backoff and exposes connection health in the top bar and fleet view.

## 4. Logistics Decision Services

### 4.1 AI slot allocator

Implemented in `backend/app/services/slot_allocator.py`.

Uses:

- Booked-slot counts.
- Total-slot counts.
- Utilization percentage.
- Estimated queue length.
- Estimated waiting time.
- Congestion score.
- Available-slot lookup near a preferred time.

The current implementation is a rule-based and simulated allocator. Savings and turnaround improvement values include randomized estimates; it is not a trained machine-learning model.

### 4.2 Live rerouter

Implemented in `backend/app/services/rerouter.py`.

Uses:

- Haversine distance calculation.
- Two hard-coded Thoothukudi-area congestion hotspots.
- Configured hotspot radius.
- Alternate-route recommendation.
- Delay avoidance estimate.
- Fuel and carbon reduction estimate.

The service returns a reroute recommendation when a truck enters a hotspot radius.

### 4.3 Fuel and emissions model

Implemented in `backend/app/services/fuel_model.py`.

The model calculates:

- Rolling resistance.
- Aerodynamic drag.
- Driving fuel consumption.
- Idle queue fuel consumption.
- Total fuel consumption.
- CO2 emissions.
- Estimated diesel cost.
- Fuel economy.

The model uses truck mass, payload, distance, average speed, idle time, diesel energy density, engine efficiency, and an INR fuel price.

## 5. Database and Seed Data

Implemented in:

- `backend/app/db.py`
- `backend/app/seed.py`
- `backend/app/models/`

Default database:

```text
SQLite: ./logisync.db
```

Models:

- `TruckModel` - fleet identity, location, status, driver, fuel, reefer, destination, gate, and ETA.
- `SlotModel` - gate, date, time, booking status, truck, driver, cargo, container, dwell estimate, and rescheduling state.
- `ContainerModel` - container identity, ISO code, yard location, weight, cargo, and seal.
- `ShipmentModel` - tracking number, origin, destination, carrier, status, assigned truck, and ETA.
- `AuditModel` - event type, user, event details, IP address, and timestamp.

Startup seeding creates:

- 24 trucks.
- Four groups of gate slots.
- 14 containers.
- Nine shipments.

Seeding is skipped when trucks already exist in the database.

## 6. Notifications and AWS Integrations

### AWS SNS

Implemented in `backend/app/services/sns_notifier.py`.

Uses:

- Slot booking confirmation messages.
- Reroute alerts.
- Direct SMS when a phone number is supplied.
- Topic publishing when an SNS topic ARN is configured.
- Simulated message responses when AWS credentials are absent.

### AWS Cognito

Implemented in `backend/app/services/cognito.py` and `backend/app/dependencies.py`.

Uses:

- User registration.
- Password authentication.
- JWT token issuance.
- Cognito JWKS validation.
- User groups and role claims.

### AWS CloudWatch

Implemented in `backend/app/services/cloudwatch.py` and `deploy/cloudwatch-agent-config.json`.

Uses:

- Custom metric publishing adapter.
- Structured application log collection.
- Nginx access log collection.
- API error log collection.
- EC2 CPU, memory, and disk monitoring configuration.

The CloudWatch service is available, but operational routes do not currently publish business metrics through it.

## 7. Middleware and Security Features

Implemented in `backend/app/middleware/`.

### Security headers

The backend adds:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection`
- `Strict-Transport-Security`
- `Referrer-Policy`
- `Permissions-Policy`
- Content Security Policy

### Request logging

The logging middleware records:

- Request ID.
- HTTP method.
- Request path.
- Response status code.
- Request duration.
- Client IP.
- Authenticated user ID when available.

It also adds `X-Request-ID` to every response.

### Rate limiting

The SlowAPI limiter provides an IP-based default limit of 100 requests per minute and a custom 429 response. The configuration also defines an AI limit, but individual AI routes do not currently apply a separate limiter decorator.

### CORS

Allowed origins are configured for local frontend development on ports 5173 and 3000, with environment-based settings support.

## 8. Deployment Features

Implemented in `deploy/`.

### EC2 setup

`deploy/ec2-setup.sh` installs and configures:

- Ubuntu packages.
- Python 3.11.
- Node.js 20.
- Nginx.
- Certbot.
- AWS CLI.
- CloudWatch Agent.
- UFW firewall.
- Fail2ban.
- Unattended upgrades.
- Dedicated non-root `logisync` service user.

### Systemd service

`deploy/logisync.service` runs Uvicorn with multiple workers and automatic restart behavior.

### Nginx reverse proxy

`deploy/nginx.conf` provides:

- HTTP-to-HTTPS redirect.
- TLS configuration.
- React SPA fallback.
- Static asset caching.
- `/api/` proxying to FastAPI.
- `/ws/` WebSocket proxying.
- Health and documentation proxying.

### CloudWatch agent

The deployment configuration collects application logs, Nginx logs, EC2 CPU metrics, memory usage, and disk usage.

## 9. Implemented Test Coverage

Tests are located in `backend/tests/test_api.py`.

Covered behavior:

- Health endpoint response.
- Security headers.
- Four-gate congestion matrix.
- AI slot suggestion response.
- Reroute detection near a hotspot.
- Fuel, CO2, and cost calculations.

## 10. Remaining Integration Boundaries

The following features exist in the codebase but are not fully connected end to end:

- Some detailed mission metadata remains synthesized by the backend serializer because the current truck table does not store full route geometry.
- Some page controls remain presentation-only, including policy weight editing and several map overlay controls.
- Fleet retains a local visual fallback when the backend cannot be reached.
- The frontend does not yet proactively refresh Cognito tokens before expiry.
- Audit coverage is strongest for booking, cancellation, rescheduling, rerouting, and settings changes; login/logout/export audit events are not yet fully wired.
- CloudWatch metric adapter exists, but API error-rate aggregation and export metrics are not yet fully automated.
- Slot AI recommendations use database lookup and randomized estimates rather than a trained AI model.
- The frontend map uses Leaflet rather than the Google Maps JavaScript API described in the design document.

These boundaries describe the current implementation state and can be used as the next integration roadmap.
