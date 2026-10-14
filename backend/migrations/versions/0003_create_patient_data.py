"""Create patient data tables: health logs, appointments, medications, adherence, records, passport, grants."""

from alembic import op
import sqlalchemy as sa

revision = "0003_create_patient_data"
down_revision = "0002_create_patient_profiles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "health_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("log_date", sa.Date(), nullable=False),
        sa.Column("metric_type", sa.String(length=30), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id", ], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "log_date", "metric_type", name="uq_health_log_day_metric"),
    )
    op.create_index("ix_health_logs_user_id", "health_logs", ["user_id"])

    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("doctor_name", sa.String(length=120), nullable=False),
        sa.Column("specialty", sa.String(length=60), nullable=True),
        sa.Column("appointment_date", sa.Date(), nullable=False),
        sa.Column("appointment_time", sa.Time(), nullable=False),
        sa.Column("visit_type", sa.String(length=20), nullable=False),
        sa.Column("location", sa.String(length=200), nullable=True),
        sa.Column("status", sa.String(length=15), nullable=False),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id", ], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_appointments_user_id", "appointments", ["user_id"])

    op.create_table(
        "medications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("dosage", sa.String(length=80), nullable=True),
        sa.Column("instructions", sa.String(length=300), nullable=True),
        sa.Column("schedule_time", sa.Time(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id", ], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_medications_user_id", "medications", ["user_id"])

    op.create_table(
        "medication_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("medication_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("log_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=10), nullable=False),
        sa.Column("recorded_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["medication_id", ], ["medications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id", ], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("medication_id", "log_date", name="uq_med_log_day"),
    )
    op.create_index("ix_medication_logs_medication_id", "medication_logs", ["medication_id"])
    op.create_index("ix_medication_logs_user_id", "medication_logs", ["user_id"])

    op.create_table(
        "medical_records",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("record_type", sa.String(length=40), nullable=False),
        sa.Column("record_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id", ], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_medical_records_user_id", "medical_records", ["user_id"])

    op.create_table(
        "health_passports",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("health_id", sa.String(length=36), nullable=False),
        sa.Column("access_code", sa.String(length=64), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id", ], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_health_passport_user"),
        sa.UniqueConstraint("health_id", name="uq_health_passport_health_id"),
        sa.UniqueConstraint("access_code", name="uq_health_passport_access_code"),
    )

    op.create_table(
        "access_grants",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("patient_user_id", sa.Integer(), nullable=False),
        sa.Column("doctor_user_id", sa.Integer(), nullable=False),
        sa.Column("patient_note", sa.String(length=200), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["doctor_user_id", ], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["patient_user_id", ], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("patient_user_id", "doctor_user_id", name="uq_access_grant_pair"),
    )
    op.create_index("ix_access_grants_patient_user_id", "access_grants", ["patient_user_id"])
    op.create_index("ix_access_grants_doctor_user_id", "access_grants", ["doctor_user_id"])


def downgrade() -> None:
    op.drop_table("access_grants")
    op.drop_table("health_passports")
    op.drop_table("medical_records")
    op.drop_table("medication_logs")
    op.drop_table("medications")
    op.drop_table("appointments")
    op.drop_table("health_logs")
