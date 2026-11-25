from datetime import date, datetime, timezone
from types import SimpleNamespace

import pytest
from freezegun import freeze_time

from strr_api.enums.enum import RegistrationType
from strr_api.utils.renewal_window import RenewalWindow


def _window(expiry, registration_type="HOST"):
    return RenewalWindow.for_registration(SimpleNamespace(expiry_date=expiry, registration_type=registration_type))


@pytest.mark.parametrize(
    "expiry",
    [
        datetime(2027, 2, 24, 23, 59, 59),
        datetime(2027, 2, 25, 6, 59, 59),
        datetime(2027, 2, 25, 6, 59, 59, tzinfo=timezone.utc),
    ],
)
def test_window_starts_at_beginning_of_vancouver_day(expiry):
    window = _window(expiry)
    assert window.start_date == date(2027, 1, 15)
    # 07:00 in winter: this also fails if the timezone data predates permanent daylight saving time
    assert window.start_utc == datetime(2027, 1, 15, 7, tzinfo=timezone.utc)


@pytest.mark.parametrize(
    "registration_type, expected",
    [
        ("HOST", date(2027, 1, 15)),
        ("PLATFORM", date(2027, 1, 15)),
        ("STRATA_HOTEL", date(2026, 12, 26)),
        (RegistrationType.STRATA_HOTEL, date(2026, 12, 26)),
    ],
)
def test_window_length_by_registration_type(registration_type, expected):
    assert _window(datetime(2027, 2, 24, 23, 59, 59), registration_type).start_date == expected


@pytest.mark.parametrize(
    "now, not_yet_open, is_open, is_closed",
    [
        ("2027-01-15 06:59:59", True, False, False),
        ("2027-01-15 07:00:00", False, True, False),
        ("2030-02-25 06:59:59", False, True, False),
        ("2030-02-25 07:00:00", False, False, True),
    ],
)
def test_window_boundaries(now, not_yet_open, is_open, is_closed):
    window = _window(datetime(2027, 2, 24, 23, 59, 59))
    with freeze_time(now):
        assert (window.is_not_yet_open, window.is_open, window.is_closed) == (not_yet_open, is_open, is_closed)
