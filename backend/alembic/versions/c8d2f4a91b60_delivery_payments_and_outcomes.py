"""delivery outcome timestamps, handling flags, and payments

Revision ID: c8d2f4a91b60
Revises: b3e7a1c95d24
Create Date: 2026-10-13

Three related additions to `delivery_requests`:

1. `out_for_delivery_at` / `delivered_at` — UTC stamps for the two transitions
   analytics and the customer-facing contact gate care about. `updated_at` cannot
   serve either role: `onupdate=datetime.utcnow` bumps it on *any* write, so it
   drifts whenever a stop is attached, reassigned or resequenced. On-time
   analytics was reading `updated_at` and comparing its UTC clock against the
   customer's IST window, which could never line up; both columns are backfilled
   from `updated_at` for existing rows so historical deliveries start scoring.

2. `handling_flags` — the structured counterpart to the free-text
   `special_handling` note. Drives both the driver earnings model and the
   customer quote. Existing rows are left NULL; app/services/handling.py falls
   back to parsing the note, so nothing needs a backfill here.

3. Payment columns — `payment_status` gates a request out of the fleet manager's
   pending queue until money has actually been captured, which is what makes
   "payment completed, then the request proceeds" true rather than decorative.
   Existing rows are marked `paid`: they were all created on the old pay-at-depot
   flow and must not suddenly become unbatched work.

No revision step uses a Postgres-only construct, so this runs on SQLite too.
"""

from alembic import op
import sqlalchemy as sa

revision = "c8d2f4a91b60"
down_revision = "b3e7a1c95d24"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("delivery_requests", sa.Column("handling_flags", sa.String(128), nullable=True))
    op.add_column("delivery_requests", sa.Column("out_for_delivery_at", sa.DateTime(), nullable=True))
    op.add_column("delivery_requests", sa.Column("delivered_at", sa.DateTime(), nullable=True))

    op.add_column(
        "delivery_requests", sa.Column("payment_status", sa.String(16), nullable=False, server_default="unpaid"),
    )
    op.add_column(
        "delivery_requests", sa.Column("payment_amount", sa.Float(), nullable=False, server_default="0"),
    )
    op.add_column("delivery_requests", sa.Column("payment_method", sa.String(32), nullable=True))
    op.add_column("delivery_requests", sa.Column("payment_ref", sa.String(64), nullable=True))
    op.add_column("delivery_requests", sa.Column("paid_at", sa.DateTime(), nullable=True))

    with op.batch_alter_table("delivery_requests") as batch:
        batch.create_index("ix_delivery_requests_payment_status", ["payment_status"])
        batch.create_index("ix_delivery_requests_payment_ref", ["payment_ref"])

    # Backfill the outcome stamps from updated_at, which is the closest thing the
    # existing rows have. `delivered_at` only for rows that actually delivered —
    # a cancelled stop's updated_at is its cancellation time, not a delivery.
    op.execute(
        "UPDATE delivery_requests SET delivered_at = updated_at "
        "WHERE status = 'delivered' AND delivered_at IS NULL"
    )
    # `out_for_delivery_at` cannot be recovered — only the status log knows whether
    # a stop ever went en route. Left NULL, which keeps driver contact details
    # hidden for historical rows. Correct default: do not retroactively disclose.
    #
    # Every pre-existing row was placed under the pay-at-depot flow.
    op.execute(
        "UPDATE delivery_requests SET payment_status = 'paid', payment_method = 'cash_on_depot' "
        "WHERE payment_status = 'unpaid'"
    )


def downgrade() -> None:
    with op.batch_alter_table("delivery_requests") as batch:
        batch.drop_index("ix_delivery_requests_payment_ref")
        batch.drop_index("ix_delivery_requests_payment_status")

    op.drop_column("delivery_requests", "paid_at")
    op.drop_column("delivery_requests", "payment_ref")
    op.drop_column("delivery_requests", "payment_method")
    op.drop_column("delivery_requests", "payment_amount")
    op.drop_column("delivery_requests", "payment_status")
    op.drop_column("delivery_requests", "delivered_at")
    op.drop_column("delivery_requests", "out_for_delivery_at")
    op.drop_column("delivery_requests", "handling_flags")