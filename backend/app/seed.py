import hashlib
from datetime import datetime
from app.db import SessionLocal, Base, engine
from app.models.truck import TruckModel
from app.models.slot import SlotModel
from app.models.container import ContainerModel
from app.models.shipment import ShipmentModel
from app.ports import PORTS, spawn_offsets, DEFAULT_PORT_ID


def _stable_int(key: str) -> int:
    """Deterministic int from string (Python hash() is salted per-process)."""
    return int(hashlib.md5(key.encode("utf-8")).hexdigest(), 16)

# 24 Initial fleet trucks positioned around Thoothukudi logistics corridors
INITIAL_TRUCKS = [
    {
        "id": "trk-01", "plate": "TN 69 AB 1001", "vin": "VIN89421A", "status": "in_transit",
        "lat": 8.7642, "lng": 78.1348, "heading": 115.0, "speed": 48.0,
        "driver_name": "R. Kumar", "driver_phone": "+91 98401 10001", "duty_hours": 3.5,
        "driver_rating": 4.9, "fuel_level": 78.0, "reefer_temp": None,
        "destination": "VOC Port Gate 3", "assigned_gate": "Gate 3", "eta": "14:15"
    },
    {
        "id": "trk-02", "plate": "TN 69 BC 2002", "vin": "VIN89422B", "status": "queued",
        "lat": 8.7518, "lng": 78.1815, "heading": 90.0, "speed": 5.0,
        "driver_name": "S. Murugan", "driver_phone": "+91 98401 10002", "duty_hours": 5.2,
        "driver_rating": 4.7, "fuel_level": 64.0, "reefer_temp": -18.2,
        "destination": "VOC Port Gate 1", "assigned_gate": "Gate 1", "eta": "13:50"
    },
    {
        "id": "trk-03", "plate": "TN 69 CD 3003", "vin": "VIN89423C", "status": "at_gate",
        "lat": 8.7558, "lng": 78.1835, "heading": 45.0, "speed": 0.0,
        "driver_name": "M. Selvam", "driver_phone": "+91 98401 10003", "duty_hours": 2.1,
        "driver_rating": 4.8, "fuel_level": 88.0, "reefer_temp": 4.5,
        "destination": "VOC Port Gate 3", "assigned_gate": "Gate 3", "eta": "13:30"
    },
    {
        "id": "trk-04", "plate": "TN 69 DE 4004", "vin": "VIN89424D", "status": "in_transit",
        "lat": 8.7890, "lng": 78.1180, "heading": 130.0, "speed": 55.0,
        "driver_name": "K. Pandian", "driver_phone": "+91 98401 10004", "duty_hours": 6.0,
        "driver_rating": 4.6, "fuel_level": 52.0, "reefer_temp": None,
        "destination": "VOC Port Gate 2", "assigned_gate": "Gate 2", "eta": "14:45"
    },
    {
        "id": "trk-05", "plate": "TN 69 EF 5005", "vin": "VIN89425E", "status": "loading",
        "lat": 8.7510, "lng": 78.1870, "heading": 180.0, "speed": 0.0,
        "driver_name": "A. Natarajan", "driver_phone": "+91 98401 10005", "duty_hours": 4.8,
        "driver_rating": 5.0, "fuel_level": 70.0, "reefer_temp": -22.0,
        "destination": "Container Yard Berth 4", "assigned_gate": "Gate 3", "eta": "13:00"
    },
    {
        "id": "trk-06", "plate": "TN 69 FG 6006", "vin": "VIN89426F", "status": "delayed",
        "lat": 8.8120, "lng": 78.1020, "heading": 120.0, "speed": 12.0,
        "driver_name": "V. Ganesan", "driver_phone": "+91 98401 10006", "duty_hours": 7.4,
        "driver_rating": 4.5, "fuel_level": 34.0, "reefer_temp": None,
        "destination": "VOC Port Gate 1", "assigned_gate": "Gate 1", "eta": "15:30"
    },
]

# Add more trucks to reach 24, spread over the inland city box (well clear of
# the curving NE coastline — the old NE-diagonal formula marched into the sea
# toward Van Thivu). See voc_legacy_position() — the repair pass reuses it.
def voc_legacy_position(i: int):
    return (
        round(8.73 + ((i * 13) % 12) * 0.008, 5),
        round(78.10 + ((i * 7) % 6) * 0.008, 5),
    )


for i in range(7, 25):
    gate_num = (i % 4) + 1
    _lat, _lng = voc_legacy_position(i)
    INITIAL_TRUCKS.append({
        "id": f"trk-{i:02d}",
        "port_id": DEFAULT_PORT_ID,
        "plate": f"TN 69 ZZ {1000 + i}",
        "vin": f"VIN99{i:03d}X",
        "status": ["in_transit", "queued", "at_gate", "loading"][i % 4],
        "lat": _lat,
        "lng": _lng,
        "heading": float((i * 35) % 360),
        "speed": float(25 + (i * 3) % 45),
        "driver_name": f"Driver {i}",
        "driver_phone": f"+91 98401 {10000 + i}",
        "duty_hours": float(1.5 + (i * 0.4) % 7.0),
        "driver_rating": round(4.4 + (i % 6) * 0.1, 1),
        "fuel_level": float(40 + (i * 7) % 55),
        "reefer_temp": -18.0 if i % 3 == 0 else None,
        "destination": f"VOC Port Gate {gate_num}",
        "assigned_gate": f"Gate {gate_num}",
        "eta": f"{12 + (i // 4)}:{(i * 15) % 60:02d}"
    })

# First 6 VOC trucks also belong to VOC explicitly (pre-migration rows backfill too).
for _t in INITIAL_TRUCKS[:6]:
    _t.setdefault("port_id", DEFAULT_PORT_ID)

# Regional identity for procedurally seeded ports (plates + driver pools).
_PORT_IDENTITY = {
    "deendayal": {"plate": "GJ-12", "names": ["R. Patel", "K. Desai", "M. Shah", "J. Thakor"]},
    "mumbai": {"plate": "MH-04", "names": ["S. Jadhav", "A. Pawar", "N. Shinde", "V. More"]},
    "jnpt": {"plate": "MH-46", "names": ["P. Patil", "R. Mhatre", "S. Koli", "D. Bhagat"]},
    "mormugao": {"plate": "GA-06", "names": ["F. D'Souza", "R. Naik", "S. Kamat", "A. Volvoikar"]},
    "mangalore": {"plate": "KA-19", "names": ["R. Shetty", "P. Poojary", "S. Kotian", "H. Mendon"]},
    "cochin": {"plate": "KL-39", "names": ["J. Mathew", "S. Nair", "B. Menon", "R. Pillai"]},
    "haldia": {"plate": "WB-20", "names": ["S. Das", "A. Mondal", "P. Maity", "G. Jana"]},
    "paradip": {"plate": "OD-14", "names": ["B. Sahoo", "D. Jena", "M. Nayak", "S. Rout"]},
    "vizag": {"plate": "AP-31", "names": ["K. Rao", "S. Varma", "P. Reddy", "V. Kumar"]},
    "chennai": {"plate": "TN-04", "names": ["M. Rajan", "K. Velu", "S. Mani", "D. Sekar"]},
    "ennore": {"plate": "TN-14", "names": ["T. Elumalai", "R. Anbu", "K. Saravanan", "P. Deva"]},
}

_PORT_STATUSES = ["in_transit", "in_transit", "queued", "at_gate", "loading", "in_transit", "delayed", "at_gate", "in_transit", "loading"]
TRUCKS_PER_PORT = 10


def build_port_trucks(port_id: str):
    """Deterministic per-port fleet: land-side offsets, regional plates/drivers."""
    port = PORTS[port_id]
    ident = _PORT_IDENTITY[port_id]
    center = port["center"]
    gates = port["gates"]
    trucks = []
    for i, (dlat, dlng) in enumerate(spawn_offsets(port_id, TRUCKS_PER_PORT)):
        h = _stable_int(f"{port_id}-truck-{i}")
        gate_idx = h % 4
        status = _PORT_STATUSES[h % len(_PORT_STATUSES)]
        trucks.append({
            "id": f"{port_id}-trk-{i + 1:02d}",
            "port_id": port_id,
            "plate": f"{ident['plate']} {chr(65 + (h % 26))}{chr(65 + ((h >> 5) % 26))} {1000 + (h % 9000)}",
            "vin": f"VIN{port_id[:2].upper()}{1000 + i:04d}X",
            "status": status,
            "lat": round(center["lat"] + dlat, 5),
            "lng": round(center["lng"] + dlng, 5),
            "heading": float(h % 360),
            "speed": float(0 if status in ("at_gate", "loading") else 25 + (h % 45)),
            "driver_name": ident["names"][h % len(ident["names"])],
            "driver_phone": f"+91 98{(h % 400) + 100:03d} {(h % 90000) + 10000:05d}",
            "duty_hours": round(1.5 + (h % 70) / 10.0, 1),
            "driver_rating": round(4.2 + (h % 8) / 10.0, 1),
            "fuel_level": float(35 + (h % 60)),
            "reefer_temp": -18.0 if h % 3 == 0 else None,
            "destination": f"{port['short']} {gates[gate_idx].split('(')[0].strip()}",
            "assigned_gate": gates[gate_idx].split(" (")[0],
            "eta": f"{12 + ((h >> 3) % 8)}:{(h % 4) * 15:02d}",
        })
    return trucks


def _seed_port_slots(db, port_id: str, gates, today_str: str):
    """Seed one port's gate slots for today (skips when already present)."""
    if db.query(SlotModel).filter(SlotModel.port_id == port_id, SlotModel.date == today_str).count() > 0:
        return
    times = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
    prefix = "" if port_id == DEFAULT_PORT_ID else f"{port_id}-"
    for g in gates:
        for t in times:
            h = _stable_int(port_id + g + t)
            is_booked = (h % 3 == 0)
            status = "booked" if is_booked else ("ai_suggested" if h % 5 == 0 else "available")
            plate_num = (h % 9000) + 1000
            slot_id = f"slot-{prefix}{_stable_int(port_id + g + t + today_str) % 1000000:06d}"
            if db.get(SlotModel, slot_id) is None:
                db.add(SlotModel(
                    id=slot_id,
                    port_id=port_id,
                    gate_id=g,
                    slot_time=t,
                    date=today_str,
                    status=status,
                    truck_plate=f"TN 69 XX {plate_num}" if is_booked else None,
                    driver_name="P. Balan" if is_booked else None,
                    cargo_type="Reefer Container" if "3" in g else "General Freight",
                    dwell_estimate_min=20 if "4" in g else 35,
                ))


def repair_out_of_bounds(db) -> int:
    """One-time self-healing for sea-drifted/legacy positions.

    Any truck outside its port's sim bounds is snapped to its deterministic
    regenerated position (procedural `{port}-trk-NN` ids keep id/plate/driver,
    only lat/lng change; VOC legacy `trk-07..24` get the corrected formula).
    Anything unrecognized is clamped into bounds. Returns repaired count.
    Idempotent: a clean DB reports 0 and changes nothing.
    """
    import re
    from app.ports import clamp_point, in_sim_bounds, spawn_point
    fixed = 0
    for t in db.query(TruckModel).all():
        port_id = t.port_id or DEFAULT_PORT_ID
        if in_sim_bounds(port_id, t.lat, t.lng):
            continue
        m = re.fullmatch(r"([a-z]+)-trk-(\d+)", t.id or "")
        m_legacy = re.fullmatch(r"trk-(\d+)", t.id or "")
        if m and m.group(1) == port_id:
            nlat, nlng = spawn_point(port_id, int(m.group(2)) - 1)
        elif m_legacy and port_id == DEFAULT_PORT_ID:
            nlat, nlng = voc_legacy_position(int(m_legacy.group(1)))
        else:
            nlat, nlng = clamp_point(port_id, t.lat, t.lng)
        if abs(nlat - t.lat) > 1e-9 or abs(nlng - t.lng) > 1e-9:
            print(f"Repairing sea-drifted truck {t.id}: ({t.lat},{t.lng}) -> ({nlat},{nlng})")
            t.lat, t.lng = nlat, nlng
            fixed += 1
    return fixed


def _stored_geo_version(db) -> int:
    """Read the stamped geography version (0 when never stamped)."""
    from sqlalchemy import text
    db.execute(text("CREATE TABLE IF NOT EXISTS seed_meta(k TEXT PRIMARY KEY, v TEXT)"))
    row = db.execute(text("SELECT v FROM seed_meta WHERE k='geo_version'")).fetchone()
    try:
        return int(row[0]) if row else 0
    except (TypeError, ValueError):
        return 0


def _store_geo_version(db, version: int):
    from sqlalchemy import text
    db.execute(
        text("INSERT INTO seed_meta(k, v) VALUES ('geo_version', :v) "
             "ON CONFLICT(k) DO UPDATE SET v=excluded.v"),
        {"v": str(version)},
    )


def reseed_procedural_fleets(db):
    """Delete + regenerate every procedural `{port}-trk-NN` fleet.

    Ids/plates/drivers are deterministic, so only lat/lng change. Used when
    GEO_VERSION bumps (spawn tables corrected) — existing databases pick up
    fixed land-side positions automatically on next backend start.
    """
    from app.ports import GEO_VERSION
    count = 0
    for port_id in PORTS:
        if port_id == DEFAULT_PORT_ID:
            continue
        deleted = db.query(TruckModel).filter(TruckModel.port_id == port_id).delete()
        for trk_data in build_port_trucks(port_id):
            db.add(TruckModel(**trk_data))
        count += len(build_port_trucks(port_id))
        if deleted:
            print(f"Reseeded {port_id} fleet ({deleted} replaced).")
    db.flush()
    _store_geo_version(db, GEO_VERSION)


def seed_database():
    """Initializes tables and seeds demo operational data."""
    from app.db import ensure_port_columns
    from app.ports import GEO_VERSION
    Base.metadata.create_all(bind=engine)
    ensure_port_columns()
    db = SessionLocal()

    try:
        # Heal partial DBs: seed each table independently if empty.
        if db.query(TruckModel).count() == 0:
            print("Seeding VOC trucks...")
            for trk_data in INITIAL_TRUCKS:
                truck = TruckModel(**trk_data)
                db.add(truck)
            db.flush()

        # Per-port fleets (idempotent: only when the port has no trucks yet).
        for port_id in PORTS:
            if port_id == DEFAULT_PORT_ID:
                continue
            if db.query(TruckModel).filter(TruckModel.port_id == port_id).count() == 0:
                print(f"Seeding {port_id} trucks...")
                for trk_data in build_port_trucks(port_id):
                    if db.get(TruckModel, trk_data["id"]) is None:
                        db.add(TruckModel(**trk_data))
                db.flush()

        # Geography migration: corrected spawn tables → refresh fleets once.
        if _stored_geo_version(db) != GEO_VERSION:
            print(f"Geography v{GEO_VERSION}: refreshing procedural fleets...")
            reseed_procedural_fleets(db)

        # Seed initial gate slots for today (only if none exist for today)
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        _seed_port_slots(db, DEFAULT_PORT_ID, PORTS[DEFAULT_PORT_ID]["gates"], today_str)
        for port_id, port in PORTS.items():
            if port_id == DEFAULT_PORT_ID:
                continue
            _seed_port_slots(db, port_id, port["gates"], today_str)
        db.flush()

        # Seed containers
        if db.query(ContainerModel).count() == 0:
            for c in range(1, 15):
                container = ContainerModel(
                    id=f"cnt-{c:03d}",
                    container_number=f"MSCU{890123 + c}",
                    iso_code="40HC" if c % 2 == 0 else "20GP",
                    status="in_yard" if c % 3 != 0 else "dispatched",
                    location=f"Yard Block {chr(65 + c % 4)}-{c:02d}",
                    weight_tons=float(18.0 + c * 0.8),
                    cargo_type="Automotive Spares" if c % 2 == 0 else "Agricultural Produce",
                    seal_number=f"SEAL-VOC-{9000 + c}"
                )
                db.add(container)
            db.flush()

        # Seed shipments
        if db.query(ShipmentModel).count() == 0:
            for s in range(1, 10):
                shipment = ShipmentModel(
                    id=f"shp-{s:03d}",
                    tracking_number=f"TRK-VOC-2026-{s:04d}",
                    origin="Madurai ICD" if s % 2 == 0 else "Coimbatore Cargo Terminal",
                    destination="VOC Port Berth 3",
                    status="in_transit" if s % 3 != 0 else "customs_clearance",
                    carrier="Tamil Nadu Freight Corridors",
                    eta=f"{13 + s}:00"
                )
                db.add(shipment)

        repaired = repair_out_of_bounds(db)
        db.commit()
        print(f"Database seeded successfully with 24 trucks and port gate slots. Repaired {repaired} out-of-bounds trucks.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
