"""empty message

Revision ID: 7a9f3c2e8b5d
Revises: 144db4d9467d
Create Date: 2024-09-08 07:10:30.198085

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func

# revision identifiers, used by Alembic.
revision = '7a9f3c2e8b5d'
down_revision = '144db4d9467d'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('application', sa.Column('application_number', sa.String(15), nullable=True, unique=True))
    op.execute(
        """
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
        CREATE OR REPLACE FUNCTION generate_unique_application_number() RETURNS TEXT AS $$
        DECLARE
            new_number TEXT;
            done BOOL;
        BEGIN
            done := false;
            WHILE NOT done LOOP
                new_number := substr(encode(gen_random_bytes(12), 'base64'), 1, 15);
                done := NOT EXISTS (SELECT 1 FROM application WHERE application_number = new_number);
            END LOOP;
            RETURN new_number;
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    op.execute(
        """
        UPDATE application
        SET application_number = generate_unique_application_number()
        WHERE application_number IS NULL;
        """
    )

    op.alter_column('application', 'application_number', nullable=False)
    op.execute("DROP FUNCTION generate_unique_application_number();")

def downgrade():
    op.drop_column('application', 'application_number')
