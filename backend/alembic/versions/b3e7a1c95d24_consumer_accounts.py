"""consumer accounts: link the consumers table to real users rows

Revision ID: b3e7a1c95d24
Revises: 8f4c1d2a9b30
Create Date: 2026-10-07

Consumers previously had no account — they identified with name + mobile per
request. This revision promotes them to first-class accounts:

  * consumers.user_id  — links a consumer to its `users` row (role=consumer).
    Stored alongside `mobile_number` rather than replacing it, so an order keeps
    resolving to the right person even if the account later changes its mobile.

  * users.consumer_at — a convenience timestamp for "customer since" columns.
    Optional; nothing depends on it.

Existing guest rows are backfilled by matching consumers.mobile_number against
users.mobile_number. Rows with no matching account stay unlinked (user_id NULL)
and simply never surface in an account-scoped listing.

No revision step uses a Postgres-only construct, so this runs on SQLite too.
"""

from alembic import op
import sqlalchemy as sa

revision = "b3e7a1c95d24"
down_revision = "8f4c1d2a9b30"
branch_labels = None
depends_on = None


def upgrade():
    from sqlalchemy import inspect
    bind = op.get_bind()
    insp = inspect(bind)

    consumer_cols = [c["name"] for c in insp.get_columns("consumers")]
    if "user_id" not in consumer_cols:
        op.add_column("consumers", sa.Column("user_id", sa.String(36), nullable=True))
        try:
            op.create_foreign_key(
                "fk_consumers_user_id",
                "consumers",
                "users",
                ["user_id"],
                ["id"],
            )
            op.create_index("ix_consumers_user_id", "consumers", ["user_id"], unique=False)
        except Exception:
            pass

    user_cols = [c["name"] for c in insp.get_columns("users")]
    if "consumer_at" not in user_cols:
        op.add_column("users", sa.Column("consumer_at", sa.DateTime(), nullable=True))

    # Link guest consumers to accounts that already exist for the same number.
    op.execute(
        """
        UPDATE consumers
        SET user_id = (
            SELECT u.id FROM users u
            WHERE u.mobile_number = consumers.mobile_number
              AND u.role = 'consumer'
            LIMIT 1
        )
        WHERE user_id IS NULL
        """
    )

    # Backfill the "customer since" stamp from the consumer row's own creation.
    op.execute(
        """
        UPDATE users
        SET consumer_at = (
            SELECT c.created_at FROM consumers c WHERE c.user_id = users.id
        )
        WHERE role = 'consumer'
          AND consumer_at IS NULL
          AND EXISTS (SELECT 1 FROM consumers c WHERE c.user_id = users.id)
        """
    )


def downgrade():
    op.drop_column("users", "consumer_at")
    op.drop_index("ix_consumers_user_id", table_name="consumers")
    op.drop_constraint("fk_consumers_user_id", "consumers", type_="foreignkey")
    op.drop_column("consumers", "user_id")