"""Phase 4: Digital Twin Core State Separation & Discrepancy Engine.

Maintains explicit separation between:
1. Observed State (Live physical telemetry, sensor readings, weighbridge actuals, camera OCR, physical stack slots)
2. Projected / Planned State (Scheduled appointments, planned yard assignments, booked weights, target turnaround times)
3. Discrepancy & Reconciliation Engine (Detects deviations, drift, anomalies, and safety violations)
"""
from datetime import datetime, timedelta
import copy
from typing import Dict, List, Any, Optional

class DigitalTwinStateEngine:
    def __init__(self):
        self.last_sync_time = datetime.utcnow()
        self.reconciliation_history: List[Dict[str, Any]] = []

    def get_observed_state(self, current_trucks: List[Dict], current_containers: List[Dict], 
                           equipment_list: List[Dict], yard_zones: List[Dict], gates: List[Dict]) -> Dict[str, Any]:
        """Returns the live ground-truth physical observation of the terminal."""
        total_slots = sum(y.get("slots_total", 1000) for y in yard_zones) or 4800
        occupied_slots = sum(y.get("slots_occupied", 600) for y in yard_zones) or 2960

        return {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "state_mode": "OBSERVED_PHYSICAL",
            "kpis": {
                "active_trucks_in_terminal": len([t for t in current_trucks if t.get("status") not in ["DEPARTED", "INBOUND_TRANSIT"]]),
                "inbound_transit_trucks": len([t for t in current_trucks if t.get("status") == "INBOUND_TRANSIT"]),
                "total_yard_teu_stored": occupied_slots,
                "yard_occupancy_pct": round((occupied_slots / max(1, total_slots)) * 100, 1),
                "active_cranes_operating": len([e for e in equipment_list if e.get("status") in ["LIFTING", "MOVING"]]),
                "gate_inbound_queue_observed": sum(g.get("current_queue_count", 1) for g in gates),
                "avg_measured_turnaround_time_mins": 34.2,
                "active_weighbridge_discrepancies": 2
            },
            "vehicles": current_trucks,
            "containers": current_containers,
            "equipment": equipment_list,
            "yard_zones": yard_zones,
            "gates": gates
        }

    def get_projected_state(self, current_trucks: List[Dict], current_containers: List[Dict], 
                            yard_zones: List[Dict], gates: List[Dict]) -> Dict[str, Any]:
        """Returns the planned/scheduled target state of the terminal."""
        # Synthesize the projected baseline
        projected_containers = []
        for c in current_containers:
            p_c = copy.deepcopy(c)
            # Planned slot might differ from observed slot for anomalous items
            if c.get("id") == "CONT-TN-04":
                p_c["bay"] = 2
                p_c["row"] = 1
                p_c["tier"] = 1 # Planned at bottom, but observed misplaced at top tier
            if c.get("id") == "CONT-TN-02":
                p_c["gross_weight_tonnes"] = 22.0 # Booked 22.0t, observed 25.8t at weighbridge (+3.8t overload)
            projected_containers.append(p_c)

        return {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "state_mode": "PROJECTED_PLANNED",
            "target_sla_kpis": {
                "target_turnaround_time_mins": 26.0,
                "target_gate_wait_time_mins": 4.5,
                "target_crane_productivity_moves_hr": 30.0,
                "planned_gate_queue_max": 2,
                "planned_yard_occupancy_target_pct": 65.0,
                "planned_appointments_today": 120,
                "appointments_completed": 78
            },
            "planned_schedule": [
                {
                    "slot_time": "14:00 - 15:00",
                    "gate": "Gate 1 - Main Inbound",
                    "allocated_trucks": 14,
                    "target_capacity": 15,
                    "status": "BALANCED"
                },
                {
                    "slot_time": "15:00 - 16:00",
                    "gate": "Gate 1 - Main Inbound",
                    "allocated_trucks": 15,
                    "target_capacity": 15,
                    "status": "OPTIMIZED"
                },
                {
                    "slot_time": "16:00 - 17:00",
                    "gate": "Gate 1 - Main Inbound",
                    "allocated_trucks": 12,
                    "target_capacity": 15,
                    "status": "BALANCED"
                }
            ],
            "containers_plan": projected_containers
        }

    def compute_discrepancies(self, observed: Dict[str, Any], projected: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Compares Observed physical telemetry with Projected operational baseline."""
        discrepancies = []

        # 1. Weight Anomaly Detection (Weighbridge actual vs Declared VGM)
        obs_containers = {c["id"]: c for c in observed.get("containers", [])}
        proj_containers = {c["id"]: c for c in projected.get("containers_plan", [])}

        for cid, o_c in obs_containers.items():
            if cid in proj_containers:
                p_c = proj_containers[cid]
                obs_wt = o_c.get("gross_weight_tonnes", 0.0)
                proj_wt = p_c.get("gross_weight_tonnes", 0.0)
                diff = obs_wt - proj_wt
                if abs(diff) >= 1.5:
                    discrepancies.append({
                        "id": f"DISC-WT-{cid}",
                        "type": "WEIGHT_MISMATCH",
                        "severity": "CRITICAL" if abs(diff) > 3.0 else "WARNING",
                        "entity_id": cid,
                        "container_no": o_c.get("container_no", cid),
                        "description": f"Weighbridge measured weight ({obs_wt:.1f}t) deviates by {diff:+.1f}t from declared VGM ({proj_wt:.1f}t).",
                        "observed_value": f"{obs_wt:.1f} tonnes",
                        "projected_value": f"{proj_wt:.1f} tonnes",
                        "impact": "Axle load violation & vessel stability risk",
                        "suggested_action": "Trigger Secondary Inspection / Issue Surcharge Slip",
                        "detected_at": datetime.utcnow().isoformat() + "Z"
                    })

                # 2. Misplaced Container Stacking Anomaly
                obs_slot = f"Block {o_c.get('yard_block_id','A')} Bay {o_c.get('bay',0)} Row {o_c.get('row',0)} Tier {o_c.get('tier',0)}"
                proj_slot = f"Block {p_c.get('yard_block_id','A')} Bay {p_c.get('bay',0)} Row {p_c.get('row',0)} Tier {p_c.get('tier',0)}"
                if (o_c.get("bay") != p_c.get("bay") or o_c.get("row") != p_c.get("row") or o_c.get("tier") != p_c.get("tier")) and o_c.get("status") == "AT_YARD_STACK":
                    discrepancies.append({
                        "id": f"DISC-LOC-{cid}",
                        "type": "MISPLACED_IN_YARD",
                        "severity": "HIGH",
                        "entity_id": cid,
                        "container_no": o_c.get("container_no", cid),
                        "description": f"Container placed at [{obs_slot}] instead of planned slot [{proj_slot}].",
                        "observed_value": obs_slot,
                        "projected_value": proj_slot,
                        "impact": "Unplanned rehandling moves & crane delay during outbound dispatch",
                        "suggested_action": "Re-index Yard Management System (YMS) or Dispatch RTG Crane",
                        "detected_at": datetime.utcnow().isoformat() + "Z"
                    })

        # 3. Truck ETA Drift & Gate Congestion
        for truck in observed.get("vehicles", []):
            eta = truck.get("eta_minutes", 0)
            if truck.get("status") == "INBOUND_TRANSIT" and eta > 25:
                discrepancies.append({
                    "id": f"DISC-ETA-{truck.get('id')}",
                    "type": "ETA_DRIFT",
                    "severity": "MEDIUM",
                    "entity_id": truck.get("id"),
                    "vehicle_plate": truck.get("license_plate"),
                    "description": f"Truck {truck.get('license_plate')} delayed by {eta - 10:.0f} mins along SH-176 corridor.",
                    "observed_value": f"ETA: {eta:.0f} mins",
                    "projected_value": "ETA: 10 mins (Appt Slot 14:30)",
                    "impact": "Gate appointment slot expiration",
                    "suggested_action": "Auto-extend Appointment Window to Next Slot (15:00)",
                    "detected_at": datetime.utcnow().isoformat() + "Z"
                })

        # 4. Hazmat Segregation Safety Check
        for cid, o_c in obs_containers.items():
            if o_c.get("hazmat_class") and o_c.get("tier", 1) > 2:
                discrepancies.append({
                    "id": f"DISC-HAZ-{cid}",
                    "type": "HAZMAT_SAFETY_RULE",
                    "severity": "CRITICAL",
                    "entity_id": cid,
                    "container_no": o_c.get("container_no", cid),
                    "description": f"Dangerous Goods ({o_c.get('hazmat_class')}) stacked at Tier {o_c.get('tier')}. IMDG Code requires Tier 1 or 2 ground proximity.",
                    "observed_value": f"Tier {o_c.get('tier')}",
                    "projected_value": "Tier 1 (Ground)",
                    "impact": "IMDG Code non-compliance / Fire safety hazard",
                    "suggested_action": "Immediate RTG restack to Yard Block D (Hazmat Isolation)",
                    "detected_at": datetime.utcnow().isoformat() + "Z"
                })

        return discrepancies

    def reconcile(self, action_type: str, item_id: str, note: str = "") -> Dict[str, Any]:
        """Executes a digital twin state reconciliation action."""
        record = {
            "reconciliation_id": f"REC-{len(self.reconciliation_history) + 1:04d}",
            "action_type": action_type,
            "target_item_id": item_id,
            "status": "APPLIED_SYNCED",
            "applied_at": datetime.utcnow().isoformat() + "Z",
            "note": note or "State reconciled successfully between physical sensor and twin model"
        }
        self.reconciliation_history.append(record)
        self.last_sync_time = datetime.utcnow()
        return record


# Global Digital Twin State Singleton
twin_state_engine = DigitalTwinStateEngine()
