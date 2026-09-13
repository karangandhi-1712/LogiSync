import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ml.truck_profiles import TRUCK_PROFILES, get_truck_profile, estimate_fuel_rate
from app.ml.route_optimizer import FuelConsumptionModel, optimize_route

client = TestClient(app)


def test_truck_profiles_database():
    assert len(TRUCK_PROFILES) >= 6
    assert "container_chassis" in TRUCK_PROFILES
    assert "reefer" in TRUCK_PROFILES
    assert "tanker" in TRUCK_PROFILES
    assert "flatbed" in TRUCK_PROFILES
    assert "mini_truck" in TRUCK_PROFILES
    assert "heavy_trailer" in TRUCK_PROFILES

    profile = get_truck_profile("container_chassis")
    assert profile["max_payload_tonnes"] == 28
    assert profile["optimal_speed_kmh"] == 55


def test_fuel_rate_estimation():
    # Base vs Loaded
    base_rate = estimate_fuel_rate("container_chassis", 0.0)
    loaded_rate = estimate_fuel_rate("container_chassis", 28.0)
    assert loaded_rate > base_rate
    assert base_rate == 32.0
    assert loaded_rate == 42.0

    # Intermediate payload
    mid_rate = estimate_fuel_rate("container_chassis", 14.0)
    assert base_rate < mid_rate < loaded_rate


def test_fuel_consumption_physics_model():
    model = FuelConsumptionModel("container_chassis", payload_tonnes=20.0)
    seg = model.estimate_segment_fuel(distance_km=100.0)
    assert seg["fuel_litres"] > 0
    assert seg["co2_kg"] > 0
    assert seg["cost_inr"] > 0
    assert seg["energy_kwh"] > 0


def test_api_truck_profiles_endpoint():
    res = client.get("/api/truck-profiles")
    assert res.status_code == 200
    profiles = res.json()
    assert len(profiles) >= 6
    ids = [p["id"] for p in profiles]
    assert "container_chassis" in ids


def test_api_optimize_route_endpoint():
    payload = {
        "coordinates": [
            [78.1750, 8.7520],
            [78.1460, 8.7630],
            [78.1320, 8.7710],
            [78.0980, 8.7980]
        ],
        "waypoint_names": [
            "Port Gate A",
            "ICD Yard B",
            "Warehouse C",
            "Distribution Hub D"
        ],
        "truck_type": "container_chassis",
        "payload_tonnes": 18.0,
        "optimization_mode": "fuel_efficient",
        "fix_origin": True,
        "fix_destination": True
    }
    res = client.post("/api/optimize-route", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "total_distance_km" in data
    assert "total_time_mins" in data
    assert "total_fuel_L" in data
    assert "total_co2_kg" in data
    assert "optimized_order" in data
    assert len(data["optimized_order"]) == 4
    assert data["optimized_order"][0] == 0  # fixed origin
    assert data["optimized_order"][-1] == 3  # fixed destination
