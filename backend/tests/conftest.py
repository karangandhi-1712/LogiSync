"""Shared test fixtures.

Tests run against a THROWAWAY database, never the dev one. The previous suite
called `seed_database()` against the live `logisync.db` with no teardown, which
mutated real developer data; this module creates a dedicated schema per session
and points the app's engine at it.

Point at a real PostgreSQL instance with `TEST_DATABASE_URL` for the production
engine (recommended — it exercises the JSONB column and the Postgres UPDATE
semantics the atomic claim depends on). Without it, a file-based SQLite
database is used, which still exercises the guarded-UPDATE path.
"""

import os
import sys
import uuid
from pathlib import Path
from typing import Iterator

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

TEST_DB_URL = os.getenv("TEST_DATABASE_URL", "").strip()

if not TEST_DB_URL:
    _tmp = BACKEND_ROOT / "logisync_test.db"
    if _tmp.exists():
        _tmp.unlink()
    TEST_DB_URL = f"sqlite:///{_tmp}"

# Must be set before app.db imports the engine.
os.environ["DATABASE_URL"] = TEST_DB_URL
os.environ["AUTO_MIGRATE"] = "false"
os.environ["RATE_LIMIT_DEFAULT"] = "10000/minute"

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

import app.models  # noqa: F401,E402  — registers tables
from app.db import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.delivery_request import DeliveryRequestModel  # noqa: E402
from app.models.delivery_schedule import DeliveryScheduleModel  # noqa: E402
from app.models.user import UserModel  # noqa: E402
from app.ports import port_list  # noqa: E402
from app.seed import seed_ports  # noqa: E402
from app.services.password import hash_password  # noqa: E402

TEST_ENGINE = create_engine(
    TEST_DB_URL,
    connect_args=(
        # SQLite serialises writers on a single lock. A generous busy timeout
        # lets the losing racer in the atomic-claim test actually reach the
        # guarded UPDATE and observe rowcount == 0, instead of erroring out
        # with "database is locked" — which would test the wrong thing.
        {"check_same_thread": False, "timeout": 30}
        if TEST_DB_URL.startswith("sqlite") else {}
    ),
)

# expire_on_commit=False so objects returned by the factories below stay usable
# after the factory closes its own session.
SessionFactory = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE,
                              expire_on_commit=False)


def _override_get_db():
    db = SessionFactory()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.drop_all(bind=TEST_ENGINE)
    Base.metadata.create_all(bind=TEST_ENGINE)
    yield
    Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture()
def db() -> Iterator:
    session = SessionFactory()
    # Start each test from a clean slate, then re-seed the depot registry.
    # SQLAlchemy 2.0: Engine.execute() is gone, use an explicit connection.
    with TEST_ENGINE.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
    session.commit()
    seed_ports(session)
    session.commit()
    yield session
    session.close()


@pytest.fixture()
def client(db) -> Iterator[TestClient]:
    with TestClient(app) as c:
        yield c


# ── Factories ────────────────────────────────────────────────────────────────

def make_user(role: str, port_id: str = None, availability: str = "available",
              mobile: str = None) -> UserModel:
    uid = uuid.uuid4().hex[:8]
    session = SessionFactory()
    user = UserModel(
        id=uuid.uuid4().hex,
        role=role,
        full_name=f"{role} {uid}",
        email=f"{role}.{uid}@test.local",
        email_verified=True,
        mobile_number=mobile or f"+919{uid}",
        mobile_verified=True,
        password_hash=hash_password("Test@1234"),
        assigned_port_id=port_id,
        availability_status=availability,
        must_change_password=False,
    )
    session.add(user)
    session.commit()
    session.close()
    return user


def make_request(port_id: str = "voc", lat: float = 8.77, lng: float = 78.14,
                 tier: str = "standard") -> DeliveryRequestModel:
    session = SessionFactory()
    from app.models.consumer import ConsumerModel
    uid = uuid.uuid4().hex[:8]
    consumer = ConsumerModel(id=uuid.uuid4().hex, name=f"Consumer {uid}",
                             mobile_number=f"+918{uid}")
    session.add(consumer)
    session.flush()
    req = DeliveryRequestModel(
        id=uuid.uuid4().hex,
        token_number=f"LG-{uid.upper()}",
        consumer_id=consumer.id,
        created_by="consumer",
        pickup_port_id=port_id,
        delivery_address=f"{lat},{lng} test address",
        delivery_lat=lat,
        delivery_lng=lng,
        package_type="Box",
        priority_tier=tier,
        status="pending",
    )
    session.add(req)
    session.commit()
    session.close()
    return req


def make_schedule(fleet_manager_id: str, port_id: str = "voc",
                  center=(8.77, 78.14), radius: float = 5.0,
                  max_batch: int = 4, status: str = "broadcasting",
                  window=("06:00", "23:00")) -> DeliveryScheduleModel:
    session = SessionFactory()
    sched = DeliveryScheduleModel(
        id=uuid.uuid4().hex,
        fleet_manager_id=fleet_manager_id,
        port_id=port_id,
        area_label=f"Test area {uuid.uuid4().hex[:4]}",
        area_center_lat=center[0],
        area_center_lng=center[1],
        radius_km=radius,
        departure_window_start=window[0],
        departure_window_end=window[1],
        max_batch_size=max_batch,
        status=status,
        estimated_earnings=0.0,
    )
    session.add(sched)
    session.commit()
    session.close()
    return sched


def attach(session, schedule_id: str, request_id: str) -> DeliveryRequestModel:
    req = session.query(DeliveryRequestModel).filter(
        DeliveryRequestModel.id == request_id
    ).first()
    req.schedule_id = schedule_id
    req.status = "batched"
    session.commit()
    return req


def auth_headers(client: TestClient, user: UserModel) -> dict:
    resp = client.post("/api/auth/login", json={
        "identifier": user.email, "password": "Test@1234",
    })
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture()
def port_admin():
    return make_user("port_admin")


@pytest.fixture()
def fleet_manager():
    return make_user("fleet_manager", port_id="voc")


@pytest.fixture()
def driver():
    return make_user("driver")


@pytest.fixture()
def driver2():
    return make_user("driver")


@pytest.fixture()
def consumer_account(client):
    """A registered customer with an authenticated API session."""
    resp = client.post("/api/auth/register/consumer", json={
        "full_name": "Asha Consumer",
        "mobile": "+919876543210",
        "email": f"asha.{uuid.uuid4().hex[:8]}@example.com",
        "password": "Test@1234",
    })
    assert resp.status_code == 201, resp.text
    body = resp.json()
    return {
        "user_id": body["user_id"],
        "headers": {"Authorization": f"Bearer {body['access_token']}"},
    }
