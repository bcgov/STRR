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
"""Uses Registries LTSA wrapper service to fetch title for a PID."""
import requests
from flask import current_app

from strr_api.models import LTSARecord
from strr_api.responses import LtsaResponse, TitleSummaries


class LtsaService:
    """
    A class that provides utility functions for connecting with the Registries wrapper service to the LTSA API
    """

    @classmethod
    def get_title_number_from_pid(cls, pid):
        """Get title number on record for a given PID."""
        svc_url = current_app.config.get("LTSA_SVC_URL")
        svc_key = current_app.config.get("LTSA_SVC_AUTH_KEY")
        timeout = current_app.config.get("LTSA_API_TIMEOUT", 20)
        headers = {
            "x-apikey": svc_key,
            "Content-Type": "application/json",
        }
        title_summaries = requests.get(
            url=svc_url + f"/titledirect/search/api/titleSummaries?filter=parcelIdentifier:{pid}",
            headers=headers,
            timeout=timeout,
        ).json()
        try:
            title_summaries_model = TitleSummaries(**title_summaries)
            return title_summaries_model.titleSummaries[0].titleNumber
        except Exception:
            return None

    @classmethod
    def get_title_details_from_pid(cls, pid):
        """Get title order on record for a given PID."""
        svc_url = current_app.config.get("LTSA_SVC_URL")
        svc_key = current_app.config.get("LTSA_SVC_AUTH_KEY")
        timeout = current_app.config.get("LTSA_API_TIMEOUT", 20)
        title_number = cls.get_title_number_from_pid(pid)
        if title_number:
            headers = {
                "x-apikey": svc_key,
                "Content-Type": "application/json",
            }
            data = {
                "order": {
                    "productType": "title",
                    "fileReference": "folio",
                    "productOrderParameters": {"titleNumber": title_number},
                }
            }
            title_order = requests.post(
                url=f"{svc_url}/titledirect/search/api/orders", headers=headers, json=data, timeout=timeout
            ).json()
            try:
                return title_order
            except Exception:
                return None
        else:
            return None

    @classmethod
    def build_ltsa_response(cls, application_id, ltsa):
        """Build ltsa response."""
        fielded_data = ltsa.get("order", {}).get("orderedProduct", {}).get("fieldedData", {})
        if fielded_data:
            ltsa_response = LtsaResponse(**fielded_data)
            cls.save_ltsa_record(application_id, ltsa_response)
            return ltsa_response
        else:
            return None

    @classmethod
    def save_ltsa_record(cls, application_id, ltsa: LtsaResponse):
        """Save ltsa record."""
        record = LTSARecord(application_id=application_id, record=ltsa.model_dump(mode="json"))
        record.save()
        return record

    @classmethod
    def get_application_ltsa_records(cls, application_id):
        """Get ltsa records for a given application."""
        return LTSARecord.get_application_ltsa_records(application_id=application_id)
