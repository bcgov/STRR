"""Tests for GeoCoderService (mocked HTTP)."""

from unittest.mock import MagicMock, patch

from strr_api.services.geocoder_service import GeoCoderService


@patch("strr_api.services.geocoder_service.requests.get")
def test_get_geocode_by_address_returns_json(mock_get, app):
    mock_get.return_value.json.return_value = {"features": []}
    with app.app_context():
        out = GeoCoderService.get_geocode_by_address("123 Example St, Victoria BC")
    assert out == {"features": []}
    mock_get.assert_called_once()
    called_url = mock_get.call_args.kwargs["url"]
    assert "addressString=" in called_url
    assert "Example" in called_url or "%20" in called_url
