"""empty message

Revision ID: 8b2e4d1f9c3a
Revises: 7a9f3c2e8b5d
Create Date: 2024-09-16 14:20:36.631552

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func

# revision identifiers, used by Alembic.
revision = '8b2e4d1f9c3a'
down_revision = '7a9f3c2e8b5d'
branch_labels = None
depends_on = None

def upgrade():
    op.alter_column('application', 'application_number', nullable=True)
    op.execute(
        """
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
        CREATE OR REPLACE FUNCTION generate_unique_application_number(app_date date) RETURNS TEXT AS $$
        DECLARE
            new_number TEXT;
            date_part TEXT;
            number_part TEXT;
            done BOOL;
        BEGIN
            date_part := to_char(app_date, 'YYYYMMDD');
            done := false;
            WHILE NOT done LOOP
                number_part := '';
                FOR i IN 1..5 LOOP
                    number_part := number_part || floor(random() * 10)::text;
                END LOOP;
                new_number := date_part || '-' || number_part;
                done := NOT EXISTS (SELECT 1 FROM application WHERE application_number = new_number);
            END LOOP;
            RETURN new_number;
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    # Update all existing rows
    op.execute(
        """
        UPDATE application 
        SET application_number = generate_unique_application_number(COALESCE(application_date::date, current_date))
        """
    )
    op.alter_column('application', 'application_number', nullable=False)
    op.create_index('ix_application_number_unique', 'application', ['application_number'], unique=True)
    op.execute("DROP FUNCTION generate_unique_application_number(date);")

def downgrade():
    op.drop_index('ix_application_number_unique', table_name='application')
    op.alter_column('application', 'application_number', nullable=True)
    op.execute("UPDATE application SET application_number = NULL")
