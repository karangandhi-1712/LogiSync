from fastapi import APIRouter, Query, HTTPException, Body, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Set
import time
import random
import json

router = APIRouter(prefix="/api", tags=["phase3-operations"])
ws_router = APIRouter(tags=["phase3-websockets"])

# ==================== WEBSOCKET CONNECTION MANAGER ====================

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.connection_cities: Dict[WebSocket, Optional[str]] = {}
        self.total_packets_processed: int = 0
        self.last_packet_timestamp: float = time.time()

    async def connect(self, websocket: WebSocket, city: Optional[str] = None):
        await websocket.accept()
        self.active_connections.add(websocket)
        self.connection_cities[websocket] = city

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        self.connection_cities.pop(websocket, None)

    async def broadcast(self, message: Dict[str, Any], city: Optional[str] = None):
        self.total_packets_processed += 1
        self.last_packet_timestamp = time.time()
        dead_connections = []
        for connection in list(self.active_connections):
            target_city = self.connection_cities.get(connection)
            if target_city and city and target_city != city:
                continue
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)

        for dc in dead_connections:
            self.disconnect(dc)


telemetry_manager = ConnectionManager()

# Pydantic Schemas
class TruckSchema(BaseModel):
    id: str
    plate_number: str
    city_id: str = "thoothukudi"
    carrier: str = "MMLP Express Freight"
    truck_type: str = "container_chassis"
    status: str = "inbound"
    driver_name: str = "K. Raman"
    latitude: float
    longitude: float
    speed_kmh: float = 0.0
    heading: float = 0.0
    fuel_pct: float = 85.0
    temperature_c: float = 4.0
    assigned_mission: str = "Port Container Transfer"
    data_source: str = "LIVE_TELEMETRY"


class TruckCreateSchema(BaseModel):
    plate_number: str
    city_id: str = "thoothukudi"
    carrier: str = "MMLP Express Freight"
    truck_type: str = "container_chassis"
    status: str = "inbound"
    driver_name: str = "K. Raman"
    latitude: float
    longitude: float
    assigned_mission: str = "Port Container Transfer"


class ContainerSchema(BaseModel):
    id: str
    container_number: str
    city_id: str = "thoothukudi"
    iso_size: str = "40ft_HC"
    gross_weight_tonnes: float = 24.5
    contents: str = "Electronics & Assemblies"
    yard_zone_id: str = "YD-01"
    tier: int = 2
    dwell_hours: float = 14.5
    customs_status: str = "cleared"
    data_source: str = "SIMULATED"


class ContainerCreateSchema(BaseModel):
    container_number: str
    city_id: str = "thoothukudi"
    iso_size: str = "40ft_HC"
    gross_weight_tonnes: float = 24.5
    contents: str = "Electronics & Assemblies"
    yard_zone_id: str = "YD-01"
    tier: int = 1
    dwell_hours: float = 2.0
    customs_status: str = "cleared"


class ShipmentSchema(BaseModel):
    id: str
    tracking_code: str
    city_id: str = "thoothukudi"
    origin_name: str
    destination_name: str
    status: str = "in_transit"
    eta_minutes: int = 30
    priority: str = "standard"
    weight_tonnes: float = 20.0
    assigned_truck_id: Optional[str] = None
    data_source: str = "SIMULATED"


class TelemetryPacket(BaseModel):
    truck_id: str
    latitude: float
    longitude: float
    speed_kmh: float
    heading: Optional[float] = 0.0
    fuel_pct: Optional[float] = 85.0
    temperature_c: Optional[float] = 4.0
    engine_status: Optional[str] = "running"
    city_id: Optional[str] = None


class MqttPublishPayload(BaseModel):
    topic: str
    payload: Dict[str, Any]


# In-Memory Storage Initializer with City Support
INITIAL_TRUCKS: Dict[str, List[Dict[str, Any]]] = {
    "thoothukudi": [
        {
            "id": "trk-th-1",
            "plate_number": "TN-69-AA-4012",
            "city_id": "thoothukudi",
            "carrier": "V.O.C. Port Logistics",
            "truck_type": "container_chassis",
            "status": "in_transit",
            "driver_name": "S. Murugan",
            "latitude": 8.7610,
            "longitude": 78.1420,
            "speed_kmh": 46.5,
            "heading": 85.0,
            "fuel_pct": 78.0,
            "temperature_c": 3.8,
            "assigned_mission": "VOC Terminal to Cold Storage Warehouse C3",
            "data_source": "SIMULATED"
        },
        {
            "id": "trk-th-2",
            "plate_number": "TN-69-BX-8821",
            "city_id": "thoothukudi",
            "carrier": "Coastal Intermodal Express",
            "truck_type": "reefer",
            "status": "at_gate",
            "driver_name": "M. Selvam",
            "latitude": 8.7520,
            "longitude": 78.1750,
            "speed_kmh": 0.0,
            "heading": 180.0,
            "fuel_pct": 92.0,
            "temperature_c": -18.4,
            "assigned_mission": "Inbound Seafood Reefer Customs Check",
            "data_source": "SIMULATED"
        },
        {
            "id": "trk-th-3",
            "plate_number": "TN-69-CZ-1109",
            "city_id": "thoothukudi",
            "carrier": "SIPCOT Freight Haulers",
            "truck_type": "flatbed",
            "status": "in_yard",
            "driver_name": "R. Kumar",
            "latitude": 8.7710,
            "longitude": 78.1320,
            "speed_kmh": 12.0,
            "heading": 45.0,
            "fuel_pct": 65.0,
            "temperature_c": 28.0,
            "assigned_mission": "Steel Coil Unloading at Yard Block B",
            "data_source": "SIMULATED"
        }
    ],
    "chennai": [
        {
            "id": "trk-ch-1",
            "plate_number": "TN-04-EV-9021",
            "city_id": "chennai",
            "carrier": "Coromandel Express Freight",
            "truck_type": "container_chassis",
            "status": "in_transit",
            "driver_name": "D. Karthik",
            "latitude": 13.0850,
            "longitude": 80.2810,
            "speed_kmh": 54.0,
            "heading": 270.0,
            "fuel_pct": 82.0,
            "temperature_c": 4.2,
            "assigned_mission": "Port Container Terminal to Sriperumbudur Auto Park",
            "data_source": "SIMULATED"
        },
        {
            "id": "trk-ch-2",
            "plate_number": "TN-22-BY-3410",
            "city_id": "chennai",
            "carrier": "Chennai Logistics Network",
            "truck_type": "reefer",
            "status": "loading",
            "driver_name": "A. Joseph",
            "latitude": 12.9680,
            "longitude": 79.9450,
            "speed_kmh": 0.0,
            "heading": 90.0,
            "fuel_pct": 74.0,
            "temperature_c": -20.0,
            "assigned_mission": "Cold Storage Pharma Dispatch",
            "data_source": "SIMULATED"
        }
    ],
    "mumbai": [
        {
            "id": "trk-mb-1",
            "plate_number": "MH-46-AR-5510",
            "city_id": "mumbai",
            "carrier": "JNPT Port Shuttles",
            "truck_type": "container_chassis",
            "status": "in_transit",
            "driver_name": "S. Pawar",
            "latitude": 18.9480,
            "longitude": 72.9510,
            "speed_kmh": 42.0,
            "heading": 60.0,
            "fuel_pct": 88.0,
            "temperature_c": 5.0,
            "assigned_mission": "JNPT Berth 3 Container Drayage",
            "data_source": "SIMULATED"
        }
    ],
    "bengaluru": [
        {
            "id": "trk-bg-1",
            "plate_number": "KA-03-MG-7744",
            "city_id": "bengaluru",
            "carrier": "Karnataka Intermodal CFS",
            "truck_type": "container_chassis",
            "status": "in_transit",
            "driver_name": "V. Hegde",
            "latitude": 12.9890,
            "longitude": 77.7480,
            "speed_kmh": 38.0,
            "heading": 315.0,
            "fuel_pct": 79.0,
            "temperature_c": 6.1,
            "assigned_mission": "ICD Whitefield to Hosakote Cross-Dock",
            "data_source": "SIMULATED"
        }
    ],
    "delhi": [
        {
            "id": "trk-dl-1",
            "plate_number": "DL-01-AB-1290",
            "city_id": "delhi",
            "carrier": "NCR Freightways",
            "truck_type": "container_chassis",
            "status": "in_transit",
            "driver_name": "R. Sharma",
            "latitude": 28.5450,
            "longitude": 77.5580,
            "speed_kmh": 50.0,
            "heading": 210.0,
            "fuel_pct": 91.0,
            "temperature_c": 3.5,
            "assigned_mission": "Dadri ICD Rail Transfer",
            "data_source": "SIMULATED"
        }
    ],
    "mundra": [
        {
            "id": "trk-md-1",
            "plate_number": "GJ-12-CT-8899",
            "city_id": "mundra",
            "carrier": "Adani Logistics Fleet",
            "truck_type": "container_chassis",
            "status": "in_transit",
            "driver_name": "P. Patel",
            "latitude": 22.8120,
            "longitude": 69.7050,
            "speed_kmh": 47.0,
            "heading": 40.0,
            "fuel_pct": 86.0,
            "temperature_c": 4.8,
            "assigned_mission": "Mundra Terminal 4 to SEZ Block A",
            "data_source": "SIMULATED"
        }
    ]
}

INITIAL_CONTAINERS: Dict[str, List[Dict[str, Any]]] = {
    "thoothukudi": [
        {
            "id": "cnt-th-1",
            "container_number": "MSCU-829104-5",
            "city_id": "thoothukudi",
            "iso_size": "40ft_HC",
            "gross_weight_tonnes": 28.4,
            "contents": "Automotive Transmission Units",
            "yard_zone_id": "Yard Zone YD-001",
            "tier": 2,
            "dwell_hours": 18.2,
            "customs_status": "cleared",
            "data_source": "SIMULATED"
        },
        {
            "id": "cnt-th-2",
            "container_number": "MAEU-440192-1",
            "city_id": "thoothukudi",
            "iso_size": "20ft",
            "gross_weight_tonnes": 18.1,
            "contents": "Refined Copper Rods & Wire",
            "yard_zone_id": "Yard Zone YD-002",
            "tier": 3,
            "dwell_hours": 42.0,
            "customs_status": "inspection_required",
            "data_source": "SIMULATED"
        },
        {
            "id": "cnt-th-3",
            "container_number": "HLCU-902187-8",
            "city_id": "thoothukudi",
            "iso_size": "reefer",
            "gross_weight_tonnes": 22.8,
            "contents": "Frozen Prawns & Marine Export",
            "yard_zone_id": "Yard Zone YD-003",
            "tier": 1,
            "dwell_hours": 6.5,
            "customs_status": "cleared",
            "data_source": "SIMULATED"
        }
    ],
    "chennai": [
        {
            "id": "cnt-ch-1",
            "container_number": "CMAU-552190-3",
            "city_id": "chennai",
            "iso_size": "40ft_HC",
            "gross_weight_tonnes": 26.5,
            "contents": "EV Battery Packs & Semiconductor Substrates",
            "yard_zone_id": "Container Stacking Yard 1",
            "tier": 2,
            "dwell_hours": 12.0,
            "customs_status": "cleared",
            "data_source": "SIMULATED"
        }
    ],
    "mumbai": [
        {
            "id": "cnt-mb-1",
            "container_number": "COSU-773120-9",
            "city_id": "mumbai",
            "iso_size": "40ft_HC",
            "gross_weight_tonnes": 30.1,
            "contents": "Heavy Industrial Machinery",
            "yard_zone_id": "Dronagiri Yard D2",
            "tier": 1,
            "dwell_hours": 24.5,
            "customs_status": "cleared",
            "data_source": "SIMULATED"
        }
    ],
    "bengaluru": [
        {
            "id": "cnt-bg-1",
            "container_number": "ONEU-662319-4",
            "city_id": "bengaluru",
            "iso_size": "20ft",
            "gross_weight_tonnes": 16.4,
            "contents": "Aerospace Precision Castings",
            "yard_zone_id": "Whitefield ICD Bay 4",
            "tier": 2,
            "dwell_hours": 9.0,
            "customs_status": "cleared",
            "data_source": "SIMULATED"
        }
    ],
    "delhi": [
        {
            "id": "cnt-dl-1",
            "container_number": "OOLU-992104-0",
            "city_id": "delhi",
            "iso_size": "40ft_HC",
            "gross_weight_tonnes": 25.0,
            "contents": "Solar Panels & Inverters",
            "yard_zone_id": "Dadri Rail Yard R1",
            "tier": 3,
            "dwell_hours": 31.0,
            "customs_status": "cleared",
            "data_source": "SIMULATED"
        }
    ],
    "mundra": [
        {
            "id": "cnt-md-1",
            "container_number": "MSKU-331298-2",
            "city_id": "mundra",
            "iso_size": "40ft_HC",
            "gross_weight_tonnes": 27.8,
            "contents": "Textiles & Garment Consignments",
            "yard_zone_id": "Mundra Yard 4B",
            "tier": 2,
            "dwell_hours": 15.2,
            "customs_status": "cleared",
            "data_source": "SIMULATED"
        }
    ]
}

INITIAL_SHIPMENTS: Dict[str, List[Dict[str, Any]]] = {
    "thoothukudi": [
        {
            "id": "shp-th-1",
            "tracking_code": "LOGI-TH-8821",
            "city_id": "thoothukudi",
            "origin_name": "VOC Port Terminal Gate 1",
            "destination_name": "NH-38 Freight Interchange",
            "status": "in_transit",
            "eta_minutes": 22,
            "priority": "express",
            "weight_tonnes": 28.4,
            "assigned_truck_id": "trk-th-1",
            "data_source": "SIMULATED"
        },
        {
            "id": "shp-th-2",
            "tracking_code": "LOGI-TH-9943",
            "city_id": "thoothukudi",
            "origin_name": "Cold Storage Agro Warehouse C3",
            "destination_name": "VOC Port Container Terminal",
            "status": "scheduled",
            "eta_minutes": 45,
            "priority": "critical",
            "weight_tonnes": 22.8,
            "assigned_truck_id": "trk-th-2",
            "data_source": "SIMULATED"
        }
    ],
    "chennai": [
        {
            "id": "shp-ch-1",
            "tracking_code": "LOGI-CH-4412",
            "city_id": "chennai",
            "origin_name": "Chennai Port Container Terminal",
            "destination_name": "Sriperumbudur Auto Logistics Hub",
            "status": "in_transit",
            "eta_minutes": 35,
            "priority": "express",
            "weight_tonnes": 26.5,
            "assigned_truck_id": "trk-ch-1",
            "data_source": "SIMULATED"
        }
    ],
    "mumbai": [
        {
            "id": "shp-mb-1",
            "tracking_code": "LOGI-MB-2219",
            "city_id": "mumbai",
            "origin_name": "JNPT Main Gate",
            "destination_name": "Taloja MIDC Freight Terminal",
            "status": "in_transit",
            "eta_minutes": 40,
            "priority": "standard",
            "weight_tonnes": 30.1,
            "assigned_truck_id": "trk-mb-1",
            "data_source": "SIMULATED"
        }
    ],
    "bengaluru": [
        {
            "id": "shp-bg-1",
            "tracking_code": "LOGI-BG-7781",
            "city_id": "bengaluru",
            "origin_name": "Whitefield ICD",
            "destination_name": "Devanahalli Cargo Gateway",
            "status": "in_transit",
            "eta_minutes": 28,
            "priority": "critical",
            "weight_tonnes": 16.4,
            "assigned_truck_id": "trk-bg-1",
            "data_source": "SIMULATED"
        }
    ],
    "delhi": [
        {
            "id": "shp-dl-1",
            "tracking_code": "LOGI-DL-3390",
            "city_id": "delhi",
            "origin_name": "Dadri Logistics Hub",
            "destination_name": "Tughlakabad ICD",
            "status": "in_transit",
            "eta_minutes": 50,
            "priority": "standard",
            "weight_tonnes": 25.0,
            "assigned_truck_id": "trk-dl-1",
            "data_source": "SIMULATED"
        }
    ],
    "mundra": [
        {
            "id": "shp-md-1",
            "tracking_code": "LOGI-MD-6602",
            "city_id": "mundra",
            "origin_name": "Mundra Terminal 4",
            "destination_name": "Mundra-Barmer Rail Siding",
            "status": "in_transit",
            "eta_minutes": 32,
            "priority": "express",
            "weight_tonnes": 27.8,
            "assigned_truck_id": "trk-md-1",
            "data_source": "SIMULATED"
        }
    ]
}

TRUCKS_DB = INITIAL_TRUCKS
CONTAINERS_DB = INITIAL_CONTAINERS
SHIPMENTS_DB = INITIAL_SHIPMENTS



# ==================== TRUCKS CRUD ====================
@router.get("/trucks")
def list_trucks(city: str = Query("thoothukudi"), status: Optional[str] = None):
    items = TRUCKS_DB.get(city, TRUCKS_DB.get("thoothukudi", []))
    if status:
        items = [t for t in items if t.get("status") == status]
    return items


@router.post("/trucks")
def create_truck(payload: TruckCreateSchema):
    city = payload.city_id
    if city not in TRUCKS_DB:
        TRUCKS_DB[city] = []
    new_id = f"trk-{city[:2]}-{int(time.time() * 1000) % 10000}"
    item = {
        "id": new_id,
        "plate_number": payload.plate_number,
        "city_id": payload.city_id,
        "carrier": payload.carrier,
        "truck_type": payload.truck_type,
        "status": payload.status,
        "driver_name": payload.driver_name,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "speed_kmh": 0.0,
        "heading": 0.0,
        "fuel_pct": 100.0,
        "temperature_c": 4.0,
        "assigned_mission": payload.assigned_mission,
        "data_source": "LIVE_USER_DISPATCH"
    }
    TRUCKS_DB[city].append(item)
    return item


@router.get("/trucks/{truck_id}")
def get_truck(truck_id: str):
    for city, items in TRUCKS_DB.items():
        for t in items:
            if t["id"] == truck_id:
                return t
    raise HTTPException(status_code=404, detail="Truck not found")


@router.put("/trucks/{truck_id}")
def update_truck(truck_id: str, payload: Dict[str, Any] = Body(...)):
    for city, items in TRUCKS_DB.items():
        for i, t in enumerate(items):
            if t["id"] == truck_id:
                t.update(payload)
                return t
    raise HTTPException(status_code=404, detail="Truck not found")


@router.delete("/trucks/{truck_id}")
def delete_truck(truck_id: str):
    for city, items in TRUCKS_DB.items():
        for i, t in enumerate(items):
            if t["id"] == truck_id:
                deleted = items.pop(i)
                return {"message": "Truck deleted", "deleted": deleted}
    raise HTTPException(status_code=404, detail="Truck not found")


# ==================== CONTAINERS CRUD ====================
@router.get("/containers")
def list_containers(city: str = Query("thoothukudi"), customs_status: Optional[str] = None):
    items = CONTAINERS_DB.get(city, CONTAINERS_DB.get("thoothukudi", []))
    if customs_status:
        items = [c for c in items if c.get("customs_status") == customs_status]
    return items


@router.post("/containers")
def create_container(payload: ContainerCreateSchema):
    city = payload.city_id
    if city not in CONTAINERS_DB:
        CONTAINERS_DB[city] = []
    new_id = f"cnt-{city[:2]}-{int(time.time() * 1000) % 10000}"
    item = {
        "id": new_id,
        "container_number": payload.container_number,
        "city_id": payload.city_id,
        "iso_size": payload.iso_size,
        "gross_weight_tonnes": payload.gross_weight_tonnes,
        "contents": payload.contents,
        "yard_zone_id": payload.yard_zone_id,
        "tier": payload.tier,
        "dwell_hours": payload.dwell_hours,
        "customs_status": payload.customs_status,
        "data_source": "USER_INGESTION"
    }
    CONTAINERS_DB[city].append(item)
    return item


@router.get("/containers/{container_id}")
def get_container(container_id: str):
    for city, items in CONTAINERS_DB.items():
        for c in items:
            if c["id"] == container_id:
                return c
    raise HTTPException(status_code=404, detail="Container not found")


@router.put("/containers/{container_id}")
def update_container(container_id: str, payload: Dict[str, Any] = Body(...)):
    for city, items in CONTAINERS_DB.items():
        for i, c in enumerate(items):
            if c["id"] == container_id:
                c.update(payload)
                return c
    raise HTTPException(status_code=404, detail="Container not found")


@router.delete("/containers/{container_id}")
def delete_container(container_id: str):
    for city, items in CONTAINERS_DB.items():
        for i, c in enumerate(items):
            if c["id"] == container_id:
                deleted = items.pop(i)
                return {"message": "Container deleted", "deleted": deleted}
    raise HTTPException(status_code=404, detail="Container not found")


# ==================== SHIPMENTS CRUD ====================
@router.get("/shipments")
def list_shipments(city: str = Query("thoothukudi"), status: Optional[str] = None):
    items = SHIPMENTS_DB.get(city, SHIPMENTS_DB.get("thoothukudi", []))
    if status:
        items = [s for s in items if s.get("status") == status]
    return items


@router.post("/shipments")
def create_shipment(payload: Dict[str, Any] = Body(...)):
    city = payload.get("city_id", "thoothukudi")
    if city not in SHIPMENTS_DB:
        SHIPMENTS_DB[city] = []
    new_id = f"shp-{city[:2]}-{int(time.time() * 1000) % 10000}"
    item = {
        "id": new_id,
        "tracking_code": payload.get("tracking_code", f"LOGI-{int(time.time()) % 10000}"),
        "city_id": city,
        "origin_name": payload.get("origin_name", "Inbound Gate"),
        "destination_name": payload.get("destination_name", "Outbound Hub"),
        "status": payload.get("status", "in_transit"),
        "eta_minutes": payload.get("eta_minutes", 30),
        "priority": payload.get("priority", "standard"),
        "weight_tonnes": payload.get("weight_tonnes", 15.0),
        "assigned_truck_id": payload.get("assigned_truck_id"),
        "data_source": "LIVE_DISPATCH"
    }
    SHIPMENTS_DB[city].append(item)
    return item


@router.get("/shipments/{shipment_id}")
def get_shipment(shipment_id: str):
    for city, items in SHIPMENTS_DB.items():
        for s in items:
            if s["id"] == shipment_id:
                return s
    raise HTTPException(status_code=404, detail="Shipment not found")


@router.put("/shipments/{shipment_id}")
def update_shipment(shipment_id: str, payload: Dict[str, Any] = Body(...)):
    for city, items in SHIPMENTS_DB.items():
        for i, s in enumerate(items):
            if s["id"] == shipment_id:
                s.update(payload)
                return s
    raise HTTPException(status_code=404, detail="Shipment not found")


@router.delete("/shipments/{shipment_id}")
def delete_shipment(shipment_id: str):
    for city, items in SHIPMENTS_DB.items():
        for i, s in enumerate(items):
            if s["id"] == shipment_id:
                deleted = items.pop(i)
                return {"message": "Shipment deleted", "deleted": deleted}
    raise HTTPException(status_code=404, detail="Shipment not found")


# ==================== TELEMETRY INGESTION & MQTT BRIDGE ====================

@router.post("/telemetry/ingest")
async def ingest_telemetry(packet: TelemetryPacket):
    """Ingests real-time GPS and sensor telemetry from an on-road truck and broadcasts via WebSocket."""
    found = False
    matched_truck = None
    target_city = packet.city_id

    for city, items in TRUCKS_DB.items():
        for t in items:
            if t["id"] == packet.truck_id:
                t["latitude"] = packet.latitude
                t["longitude"] = packet.longitude
                t["speed_kmh"] = packet.speed_kmh
                if packet.heading is not None:
                    t["heading"] = packet.heading
                if packet.fuel_pct is not None:
                    t["fuel_pct"] = packet.fuel_pct
                if packet.temperature_c is not None:
                    t["temperature_c"] = packet.temperature_c
                t["data_source"] = "LIVE_TELEMETRY"
                found = True
                matched_truck = t
                target_city = city
                break
        if found:
            break

    if not found:
        raise HTTPException(status_code=404, detail=f"Truck {packet.truck_id} not registered")

    broadcast_msg = {
        "event": "telemetry_update",
        "city": target_city,
        "truck": matched_truck,
        "timestamp": time.time()
    }
    await telemetry_manager.broadcast(broadcast_msg, city=target_city)

    return {"status": "accepted", "truck": matched_truck}


@router.post("/telemetry/mqtt-publish")
async def mqtt_publish(payload: MqttPublishPayload):
    """
    Simulates external MQTT broker publish bridge.
    Topic convention: `logisync/{city}/trucks/{truck_id}/telemetry`
    """
    topic = payload.topic
    parts = topic.split("/")
    city = "thoothukudi"
    truck_id = None

    if len(parts) >= 4 and parts[0] == "logisync":
        city = parts[1]
        if parts[2] == "trucks":
            truck_id = parts[3]

    data = payload.payload
    if truck_id and ("latitude" in data and "longitude" in data):
        packet = TelemetryPacket(
            truck_id=truck_id,
            latitude=float(data.get("latitude", 0.0)),
            longitude=float(data.get("longitude", 0.0)),
            speed_kmh=float(data.get("speed_kmh", 0.0)),
            heading=float(data.get("heading", 0.0)),
            fuel_pct=float(data.get("fuel_pct", 80.0)),
            temperature_c=float(data.get("temperature_c", 4.0)),
            city_id=city
        )
        return await ingest_telemetry(packet)

    broadcast_msg = {
        "event": "mqtt_message",
        "topic": topic,
        "city": city,
        "payload": data,
        "timestamp": time.time()
    }
    await telemetry_manager.broadcast(broadcast_msg, city=city)
    return {"status": "published", "topic": topic}


@router.post("/telemetry/simulate-tick")
async def simulate_telemetry_tick(city: str = Query("thoothukudi")):
    """
    Generates realistic dynamic telemetry tick advancing positions and fluctuating sensor readings,
    and broadcasts updates to all active WebSocket clients.
    """
    trucks = TRUCKS_DB.get(city, TRUCKS_DB.get("thoothukudi", []))
    updated_ticks = []
    for t in trucks:
        if t.get("status") in ["in_transit", "inbound"]:
            # Drift coordinates along small trajectory
            d_lat = (random.random() - 0.48) * 0.001
            d_lon = (random.random() - 0.48) * 0.001
            t["latitude"] = round(t["latitude"] + d_lat, 5)
            t["longitude"] = round(t["longitude"] + d_lon, 5)
            t["speed_kmh"] = round(max(20.0, min(65.0, t["speed_kmh"] + (random.random() - 0.5) * 5)), 1)
            t["fuel_pct"] = round(max(5.0, t["fuel_pct"] - 0.05), 1)
            if t.get("truck_type") == "reefer":
                t["temperature_c"] = round(t["temperature_c"] + (random.random() - 0.5) * 0.2, 1)

            updated_ticks.append({
                "truck_id": t["id"],
                "plate_number": t["plate_number"],
                "coordinates": [t["longitude"], t["latitude"]],
                "speed_kmh": t["speed_kmh"],
                "fuel_pct": t["fuel_pct"],
                "temperature_c": t["temperature_c"],
                "status": t.get("status")
            })

    response_data = {"city": city, "ticks_count": len(updated_ticks), "telemetry": updated_ticks}

    await telemetry_manager.broadcast({
        "event": "tick_batch",
        "city": city,
        "ticks": updated_ticks,
        "timestamp": time.time()
    }, city=city)

    return response_data


@router.get("/telemetry/stats")
def get_telemetry_stats():
    """Returns telemetry streaming statistics and connected subscriber counts."""
    total_trucks = sum(len(items) for items in TRUCKS_DB.values())
    return {
        "connected_clients": len(telemetry_manager.active_connections),
        "total_packets_processed": telemetry_manager.total_packets_processed,
        "active_tracked_trucks": total_trucks,
        "last_packet_timestamp": telemetry_manager.last_packet_timestamp,
        "protocol": "MQTT_OVER_WEBSOCKET_BRIDGE",
        "broker_status": "ONLINE"
    }


# ==================== WEBSOCKET TELEMETRY STREAM ====================

@ws_router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket, city: Optional[str] = None):
    """
    Real-time WebSocket endpoint streaming live fleet telemetry and sensor packets.
    """
    await telemetry_manager.connect(websocket, city=city)
    try:
        await websocket.send_json({
            "event": "connection_established",
            "message": "Connected to LogiSync MQTT Telemetry Ingestion Bridge",
            "subscribed_city": city or "all",
            "timestamp": time.time()
        })
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("action") == "ping":
                    await websocket.send_json({"event": "pong", "timestamp": time.time()})
            except Exception:
                pass
    except WebSocketDisconnect:
        telemetry_manager.disconnect(websocket)
    except Exception:
        telemetry_manager.disconnect(websocket)


@router.websocket("/ws/telemetry")
async def websocket_telemetry_router_alias(websocket: WebSocket, city: Optional[str] = None):
    await websocket_telemetry_endpoint(websocket, city=city)

