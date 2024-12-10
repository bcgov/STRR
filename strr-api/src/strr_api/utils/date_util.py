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
"""Date utilities."""
from datetime import datetime

import pytz


class DateUtil:
    """Date utility using legislation timezone for reporting and future effective dates."""

    LEGISLATIVE_TIMEZONE = "America/Vancouver"

    @staticmethod
    def as_legislation_timezone(date_time: datetime) -> datetime:
        """Return a datetime adjusted to the legislation timezone."""
        return date_time.astimezone(pytz.timezone(DateUtil.LEGISLATIVE_TIMEZONE))

    @staticmethod
    def format_as_string(date_time: datetime) -> str:
        """Return a datetime string in this format (eg: `August 5, 2021 at 11:00 am Pacific time`)."""
        # ensure is set to correct timezone
        date_time = DateUtil.as_legislation_timezone(date_time)
        hour = date_time.strftime("%I").lstrip("0")
        # %p provides locale value: AM, PM (en_US); am, pm (de_DE); So forcing it to be lower in any case
        am_pm = date_time.strftime("%p").lower()
        date_time_str = date_time.strftime(f"%B %-d, %Y at {hour}:%M {am_pm} Pacific time")
        return date_time_str
