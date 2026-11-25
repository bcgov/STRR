# Copyright © 2024 Province of British Columbia
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Renewal window rules.

Registration dates are stored as UTC. The renewal window opens at the beginning of the day, Vancouver time.
"""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from dateutil.relativedelta import relativedelta

from strr_api.enums.enum import RegistrationType
from strr_api.utils.date_util import DateUtil

DEFAULT_DAYS_BEFORE_EXPIRY = 40
DAYS_BEFORE_EXPIRY_BY_TYPE = {
    RegistrationType.STRATA_HOTEL.value: 60,
    RegistrationType.HOST.value: 40,
    RegistrationType.PLATFORM.value: 40,
}
YEARS_AFTER_EXPIRY = 3


def get_days_before_expiry(registration_type: str | RegistrationType) -> int:
    """Return how many days before expiry the renewal window opens for the registration type."""
    type_value = registration_type.value if isinstance(registration_type, RegistrationType) else registration_type
    return DAYS_BEFORE_EXPIRY_BY_TYPE.get(type_value, DEFAULT_DAYS_BEFORE_EXPIRY)


@dataclass(frozen=True)
class RenewalWindow:
    """Renewal window of a registration. The dates are Vancouver calendar dates, and the end date is inclusive."""

    start_date: date
    end_date: date

    @classmethod
    def for_registration(cls, registration) -> "RenewalWindow":
        """Return the renewal window for the registration."""
        expiry = registration.expiry_date
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        expiry_date = DateUtil.as_legislation_timezone(expiry).date()
        return cls(
            start_date=expiry_date - timedelta(days=get_days_before_expiry(registration.registration_type)),
            end_date=expiry_date + relativedelta(years=YEARS_AFTER_EXPIRY),
        )

    @staticmethod
    def _beginning_of_day_utc(day: date) -> datetime:
        """Return the UTC instant at which the given Vancouver date begins."""
        tz = ZoneInfo(DateUtil.LEGISLATIVE_TIMEZONE)
        return datetime.combine(day, time.min, tzinfo=tz).astimezone(timezone.utc)

    @property
    def start_utc(self) -> datetime:
        """Return the instant the window opens."""
        return self._beginning_of_day_utc(self.start_date)

    @property
    def end_utc(self) -> datetime:
        """Return the instant the window closes (exclusive)."""
        return self._beginning_of_day_utc(self.end_date + timedelta(days=1))

    @property
    def is_not_yet_open(self) -> bool:
        """Return True if the window has not opened yet."""
        return datetime.now(timezone.utc) < self.start_utc

    @property
    def is_closed(self) -> bool:
        """Return True if the window has ended."""
        return datetime.now(timezone.utc) >= self.end_utc

    @property
    def is_open(self) -> bool:
        """Return True if now is within the window."""
        return not self.is_not_yet_open and not self.is_closed
