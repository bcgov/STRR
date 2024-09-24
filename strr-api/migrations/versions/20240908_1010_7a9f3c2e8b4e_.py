"""empty message

Revision ID: 7a9f3c2e8b4e
Revises: 144db4d9467d
Create Date: 2024-09-23 10:10:30.198085

"""
import os

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql.expression import text

# revision identifiers, used by Alembic.
revision = '7a9f3c2e8b4e'
down_revision = '144db4d9467d'
branch_labels = None
depends_on = None

sql_script_dir = os.path.join(os.path.abspath(
    os.path.dirname(__file__)), '../raw_sql/')


def upgrade():
    op.add_column('application', sa.Column('application_number', sa.String(14), nullable=True, unique=True))

    connection = op.get_bind()
    sql_script_path = os.path.join(sql_script_dir, 'add_application_number.sql')
    with open(sql_script_path, 'r') as file:
        populate_application_number_script = file.read()
    connection.execute(text(populate_application_number_script))

    op.alter_column('application', 'application_number', nullable=False)
    op.create_index('ix_application_number_unique', 'application', ['application_number'], unique=True)

def downgrade():
    op.drop_index('ix_application_number_unique', table_name='application')
    op.drop_column('application', 'application_number')
