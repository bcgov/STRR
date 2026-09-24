# Copyright © 2025 Province of British Columbia
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
"""This module provides Cloud SQL connection utilities and database configuration helpers."""

from .connector import (
    DBConfig,
    close_connector,
    database_uri_from_env,
    getconn,
    sqlalchemy_settings_from_env,
    setup_pg8000_close_event_listener,
    setup_search_path_event_listener,
)

__all__ = [
    "DBConfig",
    "close_connector",
    "database_uri_from_env",
    "getconn",
    "sqlalchemy_settings_from_env",
    "setup_pg8000_close_event_listener",
    "setup_search_path_event_listener",
]
