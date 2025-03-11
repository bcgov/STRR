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
# pylint: disable=logging-fstring-interpolation, C0115, R0903

"""Validation Cache."""

import redis
from flask import current_app


class ValidationCache:

    def __init__(self):
        self.cache = redis.StrictRedis(
            host=current_app.config.get("REDIS_HOST"),
            port=current_app.config.get("REDIS_PORT"),
            db=0,
        )
