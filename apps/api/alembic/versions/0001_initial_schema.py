"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-18
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "CREATE TYPE jobstatus AS ENUM "
        "('queued','downloading','processing','running_inference','stitching','uploading','complete','failed')"
    )
    op.create_table(
        "jobs",
        sa.Column("id", sa.String(16), primary_key=True),
        sa.Column("video_url", sa.Text, nullable=False),
        sa.Column("sha256", sa.String(64), nullable=True),
        sa.Column("status", sa.Enum(
            "queued","downloading","processing","running_inference",
            "stitching","uploading","complete","failed",
            name="jobstatus",
        ), nullable=False, server_default="queued"),
        sa.Column("progress_pct", sa.Integer, nullable=False, server_default="0"),
        sa.Column("duration_sec", sa.Float, nullable=True),
        sa.Column("vertex_blob_key", sa.String(256), nullable=True),
        sa.Column("has_audio", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("has_speech", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("jobs")
    op.execute("DROP TYPE jobstatus")
