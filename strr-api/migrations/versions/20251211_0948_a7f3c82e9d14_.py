"""Add registration_json and registration_tsv columns for full-text search

Revision ID: a7f3c82e9d14
Revises: a9f3c7e8b2d1
Create Date: 2024-12-11 09:48:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy_utils.types.ts_vector import TSVectorType

# revision identifiers, used by Alembic.
revision = 'a7f3c82e9d14'
down_revision = 'a9f3c7e8b2d1'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('registrations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('registration_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
        batch_op.add_column(sa.Column('registration_tsv', TSVectorType(), sa.Computed("jsonb_to_tsvector('english', COALESCE(\"registration_json\", '{}'), '[\"string\"]')", persisted=True), nullable=True))
        batch_op.create_index('idx_registration_tsv', ['registration_tsv'], unique=False, postgresql_using='gin')
        batch_op.create_index('idx_gin_registration_json_path_ops', ['registration_json'], unique=False, postgresql_using='gin', postgresql_ops={'registration_json': 'jsonb_path_ops'})


def downgrade():
    with op.batch_alter_table('registrations', schema=None) as batch_op:
        batch_op.drop_index('idx_gin_registration_json_path_ops', postgresql_using='gin')
        batch_op.drop_index('idx_registration_tsv', postgresql_using='gin')
        batch_op.drop_column('registration_tsv')
        batch_op.drop_column('registration_json')
