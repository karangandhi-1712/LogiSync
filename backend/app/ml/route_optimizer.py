"""
ML Route Optimizer — Genetic Algorithm TSP Solver + Physics-Based Fuel Model.

Combines evolutionary optimization with a physics-based fuel consumption model to find
the most fuel-efficient and/or time-efficient route through multiple waypoints.
"""

import random
import math
from typing import List, Tuple, Dict, Any, Optional
from .truck_profiles import get_truck_profile, estimate_fuel_rate


# ==================== FUEL CONSUMPTION MODEL ====================

class FuelConsumptionModel:
    """
    Physics-based fuel consumption estimator for heavy freight vehicles.

    Uses vehicle dynamics parameters (rolling resistance, aerodynamic drag,
    drivetrain efficiency) combined with payload weight to estimate fuel usage.
    """

    AIR_DENSITY = 1.225  # kg/m^3 at sea level
    GRAVITY = 9.81  # m/s^2

    def __init__(self, truck_type: str, payload_tonnes: float):
        self.profile = get_truck_profile(truck_type)
        self.payload_tonnes = min(
            max(0, payload_tonnes),
            self.profile["max_payload_tonnes"]
        )
        self.total_mass_kg = (
            self.profile["tare_weight_tonnes"] + self.payload_tonnes
        ) * 1000

    def estimate_segment_fuel(
        self,
        distance_km: float,
        avg_speed_kmh: Optional[float] = None,
        gradient_pct: float = 0.0,
    ) -> Dict[str, float]:
        """
        Estimate fuel consumed for a road segment.

        Args:
            distance_km: Segment length in kilometers
            avg_speed_kmh: Average driving speed (defaults to truck's optimal speed)
            gradient_pct: Road gradient in percent (positive = uphill)

        Returns:
            Dict with fuel_litres, co2_kg, cost_inr, energy_kwh
        """
        if distance_km <= 0:
            return {"fuel_litres": 0.0, "co2_kg": 0.0, "cost_inr": 0.0, "energy_kwh": 0.0}

        profile = self.profile
        speed = avg_speed_kmh or profile["optimal_speed_kmh"]
        speed_ms = speed / 3.6  # Convert to m/s

        # --- Force calculations ---

        # 1. Rolling resistance force
        cr = profile["rolling_resistance"]
        f_rolling = cr * self.total_mass_kg * self.GRAVITY * math.cos(math.radians(math.atan(gradient_pct / 100)))

        # 2. Aerodynamic drag force
        cd = profile["drag_coefficient"]
        A = profile["frontal_area_m2"]
        f_aero = 0.5 * self.AIR_DENSITY * cd * A * speed_ms ** 2

        # 3. Gradient resistance force
        f_gradient = self.total_mass_kg * self.GRAVITY * math.sin(math.atan(gradient_pct / 100))

        # 4. Total tractive force (at wheels)
        f_total = max(f_rolling + f_aero + f_gradient, 0)

        # 5. Mechanical power required (kW)
        power_kw = (f_total * speed_ms) / 1000.0

        # 6. Fuel power (accounting for drivetrain efficiency)
        eta = profile["drivetrain_efficiency"]
        fuel_power_kw = power_kw / max(eta, 0.5)

        # 7. Convert to fuel consumption
        # Diesel energy density: ~35.86 MJ/L = 9.961 kWh/L
        diesel_energy_kwh_per_L = 9.961
        time_hours = distance_km / max(speed, 1)

        fuel_litres = (fuel_power_kw * time_hours) / diesel_energy_kwh_per_L

        # Apply minimum floor from empirical fuel rate
        empirical_rate = estimate_fuel_rate(profile["id"], self.payload_tonnes)
        empirical_fuel = (empirical_rate / 100.0) * distance_km
        fuel_litres = max(fuel_litres, empirical_fuel * 0.85)

        # Blend physics model with empirical (70% physics, 30% empirical for realism)
        fuel_litres = fuel_litres * 0.7 + empirical_fuel * 0.3

        # Add refrigeration overhead for reefer
        if profile["id"] == "reefer":
            overhead = profile.get("refrigeration_fuel_overhead_pct", 15.0)
            fuel_litres *= (1 + overhead / 100.0)

        # Speed inefficiency penalty (driving too fast or too slow)
        optimal = profile["optimal_speed_kmh"]
        speed_factor = 1.0 + 0.003 * abs(speed - optimal) ** 1.5
        fuel_litres *= speed_factor

        co2_kg = fuel_litres * profile["co2_emission_factor_kg_per_L"]
        cost_inr = fuel_litres * profile["fuel_cost_per_litre_INR"]
        energy_kwh = fuel_litres * diesel_energy_kwh_per_L

        return {
            "fuel_litres": round(fuel_litres, 2),
            "co2_kg": round(co2_kg, 2),
            "cost_inr": round(cost_inr, 2),
            "energy_kwh": round(energy_kwh, 2),
        }

    def estimate_route_fuel(
        self,
        total_distance_km: float,
        duration_minutes: float,
        num_segments: int = 1,
    ) -> Dict[str, Any]:
        """
        Estimate total fuel consumption for an entire route.
        """
        if total_distance_km <= 0:
            return {
                "fuel_litres": 0.0, "co2_kg": 0.0, "cost_inr": 0.0,
                "fuel_rate_L_per_100km": 0.0, "range_remaining_km": 0.0,
            }

        avg_speed = (total_distance_km / max(duration_minutes, 1)) * 60
        avg_speed = max(15, min(avg_speed, self.profile["max_speed_kmh"]))

        result = self.estimate_segment_fuel(total_distance_km, avg_speed)

        fuel_rate = (result["fuel_litres"] / max(total_distance_km, 0.1)) * 100
        tank = self.profile["fuel_tank_capacity_L"]
        range_remaining = ((tank - result["fuel_litres"]) / max(fuel_rate, 0.1)) * 100

        return {
            **result,
            "fuel_rate_L_per_100km": round(fuel_rate, 1),
            "range_remaining_km": round(max(range_remaining, 0), 1),
            "tank_capacity_L": tank,
            "fuel_pct_used": round((result["fuel_litres"] / max(tank, 1)) * 100, 1),
        }


# ==================== GENETIC ALGORITHM TSP SOLVER ====================

class GeneticAlgorithmTSP:
    """
    Solves the Travelling Salesman Problem (TSP) for multi-stop logistics routing
    using a Genetic Algorithm with:
    - Tournament selection
    - Order Crossover (OX)
    - Swap and Inversion mutations
    - Elitism preservation

    Supports multi-objective fitness: weighted combination of distance, fuel, and time.
    """

    def __init__(
        self,
        distance_matrix: List[List[float]],
        time_matrix: List[List[float]],
        fuel_model: FuelConsumptionModel,
        mode: str = "balanced",
        population_size: int = 100,
        generations: int = 200,
        mutation_rate: float = 0.15,
        elite_size: int = 10,
        fixed_start: Optional[int] = None,
        fixed_end: Optional[int] = None,
    ):
        self.distance_matrix = distance_matrix
        self.time_matrix = time_matrix
        self.fuel_model = fuel_model
        self.mode = mode
        self.n = len(distance_matrix)
        self.population_size = population_size
        self.generations = generations
        self.mutation_rate = mutation_rate
        self.elite_size = min(elite_size, population_size // 2)
        self.fixed_start = fixed_start
        self.fixed_end = fixed_end

        # Weight presets for different optimization modes
        self.weights = {
            "fuel_efficient": {"distance": 0.2, "fuel": 0.6, "time": 0.2},
            "time_efficient": {"distance": 0.2, "fuel": 0.1, "time": 0.7},
            "balanced":       {"distance": 0.33, "fuel": 0.34, "time": 0.33},
        }.get(mode, {"distance": 0.33, "fuel": 0.34, "time": 0.33})

    def _get_free_indices(self) -> List[int]:
        """Get indices that are free to be reordered (not fixed start/end)."""
        all_indices = list(range(self.n))
        free = [i for i in all_indices if i != self.fixed_start and i != self.fixed_end]
        return free

    def _build_route(self, permutation: List[int]) -> List[int]:
        """Build a complete route from a permutation of free indices."""
        route = []
        if self.fixed_start is not None:
            route.append(self.fixed_start)
        route.extend(permutation)
        if self.fixed_end is not None and self.fixed_end != self.fixed_start:
            route.append(self.fixed_end)
        return route

    def _create_individual(self, free_indices: List[int]) -> List[int]:
        """Create a random individual (permutation of free indices)."""
        perm = free_indices[:]
        random.shuffle(perm)
        return perm

    def _fitness(self, individual: List[int]) -> float:
        """
        Calculate fitness score (lower is better).
        Combines normalized distance, fuel, and time costs.
        """
        route = self._build_route(individual)
        total_dist = 0.0
        total_time = 0.0
        total_fuel = 0.0

        for i in range(len(route) - 1):
            fr, to = route[i], route[i + 1]
            dist = self.distance_matrix[fr][to]
            time = self.time_matrix[fr][to]
            total_dist += dist
            total_time += time

            # Fuel estimate for this leg
            fuel_est = self.fuel_model.estimate_segment_fuel(
                dist, avg_speed_kmh=(dist / max(time / 60, 0.01))
            )
            total_fuel += fuel_est["fuel_litres"]

        # Weighted multi-objective fitness
        w = self.weights
        # Normalize: distance in km, time in minutes, fuel in litres
        fitness = (
            w["distance"] * total_dist +
            w["fuel"] * total_fuel * 10 +      # Scale fuel to comparable range
            w["time"] * total_time * 0.5        # Scale time to comparable range
        )
        return fitness

    def _tournament_select(self, population: List[List[int]], fitnesses: List[float], k: int = 5) -> List[int]:
        """Tournament selection: pick k random individuals, return the best."""
        candidates = random.sample(range(len(population)), min(k, len(population)))
        best = min(candidates, key=lambda i: fitnesses[i])
        return population[best][:]

    def _order_crossover(self, parent1: List[int], parent2: List[int]) -> List[int]:
        """Order Crossover (OX) — preserves relative ordering."""
        if len(parent1) <= 2:
            return parent1[:]

        size = len(parent1)
        start, end = sorted(random.sample(range(size), 2))

        child = [None] * size
        child[start:end + 1] = parent1[start:end + 1]

        fill_values = [x for x in parent2 if x not in child[start:end + 1]]
        fill_idx = 0
        for i in range(size):
            if child[i] is None:
                child[i] = fill_values[fill_idx]
                fill_idx += 1

        return child

    def _mutate(self, individual: List[int]) -> List[int]:
        """Apply swap or inversion mutation."""
        if len(individual) <= 1:
            return individual

        if random.random() < self.mutation_rate:
            if random.random() < 0.5:
                # Swap mutation
                i, j = random.sample(range(len(individual)), 2)
                individual[i], individual[j] = individual[j], individual[i]
            else:
                # Inversion mutation
                i, j = sorted(random.sample(range(len(individual)), 2))
                individual[i:j + 1] = reversed(individual[i:j + 1])

        return individual

    def solve(self) -> Dict[str, Any]:
        """
        Run the GA and return the optimized route.

        Returns:
            Dict with:
            - optimized_order: list of waypoint indices in optimal order
            - total_distance_km: total route distance
            - total_time_mins: total estimated time
            - total_fuel_L: total estimated fuel
            - total_co2_kg: total CO2 emissions
            - total_cost_inr: total fuel cost
            - fitness_score: raw fitness value
            - generations_run: number of generations completed
            - improvement_pct: % improvement over initial route
        """
        free_indices = self._get_free_indices()

        # Edge case: 0 or 1 free waypoints — nothing to optimize
        if len(free_indices) <= 1:
            route = self._build_route(free_indices)
            return self._evaluate_final_route(route, 0, 0.0)

        # Initialize population
        population = [self._create_individual(free_indices) for _ in range(self.population_size)]

        # Also include the original order as one individual
        population[0] = free_indices[:]

        fitnesses = [self._fitness(ind) for ind in population]
        initial_best_fitness = min(fitnesses)

        best_individual = population[fitnesses.index(min(fitnesses))][:]
        best_fitness = min(fitnesses)

        # Evolution loop
        stagnation = 0
        for gen in range(self.generations):
            # Sort by fitness
            paired = sorted(zip(fitnesses, population), key=lambda x: x[0])
            fitnesses = [p[0] for p in paired]
            population = [p[1] for p in paired]

            # New generation
            new_population = []

            # Elitism: keep top individuals
            for i in range(self.elite_size):
                new_population.append(population[i][:])

            # Fill rest with crossover + mutation
            while len(new_population) < self.population_size:
                parent1 = self._tournament_select(population, fitnesses)
                parent2 = self._tournament_select(population, fitnesses)
                child = self._order_crossover(parent1, parent2)
                child = self._mutate(child)
                new_population.append(child)

            population = new_population
            fitnesses = [self._fitness(ind) for ind in population]

            gen_best = min(fitnesses)
            if gen_best < best_fitness:
                best_fitness = gen_best
                best_individual = population[fitnesses.index(gen_best)][:]
                stagnation = 0
            else:
                stagnation += 1

            # Early stopping if stagnant
            if stagnation > 30:
                break

        route = self._build_route(best_individual)
        improvement = ((initial_best_fitness - best_fitness) / max(initial_best_fitness, 0.001)) * 100

        return self._evaluate_final_route(route, gen + 1, improvement)

    def _evaluate_final_route(self, route: List[int], generations_run: int, improvement_pct: float) -> Dict[str, Any]:
        """Evaluate the final route and return detailed metrics."""
        total_dist = 0.0
        total_time = 0.0
        total_fuel = 0.0
        total_co2 = 0.0
        total_cost = 0.0
        legs = []

        for i in range(len(route) - 1):
            fr, to = route[i], route[i + 1]
            dist = self.distance_matrix[fr][to]
            time_min = self.time_matrix[fr][to]
            avg_speed = (dist / max(time_min / 60, 0.01))

            fuel_est = self.fuel_model.estimate_segment_fuel(dist, avg_speed)

            total_dist += dist
            total_time += time_min
            total_fuel += fuel_est["fuel_litres"]
            total_co2 += fuel_est["co2_kg"]
            total_cost += fuel_est["cost_inr"]

            legs.append({
                "from_idx": fr,
                "to_idx": to,
                "distance_km": round(dist, 2),
                "time_mins": round(time_min, 1),
                "fuel_litres": fuel_est["fuel_litres"],
                "co2_kg": fuel_est["co2_kg"],
            })

        # Efficiency score (0-100, higher = better)
        profile = self.fuel_model.profile
        max_rate = profile["loaded_fuel_rate_L_per_100km"]
        actual_rate = (total_fuel / max(total_dist, 0.1)) * 100 if total_dist > 0 else max_rate
        efficiency_score = max(0, min(100, 100 - ((actual_rate / max_rate) * 50)))

        return {
            "optimized_order": route,
            "total_distance_km": round(total_dist, 2),
            "total_time_mins": round(total_time, 1),
            "total_fuel_L": round(total_fuel, 2),
            "total_co2_kg": round(total_co2, 2),
            "total_cost_inr": round(total_cost, 0),
            "fuel_rate_L_per_100km": round(actual_rate, 1),
            "efficiency_score": round(efficiency_score, 1),
            "legs": legs,
            "generations_run": generations_run,
            "improvement_pct": round(max(improvement_pct, 0), 1),
        }


# ==================== CONVENIENCE FUNCTION ====================

def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """
    Calculate the great-circle distance between two points (lon, lat) in km.
    """
    lon1, lat1 = math.radians(coord1[0]), math.radians(coord1[1])
    lon2, lat2 = math.radians(coord2[0]), math.radians(coord2[1])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))

    R = 6371.0  # Earth radius in km
    return R * c


def build_distance_matrix(coordinates: List[Tuple[float, float]]) -> List[List[float]]:
    """Build a distance matrix from coordinate pairs using haversine distance."""
    n = len(coordinates)
    matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                # Apply road factor (roads are ~1.3x longer than straight-line)
                matrix[i][j] = haversine_distance(coordinates[i], coordinates[j]) * 1.3
    return matrix


def build_time_matrix(distance_matrix: List[List[float]], avg_speed_kmh: float = 50.0) -> List[List[float]]:
    """Build a time matrix (in minutes) from a distance matrix."""
    n = len(distance_matrix)
    time_matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                time_matrix[i][j] = (distance_matrix[i][j] / max(avg_speed_kmh, 1)) * 60
    return time_matrix


def optimize_route(
    coordinates: List[Tuple[float, float]],
    waypoint_names: List[str],
    truck_type: str = "container_chassis",
    payload_tonnes: float = 15.0,
    mode: str = "balanced",
    fix_origin: bool = True,
    fix_destination: bool = True,
) -> Dict[str, Any]:
    """
    High-level API: optimize a multi-stop route.

    Args:
        coordinates: list of (lon, lat) tuples for each waypoint
        waypoint_names: human-readable names for each waypoint
        truck_type: truck profile ID
        payload_tonnes: cargo weight in tonnes
        mode: 'fuel_efficient', 'time_efficient', or 'balanced'
        fix_origin: if True, first waypoint stays first
        fix_destination: if True, last waypoint stays last

    Returns:
        Full optimization result dict
    """
    n = len(coordinates)
    if n < 2:
        return {"error": "Need at least 2 waypoints", "optimized_order": list(range(n))}

    # Build matrices
    dist_matrix = build_distance_matrix(coordinates)
    fuel_model = FuelConsumptionModel(truck_type, payload_tonnes)
    time_matrix = build_time_matrix(dist_matrix, fuel_model.profile["optimal_speed_kmh"])

    # Configure GA
    fixed_start = 0 if fix_origin else None
    fixed_end = (n - 1) if fix_destination else None

    # Scale GA parameters based on problem size
    pop_size = min(200, max(50, n * 20))
    gens = min(500, max(100, n * 40))

    ga = GeneticAlgorithmTSP(
        distance_matrix=dist_matrix,
        time_matrix=time_matrix,
        fuel_model=fuel_model,
        mode=mode,
        population_size=pop_size,
        generations=gens,
        mutation_rate=0.15,
        elite_size=max(5, pop_size // 10),
        fixed_start=fixed_start,
        fixed_end=fixed_end,
    )

    result = ga.solve()

    # Map indices back to waypoint names
    result["optimized_waypoint_names"] = [waypoint_names[i] for i in result["optimized_order"]]
    result["truck_type"] = truck_type
    result["payload_tonnes"] = payload_tonnes
    result["optimization_mode"] = mode

    # Also compute the "original" route metrics for comparison
    original_route = list(range(n))
    original_result = ga._evaluate_final_route(original_route, 0, 0.0)
    result["original_distance_km"] = original_result["total_distance_km"]
    result["original_time_mins"] = original_result["total_time_mins"]
    result["original_fuel_L"] = original_result["total_fuel_L"]
    result["original_co2_kg"] = original_result["total_co2_kg"]
    result["original_cost_inr"] = original_result["total_cost_inr"]

    # Savings
    result["fuel_saved_L"] = round(original_result["total_fuel_L"] - result["total_fuel_L"], 2)
    result["time_saved_mins"] = round(original_result["total_time_mins"] - result["total_time_mins"], 1)
    result["cost_saved_inr"] = round(original_result["total_cost_inr"] - result["total_cost_inr"], 0)

    return result
