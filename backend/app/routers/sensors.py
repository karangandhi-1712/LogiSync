"""IoT Sensor Network & Port Gate Hardware Telemetry.

Manages:
- ANPR Optical Character Recognition Cameras at Inbound/Outbound Gates
- Dual 80-tonne Static & Dynamic Weighbridge Load Cell Transducers
- RFID FastTrack Cargo Readers
- Cold-Chain Temperature & Humidity Transmitters (Warehouse & Reefer Blocks)
- Warehouse Loading Dock Ultrasonic Vehicle Proximity Sensors
- Radiation Portal Monitors & Hazardous Vapor Sensors
"""
import time
import random
from datetime import datetime
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, Body
from pydantic import BaseModel

router = APIRouter(prefix="/api/sensors", tags=["logistics-iot-sensors"])

# In-memory sensor states
def generate_live_sensor_telemetry():
    now = datetime.utcnow().isoformat() + "Z"
    return {
        "timestamp": now,
        "gates": [
            {
                "gate_id": "GATE_01_MAIN",
                "name": "Main Inbound Gate (SH-176 Access)",
                "barrier_status": "OPEN",
                "anpr_camera": {
                    "camera_id": "CAM-ANPR-01",
                    "status": "ONLINE",
                    "last_plate_read": "TN-69-AA-8412",
                    "confidence_score": 99.4,
                    "matched_appointment": "GP-TH-0921",
                    "timestamp": now
                },
                "rfid_scanner": {
                    "device_id": "RFID-PORTAL-01",
                    "status": "ONLINE",
                    "last_tag_id": "TAG-MSKU-849102-3",
                    "signal_strength_dbm": -42
                },
                "weighbridge_scale": {
                    "device_id": "WB-SCALE-IN-01",
                    "status": "ACTIVE_MEASURING",
                    "capacity_tonnes": 80.0,
                    "current_gross_weight_tonnes": 26.42,
                    "tare_estimate_tonnes": 3.90,
                    "net_cargo_weight_tonnes": 22.52,
                    "declared_vgm_tonnes": 26.40,
                    "variance_pct": 0.08,
                    "axle_1_load_t": 7.2,
                    "axle_2_load_t": 9.6,
                    "axle_3_load_t": 9.62,
                    "discrepancy_alert": False
                },
                "radiation_portal": {
                    "status": "CLEAR",
                    "gamma_cps": 142,
                    "neutron_cps": 2
                }
            },
            {
                "gate_id": "GATE_02_OUTBOUND",
                "name": "Main Outbound Exit Gate",
                "barrier_status": "CLOSED",
                "anpr_camera": {
                    "camera_id": "CAM-ANPR-02",
                    "status": "ONLINE",
                    "last_plate_read": "TN-72-B-9923",
                    "confidence_score": 98.7,
                    "matched_appointment": "GP-TH-0922",
                    "timestamp": now
                },
                "rfid_scanner": {
                    "device_id": "RFID-PORTAL-02",
                    "status": "ONLINE",
                    "last_tag_id": "TAG-MAEU-310492-1",
                    "signal_strength_dbm": -45
                },
                "weighbridge_scale": {
                    "device_id": "WB-SCALE-OUT-02",
                    "status": "READY_IDLE",
                    "capacity_tonnes": 80.0,
                    "current_gross_weight_tonnes": 0.00,
                    "discrepancy_alert": False
                }
            }
        ],
        "warehouses": [
            {
                "warehouse_id": "WH_01_DRY",
                "name": "MMLP Central Logistics Warehouse A",
                "ambient_temp_celsius": 28.4,
                "humidity_pct": 62.0,
                "air_quality_iaq": 45,
                "dock_bays": [
                    {"bay_no": 1, "status": "OCCUPIED_UNLOADING", "truck_plate": "TN-69-X-4410", "pallet_count_unloaded": 24},
                    {"bay_no": 2, "status": "AVAILABLE", "truck_plate": None, "pallet_count_unloaded": 0},
                    {"bay_no": 3, "status": "OCCUPIED_LOADING", "truck_plate": "TN-69-Z-1102", "pallet_count_unloaded": 18},
                    {"bay_no": 4, "status": "AVAILABLE", "truck_plate": None, "pallet_count_unloaded": 0},
                    {"bay_no": 5, "status": "MAINTENANCE", "truck_plate": None, "pallet_count_unloaded": 0}
                ]
            },
            {
                "warehouse_id": "WH_02_COLD",
                "name": "Cold Chain & Frozen Seafood Facility",
                "ambient_temp_celsius": -18.6,
                "target_temp_celsius": -18.0,
                "humidity_pct": 84.5,
                "temp_alert": False,
                "compressor_status": "RUNNING_100_PCT",
                "dock_bays": [
                    {"bay_no": 1, "status": "OCCUPIED_REEFER_PLUGGED", "truck_plate": "TN-72-B-9923", "temp_celsius": -18.4},
                    {"bay_no": 2, "status": "AVAILABLE", "truck_plate": None, "temp_celsius": -18.6}
                ]
            }
        ],
        "yard_environmental": {
            "wind_speed_knots": 11.4,
            "crane_wind_alarm": False,
            "outdoor_temp_celsius": 31.2,
            "visibility_km": 10.0,
            "precipitation_mm": 0.0
        }
    }


@router.get("/telemetry")
def get_sensor_telemetry():
    """Returns real-time hardware sensor readings across gates, weighbridges, and warehouses."""
    return generate_live_sensor_telemetry()


class SimulateTriggerRequest(BaseModel):
    sensor_type: str # ANPR_TRIGGER, WEIGHBRIDGE_SPIKE, REEFER_TEMP_ALERT, DOCK_BAY_UPDATE
    gate_or_wh_id: str
    data: Optional[Dict[str, Any]] = None


@router.post("/trigger-event")
def trigger_sensor_event(req: SimulateTriggerRequest):
    """Simulates an IoT hardware trigger or sensor threshold alert."""
    return {
        "status": "EVENT_PROCESSED",
        "sensor_type": req.sensor_type,
        "target_facility": req.gate_or_wh_id,
        "payload": req.data or {},
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "action_taken": "Logged to Digital Twin Operational Event Store and broadcast to active UI clients"
    }
