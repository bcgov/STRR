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

# pylint: disable=C0121

"""Events Service."""
from strr_api.models import Events


class EventsService:
    """Service to interact with the event model."""

    @classmethod
    def save_event(
        cls,
        event_type: str,
        event_name: str,
        details: str = None,
        visible_to_applicant: bool = False,
        user_id: int = None,
        registration_id: int = None,
        application_id: int = None,
    ):  # pylint: disable=R0913
        """Saves STRR event."""

        event = Events(
            user_id=user_id,
            event_type=event_type,
            event_name=event_name,
            details=details,
            visible_to_applicant=visible_to_applicant,
            application_id=application_id,
            registration_id=registration_id,
        )
        event.save()
        return event

    @classmethod
    def fetch_registration_events(cls, registration_id: int, applicant_visible_events_only: bool = True):
        """Get events for a given registration."""
        return Events.fetch_registration_events(registration_id, applicant_visible_events_only)

    @classmethod
    def fetch_application_events(cls, application_id: int, applicant_visible_events_only: bool = True):
        """Get events for a given application id."""
        return Events.fetch_application_events(application_id, applicant_visible_events_only)
