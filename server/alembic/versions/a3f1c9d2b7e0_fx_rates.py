"""fx_rates table

Revision ID: a3f1c9d2b7e0
Revises: 61e3200f8a8e
Create Date: 2026-09-11
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a3f1c9d2b7e0"
down_revision: Union[str, None] = "61e3200f8a8e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "fx_rates",
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("sgd_per_unit", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("currency"),
    )


def downgrade() -> None:
    op.drop_table("fx_rates")
