import math
from typing import Dict, Any


class FuelConsumptionModel:
    """
    Physics-based heavy truck fuel consumption model.
    Accounts for vehicle mass, aerodynamic drag, rolling resistance,
    speed profile, and idle queuing fuel consumption.
    """

    AIR_DENSITY = 1.225         # kg/m^3
    GRAVITY = 9.81              # m/s^2
    DIESEL_ENERGY_DENSITY = 38.6  # MJ/L
    ENGINE_EFFICIENCY = 0.42    # Thermal efficiency of heavy diesel engine
    IDLE_FUEL_RATE_L_HR = 2.8   # Litres/hour while idling in gate queue

    def __init__(
        self,
        curb_weight_kg: float = 8500.0,
        payload_weight_kg: float = 24000.0,
        frontal_area_m2: float = 9.2,
        drag_coefficient: float = 0.65,
        rolling_resistance_coeff: float = 0.0065
    ):
        self.total_mass = curb_weight_kg + payload_weight_kg
        self.area = frontal_area_m2
        self.cd = drag_coefficient
        self.crr = rolling_resistance_coeff

    def calculate_trip_fuel(
        self,
        distance_km: float,
        avg_speed_kmh: float,
        idle_time_minutes: float = 0.0
    ) -> Dict[str, Any]:
        """Calculates total fuel consumption in litres, cost, and CO2 emissions."""
        speed_ms = avg_speed_kmh / 3.6
        distance_m = distance_km * 1000.0

        # Rolling resistance force (N)
        f_roll = self.crr * self.total_mass * self.GRAVITY

        # Aerodynamic drag force (N)
        f_aero = 0.5 * self.AIR_DENSITY * self.cd * self.area * (speed_ms ** 2)

        total_force = f_roll + f_aero
        work_joules = total_force * distance_m
        work_mj = work_joules / 1e6

        # Fuel in litres
        driving_fuel_litres = work_mj / (self.DIESEL_ENERGY_DENSITY * self.ENGINE_EFFICIENCY)
        idle_fuel_litres = (idle_time_minutes / 60.0) * self.IDLE_FUEL_RATE_L_HR
        total_fuel_litres = driving_fuel_litres + idle_fuel_litres

        # CO2 emissions: ~2.68 kg CO2 per litre of diesel
        co2_emissions_kg = total_fuel_litres * 2.68

        # Approximate diesel cost: ₹94/litre in Tamil Nadu
        cost_inr = total_fuel_litres * 94.0

        return {
            "distance_km": distance_km,
            "driving_fuel_litres": round(driving_fuel_litres, 2),
            "idle_fuel_litres": round(idle_fuel_litres, 2),
            "total_fuel_litres": round(total_fuel_litres, 2),
            "co2_emissions_kg": round(co2_emissions_kg, 2),
            "cost_inr": round(cost_inr, 2),
            "fuel_economy_km_per_l": round(distance_km / max(total_fuel_litres, 0.1), 2)
        }


fuel_model = FuelConsumptionModel()
