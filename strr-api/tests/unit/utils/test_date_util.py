from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from strr_api.utils.date_util import DateUtil


def test_as_legislation_timezone_uses_iana_vancouver_timezone():
    date_time = datetime(2027, 1, 15, 12, 0, 0, tzinfo=timezone.utc)

    result = DateUtil.as_legislation_timezone(date_time)

    assert result == date_time.astimezone(ZoneInfo("America/Vancouver"))
    assert result.tzinfo.key == "America/Vancouver"


def test_format_as_string_uses_iana_vancouver_timezone():
    date_time = datetime(2027, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
    vancouver_date_time = date_time.astimezone(ZoneInfo("America/Vancouver"))
    hour = vancouver_date_time.strftime("%I").lstrip("0")
    am_pm = vancouver_date_time.strftime("%p").lower()
    expected = vancouver_date_time.strftime(f"%B %-d, %Y at {hour}:%M {am_pm} Pacific time")

    assert DateUtil.format_as_string(date_time) == expected
