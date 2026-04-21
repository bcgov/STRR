"""Unit tests for backfiller.utils datetime helpers."""

from datetime import UTC, datetime

import pytest

from backfiller.utils import convert_to_json_date, convert_to_json_datetime


@pytest.mark.parametrize(
    "fn, value, expected",
    [
        pytest.param(
            convert_to_json_date,
            datetime(2024, 3, 15, 12, 0, tzinfo=UTC),
            "2024-03-15",
            id="date",
        ),
        pytest.param(
            convert_to_json_datetime,
            datetime(2024, 3, 15, 14, 30, 0, tzinfo=UTC),
            "2024-03-15T14:30:00-00:00",
            id="datetime",
        ),
    ],
)
def test_convert_formats_valid_datetime(fn, value, expected):
    assert fn(value) == expected


@pytest.mark.parametrize(
    "fn, bad_value",
    [
        pytest.param(convert_to_json_date, "not-a-date", id="date"),
        pytest.param(convert_to_json_datetime, object(), id="datetime"),
    ],
)
def test_convert_invalid_input_returns_none_and_logs_error(capsys, fn, bad_value):
    assert fn(bad_value) is None
    assert "Error" in capsys.readouterr().out
