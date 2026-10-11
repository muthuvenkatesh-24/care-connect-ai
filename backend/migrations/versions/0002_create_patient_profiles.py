"""Create patient_profiles for per-patient health details."""

from alembic import op
import sqlalchemy as sa

revision = "0002_create_patient_profiles"
down_revision = "0001_create_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "patient_profiles",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("gender", sa.String(length=60), nullable=True),
        sa.Column("address", sa.String(length=300), nullable=True),
        sa.Column("emergency_contact", sa.String(length=120), nullable=True),
        sa.Column("emergency_phone", sa.String(length=40), nullable=True),
        sa.Column("blood_type", sa.String(length=5), nullable=True),
        sa.Column("height_cm", sa.Float(), nullable=True),
        sa.Column("weight_kg", sa.Float(), nullable=True),
        sa.Column("allergies", sa.String(length=500), nullable=True),
        sa.Column("conditions", sa.String(length=500), nullable=True),
        sa.Column("medications", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("patient_profiles")
