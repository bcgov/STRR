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
"""Tests to assure the new rental unit options in payment service."""

import pytest

from strr_api.services.payment_service import (
    HOST_REGISTRATION_FEE_1,
    HOST_REGISTRATION_FEE_2,
    HOST_REGISTRATION_FEE_3,
    PayService,
)


class TestPayService:
    """Tests for rentalUnitSetupOption mapping and related behaviors in PaymentService."""

    def test_payment_mapping_for_default_matrix(self):
        """Test all options using DEFAULT_FEE_MAPPING for standard property types."""
        pay = PayService()
        for option, expected in {
            "OPTION_1": HOST_REGISTRATION_FEE_2,
            "OPTION_2": HOST_REGISTRATION_FEE_2,
            "OPTION_3": HOST_REGISTRATION_FEE_1,
        }.items():
            registration_json = {
                "unitDetails": {
                    "propertyType": "SINGLE_FAMILY_HOME",
                    "rentalUnitSetupOption": option,
                }
            }
            filing_type, quantity = pay._get_host_filing_type(registration_json)  # pylint: disable=protected-access
            assert filing_type == expected
            assert quantity == 1

    def test_payment_mapping_for_bed_and_breakfast(self):
        """Test all options map to HOST_REGISTRATION_FEE_3 for Bed and Breakfast."""
        pay = PayService()
        for option in ["OPTION_1", "OPTION_2", "OPTION_3"]:
            registration_json = {
                "unitDetails": {
                    "propertyType": "BED_AND_BREAKFAST",
                    "rentalUnitSetupOption": option,
                }
            }
            filing_type, quantity = pay._get_host_filing_type(registration_json)  # pylint: disable=protected-access
            assert filing_type == HOST_REGISTRATION_FEE_3
            assert quantity == 1

    def test_quantity_ignores_room_count_when_option_present(self):
        """When rental unit option is provided, quantity remains 1."""
        pay = PayService()
        registration_json = {
            "unitDetails": {
                "propertyType": "SINGLE_FAMILY_HOME",
                "rentalUnitSetupOption": "OPTION_3",
                "rentalUnitSpaceType": "SHARED_ACCOMMODATION",
                "numberOfRoomsForRent": 5,
            }
        }
        _, quantity = pay._get_host_filing_type(registration_json)  # pylint: disable=protected-access
        assert quantity == 1

    def test_payment_mapping_ignores_host_type_when_option_present(self):
        """hostType should not affect filing type when rentalUnitSetupOption is provided."""
        pay = PayService()
        for host_type in ["OWNER", "FRIEND_RELATIVE", "LONG_TERM_TENANT"]:
            registration_json = {
                "unitDetails": {
                    "propertyType": "SINGLE_FAMILY_HOME",
                    "rentalUnitSetupOption": "OPTION_2",
                    "hostType": host_type,
                }
            }
            filing_type, quantity = pay._get_host_filing_type(registration_json)  # pylint: disable=protected-access
            assert filing_type == HOST_REGISTRATION_FEE_2
            assert quantity == 1
