# Thoothukudi MMLP Digital Twin — data sources

> Rule: every external dataset gets an entry here with source, license,
> download date, version, attribution. Real infra coordinates unknown →
> values in `data/seed/` are tagged `SIMULATED` / `ESTIMATED`.

| Dataset | Source | License | Download date | Version | Attribution | Usage | Status |
|---|---|---|---|---|---|---|---|
| MMLP Real Infra Data (Phase 2) | OpenStreetMap / Overpass API (`https://lz4.overpass-api.de/api/interpreter`) | ODbL | 2026-09-09 | live | © OpenStreetMap contributors | `data/seed/real_*.geojson` | IMPLEMENTED |
| Base map tiles (Phase 1) | OpenStreetMap / Carto basemaps (`https://basemaps.cartocdn.com`, OSM data © OpenStreetMap contributors) | ODbL (data) / CC-BY (Carto style) | 2026-09-09 (referenced, not downloaded — loaded live in browser) | live | © OpenStreetMap contributors © CARTO | Frontend MapLibre basemap | IMPLEMENTED |
| MMLP boundary / gates / roads / warehouses / yards (Phase 1) | Hand-generated placeholder polygons around Thoothukudi Port vicinity for demo purposes | N/A (synthetic) | 2026-09-09 | v0.1-phase1 | N/A | `data/seed/*.geojson`, seeded into PostGIS + served via API | SIMULATED |
| Thoothukudi Port reference point (~8.75N, 78.20E) | Public knowledge / OpenStreetMap browsing context only, NOT surveyed | ODbL (OSM) | 2026-09-09 | n/a | © OpenStreetMap contributors | Map center only, not claimed as infra coordinate | ESTIMATED |

## Planned (not yet ingested — Phases 2–9)
- OpenTopoMap tiles (CC-BY-SA) — PLANNED
- Copernicus Sentinel / USGS Landsat imagery (free licenses, Phase 9 only) — PLANNED
- Government GIS datasets (to be listed when actually downloaded) — PLANNED
- OSRM / pgRouting routing on OSM extracts (ODbL) — PLANNED (Phase 6)
