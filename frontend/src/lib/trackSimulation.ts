/**
 * ─── Live tracking kinematics ────────────────────────────────────────────────
 *
 * The backend pushes discrete driver positions over the event socket (a handful
 * per second at best, realistically a few per minute). Dropping those straight
 * onto a Leaflet marker makes the truck teleport, which reads as "broken" rather
 * than "live". This module turns that stream into continuous motion.
 *
 * Two modes, picked automatically:
 *
 *   real       - the driver is actually transmitting. Each new ping becomes a
 *                target and a rAF loop eases the marker toward it over ~1.5s.
 *   simulated  - nothing real has arrived for `STALE_AFTER_MS` while the parcel
 *                is on the move. We walk the vehicle along the optimised route
 *                polyline at a plausible urban speed so the customer still sees
 *                their delivery progress. Callers must surface this in the UI;
 *                a synthetic position that looks real is worse than no position.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

/** How long a real position stays authoritative before we consider it stale. */
export const STALE_AFTER_MS = 20_000;

/** A real ping is eased into over this long, so the marker glides. */
const GLIDE_MS = 1500;

/** Urban last-mile average, km/h, used only by the simulated mode. */
const SIM_SPEED_KMH = 25;

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from `a` to `b`, in degrees clockwise from north. */
export function bearing(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/** Shortest signed angular delta between two headings, in degrees. */
function headingDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

export interface PolylineIndex {
  line: LatLng[];
  /** Cumulative km at each vertex, so distance lookups are O(1) after build. */
  cum: number[];
  totalKm: number;
}

export function buildPolylineIndex(polyline: [number, number][] | null | undefined): PolylineIndex | null {
  const line = (polyline ?? []).map(([lat, lng]) => ({ lat, lng }));
  if (line.length < 2) return null;

  const cum = [0];
  for (let i = 1; i < line.length; i += 1) {
    cum.push(cum[i - 1] + haversineKm(line[i - 1], line[i]));
  }
  return { line, cum, totalKm: cum[cum.length - 1] };
}

/** Point `km` along the indexed polyline. */
export function pointAtKm(idx: PolylineIndex, km: number): LatLng {
  const target = Math.max(0, Math.min(idx.totalKm, km));

  // Binary search for the segment containing `target`.
  let lo = 0;
  let hi = idx.cum.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (idx.cum[mid] <= target) lo = mid;
    else hi = mid;
  }
  const segStart = idx.cum[lo];
  const segLen = idx.cum[lo + 1] - segStart;
  const t = segLen > 0 ? (target - segStart) / segLen : 0;
  const a = idx.line[lo];
  const b = idx.line[lo + 1];
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

/**
 * Nearest point on the polyline to `p`, as a distance along the route.
 * Used to work out where a real driver ping actually sits on the planned path.
 */
export function nearestKmOnPolyline(idx: PolylineIndex, p: LatLng): number {
  let best = 0;
  let bestKm = Number.POSITIVE_INFINITY;
  for (let i = 1; i < idx.line.length; i += 1) {
    const candidate = pointAtKm(idx, idx.cum[i - 1]);
    const d = haversineKm(candidate, p);
    if (d < bestKm) {
      bestKm = d;
      best = idx.cum[i - 1];
    }
  }
  return best;
}

export type TrackMode = 'idle' | 'real' | 'simulated';

export interface TrackerState {
  mode: TrackMode;
  position: LatLng | null;
  heading: number | null;
  /** Distance already covered along the route, for ETA maths. */
  progressKm: number | null;
}

/**
 * Drives a continuously-moving marker from real pings, with a synthetic fallback.
 *
 * Instantiate one per tracking page, drive it from a rAF loop, and release it on
 * unmount. It deliberately owns no React state - call `getState()` inside the
 * frame loop and push straight to the Leaflet marker, so 60fps motion never
 * triggers a re-render.
 */
export class DeliveryTracker {
  private route: PolylineIndex | null;
  private position: LatLng | null = null;
  private heading: number | null = null;

  /** Where the marker is heading right now (a real ping, or the glide target). */
  private target: LatLng | null = null;
  private targetHeading: number | null = null;
  private glideStart = 0;
  private glideFromLat: number | null = null;
  private glideFromLng: number | null = null;
  private glideFromHeading: number | null = null;

  private lastRealAt: number | null = null;
  private simProgressKm = 0;
  private mode: TrackMode = 'idle';

  /** Endpoint of the optimised route, where the simulated walk finishes. */
  private destination: LatLng | null = null;

  constructor(options: { polyline?: [number, number][] | null; destination?: LatLng | null }) {
    this.route = buildPolylineIndex(options.polyline);
    this.destination = options.destination ?? this.route?.line[this.route.line.length - 1] ?? null;
  }

  getState(): TrackerState {
    return {
      mode: this.mode,
      position: this.position ? { ...this.position } : null,
      heading: this.heading,
      progressKm:
        this.route && this.position
          ? nearestKmOnPolyline(this.route, this.position)
          : null,
    };
  }

  /** Seed from a snapshot (page load) so the map is never empty on first paint. */
  seed(position: LatLng | null, heading: number | null = null): void {
    if (!position) return;
    this.position = { ...position };
    this.target = { ...position };
    this.heading = heading;
    this.targetHeading = heading;
    // `tick()` receives requestAnimationFrame's performance clock, so keep
    // telemetry timestamps in that same monotonic time domain.
    this.lastRealAt = performance.now();
    this.mode = 'real';

    if (this.route) {
      this.simProgressKm = nearestKmOnPolyline(this.route, position);
    }
  }

  /** Feed a real driver position. Flips the tracker out of simulated mode. */
  pushReal(position: LatLng, heading: number | null = null): void {
    this.lastRealAt = performance.now();
    this.mode = 'real';

    if (!this.position) {
      this.seed(position, heading);
      return;
    }
    this.beginGlide(position, heading);
    if (this.route) {
      this.simProgressKm = nearestKmOnPolyline(this.route, position);
    }
  }

  /**
   * Called once per frame. Returns true when something moved, so the caller can
   * skip the Leaflet `setLatLng` on frames where nothing changed.
   */
  tick(now: number): boolean {
    if (this.shouldSimulate(now)) {
      return this.tickSimulated(now);
    }
    return this.tickGlide(now);
  }

  /** True when real telemetry has gone quiet but the parcel is still moving. */
  private shouldSimulate(now: number): boolean {
    if (this.mode === 'idle') return false;
    if (!this.route || !this.destination) return false;
    if (this.position && haversineKm(this.position, this.destination) < 0.05) return false;
    return this.lastRealAt != null && now - this.lastRealAt > STALE_AFTER_MS;
  }

  private tickSimulated(now: number): boolean {
    const route = this.route;
    if (!route) return false;

    const wasSimulated = this.mode === 'simulated';
    this.mode = 'simulated';

    const dt = this.simPrevAt == null ? 0 : (now - this.simPrevAt) / 1000;
    this.simPrevAt = now;

    // On the first simulated frame, jump onto the route rather than starting from
    // wherever the last real ping happened to be.
    if (!wasSimulated || !this.position) {
      const start = this.position
        ? nearestKmOnPolyline(route, this.position)
        : 0;
      this.simProgressKm = Math.max(this.simProgressKm, start);
      const p = pointAtKm(route, this.simProgressKm);
      this.position = p;
      this.target = p;
      const ahead = pointAtKm(route, Math.min(route.totalKm, this.simProgressKm + 0.05));
      this.heading = bearing(p, ahead);
      this.targetHeading = this.heading;
      return true;
    }

    if (dt <= 0) return false;
    this.simProgressKm = Math.min(route.totalKm, this.simProgressKm + SIM_SPEED_KMH * dt / 3600);
    const p = pointAtKm(route, this.simProgressKm);
    if (this.position && haversineKm(this.position, p) < 1e-6) return false;

    this.position = p;
    const ahead = pointAtKm(route, Math.min(route.totalKm, this.simProgressKm + 0.05));
    this.heading = bearing(p, ahead);
    return true;
  }

  private simPrevAt: number | null = null;

  private tickGlide(now: number): boolean {
    if (!this.target || this.glideFromLat == null || this.glideFromLng == null) return false;

    const t = Math.min(1, (now - this.glideStart) / GLIDE_MS);
    // ease-out cubic: leaves the last ping promptly, settles gently on arrival.
    const e = 1 - Math.pow(1 - t, 3);

    const lat = this.glideFromLat + (this.target.lat - this.glideFromLat) * e;
    const lng = this.glideFromLng + (this.target.lng - this.glideFromLng) * e;
    this.position = { lat, lng };

    if (this.targetHeading != null && this.glideFromHeading != null) {
      this.heading = this.glideFromHeading + headingDelta(this.glideFromHeading, this.targetHeading) * e;
    }
    return true;
  }

  private beginGlide(next: LatLng, heading: number | null): void {
    const from = this.position;
    this.glideFromLat = from?.lat ?? next.lat;
    this.glideFromLng = from?.lng ?? next.lng;
    this.glideFromHeading = this.heading;
    this.glideStart = performance.now();
    this.target = { ...next };
    this.targetHeading = heading ?? (from ? bearing(from, next) : null);
  }
}

/** ETA as whole minutes from `remainingKm` at `speedKmh`. */
export function etaMinutes(remainingKm: number, speedKmh = SIM_SPEED_KMH): number | null {
  if (!Number.isFinite(remainingKm) || remainingKm <= 0) return 0;
  if (speedKmh <= 0) return null;
  return Math.max(1, Math.round((remainingKm / speedKmh) * 60));
}
