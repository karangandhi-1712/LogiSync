from datetime import datetime
from app.db import SessionLocal, Base, engine
from app.models.truck import TruckModel
from app.models.slot import SlotModel
from app.models.container import ContainerModel
from app.models.shipment import ShipmentModel

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

# Add more trucks to reach 24
for i in range(7, 25):
    gate_num = (i % 4) + 1
    INITIAL_TRUCKS.append({
        "id": f"trk-{i:02d}",
        "plate": f"TN 69 ZZ {1000 + i}",
        "vin": f"VIN99{i:03d}X",
        "status": ["in_transit", "queued", "at_gate", "loading"][i % 4],
        "lat": 8.75 + (i * 0.004),
        "lng": 78.13 + (i * 0.003),
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


def seed_database():
    """Initializes tables and seeds demo operational data."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(TruckModel).count() > 0:
            return

        print("Seeding database with initial VOC Port logistics data...")

        # Seed trucks
        for trk_data in INITIAL_TRUCKS:
            truck = TruckModel(**trk_data)
            db.add(truck)

        # Seed initial gate slots for today
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        gates = ["Gate 1 (Bulk)", "Gate 2 (General)", "Gate 3 (Container/Reefer)", "Gate 4 (Express Rail)"]
        times = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]

        for g in gates:
            for t in times:
                is_booked = (hash(g + t) % 3 == 0)
                status = "booked" if is_booked else ("ai_suggested" if hash(g + t) % 5 == 0 else "available")
                plate_num = (abs(hash(g + t)) % 9000) + 1000
                slot = SlotModel(
                    id=f"slot-{abs(hash(g + t + today_str)) % 1000000:06d}",
                    gate_id=g,
                    slot_time=t,
                    date=today_str,
                    status=status,
                    truck_plate=f"TN 69 XX {plate_num}" if is_booked else None,
                    driver_name="P. Balan" if is_booked else None,
                    cargo_type="Reefer Container" if "3" in g else "General Freight",
                    dwell_estimate_min=20 if "4" in g else 35
                )
                db.add(slot)

        # Seed containers
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

        # Seed shipments
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

        db.commit()
        print("Database seeded successfully with 24 trucks and port gate slots.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
