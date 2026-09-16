"""Host drafts retain incomplete addresses in applicant dashboard responses."""

from http import HTTPStatus

import pytest

from tests.shared_test_constants import ACCOUNT_ID
from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header_account


@pytest.mark.parametrize(
    "address_fields",
    [{}, {"unitAddress": {}}, {"unitAddress": {"city": "Victoria"}}],
    ids=["omitted-address", "empty-address", "partial-address"],
)
def test_incomplete_host_draft_address_is_preserved(session, client, jwt, address_fields):
    """Draft create, list and search do not require a completed unit address."""
    headers = create_header_account(jwt, roles=[PUBLIC_USER], account_id=ACCOUNT_ID)
    headers["isDraft"] = True
    registration = {"registrationType": "HOST", **address_fields}

    response = client.post("/applications", json={"registration": registration}, headers=headers)
    assert response.status_code == HTTPStatus.OK
    application_number = response.json["header"]["applicationNumber"]
    assert response.json["header"]["status"] == "DRAFT"
    assert response.json["registration"] == registration

    for endpoint in ["/applications", "/applications/user/search"]:
        response = client.get(
            endpoint,
            query_string={"registrationType": "HOST", "recordNumber": application_number, "status": "DRAFT"},
            headers=headers,
        )
        assert response.status_code == HTTPStatus.OK
        rows = response.json["applications"]
        assert len(rows) == 1
        assert rows[0]["header"]["applicationNumber"] == application_number
        assert rows[0]["registration"] == registration
