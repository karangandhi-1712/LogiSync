"""Seed a realistic demo dataset for the LogiSync presentation.

Writes to a THROWAWAY database (`backend/logisync_demo.db`). The developer's real
`logisync.db` is never opened, read or written.

Everything downstream — the CSVs, the charts, the screenshots — is generated from
what this produces, so the deck shows a system behaving like the real one rather
than six hand-made rows. What is *generated* rather than *measured* is stated on
the slides.

Shape:
  12 depots · ~25 fleet managers · ~40 drivers · ~800 consumers
  ~520 delivery requests spread over 90 days, driven through the real status
  chain so `status_update_log`, batch fill and on-time figures are all
  internally consistent rather than sprinkled in.

Run:  python ppt_assets/seed_demo_data.py
"""

import os
import random
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))

DEMO_DB = BACKEND / "logisync_demo.db"
if DEMO_DB.exists():
    DEMO_DB.unlink()

os.environ["DATABASE_URL"] = f"sqlite:///{DEMO_DB}"
os.environ["AUTO_MIGRATE"] = "false"
os.environ["SEED_DEMO_ACCOUNTS"] = "false"

from app.db import Base, SessionLocal  # noqa: E402
from app.models.consumer import ConsumerModel  # noqa: E402
from app.models.delivery_request import DeliveryRequestModel  # noqa: E402
from app.models.delivery_schedule import DeliveryScheduleModel  # noqa: E402
from app.models.port import PortModel  # noqa: E402
from app.models.status_log import StatusUpdateLogModel  # noqa: E402
from app.models.user import UserModel  # noqa: E402
from app.ports import port_list  # noqa: E402
from app.services import handling  # noqa: E402
from app.services.earnings import (  # noqa: E402
    StopEarnings, earnings_quote, estimated_route_km,
)
from app.services.password import hash_password  # noqa: E402
from app.services.pricing import quote_charge  # noqa: E402
from app.constants import (  # noqa: E402
    AVAIL_AVAILABLE, AVAIL_BUSY, AVAIL_OFFLINE, TIER_EXPRESS, TIER_STANDARD, TIER_URGENT,
)
from app.services.schedule_engine import IST_OFFSET  # noqa: E402

SEED = 20261014
random.seed(SEED)

DAYS = 90
N_REQUESTS = 520
N_DRIVERS = 40
N_FLEET_MANAGERS = 25

PACKAGE_TYPES = ["Carton", "Pallet", "Reefer box", "Sack", "Drum", "Documents"]
# Weighted so most freight is ordinary and a visible minority is awkward.
PACKAGE_WEIGHTS = (
    ["Carton"] * 40 + ["Pallet"] * 22 + ["Documents"] * 12
    + ["Sack"] * 10 + ["Drum"] * 8 + ["Reefer box"] * 8
)
HANDLING_POOL = [
    (None, 0.58), ([], 0.10),
    (["fragile"], 0.12), (["upright"], 0.10),
    (["fragile", "upright"], 0.05), (["refrigerated"], 0.03),
    (["liquid"], 0.02),
]
FIRST = ["Asha", "Ravi", "Meena", "Karthik", "Priya", "Suresh", "Latha", "Arjun", "Divya",
         "Mohan", "Kavitha", "Sanjay", "Fatima", "Naveen", "Poornima", "Ganesh", "Rekha",
         "Vikram", "Anitha", "Suresh", "Bala", "Muthu", "Ramesh", "Shanthi", "Yusuf"]
LAST = ["Kumar", "Sharma", "Rajan", "Iyer", "Naidu", "Pillai", "Reddy", "Patel", "Das",
        "Menon", "Krishnan", "Bose", "Gupta", "Nair", "Chowdhury"]
CITIES = {
    "voc": ["Thoothukudi", "Tirunelveli", "Madurai", "Sivakasi"],
    "chennai": ["Chennai", "Ambattur", "Guindy", "Porur", "Tambaram"],
    "ennore": ["Chennai", "Manali", "Ponneri", "Gummidipoondi"],
    "mumbai": ["Mumbai", "Andheri", "Thane", "Navi Mumbai"],
    "jnpt": ["Navi Mumbai", "Panvel", "Taloja", "Kharghar"],
    "cochin": ["Kochi", "Ernakulam", "Thrissur", "Alappuzha"],
    "mangalore": ["Mangaluru", "Udupi", "Kannur", "Bhadrakali"],
    "mormugao": ["Vasco da Gama", "Panaji", "Mormugao", "Mapusa"],
    "deendayal": ["Kandla", "Bhuj", "Jamnagar", "Rajkot"],
    "haldia": ["Haldia", "Kolkata", "Howrah", "Diamond Harbour"],
    "paradip": ["Paradip", "Cuttack", "Bhubaneswar", "Puri"],
    "vizag": ["Visakhapatnam", "Guntur", "Rajahmundry", "Vijayawada"],
}


def weighted_choice(pool):
    roll = random.random()
    cum = 0.0
    for value, weight in pool:
        cum += weight
        if roll <= cum:
            return value
    return pool[-1][0]


def jitter_km(lat, lng, km):
    """Rough offset within `km` of a point, good enough for map realism."""
    import math
    dlat = random.uniform(-km, km) / 110.0
    dlng = random.uniform(-km, km) / (110.0 * max(0.2, math.cos(math.radians(lat))))
    return round(lat + dlat, 6), round(lng + dlng, 6)


def main() -> None:
    from app.db import engine
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        _seed(db)
    finally:
        db.close()

    # Report exactly what landed, so the deck's numbers are verifiable.
    from sqlalchemy import text
    s = SessionLocal()
    counts = {}
    for table in ("users", "ports", "consumers", "delivery_requests",
                  "delivery_schedules", "status_update_log"):
        counts[table] = s.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
    print("Demo database written:", DEMO_DB)
    for k, v in counts.items():
        print(f"  {k:20} {v}")
    s.close()


def _seed(db) -> None:
    now = datetime.utcnow()
    start = now - timedelta(days=DAYS)

    # ── Depots ────────────────────────────────────────────────────────────
    for row in port_list():
        db.add(PortModel(
            id=row["id"], code=row["code"], name=row["name"], short=row["short"],
            city=row["city"], state=row["state"], lat=row["lat"], lng=row["lng"],
            zoom=float(row["zoom"]), corridor=row["corridor"], is_active=True,
        ))
    db.commit()

    pw = hash_password("Demo@1234")

    # ── Port admins ────────────────────────────────────────────────────────
    db.add(UserModel(
        role="port_admin", full_name="Port Admin", email="admin@logisync.ai",
        email_verified=True, mobile_number="+919840000001", mobile_verified=True,
        password_hash=hash_password("Admin@123"), assigned_port_id=None,
        is_active=True, must_change_password=False, availability_status=AVAIL_OFFLINE,
    ))
    # The demo fleet-manager and driver accounts the UI advertises.
    db.add(UserModel(
        role="fleet_manager", full_name="Suresh Raman", email="manager@logisync.ai",
        email_verified=True, mobile_number="+919840000003", mobile_verified=True,
        password_hash=hash_password("Manager@123"), assigned_port_id="voc",
        is_active=True, must_change_password=False, availability_status=AVAIL_OFFLINE,
    ))
    db.add(UserModel(
        role="driver", full_name="Ravi Kumar", email="driver@logisync.ai",
        email_verified=True, mobile_number="+919840000002", mobile_verified=True,
        # Must match the credential the sign-in screen advertises and autofills.
        password_hash=hash_password("Driver@123"), vehicle_number="TN01AB1234",
        vehicle_type="container_truck", assigned_port_id=None, is_active=True,
        must_change_password=False, availability_status=AVAIL_AVAILABLE,
    ))
    db.add(UserModel(
        role="consumer", full_name="Ananya Sharma", email="customer@logisync.ai",
        email_verified=True, mobile_number="+919840000004", mobile_verified=True,
        password_hash=hash_password("Customer@123"), is_active=True,
        must_change_password=False, availability_status=AVAIL_OFFLINE,
        consumer_at=now - timedelta(days=DAYS),
    ))
    db.commit()

    consumer_user = db.query(UserModel).filter(UserModel.email == "customer@logisync.ai").first()
    db.add(ConsumerModel(
        name="Ananya Sharma", mobile_number="+919840000004", user_id=consumer_user.id,
    ))
    db.commit()

    # ── Fleet managers, one or two per depot ───────────────────────────────
    managers = []
    for i in range(N_FLEET_MANAGERS):
        port = port_list()[i % len(port_list())]
        first, last = random.choice(FIRST), random.choice(LAST)
        uid = uuid.uuid4().hex
        u = UserModel(
            role="fleet_manager", full_name=f"{first} {last}", email=f"fm.{uid[:8]}@logisync.ai",
            email_verified=True, mobile_number=f"+9198{random.randint(10000000, 99999999)}",
            mobile_verified=True, password_hash=pw, assigned_port_id=port["id"],
            is_active=random.random() > 0.08, must_change_password=False,
            availability_status=AVAIL_OFFLINE,
        )
        db.add(u)
        db.flush()
        managers.append(u)
    db.commit()

    # ── Drivers ────────────────────────────────────────────────────────────
    vehicles = [
        ("container_truck", "TN"), ("container_truck", "MH"), ("mini_truck", "KA"),
        ("mini_truck", "GJ"), ("temp_truck", "KL"), ("van", "DL"), ("van", "WB"),
    ]
    drivers = []
    for i in range(N_DRIVERS):
        first, last = random.choice(FIRST), random.choice(LAST)
        uid = uuid.uuid4().hex
        vtype, prefix = vehicles[i % len(vehicles)]
        plate = f"{prefix}{random.randint(10, 99)}{random.choice('ABCDEFGHJKLMNPQRSTUVWXYZ')}{random.randint(1000, 9999)}"
        avail = random.choices(
            [AVAIL_AVAILABLE, AVAIL_BUSY, AVAIL_OFFLINE], weights=[46, 30, 24]
        )[0]
        u = UserModel(
            role="driver", full_name=f"{first} {last}", email=f"drv.{uid[:8]}@logisync.ai",
            email_verified=True, mobile_number=f"+9198{random.randint(10000000, 99999999)}",
            mobile_verified=True, password_hash=pw, vehicle_number=plate,
            vehicle_type=vtype, assigned_port_id=None, is_active=random.random() > 0.06,
            must_change_password=False, availability_status=avail,
        )
        db.add(u)
        db.flush()
        drivers.append(u)
    db.commit()

    # ── Consumers ──────────────────────────────────────────────────────────
    consumers = []
    for i in range(800):
        first, last = random.choice(FIRST), random.choice(LAST)
        uid = uuid.uuid4().hex
        mobile = f"+9198{random.randint(10000000, 99999999)}"
        c = ConsumerModel(name=f"{first} {last}", mobile_number=mobile)
        db.add(c)
        db.flush()
        consumers.append(c)
    db.commit()

    # ── Requests + schedules ───────────────────────────────────────────────
    # Grouped by day so batching has something to batch.
    requests_by_day = {}
    for _ in range(N_REQUESTS):
        offset = random.choices(range(DAYS), weights=[3] * DAYS)[0]
        day = (start + timedelta(days=offset)).date()
        requests_by_day[day] = requests_by_day.get(day, 0) + 1

    log_rows = []
    for day in sorted(requests_by_day):
        # Working days carry the load; weekends are lighter, like a real depot.
        dow = day.weekday()
        if dow == 6:
            continue
        count = requests_by_day[day]
        if not count:
            continue

        day_start = datetime.combine(day, datetime.min.time()) + timedelta(hours=7)
        # Night shift of requests, so deliveries span a realistic working day.
        cursor = day_start + timedelta(minutes=random.randint(0, 240))

        for _ in range(count):
            cursor += timedelta(minutes=random.randint(12, 95))
            # Intake runs a 07:00-16:00 working day. Allowing intake later than
            # that leaves no room between "requested" and "requested window
            # closes", which would make an on-time delivery arithmetically
            # impossible and drag the on-time rate down for the wrong reason.
            if cursor.hour >= 16:
                cursor = cursor.replace(hour=7) + timedelta(days=1)
            if cursor > now:
                break

            # The depot works in IST wall-clock, so the *decision* clock is IST.
            # Only the stored column is UTC. Deriving the window from a UTC hour
            # and comparing it against an IST deadline is the same bug the app
            # itself had, and it silently caps the achievable on-time rate.
            created_ist = cursor + IST_OFFSET
            intake_hour = min(15, max(7, created_ist.hour))
            win_start = min(18, intake_hour + random.randint(1, 2))
            win_end = min(23, win_start + random.choice([4, 5, 6, 8]))

            port = random.choice(port_list())
            consumer = random.choice(consumers)
            tier = random.choices(
                [TIER_STANDARD, TIER_EXPRESS, TIER_URGENT], weights=[58, 30, 12]
            )[0]
            flags = weighted_choice(HANDLING_POOL) or []
            pkg = random.choice(PACKAGE_WEIGHTS)
            weight = round(random.choices(
                [random.uniform(0.2, 3), random.uniform(3, 18),
                 random.uniform(18, 45), random.uniform(45, 180)],
                weights=[24, 36, 26, 14],
            )[0], 2)

            lat, lng = jitter_km(port["lat"], port["lng"], random.uniform(3, 28))
            city = random.choice(CITIES.get(port["id"], [port["city"]]))
            address = f"{random.randint(1, 240)}, {random.choice(['Anna Salai','Station Road','Gandhi Nagar','Market Street','Anna Nagar','Bridge Road','Temple Street','MG Road','Nehru Nagar','Cross Cut Road'])}, {city}"

            # Requested window: always opens after intake and leaves at least four
            # hours of room, so "on time" is achievable rather than arithmetically
            # impossible. The old hardcoded 10:00-18:00 in the UI was the
            # opposite: for anyone booking after 18:00 it had already closed.
            quote = quote_charge(tier, weight, flags)
            created = cursor - IST_OFFSET
            # 3% of orders are never paid for.
            paid = random.random() > 0.03

            req = DeliveryRequestModel(
                id=uuid.uuid4().hex,
                token_number=f"LG-{uuid.uuid4().hex[:10].upper()}",
                consumer_id=consumer.id,
                created_by="consumer",
                created_by_user_id=consumer_user.id if random.random() > 0.85 else None,
                pickup_port_id=port["id"],
                delivery_address=address,
                delivery_lat=lat, delivery_lng=lng,
                package_type=pkg, package_weight=weight,
                special_handling=None,
                handling_flags=handling.serialize(flags) or None,
                priority_tier=tier,
                requested_window_start=f"{win_start:02d}:00",
                requested_window_end=f"{min(win_end, 23):02d}:59",
                status="pending",
                payment_status="paid" if paid else "unpaid",
                payment_amount=quote["total"],
                payment_method="cash_on_depot",
                paid_at=created if paid else None,
                created_at=created, updated_at=created,
            )
            db.add(req)
            db.flush()
            log_rows.append(req)

            # Age the request into its real outcome.
            _age(db, req, created, created_ist, now, port)

        db.commit()

    db.commit()
    # Live work first, so the batching pass below can claim some of it and leave
    # the rest sitting in the pending queue.
    n_live = _seed_live_tail(db, now, consumers, ports_all())
    db.commit()
    n_sched = _build_schedules(db, now, drivers, managers)
    _give_demo_driver_a_run(db, now)
    db.commit()
    print(f"seeded {len(log_rows)} requests across {DAYS} days, {n_sched} batches, "
          f"{n_live} live requests")


def ports_all():
    return port_list()


def _give_demo_driver_a_run(db, now) -> None:
    """Hand the advertised demo driver one live batch.

    `driver@logisync.ai` is the account the sign-in screen offers, so its home
    screen is what a reviewer lands on. Left empty it would read as "the driver
    has no work" rather than "this is the console".
    """
    driver = db.query(UserModel).filter(UserModel.email == "driver@logisync.ai").first()
    if driver is None:
        return
    already = db.query(DeliveryScheduleModel).filter(
        DeliveryScheduleModel.claimed_by_driver_id == driver.id
    ).first()
    if already is not None:
        return

    sched = db.query(DeliveryScheduleModel).filter(
        DeliveryScheduleModel.status.in_(["broadcasting", "claimed"])
    ).order_by(DeliveryScheduleModel.created_at.desc()).first()
    if sched is None:
        return

    claimed_at = now - timedelta(minutes=random.randint(20, 90))
    sched.claimed_by_driver_id = driver.id
    sched.claimed_at = claimed_at
    sched.locked_at = claimed_at + timedelta(minutes=random.randint(8, 30))
    sched.departed_at = sched.locked_at + timedelta(minutes=random.randint(3, 15))
    sched.status = "in_progress"
    sched.driver_lat = sched.area_center_lat + random.uniform(-0.03, 0.03)
    sched.driver_lng = sched.area_center_lng + random.uniform(-0.03, 0.03)
    sched.driver_heading = random.uniform(0, 360)
    sched.driver_updated_at = now

    stops = db.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.schedule_id == sched.id
    ).all()
    if stops:
        sched.optimized_route = {
            "order": [r.id for r in stops],
            "polyline": [
                [round(sched.area_center_lng, 5), round(sched.area_center_lat, 5)],
                [round(stops[0].delivery_lng, 5), round(stops[0].delivery_lat, 5)],
            ],
            "legs": [], "total_distance_km": 22.4,
            "total_duration_s": 4256, "simulated": True,
        }
    driver.availability_status = AVAIL_BUSY


def _seed_live_tail(db, now, consumers, plist) -> int:
    """Work that is in flight right now.

    The 90-day history ends with every request resolved, so the fleet manager's
    pending queue and the driver's job feed would both be empty. In-flight work
    is what those screens exist to show, so it is created explicitly rather than
    hoped for from the history generator — whose final day is truncated at `now`
    and so produces nothing.
    """
    from app.ports import port_center

    # Weight VOC heavily: it is the demo depot the seeded fleet manager and the
    # marketing copy both name, and it must open onto a populated console.
    spec = [("voc", 16), ("chennai", 6), ("mumbai", 5), ("cochin", 4),
            ("haldia", 4), ("vizag", 4), ("ennore", 3), ("mangalore", 3),
            ("paradip", 3), ("deendayal", 3), ("jnpt", 3), ("mormugao", 3)]

    made = 0
    for port_id, count in spec:
        plat, plng = port_center(port_id)
        for i in range(count):
            flags = weighted_choice(HANDLING_POOL) or []
            pkg = random.choice(PACKAGE_WEIGHTS)
            weight = round(random.choices(
                [random.uniform(0.3, 4), random.uniform(4, 20),
                 random.uniform(20, 48), random.uniform(48, 140)],
                weights=[28, 38, 24, 10],
            )[0], 2)
            tier = random.choices(
                [TIER_STANDARD, TIER_EXPRESS, TIER_URGENT], weights=[50, 32, 18]
            )[0]
            lat, lng = jitter_km(plat, plng, random.uniform(2, 14))
            city = random.choice(CITIES.get(port_id, [port_id]))
            address = f"{random.randint(1, 240)}, {random.choice(['Anna Salai','Station Road','Gandhi Nagar','Market Street','Anna Nagar','Bridge Road','MG Road'])}, {city}"
            created = now - timedelta(hours=random.uniform(0.5, 70))
            intake_hour = max(7, (created + IST_OFFSET).hour)
            win_start = min(18, intake_hour + 1)
            win_end = min(23, win_start + random.choice([4, 5, 6]))
            quote = quote_charge(tier, weight, flags)
            req = DeliveryRequestModel(
                id=uuid.uuid4().hex,
                token_number=f"LG-{uuid.uuid4().hex[:10].upper()}",
                consumer_id=random.choice(consumers).id,
                created_by="consumer",
                pickup_port_id=port_id,
                delivery_address=address,
                delivery_lat=lat, delivery_lng=lng,
                package_type=pkg, package_weight=weight,
                handling_flags=handling.serialize(flags) or None,
                priority_tier=tier,
                requested_window_start=f"{win_start:02d}:00",
                requested_window_end=f"{win_end:02d}:00",
                status="pending",
                payment_status="paid",
                payment_amount=quote["total"],
                payment_method="cash_on_depot",
                paid_at=created,
                created_at=created, updated_at=created,
            )
            db.add(req)
            made += 1
    db.flush()
    return made


def _cluster_by_geography(rows, radius_km=6.0, max_stops=8):
    """Group stops that are physically close, the way a fleet manager does.

    Grouping by calendar day produced one-stop batches, because a depot's daily
    work is spread over tens of kilometres. The real constraint is the FM's
    radius knob, so the grouping has to respect distance or every downstream
    figure — batch fill, the histogram, avg stops per run — is nonsense.
    """
    from app.ports import haversine_km

    remaining = sorted(rows, key=lambda r: (r.delivery_lat, r.delivery_lng))
    clusters = []
    while remaining:
        seed = remaining.pop(0)
        group = [seed]
        clat, clng = seed.delivery_lat, seed.delivery_lng
        still = []
        for r in remaining:
            if len(group) >= max_stops:
                still.append(r)
                continue
            if haversine_km(clat, clng, r.delivery_lat, r.delivery_lng) <= radius_km:
                group.append(r)
                clat = sum(g.delivery_lat for g in group) / len(group)
                clng = sum(g.delivery_lng for g in group) / len(group)
            else:
                still.append(r)
        remaining = still
        clusters.append(group)
    return clusters


def _build_schedules(db, now, drivers, managers) -> int:
    """Group resolved requests into batches.

    Without this the demo has no batches at all, and the fleet manager console,
    the batch-fill histogram and the busiest-areas analytics all render empty.
    Completed batches come from delivered history; live ones from work that is
    still in flight, so the FM console opens onto something real.
    """
    ports = {p["id"]: p for p in port_list()}
    managers_by_port = {}
    for m in managers:
        managers_by_port.setdefault(m.assigned_port_id, []).append(m)

    created = 0

    def make(pm, centre_lat, centre_lng, stops, when, status, cap, driver=None):
        nonlocal created
        pool = managers_by_port.get(pm["id"]) or []
        fm = random.choice(pool) if pool else None
        if fm is None:
            return None
        route_km = round(random.uniform(8, 46), 2)
        quote = earnings_quote(
            [StopEarnings(
                reference=r.token_number,
                tier=r.priority_tier,
                weight_kg=r.package_weight,
                flags=handling.deserialize(r.handling_flags),
            ) for r in stops],
            route_km,
        )
        sched = DeliveryScheduleModel(
            id=uuid.uuid4().hex,
            fleet_manager_id=fm.id,
            port_id=pm["id"],
            area_label=f"{random.choice(CITIES.get(pm['id'], [pm['city']]))} belt",
            area_center_lat=centre_lat, area_center_lng=centre_lng,
            radius_km=random.choice([4.0, 5.0, 6.0, 8.0, 10.0]),
            departure_window_start=f"{random.randint(6, 15):02d}:00",
            departure_window_end=f"{random.randint(17, 23):02d}:00",
            max_batch_size=cap,
            status=status,
            estimated_earnings=quote["stops_pay"] + quote["distance_pay"] + quote["batch_bonus"],
            created_at=when,
        )

        if status in ("claimed", "locked", "in_progress"):
            claimed_at = when + timedelta(minutes=random.randint(1, 42))
            sched.claimed_by_driver_id = driver.id
            sched.claimed_at = claimed_at
            if status in ("locked", "in_progress"):
                sched.locked_at = claimed_at + timedelta(minutes=random.randint(5, 55))
            if status == "in_progress":
                sched.departed_at = sched.locked_at + timedelta(minutes=random.randint(2, 25))
                sched.driver_lat = centre_lat + random.uniform(-0.05, 0.05)
                sched.driver_lng = centre_lng + random.uniform(-0.05, 0.05)
                sched.driver_heading = random.uniform(0, 360)
                sched.driver_updated_at = now
            sched.final_earnings = quote["total"]
            sched.optimized_route = {
                "order": [r.id for r in stops],
                "polyline": [
                    [round(centre_lng, 5), round(centre_lat, 5)],
                    [round(stops[0].delivery_lng, 5), round(stops[0].delivery_lat, 5)],
                ],
                "legs": [], "total_distance_km": route_km,
                "total_duration_s": int(route_km * 190), "simulated": True,
            }

        if status == "completed":
            completed_at = when + timedelta(hours=random.uniform(3, 11))
            sched.completed_at = completed_at
            sched.claimed_by_driver_id = driver.id if driver else None
            sched.claimed_at = when + timedelta(minutes=random.randint(1, 40))
            sched.locked_at = sched.claimed_at + timedelta(minutes=random.randint(5, 50))
            sched.departed_at = sched.locked_at + timedelta(minutes=random.randint(2, 20))
            sched.final_earnings = quote["total"]

        db.add(sched)
        db.flush()

        for seq, r in enumerate(stops, start=1):
            r.schedule_id = sched.id
            r.stop_sequence = seq
            if status == "broadcasting" and r.status == "pending":
                r.status = "batched"
        created += 1
        return sched

    # ── Historical: completed batches from delivered work ──────────────────
    done = db.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.status.in_(["delivered", "failed"]),
        DeliveryRequestModel.delivered_at.isnot(None),
    ).all()
    done_by_port = {}
    for r in done:
        done_by_port.setdefault(r.pickup_port_id, []).append(r)

    for port_id, rows in done_by_port.items():
        pm = ports.get(port_id)
        if not pm:
            continue
        for group in _cluster_by_geography(rows, radius_km=6.0, max_stops=8):
            clat = sum(r.delivery_lat for r in group) / len(group)
            clng = sum(r.delivery_lng for r in group) / len(group)
            # Cap sits at or just above what was filled, as a planner would set.
            cap = max(4, min(12, (len(group) + random.randint(0, 3)) // 2 * 2))
            make(pm, clat, clng, group,
                 max(r.created_at for r in group) + timedelta(minutes=random.randint(10, 90)),
                 "completed", cap, driver=random.choice(drivers))

    # ── Live: what the fleet manager sees today ────────────────────────────
    live_rows = db.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.status.in_(["pending", "batched", "assigned", "picked_up", "en_route"])
    ).all()

    # Hold a slice back unbatched. A depot where every request is already in a
    # batch shows an empty "pending requests" panel, which is a realistic state
    # but a useless screenshot — and it hides the queue this whole screen exists
    # to manage.
    holdback = set()
    for r in live_rows:
        if random.random() < 0.22:
            holdback.add(r.id)

    live_by_port = {}
    for r in live_rows:
        if r.id in holdback:
            continue
        live_by_port.setdefault(r.pickup_port_id, []).append(r)

    for port_id, rows in live_by_port.items():
        pm = ports.get(port_id)
        if not pm or not rows:
            continue
        for group in _cluster_by_geography(rows, radius_km=6.0, max_stops=8):
            clat = sum(r.delivery_lat for r in group) / len(group)
            clng = sum(r.delivery_lng for r in group) / len(group)
            cap = max(4, min(12, (len(group) + random.randint(0, 3)) // 2 * 2))
            when = max(r.created_at for r in group)
            status = random.choices(
                ["broadcasting", "claimed", "in_progress"], weights=[24, 26, 50]
            )[0]
            make(pm, clat, clng, group, when, status, cap,
                 driver=random.choice(drivers) if status != "broadcasting" else None)

    db.commit()
    return created


def _age(db, req, created, created_ist, now, port) -> None:
    """Move a request through the real status chain, with honest timing.

    `delivered_at` / `out_for_delivery_at` are stamped here because this script
    writes rows directly rather than driving the HTTP status endpoint.
    """
    age_hours = (now - created).total_seconds() / 3600.0

    if req.payment_status != "paid":
        if age_hours > 6 and random.random() < 0.5:
            req.status = "cancelled"
            log_rows_add(db, req, "pending", "cancelled", created + timedelta(hours=2), "abandoned unpaid")
            req.updated_at = created + timedelta(hours=2)
        return

    # Younger requests are still moving; older ones have resolved.
    if age_hours < 6:
        roll = random.random()
        if roll < 0.45:
            return
        req.status = random.choice(["batched", "assigned", "picked_up", "en_route"])
        req.updated_at = created + timedelta(hours=random.uniform(0.5, 4))
        return

    roll = random.random()
    if roll < 0.075:
        req.status = "cancelled"
        at = created + timedelta(hours=random.uniform(1, 6))
        req.updated_at = at
        log_rows_add(db, req, "pending", "cancelled", at, "cancelled by customer")
        return
    if roll < 0.105:
        req.status = "failed"
        at = created + timedelta(hours=random.uniform(2, 20))
        req.failure_reason = random.choice(
            ["customer unreachable", "address not found", "consignee refused",
             "vehicle breakdown", "depot rescheduled"]
        )
        req.out_for_delivery_at = at - timedelta(hours=random.uniform(0.3, 2))
        req.updated_at = at
        log_rows_add(db, req, "en_route", "failed", at, req.failure_reason)
        return

    # Delivered. Aim the completion inside the requested window most of the
    # time so on-time rate is a meaningful, non-degenerate number.
    w_start = int(req.requested_window_start.split(":")[0]) * 60 + int(req.requested_window_start.split(":")[1])
    w_end = int(req.requested_window_end.split(":")[0]) * 60 + int(req.requested_window_end.split(":")[1])
    on_time = random.random() < 0.93

    # The window is always generated to open after intake, so an on-time
    # delivery has real room inside it. Pick in IST wall-clock on the request's
    # own day, then convert to the UTC we store.
    if on_time:
        lo = max(w_start, created_ist.hour * 60 + created_ist.minute + 25)
        hi = w_end
        target_min = max(lo, hi) if lo >= hi else random.randint(lo, hi - 5)
    else:
        target_min = w_end + random.randint(25, 300)

    # Build the completion in IST wall-clock on the request's own day, then
    # convert once, on the way into the column.
    ist_naive = created_ist.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(minutes=target_min)
    delivered = ist_naive - IST_OFFSET
    if delivered <= created:
        delivered = created + timedelta(minutes=random.randint(25, 90))

    out_for = delivered - timedelta(minutes=random.uniform(8, 55))
    req.out_for_delivery_at = out_for
    req.delivered_at = delivered
    req.status = "delivered"
    req.updated_at = delivered

    log_rows_add(db, req, "batched", "assigned", out_for - timedelta(minutes=40), None)
    log_rows_add(db, req, "assigned", "picked_up", out_for - timedelta(minutes=18), None)
    log_rows_add(db, req, "picked_up", "en_route", out_for, None)
    log_rows_add(db, req, "en_route", "delivered", delivered, None)


def log_rows_add(db, req, old, new, when, reason):
    db.add(StatusUpdateLogModel(
        delivery_request_id=req.id,
        schedule_id=req.schedule_id,
        old_status=old, new_status=new,
        updated_by=None, reason=reason, timestamp=when,
    ))


if __name__ == "__main__":
    main()