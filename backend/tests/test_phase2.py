import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_gis_layers_thoothukudi():
    res = client.get("/api/gis/layers?city=thoothukudi")
    assert res.status_code == 200
    data = res.json()
    assert data["city"] == "thoothukudi"
    assert "warehouses" in data
    assert "yards" in data
    assert "gates" in data

    wh_features = data["warehouses"]["features"]
    assert len(wh_features) > 0
    first_wh = wh_features[0]["properties"]
    assert "area_sqm" in first_wh
    assert "capacity_pallets_estimated" in first_wh
    assert first_wh["capacity_pallets_estimated"] > 0
    assert first_wh["operational_metrics"] == "SIMULATED"


def test_gis_layers_chennai():
    res = client.get("/api/gis/layers?city=chennai")
    assert res.status_code == 200
    data = res.json()
    assert data["city"] == "chennai"
    assert len(data["warehouses"]["features"]) > 0

    # Coordinate check: Chennai coordinates are around lon 80.2, lat 13.0
    coords = data["warehouses"]["features"][0]["geometry"]["coordinates"][0][0]
    assert 79.0 < coords[0] < 81.0
    assert 12.0 < coords[1] < 14.0


def test_kpis_multi_city():
    res_th = client.get("/api/kpis?city=thoothukudi")
    assert res_th.status_code == 200
    d_th = res_th.json()
    assert d_th["warehouses"] > 0
    assert d_th["total_pallet_capacity_estimated"] > 0
    assert d_th["operational_metrics"] == "SIMULATED"

    res_ch = client.get("/api/kpis?city=chennai")
    assert res_ch.status_code == 200
    d_ch = res_ch.json()
    assert d_ch["warehouses"] > 0
