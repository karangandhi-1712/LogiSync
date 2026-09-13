"""
Truck profile database with real-world Indian logistics truck specifications.
Includes fuel curves, payload capacities, dimensions, and operational parameters.
"""

from typing import Dict, Any


# Complete truck profiles database
TRUCK_PROFILES: Dict[str, Dict[str, Any]] = {
    "container_chassis": {
        "id": "container_chassis",
        "name": "Tata Prima 4928.S",
        "category": "Heavy Container Chassis",
        "description": "49-tonne GVW container trailer for port-to-ICD corridor runs",
        "icon": "🚛",
        # Physical specs
        "max_payload_tonnes": 28.0,
        "gross_vehicle_weight_tonnes": 49.0,
        "tare_weight_tonnes": 21.0,
        "axle_count": 5,
        "length_m": 16.5,
        "width_m": 2.6,
        "height_m": 4.5,
        "turning_radius_m": 11.2,
        # Engine & fuel
        "engine_power_hp": 280,
        "fuel_tank_capacity_L": 400,
        "fuel_type": "diesel",
        "base_fuel_rate_L_per_100km": 32.0,   # empty
        "loaded_fuel_rate_L_per_100km": 42.0,  # at max payload
        "max_speed_kmh": 85,
        "optimal_speed_kmh": 55,
        # Aerodynamics & physics
        "drag_coefficient": 0.78,
        "frontal_area_m2": 10.2,
        "rolling_resistance": 0.008,
        "drivetrain_efficiency": 0.88,
        # Cost
        "fuel_cost_per_litre_INR": 89.5,
        "toll_class": "multi_axle",
        "co2_emission_factor_kg_per_L": 2.68,
    },
    "reefer": {
        "id": "reefer",
        "name": "Ashok Leyland 4220 Reefer",
        "category": "Refrigerated Container",
        "description": "Temperature-controlled transport for perishables and pharma",
        "icon": "🧊",
        "max_payload_tonnes": 22.0,
        "gross_vehicle_weight_tonnes": 42.0,
        "tare_weight_tonnes": 20.0,
        "axle_count": 4,
        "length_m": 14.5,
        "width_m": 2.5,
        "height_m": 4.2,
        "turning_radius_m": 10.5,
        "engine_power_hp": 220,
        "fuel_tank_capacity_L": 350,
        "fuel_type": "diesel",
        "base_fuel_rate_L_per_100km": 35.0,
        "loaded_fuel_rate_L_per_100km": 48.0,  # higher due to refrigeration unit
        "max_speed_kmh": 80,
        "optimal_speed_kmh": 50,
        "drag_coefficient": 0.82,
        "frontal_area_m2": 9.8,
        "rolling_resistance": 0.009,
        "drivetrain_efficiency": 0.85,
        "fuel_cost_per_litre_INR": 89.5,
        "toll_class": "multi_axle",
        "co2_emission_factor_kg_per_L": 2.68,
        "refrigeration_fuel_overhead_pct": 15.0,
    },
    "flatbed": {
        "id": "flatbed",
        "name": "BharatBenz 3528R",
        "category": "Heavy Flatbed Trailer",
        "description": "Open-deck carrier for steel, machinery, and construction materials",
        "icon": "🏗️",
        "max_payload_tonnes": 25.0,
        "gross_vehicle_weight_tonnes": 35.0,
        "tare_weight_tonnes": 10.0,
        "axle_count": 3,
        "length_m": 12.0,
        "width_m": 2.5,
        "height_m": 3.8,
        "turning_radius_m": 9.5,
        "engine_power_hp": 280,
        "fuel_tank_capacity_L": 300,
        "fuel_type": "diesel",
        "base_fuel_rate_L_per_100km": 28.0,
        "loaded_fuel_rate_L_per_100km": 40.0,
        "max_speed_kmh": 80,
        "optimal_speed_kmh": 55,
        "drag_coefficient": 0.85,
        "frontal_area_m2": 8.5,
        "rolling_resistance": 0.008,
        "drivetrain_efficiency": 0.87,
        "fuel_cost_per_litre_INR": 89.5,
        "toll_class": "heavy",
        "co2_emission_factor_kg_per_L": 2.68,
    },
    "tanker": {
        "id": "tanker",
        "name": "Volvo FM 420 Tanker",
        "category": "Liquid Tanker Truck",
        "description": "Petroleum, chemical, and food-grade liquid transport",
        "icon": "🛢️",
        "max_payload_tonnes": 24.0,
        "gross_vehicle_weight_tonnes": 40.0,
        "tare_weight_tonnes": 16.0,
        "axle_count": 4,
        "length_m": 13.5,
        "width_m": 2.5,
        "height_m": 3.9,
        "turning_radius_m": 10.0,
        "engine_power_hp": 420,
        "fuel_tank_capacity_L": 400,
        "fuel_type": "diesel",
        "base_fuel_rate_L_per_100km": 30.0,
        "loaded_fuel_rate_L_per_100km": 44.0,
        "max_speed_kmh": 75,
        "optimal_speed_kmh": 50,
        "drag_coefficient": 0.72,
        "frontal_area_m2": 9.5,
        "rolling_resistance": 0.007,
        "drivetrain_efficiency": 0.90,
        "fuel_cost_per_litre_INR": 89.5,
        "toll_class": "multi_axle",
        "co2_emission_factor_kg_per_L": 2.68,
    },
    "mini_truck": {
        "id": "mini_truck",
        "name": "Tata Ace Gold",
        "category": "Light Commercial Vehicle",
        "description": "Last-mile intra-city delivery and short-haul distribution",
        "icon": "🚚",
        "max_payload_tonnes": 1.0,
        "gross_vehicle_weight_tonnes": 2.2,
        "tare_weight_tonnes": 1.2,
        "axle_count": 2,
        "length_m": 4.7,
        "width_m": 1.7,
        "height_m": 2.4,
        "turning_radius_m": 4.6,
        "engine_power_hp": 40,
        "fuel_tank_capacity_L": 30,
        "fuel_type": "diesel",
        "base_fuel_rate_L_per_100km": 8.0,
        "loaded_fuel_rate_L_per_100km": 13.0,
        "max_speed_kmh": 75,
        "optimal_speed_kmh": 40,
        "drag_coefficient": 0.55,
        "frontal_area_m2": 3.8,
        "rolling_resistance": 0.012,
        "drivetrain_efficiency": 0.82,
        "fuel_cost_per_litre_INR": 89.5,
        "toll_class": "light",
        "co2_emission_factor_kg_per_L": 2.68,
    },
    "heavy_trailer": {
        "id": "heavy_trailer",
        "name": "Scania R450 Multi-Axle",
        "category": "Super-Heavy Multi-Axle Trailer",
        "description": "Oversized and overweight cargo — turbines, transformers, heavy machinery",
        "icon": "🏋️",
        "max_payload_tonnes": 40.0,
        "gross_vehicle_weight_tonnes": 55.0,
        "tare_weight_tonnes": 15.0,
        "axle_count": 6,
        "length_m": 18.5,
        "width_m": 2.6,
        "height_m": 4.6,
        "turning_radius_m": 13.0,
        "engine_power_hp": 450,
        "fuel_tank_capacity_L": 500,
        "fuel_type": "diesel",
        "base_fuel_rate_L_per_100km": 38.0,
        "loaded_fuel_rate_L_per_100km": 55.0,
        "max_speed_kmh": 70,
        "optimal_speed_kmh": 45,
        "drag_coefficient": 0.85,
        "frontal_area_m2": 11.5,
        "rolling_resistance": 0.010,
        "drivetrain_efficiency": 0.86,
        "fuel_cost_per_litre_INR": 89.5,
        "toll_class": "over_dimensional",
        "co2_emission_factor_kg_per_L": 2.68,
    },
}


def get_truck_profile(truck_type: str) -> Dict[str, Any]:
    """Get truck profile by type ID. Falls back to container_chassis if not found."""
    return TRUCK_PROFILES.get(truck_type, TRUCK_PROFILES["container_chassis"])


def get_all_profiles() -> list:
    """Return all truck profiles as a list."""
    return list(TRUCK_PROFILES.values())


def estimate_fuel_rate(truck_type: str, payload_tonnes: float) -> float:
    """
    Linearly interpolate fuel consumption rate (L/100km) based on payload.
    Returns fuel rate in L/100km.
    """
    profile = get_truck_profile(truck_type)
    base = profile["base_fuel_rate_L_per_100km"]
    loaded = profile["loaded_fuel_rate_L_per_100km"]
    max_payload = profile["max_payload_tonnes"]

    if max_payload <= 0:
        return base

    # Clamp payload to valid range
    actual_payload = max(0.0, min(payload_tonnes, max_payload))
    ratio = actual_payload / max_payload

    fuel_rate = base + (loaded - base) * ratio

    # Add refrigeration overhead for reefer trucks
    if truck_type == "reefer" and "refrigeration_fuel_overhead_pct" in profile:
        fuel_rate *= (1 + profile["refrigeration_fuel_overhead_pct"] / 100.0)

    return round(fuel_rate, 2)
