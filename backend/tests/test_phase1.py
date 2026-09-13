import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"


def test_cities_list():
    res = client.get("/api/cities")
    assert res.status_code == 200
    cities = res.json()
    assert len(cities) >= 6
    ids = [c["id"] for c in cities]
    assert "thoothukudi" in ids
    assert "chennai" in ids
    assert "mumbai" in ids


def test_multi_point_route():
    # 5 Waypoints (A, B, C, D, E) in Thoothukudi
    payload = {
        "coordinates": [
            [78.1750, 8.7520], # A
            [78.1460, 8.7630], # B
            [78.1320, 8.7710], # C
            [78.1250, 8.7850], # D
            [78.0980, 8.7980]  # E
        ]
    }
    res = client.post("/api/route", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "coordinates" in data
    assert len(data["coordinates"]) > 5
    assert data["distanceMeters"] > 0
    assert data["durationSeconds"] > 0


def test_traffic_incidents():
    res = client.get("/api/traffic/incidents?city=thoothukudi")
    assert res.status_code == 200
    data = res.json()
    assert "incidents" in data
    assert len(data["incidents"]) > 0
    types = [i["type"] for i in data["incidents"]]
    assert "roadblock" in types


def test_kpis_and_gis():
    res = client.get("/api/kpis")
    assert res.status_code == 200
    data = res.json()
    assert "gates" in data
    assert "warehouses" in data
