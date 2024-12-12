"""empty message

Revision ID: 4b06b9e4a053
Revises: 4298c4cb3f07
Create Date: 2024-06-17 00:54:23.116694

"""
import os
from alembic import op
from sqlalchemy.sql.expression import text

# revision identifiers, used by Alembic.
revision = '412aa6608c42'
down_revision = '4b06b9e4a053'
branch_labels = None
depends_on = None

sql_script_dir = os.path.join(os.path.abspath(
    os.path.dirname(__file__)), '../raw_sql/')


def upgrade():
    pass


def downgrade():
    pass
