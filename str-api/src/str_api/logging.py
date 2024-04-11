# Copyright © 2024 Province of British Columbia
#
# Licensed under the BSD 3 Clause License, (the "License");
# you may not use this file except in compliance with the License.
# The template for the license can be found here
#    https://opensource.org/license/bsd-3-clause/
#
# Redistribution and use in source and binary forms,
# with or without modification, are permitted provided that the
# following conditions are met:
#
# 1. Redistributions of source code must retain the above copyright notice,
#    this list of conditions and the following disclaimer.
#
# 2. Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.
#
# 3. Neither the name of the copyright holder nor the names of its contributors
#    may be used to endorse or promote products derived from this software
#    without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS”
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
# THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
# ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
# LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.
"""Centralized setup of logging for the service."""
from __future__ import annotations

import logging
import logging.config
import sys
from os import path
from typing import Union

from flask import current_app

from str_api.enums import LogLevel as Level
from str_api.common.flags import Flags


def setup_logging(conf):
    """Create the services logger."""
    # pylint: disable=consider-using-f-string
    # log_file_path = path.join(path.abspath(path.dirname(__file__)), conf)

    if conf and path.isfile(conf):
        logging.config.fileConfig(conf)
        print('Configure logging, from conf:{}'.format(conf), file=sys.stdout)
    else:
        print('Unable to configure logging, attempted conf:{}'.format(conf), file=sys.stderr)


def get_logging_flag_name():
    """Get the name of the FFlag to lookup."""
    try:
        return current_app.config.get('OPS_LOGGER_LEVEL_FLAG', 'str-api')
    except:  # pylint: disable=bare-except; # noqa: E722, B901
        return f'ops-{__name__}-log-level'


def set_log_level_by_flag():
    """Set the logging level if the FF has a different level than what is currently set."""
    try:
        flag_name = get_logging_flag_name()
        flag_value = Flags.value(flag_name)
        if flag_value and (level_name := logging.getLevelName(logging.getLogger().level)) \
                and flag_value != level_name:  # pylint: disable=E0601; linter hates the walrus
            set_logging_level(flag_value)
    except Exception:  # noqa: B902
        return


def set_logging_level(level: Union(Level, str)):
    """Set the logging level of the top logger."""
    _logger = logging.getLogger()

    match level:
        case Level.CRITICAL:
            _logger.setLevel(logging.CRITICAL)
        case Level.DEBUG:
            _logger.setLevel(logging.DEBUG)
        case Level.ERROR:
            _logger.setLevel(logging.ERROR)
        case Level.INFO:
            _logger.setLevel(logging.INFO)
        case Level.WARNING:
            _logger.setLevel(logging.WARNING)

        case _:
            _logger.setLevel(logging.INFO)
