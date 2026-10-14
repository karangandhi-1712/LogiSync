"""Special-handling flags.

A parcel's handling requirements drive both the driver's pay and the customer's
charge, so they have to be machine-readable. Customers now pick chips at intake
which land directly in `delivery_requests.handling_flags`; this module exists to
normalise those flags and to recover them from the older free-text
`special_handling` note when no structured value was stored.
"""

from typing import Iterable, Optional, Set

from app.constants import (
    HANDLING_FLAG_SEPARATOR,
    HANDLING_FRAGILE,
    HANDLING_LIQUID,
    HANDLING_REFRIGERATED,
    HANDLING_UPRIGHT,
    VALID_HANDLING,
)

#: Free-text tokens that imply each flag. The customer note is prose ("glass,
#: please keep upright"), so substring matching is the only way to honour rows
#: captured before the chips existed.
_TEXT_HINTS = {
    HANDLING_FRAGILE: ("fragile", "glass", "breakable", "porcelain", "delicate"),
    HANDLING_UPRIGHT: (
        "upright", "this side up", "this-side-up", "do not tilt", "no top load",
        "top load", "keep standing", "vertical",
    ),
    HANDLING_REFRIGERATED: (
        "refrigerat", "reefer", "cold chain", "cold-chain", "temperature control",
        "temperature-controlled", "chilled", "frozen", "perishable",
    ),
    HANDLING_LIQUID: ("liquid", "drum", "bottle", "jerrycan", "canister", "oil drum"),
}

#: Package types that imply a flag on their own, with no note written.
_TYPE_HINTS = {
    "reefer box": HANDLING_REFRIGERATED,
    "refrigerated": HANDLING_REFRIGERATED,
    "drum": HANDLING_LIQUID,
}


def normalize(flags: Optional[Iterable[str]]) -> Set[str]:
    """Keep only recognised flags, lowercased and de-duplicated."""
    if not flags:
        return set()
    out: Set[str] = set()
    for raw in flags:
        if raw is None:
            continue
        token = str(raw).strip().lower()
        if token in VALID_HANDLING:
            out.add(token)
    return out


def serialize(flags: Iterable[str]) -> str:
    """Flags as the comma-joined string the `handling_flags` column stores."""
    return HANDLING_FLAG_SEPARATOR.join(sorted(normalize(flags)))


def deserialize(value: Optional[str]) -> Set[str]:
    """Read the stored column back into a set. Tolerates NULL and junk."""
    if not value:
        return set()
    return normalize(str(value).split(HANDLING_FLAG_SEPARATOR))


def parse_text(note: Optional[str]) -> Set[str]:
    """Recover flags from a free-text special-handling note."""
    if not note:
        return set()
    low = str(note).lower()
    return {
        flag for flag, hints in _TEXT_HINTS.items()
        if any(hint in low for hint in hints)
    }


def resolve(flags: Optional[Iterable[str]] = None,
            note: Optional[str] = None,
            package_type: Optional[str] = None) -> Set[str]:
    """The authoritative flag set for a parcel.

    Structured flags win; the note and package type only contribute hints the
    customer did not already express as a chip.
    """
    out = normalize(flags)
    if note:
        out |= parse_text(note)
    if package_type:
        implied = _TYPE_HINTS.get(str(package_type).strip().lower())
        if implied:
            out.add(implied)
    return out