import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import Base, engine
from app.seed import seed_database
from app.services.slot_allocator import slot_allocator_service
from app.services.rerouter import rerouter_service
from app.services.fuel_model import fuel_model

@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    seed_database()

client = TestClient(app)


def test_health_check():
    response = client.get("/healthz")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "LogiSync" in data["service"]


def test_security_headers():
    response = client.get("/healthz")
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert "Strict-Transport-Security" in response.headers


def test_slot_congestion_matrix():
    response = client.get("/api/slots/congestion")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 4
    for gate in data:
        assert "congestion_score" in gate
        assert "queue_length" in gate


def test_ai_slot_suggestion():
    rec = slot_allocator_service.suggest_optimal_slot(
        gate_id="Gate 3 (Container/Reefer)",
        preferred_time="14:00",
        date_str="2026-09-15"
    )
    assert "recommended_time" in rec
    assert rec["turnaround_improvement_pct"] > 0


def test_rerouter_evaluation():
    # Test coordinates near VOC port entrance bottleneck (8.7520, 78.1830)
    result = rerouter_service.evaluate_truck_position(
        truck_id="trk-01",
        current_lat=8.7525,
        current_lng=78.1825
    )
    assert result["reroute_triggered"] is True
    assert "recommended_route" in result


def test_fuel_consumption_model():
    res = fuel_model.calculate_trip_fuel(
        distance_km=25.0,
        avg_speed_kmh=45.0,
        idle_time_minutes=30.0
    )
    assert res["total_fuel_litres"] > 0
    assert res["co2_emissions_kg"] > 0
    assert res["cost_inr"] > 0
