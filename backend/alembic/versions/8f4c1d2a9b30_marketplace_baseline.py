"""marketplace baseline: ports, consumers, delivery requests, schedules, status log

Revision ID: 8f4c1d2a9b30
Revises:
Create Date: 2026-10-06

Supersedes the previous schema entirely. The slot-booking world (bookings, slots,
trucks, containers, shipments) is dropped in downgrade() rather than migrated:
the broadcast/claim/batch delivery mechanic has no field-level correspondence
with gate/slot booking, and the old tables held only demo rows.

Runs on both PostgreSQL and SQLite — JSONB degrades to JSON via with_variant on
the model, and no revision step uses a Postgres-only construct.
"""

from alembic import op
import sqlalchemy as sa

revision = "8f4c1d2a9b30"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ── Depots ───────────────────────────────────────────────────────────────
    op.create_table(
        "ports",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("code", sa.String(16), nullable=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("short", sa.String(64), nullable=True),
        sa.Column("city", sa.String(64), nullable=True),
        sa.Column("state", sa.String(64), nullable=True),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("zoom", sa.Float(), nullable=True),
        sa.Column("corridor", sa.String(128), nullable=True),
        sa.Column("orientation", sa.String(16), nullable=True),
        sa.Column("is_active", sa.String(8), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_ports_code", "ports", ["code"])

    # ── Users (role vocabulary is port_admin | fleet_manager | driver) ───────
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("full_name", sa.String(128), nullable=False),
        sa.Column("email", sa.String(256), nullable=False),
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("mobile_number", sa.String(32), nullable=False),
        sa.Column("mobile_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("password_hash", sa.String(256), nullable=False),
        sa.Column("photo_url", sa.String(512), nullable=True),
        sa.Column("vehicle_number", sa.String(32), nullable=True),
        sa.Column("vehicle_type", sa.String(32), nullable=True),
        sa.Column("assigned_port_id", sa.String(32), nullable=True),
        sa.Column("availability_status", sa.String(16), nullable=False, server_default="available"),
        sa.Column("going_offline_at", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_assigned_port_id", "users", ["assigned_port_id"])
    op.create_index("ix_users_availability_status", "users", ["availability_status"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_mobile_number", "users", ["mobile_number"], unique=True)

    # ── Consumers (no accounts — identity is name + mobile per request) ──────
    op.create_table(
        "consumers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("mobile_number", sa.String(32), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_consumers_mobile_number", "consumers", ["mobile_number"], unique=True)

    # ── Delivery schedules: the broadcastable batch ──────────────────────────
    op.create_table(
        "delivery_schedules",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("fleet_manager_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("port_id", sa.String(32), sa.ForeignKey("ports.id"), nullable=False),
        sa.Column("area_label", sa.String(160), nullable=False),
        sa.Column("area_center_lat", sa.Float(), nullable=False),
        sa.Column("area_center_lng", sa.Float(), nullable=False),
        sa.Column("radius_km", sa.Float(), nullable=False, server_default="6.0"),
        sa.Column("departure_window_start", sa.String(8), nullable=False),
        sa.Column("departure_window_end", sa.String(8), nullable=False),
        sa.Column("max_batch_size", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("status", sa.String(32), nullable=False, server_default="broadcasting"),
        sa.Column("claimed_by_driver_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("claimed_at", sa.DateTime(), nullable=True),
        sa.Column("locked_at", sa.DateTime(), nullable=True),
        sa.Column("departed_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(), nullable=True),
        sa.Column("estimated_earnings", sa.Float(), nullable=False, server_default="0"),
        sa.Column("final_earnings", sa.Float(), nullable=True),
        sa.Column("optimized_route", sa.JSON(), nullable=True),
        sa.Column("driver_lat", sa.Float(), nullable=True),
        sa.Column("driver_lng", sa.Float(), nullable=True),
        sa.Column("driver_heading", sa.Float(), nullable=True),
        sa.Column("driver_updated_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_delivery_schedules_status", "delivery_schedules", ["status"])
    op.create_index("ix_delivery_schedules_port_id", "delivery_schedules", ["port_id"])
    op.create_index("ix_delivery_schedules_fleet_manager_id", "delivery_schedules", ["fleet_manager_id"])
    op.create_index("ix_delivery_schedules_claimed_by_driver_id", "delivery_schedules", ["claimed_by_driver_id"])
    op.create_index("ix_delivery_schedules_created_at", "delivery_schedules", ["created_at"])

    # ── Delivery requests: one consumer parcel, later one stop ───────────────
    op.create_table(
        "delivery_requests",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("token_number", sa.String(32), nullable=False),
        sa.Column("consumer_id", sa.String(36), sa.ForeignKey("consumers.id"), nullable=False),
        sa.Column("created_by", sa.String(16), nullable=False, server_default="consumer"),
        sa.Column("created_by_user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("pickup_port_id", sa.String(32), sa.ForeignKey("ports.id"), nullable=False),
        sa.Column("delivery_address", sa.String(512), nullable=False),
        sa.Column("delivery_lat", sa.Float(), nullable=False),
        sa.Column("delivery_lng", sa.Float(), nullable=False),
        sa.Column("package_type", sa.String(64), nullable=True),
        sa.Column("package_weight", sa.Float(), nullable=True),
        sa.Column("special_handling", sa.String(512), nullable=True),
        sa.Column("priority_tier", sa.String(16), nullable=False, server_default="standard"),
        sa.Column("requested_window_start", sa.String(8), nullable=True),
        sa.Column("requested_window_end", sa.String(8), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("failure_reason", sa.String(512), nullable=True),
        sa.Column("schedule_id", sa.String(36), sa.ForeignKey("delivery_schedules.id"), nullable=True),
        sa.Column("stop_sequence", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_delivery_requests_token_number", "delivery_requests", ["token_number"], unique=True)
    op.create_index("ix_delivery_requests_status", "delivery_requests", ["status"])
    op.create_index("ix_delivery_requests_schedule_id", "delivery_requests", ["schedule_id"])
    op.create_index("ix_delivery_requests_pickup_port_id", "delivery_requests", ["pickup_port_id"])
    op.create_index("ix_delivery_requests_consumer_id", "delivery_requests", ["consumer_id"])
    op.create_index("ix_delivery_requests_created_at", "delivery_requests", ["created_at"])

    # ── Audit trail: schedule-level and stop-level status changes ────────────
    op.create_table(
        "status_update_log",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("delivery_request_id", sa.String(36), sa.ForeignKey("delivery_requests.id"), nullable=True),
        sa.Column("schedule_id", sa.String(36), sa.ForeignKey("delivery_schedules.id"), nullable=True),
        sa.Column("old_status", sa.String(32), nullable=True),
        sa.Column("new_status", sa.String(32), nullable=False),
        sa.Column("updated_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("reason", sa.String(512), nullable=True),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_status_update_log_delivery_request_id", "status_update_log", ["delivery_request_id"])
    op.create_index("ix_status_update_log_schedule_id", "status_update_log", ["schedule_id"])
    op.create_index("ix_status_update_log_timestamp", "status_update_log", ["timestamp"])

    # ── OTP verifications (driver sign-up mobile/email verification) ─────────
    op.create_table(
        "otp_verifications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("target_type", sa.String(16), nullable=False),
        sa.Column("target_value", sa.String(256), nullable=False),
        sa.Column("otp_code_hash", sa.String(256), nullable=False),
        sa.Column("purpose", sa.String(32), nullable=False, server_default="signup"),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_otp_verifications_target_type", "otp_verifications", ["target_type"])
    op.create_index("ix_otp_verifications_target_value", "otp_verifications", ["target_value"])

    # ── Audit trail + user settings (carried over unchanged) ─────────────────
    op.create_table(
        "audit_trail",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("user_id", sa.String(64), nullable=True, server_default="system"),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_audit_trail_event_type", "audit_trail", ["event_type"])

    op.create_table(
        "user_settings",
        sa.Column("user_id", sa.String(64), primary_key=True),
        sa.Column("theme", sa.String(32), nullable=True, server_default="light"),
        sa.Column("tutorial_enabled", sa.String(16), nullable=True, server_default="true"),
        sa.Column("notification_sms", sa.String(16), nullable=True, server_default="true"),
        sa.Column("notification_push", sa.String(16), nullable=True, server_default="true"),
        sa.Column("notification_inapp", sa.String(16), nullable=True, server_default="true"),
        sa.Column("default_map_mode", sa.String(32), nullable=True, server_default="roadmap"),
        sa.Column("default_zoom", sa.String(16), nullable=True, server_default="12"),
        sa.Column("units", sa.String(16), nullable=True, server_default="metric"),
        sa.Column("preferences", sa.JSON(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table("user_settings")
    op.drop_table("audit_trail")
    op.drop_table("otp_verifications")
    op.drop_table("status_update_log")
    op.drop_table("delivery_requests")
    op.drop_table("delivery_schedules")
    op.drop_table("consumers")
    op.drop_table("users")
    op.drop_table("ports")