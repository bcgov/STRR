import os
import json
import pytest

from str_api.services.json_schema import SchemaService


@pytest.mark.parametrize(
    "test_name, invalid_json_file_name, expected_error",
    [
        (
            "Invalid date format -- effectiveDate",
            "effective_date_invalid_format.json",
            "'2022-01-01----' is not a 'date'"
        ),
        (
            "Missing required fields -- effectiveDate",
            "effective_date_missing.json",
            "'effectiveDate' is a required property"
        )
    ],
)
def test_invalid_significant_individuals_filing_schema(
    client, session, test_name, invalid_json_file_name, expected_error
):
    current_dir = os.path.dirname(__file__)
    with open(
        os.path.join(current_dir, "..", "..", "mocks", "significantIndividualsFiling", invalid_json_file_name)
    ) as file:
        data = json.load(file)
        ss = SchemaService()
        [valid, errors] = ss.validate(schema_name="str-filing.schema.json", data=data)
        assert valid is False
        assert expected_error in [error["message"] for error in errors]


def test_valid_significant_individuals_filing_schema():
    current_dir = os.path.dirname(__file__)

    with open(
        os.path.join(current_dir, "..", "..", "mocks", "significantIndividualsFiling", 'valid.json')
    ) as file:
        data = json.load(file)
        ss = SchemaService()
        [valid, errors] = ss.validate(schema_name="str-filing.schema.json", data=data)
        print(errors)
        assert valid is True
        assert len(errors) == 0
