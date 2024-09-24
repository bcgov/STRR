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

UPDATE application
    SET application_number = generate_unique_application_number(application_date::date)
    WHERE application_number IS NULL;

DROP FUNCTION generate_unique_application_number(date);