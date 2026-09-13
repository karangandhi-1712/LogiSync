"""Phase 3: Real-Time Telemetry Streaming & Multi-Modal Simulation Broadcaster.

Provides:
- WebSocket `/api/telemetry/ws` for high-frequency live digital twin telemetry.
- Multi-modal physics animator moving Cargo Ships along Gulf of Mannar sea lanes, Freight Trains along Southern Railway tracks, and Interstate Trucks along NH-44 / SH-176 highways.
- REST ingestion `/api/telemetry/event` for external IoT sensors / RFID reads.
"""
import asyncio
import json
import math
import time
from typing import List, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from .entities import trucks_store, vessels_store, trains_store, equipment_store

router = APIRouter(prefix="/api/telemetry", tags=["phase3-telemetry"])

# 1. Authentic OSM SH-176 / NH-44 Highway North Corridor into MMLP Complex
WAYPOINTS_HIGHWAY_NORTH = [
    [78.140979, 8.785231], # SH-176 North Entry (Madurai/Chennai NH-44 feeder)
    [78.140880, 8.784516],
    [78.140540, 8.782629],
    [78.140076, 8.780837],
    [78.139555, 8.779091],
    [78.139251, 8.778072],
    [78.138883, 8.776892],
    [78.138569, 8.776312],
    [78.137841, 8.775751],
    [78.137762, 8.775689],
    [78.136139, 8.774456],
    [78.135876, 8.774170],
    [78.135640, 8.773855],
    [78.135527, 8.773677],
    [78.134387, 8.771648],
    [78.134199, 8.770877],
    [78.133657, 8.767942],
    [78.133363, 8.766227],
    [78.133115, 8.765367],
    [78.136854, 8.762911], # Arterial link into MMLP
    [78.136800, 8.762400], # Gate 1 Complex
    [78.137000, 8.761800], # 80t Weighbridge
    [78.137200, 8.762000], # Yard Block A
    [78.137400, 8.762300], # Export Staging Bay
]

# 2. Highway West Arterial (NH-38 / NH-744 from Bengaluru / Kerala / Hyderabad)
WAYPOINTS_HIGHWAY_WEST = [
    [78.105000, 8.775000], # NH-38 West Arterial Entry
    [78.112000, 8.773500],
    [78.118000, 8.771000],
    [78.124000, 8.768500],
    [78.129000, 8.766500],
    [78.133115, 8.765367],
    [78.136854, 8.762911],
    [78.136800, 8.762400], # Gate 1
    [78.137200, 8.762000], # Yard Block A
]

# 3. Port Access Expressway (VOC Port Wharf to MMLP Central Depot)
WAYPOINTS_PORT_EXPRESSWAY = [
    [78.165000, 8.752000], # VOC Port Container Berth Wharf Gate 3
    [78.152904, 8.758614],
    [78.152673, 8.758747],
    [78.152366, 8.758804],
    [78.150839, 8.759030],
    [78.148888, 8.759323],
    [78.147702, 8.759536],
    [78.147417, 8.759569],
    [78.146843, 8.759664],
    [78.144827, 8.759992],
    [78.143460, 8.760208],
    [78.142903, 8.760335],
    [78.142072, 8.760600],
    [78.141278, 8.760940],
    [78.139697, 8.761800],
    [78.137630, 8.762891],
    [78.137270, 8.763049],
    [78.136800, 8.762400], # Gate 1
    [78.135800, 8.761900], # Central Warehouse WH-01
]

# 4. SIPCOT Industrial Hazmat Bypass
WAYPOINTS_SIPCOT_HAZMAT = [
    [78.128000, 8.772000], # SIPCOT Complex
    [78.130000, 8.768500],
    [78.133000, 8.765000],
    [78.136800, 8.762400],
    [78.137200, 8.761000], # Yard Block D (Hazmat Isolation)
]

# 5. South Coastal Logistics Road (Marine Fisheries & Salt Pans)
WAYPOINTS_SOUTH_COASTAL = [
    [78.155000, 8.735000], # Fishery Harbour & Salt Pan Hub
    [78.148000, 8.745000],
    [78.142000, 8.755000],
    [78.138500, 8.762400],
    [78.137000, 8.761800],
    [78.135800, 8.761900], # Cold-Chain WH-02
]

# 6. Internal Electric AGV Shuttle Route
WAYPOINTS_INTERNAL_SHUTTLE = [
    [78.137200, 8.762000],
    [78.136900, 8.762800],
    [78.136500, 8.763800],
    [78.136000, 8.764500], # Rail Siding S1
    [78.136500, 8.763800],
    [78.136900, 8.762800],
    [78.137200, 8.762000]
]

# 7. Authentic Southern Railway Mainline & MMLP Intermodal Rail Track
WAYPOINTS_RAILWAY_CORRIDOR = [
    [78.108799, 8.780506], # Southern Railway Mainline Approach
    [78.109810, 8.778576],
    [78.110883, 8.777362],
    [78.112788, 8.776283],
    [78.115477, 8.774820],
    [78.117875, 8.773544],
    [78.121226, 8.771734],
    [78.123583, 8.770472],
    [78.125894, 8.769228],
    [78.128518, 8.767811],
    [78.129583, 8.767230],
    [78.133000, 8.765800],
    [78.136000, 8.764500], # MMLP Siding 1 (Track 1)
    [78.135800, 8.762500],
    [78.135500, 8.760000]  # Rail RMG Gantry Container Bay
]

# 8. Gulf of Mannar Deepwater Navigation Channel into VOC Port Berths
WAYPOINTS_SEA_NAVIGATION_CHANNEL = [
    [78.235000, 8.728000], # Open Sea Shipping Lane
    [78.220000, 8.733000],
    [78.205000, 8.738500],
    [78.192000, 8.743500],
    [78.181000, 8.747500], # Port Outer Breakwater Channel
    [78.172000, 8.750500], # Turning Basin
    [78.165000, 8.752000]  # VOC Port Berth 8 Container Wharf
]

# 9. VOC Port Inner Basin & Tug Fairway
WAYPOINTS_PORT_INNER_BASIN = [
    [78.181000, 8.747500],
    [78.176000, 8.749000],
    [78.170000, 8.751000],
    [78.165000, 8.752000]
]


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)
        for dc in dead_connections:
            self.disconnect(dc)

manager = ConnectionManager()

# Global animation state
_sim_step = 0

def _calculate_polyline_lengths(pts):
    lengths = []
    total = 0.0
    for i in range(len(pts) - 1):
        p1, p2 = pts[i], pts[i+1]
        dist = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
        lengths.append(dist)
        total += dist
    return lengths, total


def _get_polyline_position(pts, lengths, total_len, progress_pct):
    """Accurate Google Maps style progress navigation along multi-segment polyline."""
    target_dist = (progress_pct % 1.0) * total_len
    accum = 0.0
    for i, seg_len in enumerate(lengths):
        if accum + seg_len >= target_dist or i == len(lengths) - 1:
            seg_alpha = (target_dist - accum) / seg_len if seg_len > 0 else 0.0
            p1 = pts[i]
            p2 = pts[i + 1]
            lon = p1[0] + (p2[0] - p1[0]) * seg_alpha
            lat = p1[1] + (p2[1] - p1[1]) * seg_alpha

            # Forward Tangent Bearing
            d_lon = math.radians(p2[0] - p1[0])
            lat1 = math.radians(p1[1])
            lat2 = math.radians(p2[1])
            y = math.sin(d_lon) * math.cos(lat2)
            x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(d_lon)
            bearing = (math.degrees(math.atan2(y, x)) + 360) % 360
            return lon, lat, bearing, i
        accum += seg_len
    return pts[-1][0], pts[-1][1], 0.0, len(lengths) - 1


# Pre-calculate polyline lengths
_LEN_HW_N, _TOT_HW_N = _calculate_polyline_lengths(WAYPOINTS_HIGHWAY_NORTH)
_LEN_HW_W, _TOT_HW_W = _calculate_polyline_lengths(WAYPOINTS_HIGHWAY_WEST)
_LEN_PORT, _TOT_PORT = _calculate_polyline_lengths(WAYPOINTS_PORT_EXPRESSWAY)
_LEN_SIPCOT, _TOT_SIPCOT = _calculate_polyline_lengths(WAYPOINTS_SIPCOT_HAZMAT)
_LEN_COAST, _TOT_COAST = _calculate_polyline_lengths(WAYPOINTS_SOUTH_COASTAL)
_LEN_AGV, _TOT_AGV = _calculate_polyline_lengths(WAYPOINTS_INTERNAL_SHUTTLE)
_LEN_RAIL, _TOT_RAIL = _calculate_polyline_lengths(WAYPOINTS_RAILWAY_CORRIDOR)
_LEN_SEA, _TOT_SEA = _calculate_polyline_lengths(WAYPOINTS_SEA_NAVIGATION_CHANNEL)
_LEN_BASIN, _TOT_BASIN = _calculate_polyline_lengths(WAYPOINTS_PORT_INNER_BASIN)


def update_live_telemetry_step():
    """Advances multi-modal vehicles smoothly along authentic OSM road, rail, and sea paths across wide corridors."""
    global _sim_step
    _sim_step += 1

    # 1. Animate Multi-Corridor Interstate Fleet
    for i, t in enumerate(trucks_store):
        corridor = t.get("corridor_id", "")
        route_type = t.get("route_type", "")

        if t["id"] == "TRK-TN-103" or "AGV" in corridor: # AGV Shuttle
            progress = ((_sim_step * 0.015) + (i * 0.2)) % 1.0
            lon, lat, hdg, seg_idx = _get_polyline_position(WAYPOINTS_INTERNAL_SHUTTLE, _LEN_AGV, _TOT_AGV, progress)
            t["longitude"] = round(lon, 6)
            t["latitude"] = round(lat, 6)
            t["heading"] = round(hdg, 1)
            t["speed_kmh"] = 22.0
            t["status"] = "MOVING_TO_YARD"
        elif "WEST" in corridor or "WEST" in route_type: # NH-38 West Arterial (KA, KL, TS)
            progress = ((_sim_step * 0.009) + (i * 0.16)) % 1.0
            lon, lat, hdg, seg_idx = _get_polyline_position(WAYPOINTS_HIGHWAY_WEST, _LEN_HW_W, _TOT_HW_W, progress)
            t["longitude"] = round(lon, 6)
            t["latitude"] = round(lat, 6)
            t["heading"] = round(hdg, 1)
            t["speed_kmh"] = 46.0 if seg_idx < len(_LEN_HW_W) - 2 else 15.0
            t["status"] = "INBOUND_HIGHWAY" if seg_idx < len(_LEN_HW_W) - 2 else "GATE_PROCESSING"
        elif "PORT" in corridor or "PORT" in route_type: # Port Expressway
            progress = ((_sim_step * 0.011) + (i * 0.15)) % 1.0
            lon, lat, hdg, seg_idx = _get_polyline_position(WAYPOINTS_PORT_EXPRESSWAY, _LEN_PORT, _TOT_PORT, progress)
            t["longitude"] = round(lon, 6)
            t["latitude"] = round(lat, 6)
            t["heading"] = round(hdg, 1)
            t["speed_kmh"] = 40.0 if seg_idx < len(_LEN_PORT) - 2 else 12.0
            t["status"] = "PORT_TRANSIT" if seg_idx < len(_LEN_PORT) - 2 else "DOCK_UNLOADING"
        elif "SIPCOT" in corridor or "HAZMAT" in route_type: # Chemical Hazmat Bypass
            progress = ((_sim_step * 0.01) + (i * 0.22)) % 1.0
            lon, lat, hdg, seg_idx = _get_polyline_position(WAYPOINTS_SIPCOT_HAZMAT, _LEN_SIPCOT, _TOT_SIPCOT, progress)
            t["longitude"] = round(lon, 6)
            t["latitude"] = round(lat, 6)
            t["heading"] = round(hdg, 1)
            t["speed_kmh"] = 35.0 if seg_idx < len(_LEN_SIPCOT) - 1 else 0.0
            t["status"] = "INBOUND_HIGHWAY" if seg_idx < len(_LEN_SIPCOT) - 1 else "YARD_STACKING"
        elif "SOUTH" in corridor or "COASTAL" in route_type: # South Coastal Fisheries Road
            progress = ((_sim_step * 0.009) + (i * 0.18)) % 1.0
            lon, lat, hdg, seg_idx = _get_polyline_position(WAYPOINTS_SOUTH_COASTAL, _LEN_COAST, _TOT_COAST, progress)
            t["longitude"] = round(lon, 6)
            t["latitude"] = round(lat, 6)
            t["heading"] = round(hdg, 1)
            t["speed_kmh"] = 38.0 if seg_idx < len(_LEN_COAST) - 2 else 10.0
            t["status"] = "INBOUND_TRANSIT" if seg_idx < len(_LEN_COAST) - 2 else "WEIGHBRIDGE_MEASURING"
        else: # SH-176 North Highway Inbound Corridor (MH, DL, AP, HR, TN)
            progress = ((_sim_step * 0.008) + (i * 0.12)) % 1.0
            lon, lat, hdg, seg_idx = _get_polyline_position(WAYPOINTS_HIGHWAY_NORTH, _LEN_HW_N, _TOT_HW_N, progress)
            t["longitude"] = round(lon, 6)
            t["latitude"] = round(lat, 6)
            t["heading"] = round(hdg, 1)
            t["speed_kmh"] = 48.0 if seg_idx < len(_LEN_HW_N) - 4 else (15.0 if seg_idx < len(_LEN_HW_N) - 2 else 0.0)
            t["status"] = "INBOUND_HIGHWAY" if seg_idx < len(_LEN_HW_N) - 4 else ("WEIGHBRIDGE_MEASURING" if seg_idx == len(_LEN_HW_N) - 3 else "YARD_STACKING")

    # 2. Animate Cargo Ships & Tugs along Gulf of Mannar Navigation Fairways
    for j, v in enumerate(vessels_store):
        is_inner = "INNER" in v.get("corridor_id", "") or "Tug" in v.get("vessel_name", "")
        pts = WAYPOINTS_PORT_INNER_BASIN if is_inner else WAYPOINTS_SEA_NAVIGATION_CHANNEL
        lens = _LEN_BASIN if is_inner else _LEN_SEA
        tot = _TOT_BASIN if is_inner else _TOT_SEA
        speed_factor = 0.008 if is_inner else 0.004

        progress_sea = ((_sim_step * speed_factor) + (j * 0.28)) % 1.0
        lon_v, lat_v, hdg_v, seg_v = _get_polyline_position(pts, lens, tot, progress_sea)
        v["longitude"] = round(lon_v, 6)
        v["latitude"] = round(lat_v, 6)
        v["heading"] = round(hdg_v, 1)
        v["speed_knots"] = round(14.5 - seg_v * 1.5, 1) if seg_v < len(lens) - 1 else 0.0
        v["status"] = "APPROACHING_PORT_CHANNEL" if seg_v < 2 else ("PILOT_BOARDED" if seg_v < len(lens) - 1 else "BERTHED_UNLOADING")

    # 3. Animate Freight Trains along Southern Railway Mainline & Siding
    for k, tr in enumerate(trains_store):
        progress_rail = ((_sim_step * 0.006) + (k * 0.4)) % 1.0
        lon_tr, lat_tr, hdg_tr, seg_tr = _get_polyline_position(WAYPOINTS_RAILWAY_CORRIDOR, _LEN_RAIL, _TOT_RAIL, progress_rail)
        tr["longitude"] = round(lon_tr, 6)
        tr["latitude"] = round(lat_tr, 6)
        tr["heading"] = round(hdg_tr, 1)
        tr["speed_kmh"] = round(52.0 - seg_tr * 3.5, 1) if seg_tr < len(_LEN_RAIL) - 1 else 0.0
        tr["status"] = "INBOUND_MAINLINE" if seg_tr < 5 else ("APPROACHING_MMLP_SIDING" if seg_tr < len(_LEN_RAIL) - 1 else "RAIL_GANTRY_UNLOADING")

    # 4. Crane status oscillation
    for eq in equipment_store:
        if eq["equipment_type"] == "RTG_CRANE":
            eq["status"] = "LIFTING" if (_sim_step % 6) < 3 else "IDLE"
        elif eq["equipment_type"] == "RMG_RAIL_CRANE":
            eq["status"] = "MOVING" if (_sim_step % 8) < 4 else "LIFTING"


class TelemetryEvent(BaseModel):
    event_type: str
    device_id: str
    payload: Dict[str, Any]


@router.post("/event")
async def ingest_telemetry_event(event: TelemetryEvent):
    """REST endpoint for IoT gateways, RFID scanners, and weighbridge scales."""
    packet = {
        "type": "IOT_EVENT",
        "event_type": event.event_type,
        "device_id": event.device_id,
        "payload": event.payload,
        "timestamp": time.time()
    }
    await manager.broadcast(packet)
    return {"status": "INGESTED", "packet": packet}


@router.websocket("/ws")
async def telemetry_websocket(websocket: WebSocket):
    """WebSocket feed for the React 3D Digital Twin frontend with full Multi-Modal Telemetry."""
    await manager.connect(websocket)
    try:
        while True:
            update_live_telemetry_step()
            telemetry_snapshot = {
                "type": "TELEMETRY_STREAM",
                "timestamp": time.time(),
                "sim_step": _sim_step,
                "trucks": trucks_store,
                "vessels": vessels_store,
                "trains": trains_store,
                "equipment": equipment_store,
                "gate_queues": {
                    "gate_01_inbound": 1 if (_sim_step % 10) < 5 else 2,
                    "gate_02_rail": 1,
                    "gate_03_port": 1
                }
            }
            await websocket.send_json(telemetry_snapshot)
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

