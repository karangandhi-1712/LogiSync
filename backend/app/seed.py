"""Idempotent seeding for the delivery marketplace.

Only two things are seeded: the 12 depot rows (from the app/ports.py registry)
and, when explicitly asked, a single port_admin account. Demo delivery
requests/schedules are NOT seeded — they were demo data for the removed
slot-booking flow and would pollute marketplace analytics.
"""

import os
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.consumer import ConsumerModel
from app.models.port import PortModel
from app.models.user import UserModel
from app.ports import port_list
from app.services.password import hash_password


def seed_ports(db: Session) -> int:
    """Upsert the depot registry into the `ports` table. Returns rows written."""
    written = 0
    for row in port_list():
        existing = db.query(PortModel).filter(PortModel.id == row["id"]).first()
        if existing:
            # Keep the row in sync with the registry without churning updated_at.
            existing.name = row["name"]
            existing.short = row["short"]
            existing.city = row["city"]
            existing.state = row["state"]
            existing.lat = row["lat"]
            existing.lng = row["lng"]
            existing.zoom = float(row["zoom"])
            existing.corridor = row["corridor"]
            continue
        db.add(PortModel(id=row["id"], **{
            k: row[k] for k in ("code", "name", "short", "city", "state", "lat", "lng", "corridor")
        }, zoom=float(row["zoom"])))
        written += 1
    db.commit()
    return written


def seed_admin(db: Session, email: str, password: str, full_name: str = "Port Admin",
               mobile: str = "+919840000001") -> str:
    """Create the single port_admin account if no admin exists yet."""
    if db.query(UserModel).filter(UserModel.role == "port_admin").first():
        return "exists"
    if db.query(UserModel).filter(UserModel.email == email).first():
        return "email-taken"
    admin = UserModel(
        role="port_admin", full_name=full_name, email=email, email_verified=True,
        mobile_number=mobile, mobile_verified=True, password_hash=hash_password(password),
        assigned_port_id=None,
    )
    db.add(admin)
    db.commit()
    return "created"


def seed_demo_accounts(db: Session) -> dict[str, str]:
    """Seed demo accounts for all roles if not already present."""
    results = {}

    # 1. Port Admin
    if not db.query(UserModel).filter(UserModel.email == "admin@logisync.ai").first():
        db.add(UserModel(
            role="port_admin", full_name="Port Admin", email="admin@logisync.ai",
            email_verified=True, mobile_number="+919840000001", mobile_verified=True,
            password_hash=hash_password("Admin@123"), assigned_port_id=None,
            is_active=True, must_change_password=False,
        ))
        results["admin"] = "created"
    else:
        results["admin"] = "exists"

    # 2. Driver
    if not db.query(UserModel).filter(UserModel.email == "driver@logisync.ai").first():
        db.add(UserModel(
            role="driver", full_name="Ravi Kumar", email="driver@logisync.ai",
            email_verified=True, mobile_number="+919840000002", mobile_verified=True,
            password_hash=hash_password("Driver@123"), vehicle_number="TN01AB1234",
            vehicle_type="container_truck", availability_status="available",
            is_active=True, must_change_password=False,
        ))
        results["driver"] = "created"
    else:
        results["driver"] = "exists"

    # 3. Fleet Manager
    if not db.query(UserModel).filter(UserModel.email == "manager@logisync.ai").first():
        db.add(UserModel(
            role="fleet_manager", full_name="Suresh Raman", email="manager@logisync.ai",
            email_verified=True, mobile_number="+919840000003", mobile_verified=True,
            password_hash=hash_password("Manager@123"), assigned_port_id="voc",
            is_active=True, must_change_password=False,
        ))
        results["fleet_manager"] = "created"
    else:
        results["fleet_manager"] = "exists"

    # 4. Customer
    if not db.query(UserModel).filter(UserModel.email == "customer@logisync.ai").first():
        c_user = UserModel(
            role="consumer", full_name="Ananya Sharma", email="customer@logisync.ai",
            email_verified=True, mobile_number="+919840000004", mobile_verified=True,
            password_hash=hash_password("Customer@123"), availability_status="offline",
            is_active=True, must_change_password=False,
        )
        db.add(c_user)
        db.flush()
        db.add(ConsumerModel(name="Ananya Sharma", mobile_number="+919840000004", user_id=c_user.id))
        results["customer"] = "created"
    else:
        results["customer"] = "exists"

    db.commit()
    return results


def seed_database() -> None:
    db = SessionLocal()
    try:
        written = seed_ports(db)
        print(f"[seed] ports upserted ({written} new)")
        admin_email = os.getenv("SEED_ADMIN_EMAIL")
        if admin_email:
            result = seed_admin(db, admin_email, os.getenv("SEED_ADMIN_PASSWORD", "Admin@123"))
            print(f"[seed] port_admin: {result}")
        demo_results = seed_demo_accounts(db)
        print(f"[seed] demo accounts: {demo_results}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()