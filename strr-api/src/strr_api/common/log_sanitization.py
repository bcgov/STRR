# Copyright © 2023 Province of British Columbia
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
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
# ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
# LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.
"""Mitigate log injection by normalizing log records before handlers emit."""

from __future__ import annotations

import logging


def _sanitize_string(s: str) -> str:
    return s.replace("\r", " ").replace("\n", " ").replace("\x0b", " ")


def _sanitize_value(value: object) -> object:
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return _sanitize_string(value)
    if isinstance(value, dict):
        return {k: _sanitize_value(v) for k, v in value.items()}
    if isinstance(value, tuple):
        return tuple(_sanitize_value(v) for v in value)
    if isinstance(value, list):
        return [_sanitize_value(v) for v in value]
    return _sanitize_string(str(value))


class SanitizeLogInjectionFilter(logging.Filter):
    """Normalize ``msg`` / ``args`` so newline-based log forging is ineffective."""

    def filter(self, record: logging.LogRecord) -> bool:
        args = record.args
        if args:
            if isinstance(args, dict):
                record.args = {k: _sanitize_value(v) for k, v in args.items()}
            else:
                record.args = tuple(_sanitize_value(v) for v in args)
        elif isinstance(record.msg, str):
            record.msg = _sanitize_string(record.msg)
        record.message = None  # type: ignore[attr-defined]
        return True


def install_log_injection_filter() -> None:
    """Attach :class:`SanitizeLogInjectionFilter` once per distinct handler on root and ``api`` loggers."""
    filt = SanitizeLogInjectionFilter()
    seen: set[int] = set()
    for log in (logging.getLogger(), logging.getLogger("api")):
        for handler in log.handlers:
            hid = id(handler)
            if hid in seen:
                continue
            seen.add(hid)
            if any(isinstance(f, SanitizeLogInjectionFilter) for f in handler.filters):
                continue
            handler.addFilter(filt)
