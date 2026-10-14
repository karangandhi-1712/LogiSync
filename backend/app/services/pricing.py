"""What the customer is quoted for a parcel.

Separate from the driver earnings model on purpose: the customer sees one clear
price at intake and the driver sees one clear payout at broadcast. Both are
derived from `app.constants`, so neither can drift, and the driver's base pay is
always strictly above the customer's base fee.
"""

from typing import Any, Dict, Iterable, List, Optional

from app.constants import (
    CUSTOMER_BASE_FEE,
    CUSTOMER_HANDLING_FEE,
    CUSTOMER_MIN_CHARGE,
    CUSTOMER_PER_KG,
    CUSTOMER_WEIGHT_CAP_KG,
    TIER_STANDARD,
    VALID_TIERS,
)
from app.services.handling import normalize


def quote_charge(tier: Optional[str], weight_kg: Optional[float] = None,
                 flags: Optional[Iterable[str]] = None) -> Dict[str, Any]:
    """Price one parcel.

    `weight_component` and `handling_fee` are zero when the customer declared
    neither, which is why a standard-tier parcel under the minimum still lands on
    `CUSTOMER_MIN_CHARGE` rather than being free.
    """
    tier = (tier or TIER_STANDARD).strip().lower()
    if tier not in VALID_TIERS:
        tier = TIER_STANDARD

    base = CUSTOMER_BASE_FEE.get(tier, 0.0)

    try:
        weight = float(weight_kg) if weight_kg not in (None, "") else 0.0
    except (TypeError, ValueError):
        weight = 0.0
    weight = max(0.0, min(weight, CUSTOMER_WEIGHT_CAP_KG))
    weight_component = round(weight * CUSTOMER_PER_KG, 2)

    active = normalize(flags)
    handling_fee = round(sum(CUSTOMER_HANDLING_FEE.get(f, 0.0) for f in active), 2)

    subtotal = base + weight_component + handling_fee
    total = round(max(subtotal, CUSTOMER_MIN_CHARGE), 2)

    return {
        "tier": tier,
        "base_fee": round(base, 2),
        "weight_kg": round(weight, 2),
        "weight_component": weight_component,
        "handling_flags": sorted(active),
        "handling_fee": handling_fee,
        "min_charge_applied": total > subtotal,
        "total": total,
    }


def quote_charge_breakdown(tier: Optional[str], weight_kg: Optional[float] = None,
                          flags: Optional[Iterable[str]] = None) -> List[Dict[str, Any]]:
    """Line items for the checkout summary, so the customer sees the maths."""
    q = quote_charge(tier, weight_kg, flags)
    lines: List[Dict[str, Any]] = [
        {"label": f"{q['tier'].capitalize()} delivery", "amount": q["base_fee"]},
    ]
    if q["weight_component"] > 0:
        lines.append({
            "label": f"Weight · {q['weight_kg']:g} kg",
            "amount": q["weight_component"],
        })
    for flag in q["handling_flags"]:
        lines.append({
            "label": f"Handling · {flag}",
            "amount": CUSTOMER_HANDLING_FEE.get(flag, 0.0),
        })
    lines.append({"label": "Total", "amount": q["total"], "emphasis": True})
    return lines