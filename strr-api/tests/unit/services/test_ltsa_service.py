"""Additional LTSA service coverage (mocked HTTP + persistence)."""

from unittest.mock import MagicMock, patch

from strr_api.responses import LtsaResponse
from strr_api.services.ltsa_service import LtsaService


def _title_summaries_payload(title_number="T123"):
    return {
        "titleSummaries": [
            {
                "titleNumber": title_number,
                "landTitleDistrict": "New Westminster",
                "landTitleDistrictCode": "NW",
                "parcelIdentifier": "PID1",
                "status": "REGISTERED",
                "firstOwner": "A",
            }
        ]
    }


@patch("strr_api.services.ltsa_service.requests.get")
def test_get_title_number_from_pid_success(mock_get, app):
    mock_get.return_value.json.return_value = _title_summaries_payload("TN-99")
    with app.app_context():
        assert LtsaService.get_title_number_from_pid("PID1") == "TN-99"


@patch("strr_api.services.ltsa_service.requests.get")
def test_get_title_number_from_pid_invalid_payload_returns_none(mock_get, app):
    mock_get.return_value.json.return_value = {"titleSummaries": []}
    with app.app_context():
        assert LtsaService.get_title_number_from_pid("PID1") is None


@patch("strr_api.services.ltsa_service.LtsaService.get_title_number_from_pid")
@patch("strr_api.services.ltsa_service.requests.post")
def test_get_title_details_from_pid_posts_order(mock_post, mock_title, app):
    mock_title.return_value = "TN-1"
    mock_post.return_value.json.return_value = {"order": {"id": "o1"}}
    with app.app_context():
        out = LtsaService.get_title_details_from_pid("PID1")
    assert out == {"order": {"id": "o1"}}
    mock_post.assert_called_once()


@patch("strr_api.services.ltsa_service.LtsaService.get_title_number_from_pid")
def test_get_title_details_from_pid_no_title_returns_none(mock_title, app):
    mock_title.return_value = None
    with app.app_context():
        assert LtsaService.get_title_details_from_pid("PID1") is None


def test_build_ltsa_response_with_fielded_data(app):
    ltsa = {
        "order": {
            "orderedProduct": {
                "fieldedData": {
                    "titleStatus": "REGISTERED",
                    "titleIdentifier": {"titleNumber": "T1", "landTitleDistrict": "NW"},
                    "tombstone": {
                        "applicationReceivedDate": "",
                        "enteredDate": "",
                        "titleRemarks": "",
                        "marketValueAmount": "",
                        "fromTitles": [],
                        "natureOfTransfers": [],
                    },
                    "taxAuthorities": [],
                    "ownershipGroups": [],
                    "descriptionsOfLand": [],
                }
            }
        }
    }
    with app.app_context():
        with patch.object(LtsaService, "save_ltsa_record") as mock_save:
            mock_save.return_value = MagicMock()
            out = LtsaService.build_ltsa_response(7, ltsa)
    assert isinstance(out, LtsaResponse)
    mock_save.assert_called_once()


def test_build_ltsa_response_empty_fielded_returns_none():
    assert LtsaService.build_ltsa_response(1, {"order": {}}) is None


@patch("strr_api.models.LTSARecord.get_application_ltsa_records")
def test_get_application_ltsa_records_delegates(mock_get, app):
    mock_get.return_value = []
    with app.app_context():
        assert LtsaService.get_application_ltsa_records(3) == []
    mock_get.assert_called_once_with(application_id=3)


@patch("strr_api.services.ltsa_service.LTSARecord")
def test_save_ltsa_record_persists(mock_record_cls, app):
    ltsa = MagicMock()
    ltsa.model_dump.return_value = {"titleStatus": "REGISTERED"}
    mock_inst = MagicMock()
    mock_record_cls.return_value = mock_inst
    with app.app_context():
        out = LtsaService.save_ltsa_record(5, ltsa)
    assert out is mock_inst
    mock_record_cls.assert_called_once()
    mock_inst.save.assert_called_once()
    ltsa.model_dump.assert_called_once_with(mode="json")
