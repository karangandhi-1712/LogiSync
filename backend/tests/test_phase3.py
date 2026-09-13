import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_phase3():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["phase"] >= 3
    assert data["implementation_status"] == "IMPLEMENTED"


def test_trucks_crud():
    # 1. List
    res = client.get("/api/trucks?city=thoothukudi")
    assert res.status_code == 200
    trucks = res.json()
    assert len(trucks) >= 1

    # 2. Create
    new_truck = {
        "plate_number": "TN-69-ZZ-9999",
        "city_id": "thoothukudi",
        "carrier": "Test Carrier",
        "truck_type": "container_chassis",
        "status": "inbound",
        "driver_name": "Test Driver",
        "latitude": 8.7654,
        "longitude": 78.1345,
        "assigned_mission": "Test Mission"
    }
    create_res = client.post("/api/trucks", json=new_truck)
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["plate_number"] == "TN-69-ZZ-9999"
    t_id = created["id"]

    # 3. Get by ID
    get_res = client.get(f"/api/trucks/{t_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == t_id

    # 4. Update
    up_res = client.put(f"/api/trucks/{t_id}", json={"status": "in_transit", "speed_kmh": 42.0})
    assert up_res.status_code == 200
    assert up_res.json()["speed_kmh"] == 42.0

    # 5. Delete
    del_res = client.delete(f"/api/trucks/{t_id}")
    assert del_res.status_code == 200


def test_containers_crud():
    # 1. List
    res = client.get("/api/containers?city=thoothukudi")
    assert res.status_code == 200
    containers = res.json()
    assert len(containers) >= 1

    # 2. Create
    new_cnt = {
        "container_number": "TEST-123456-7",
        "city_id": "thoothukudi",
        "iso_size": "40ft_HC",
        "gross_weight_tonnes": 25.0,
        "contents": "Machinery Parts",
        "yard_zone_id": "YD-01",
        "tier": 2,
        "dwell_hours": 4.5,
        "customs_status": "cleared"
    }
    create_res = client.post("/api/containers", json=new_cnt)
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["container_number"] == "TEST-123456-7"
    c_id = created["id"]

    # 3. Get by ID
    get_res = client.get(f"/api/containers/{c_id}")
    assert get_res.status_code == 200
    assert get_res.json()["container_number"] == "TEST-123456-7"

    # 4. Update
    up_res = client.put(f"/api/containers/{c_id}", json={"customs_status": "hold", "tier": 3})
    assert up_res.status_code == 200
    assert up_res.json()["customs_status"] == "hold"

    # 5. Delete
    del_res = client.delete(f"/api/containers/{c_id}")
    assert del_res.status_code == 200


def test_shipments_crud():
    # 1. List
    res = client.get("/api/shipments?city=thoothukudi")
    assert res.status_code == 200
    shipments = res.json()
    assert len(shipments) >= 1

    # 2. Create
    new_shp = {
        "city_id": "thoothukudi",
        "tracking_code": "TEST-SHP-001",
        "origin_name": "VOC Gate 1",
        "destination_name": "Warehouse Block A",
        "status": "scheduled",
        "eta_minutes": 25,
        "priority": "express",
        "weight_tonnes": 22.0
    }
    create_res = client.post("/api/shipments", json=new_shp)
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["tracking_code"] == "TEST-SHP-001"
    s_id = created["id"]

    # 3. Get by ID
    get_res = client.get(f"/api/shipments/{s_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == s_id

    # 4. Update
    up_res = client.put(f"/api/shipments/{s_id}", json={"status": "in_transit", "eta_minutes": 18})
    assert up_res.status_code == 200
    assert up_res.json()["status"] == "in_transit"

    # 5. Delete
    del_res = client.delete(f"/api/shipments/{s_id}")
    assert del_res.status_code == 200


def test_telemetry_ingest_and_tick():
    # Ingest
    packet = {
        "truck_id": "trk-th-1",
        "latitude": 8.7622,
        "longitude": 78.1435,
        "speed_kmh": 48.2,
        "heading": 92.0,
        "fuel_pct": 77.5,
        "temperature_c": 3.6
    }
    ingest_res = client.post("/api/telemetry/ingest", json=packet)
    assert ingest_res.status_code == 200
    assert ingest_res.json()["status"] == "accepted"

    # Tick simulation
    tick_res = client.post("/api/telemetry/simulate-tick?city=thoothukudi")
    assert tick_res.status_code == 200
    assert "telemetry" in tick_res.json()
    assert tick_res.json()["ticks_count"] > 0


def test_mqtt_publish_and_stats():
    mqtt_msg = {
        "topic": "logisync/thoothukudi/trucks/trk-th-1/telemetry",
        "payload": {
            "latitude": 8.7630,
            "longitude": 78.1440,
            "speed_kmh": 50.0,
            "heading": 95.0,
            "fuel_pct": 76.8,
            "temperature_c": 3.5
        }
    }
    pub_res = client.post("/api/telemetry/mqtt-publish", json=mqtt_msg)
    assert pub_res.status_code == 200

    # Stats
    stats_res = client.get("/api/telemetry/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "total_packets_processed" in stats
    assert stats["total_packets_processed"] >= 1
    assert stats["broker_status"] == "ONLINE"


def test_websocket_telemetry():
    with client.websocket_connect("/ws/telemetry?city=thoothukudi") as websocket:
        # Initial connection packet
        greeting = websocket.receive_json()
        assert greeting["event"] == "connection_established"

        # Client ping
        websocket.send_text('{"action":"ping"}')
        pong = websocket.receive_json()
        assert pong["event"] == "pong"

        # Simulate tick in background and verify websocket broadcast is received
        client.post("/api/telemetry/simulate-tick?city=thoothukudi")
        broadcast = websocket.receive_json()
        assert broadcast["event"] == "tick_batch"
        assert broadcast["city"] == "thoothukudi"
        assert len(broadcast["ticks"]) > 0

