CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE OR REPLACE FUNCTION generate_unique_application_number() RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    number_part TEXT;
    done BOOL;
BEGIN
    done := false;
    WHILE NOT done LOOP
        number_part := '';
        FOR i IN 1..14 LOOP
            number_part := number_part || floor(random() * 10)::text;
        END LOOP;
        new_number := number_part;
        done := NOT EXISTS (SELECT 1 FROM application WHERE application_number = new_number);
    END LOOP;
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

UPDATE application
    SET application_number = generate_unique_application_number()
    WHERE application_number IS NULL;

DROP FUNCTION generate_unique_application_number();