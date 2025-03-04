"""
This module provides utility functions to convert datetime objects
to JSON-compatible date and datetime strings.

Functions:
- convert_to_json_date: Converts a datetime object to a string formatted as YYYY-MM-DD.
- convert_to_json_datetime: Converts a datetime object to a string formatted as YYYY-MM-SSTHH:MM:SS+00:00.
"""

# Copyright © 2019 Province of British Columbia
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


def convert_to_json_date(date):
    """Convert datetime to string formatted as YYYY-MM-DD, per JSON Schema specs.

    :param date: datetime object
    :return: string
    """
    try:
        return date.strftime("%Y-%m-%d")
    except AttributeError as err:
        print(f"Error: {err}. The provided object does not have a 'strftime' method.")
        return None


def convert_to_json_datetime(date):
    """Convert datetime to string formatted as YYYY-MM-SSTHH:MM:SS+00:00, per JSON Schema specs.

    :param date: datetime object
    :return: string
    """
    try:
        return date.strftime("%Y-%m-%dT%H:%M:%S-00:00")
    except AttributeError as err:
        print(f"Error: {err}. The provided object does not have a 'strftime' method.")
        return None
