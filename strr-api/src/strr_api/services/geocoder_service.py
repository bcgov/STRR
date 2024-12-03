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
"""Uses BC Gov Geocoder service to fetch latitude and longitude."""
from urllib.parse import quote

import requests
from flask import current_app


class GeoCoderService:
    """
    A class that provides utility functions for connecting with the BC Government Geocorder Service API.
    https://www2.gov.bc.ca/gov/content/data/geographic-data-services/location-services/geocoder
    """

    @classmethod
    def get_geocode_by_address(cls, address):
        """Get geocode (latitude, longitude) by address"""
        svc_url = current_app.config.get("GEOCODER_SVC_URL")
        svc_key = current_app.config.get("GEOCODER_SVC_AUTH_KEY")
        timeout = current_app.config.get("GEOCODER_API_TIMEOUT", 20)

        headers = {
            "Authorization": "Bearer " + svc_key,
            "Content-Type": "application/json",
        }
        encoded_address = quote(address)

        url = (
            f"{svc_url}/addresses.json?"
            f"addressString={encoded_address}&"
            "locationDescriptor=any&"
            "maxResults=1&"
            "interpolation=adaptive&"
            "echo=true&"
            "brief=false&"
            "autoComplete=false&"
            "setBack=0&"
            "outputSRS=4326&"
            "minScore=95&"
            "provinceCode=BC"
        )

        geocode_response = requests.get(url=url, headers=headers, timeout=timeout).json()

        try:
            return geocode_response
        except Exception:
            return None
