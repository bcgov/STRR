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
# pylint: disable=W0707
"""Manages Auth service interactions."""
import os
from http import HTTPStatus

import requests
from flask import current_app
from requests.exceptions import HTTPError

from strr_api.exceptions import ExternalServiceException
from strr_api.requests import SBCMailingAddress
from strr_api.requests.SBCAccountCreationRequest import SBCAccountCreationRequest
from strr_api.services.rest_service import RestService
from strr_api.utils.user_context import UserContext, user_context


class AuthService:
    """Service to invoke Rest calls to auth-api."""

    @classmethod
    def get_service_client_token(cls):
        """Get service account client token for cross api calls."""

        client_id = current_app.config.get("STRR_SERVICE_ACCOUNT_CLIENT_ID")
        client_secret = current_app.config.get("STRR_SERVICE_ACCOUNT_SECRET")
        token_url = current_app.config.get("KEYCLOAK_AUTH_TOKEN_URL")
        timeout = int(current_app.config.get("AUTH_SVC_TIMEOUT", 20))

        data = "grant_type=client_credentials"

        # get service account token
        res = requests.post(
            url=token_url,
            data=data,
            headers={"content-type": "application/x-www-form-urlencoded"},
            auth=(client_id, client_secret),
            timeout=timeout,
        )

        try:
            return res.json().get("access_token")
        except Exception:
            return None

    @classmethod
    def does_sbc_account_exist(cls, bearer_token, account_name: str):
        """Search and return if SBC account name already exists."""

        endpoint = f"{current_app.config.get('AUTH_SVC_URL')}/orgs?name={account_name.strip()}"
        headers = {"Authorization": "Bearer " + bearer_token}
        resp = requests.get(endpoint, headers=headers)

        if resp.status_code == HTTPStatus.OK:
            return True
        elif resp.status_code == HTTPStatus.NO_CONTENT:
            return False

        raise ExternalServiceException(message="Error checking if SBC account name already exists.")

    @classmethod
    def get_user_accounts(cls, bearer_token):
        """Return accounts for current user."""

        endpoint = f"{current_app.config.get('AUTH_SVC_URL')}/users/orgs"
        user_account_details = RestService.get(endpoint=endpoint, token=bearer_token).json()
        return user_account_details

    @classmethod
    def get_sbc_accounts_mailing_address(cls, bearer_token, account_id):
        """Return mailing address for given sbc account"""
        mailing_address = None
        endpoint = f"{current_app.config.get('AUTH_SVC_URL')}/orgs/{account_id}"
        user_account_details = RestService.get(endpoint=endpoint, token=bearer_token).json()
        if mailing_address_dict := user_account_details.get("mailingAddress", {}):
            if mailing_address_dict.get("street"):
                mailing_address = SBCMailingAddress(
                    street=mailing_address_dict.get("street"),
                    city=mailing_address_dict.get("city"),
                    region=mailing_address_dict.get("region"),
                    postalCode=mailing_address_dict.get("postalCode"),
                    country=mailing_address_dict.get("country"),
                    streetAdditional=mailing_address_dict.get("streetAdditional", None),
                )
        return mailing_address

    @classmethod
    @user_context
    def update_user_profile(cls, **kwargs):
        """Updates user profile in SBC Connect"""
        user: UserContext = kwargs["user_context"]
        endpoint = f"{current_app.config.get('AUTH_SVC_URL')}/users"
        try:
            response = RestService.post(endpoint=endpoint, token=user.bearer_token).json()
            return response
        except HTTPError as exception:
            current_app.logger.error("Error while creating user roles", exception)
            raise ExternalServiceException(
                error="Error while updating user profile in SBC Connect.",
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            )

    @classmethod
    @user_context
    def get_user_tos(cls, **kwargs):
        """Gets the latest user ToS if the latest version is not accepted."""

        user: UserContext = kwargs["user_context"]
        endpoint = f"{current_app.config.get('AUTH_SVC_URL')}/users/@me"
        user_details = RestService.get(endpoint=endpoint, token=user.bearer_token).json()
        res = user_details.get("userTerms")
        if not res.get("isTermsOfUseAccepted"):
            tos_document_response = RestService.get(
                endpoint=f"{current_app.config.get('AUTH_SVC_URL')}/documents/termsofuse",
                token=user.bearer_token,
            ).json()
            res["termsOfUseCurrentVersion"] = tos_document_response.get("versionId")
            res["termsOfUse"] = tos_document_response.get("content")
        return res

    @classmethod
    @user_context
    def update_user_tos(cls, request_json: dict, **kwargs):
        """Updates whether a user accepted a specific ToS version."""

        user: UserContext = kwargs["user_context"]
        endpoint = f"{current_app.config.get('AUTH_SVC_URL')}/users/@me"

        user_details = RestService.patch(endpoint=endpoint, token=user.bearer_token, data=request_json).json()
        res = user_details.get("userTerms")
        return res

    @classmethod
    def get_user_profile(cls, bearer_token):
        """Return current user profile."""

        endpoint = f"{current_app.config.get('AUTH_SVC_URL')}/users/@me"
        user_profile = RestService.get(endpoint=endpoint, token=bearer_token).json()
        return user_profile

    @classmethod
    def get_user_settings(cls, bearer_token, uuid):
        """Return a user's settings."""

        endpoint = f"{current_app.config.get('AUTH_SVC_URL')}/users/{uuid}/settings"
        user_settings = RestService.get(endpoint=endpoint, token=bearer_token).json()
        return user_settings

    @classmethod
    def get_unique_sbc_username(cls, bearer_token, name):
        """Get a unique username for the SBC account."""

        basename = name
        # add two random hexadecimals to the name to make it unique
        for _ in range(10):
            account_name_already_exists = AuthService.does_sbc_account_exist(bearer_token, name)
            if not account_name_already_exists:
                break
            name = f"{basename}-{os.urandom(1).hex()}"

        return name

    @classmethod
    def create_user_account(cls, bearer_token, request: SBCAccountCreationRequest, user_id):
        """Create a new user account."""

        account_name = AuthService.get_unique_sbc_username(bearer_token, request.name)
        endpoint = f"{current_app.config.get('AUTH_SVC_URL')}/orgs"
        create_account_payload = {
            "name": account_name,
            "accessType": "REGULAR",
            "typeCode": "BASIC",
            "productSubscriptions": [{"productCode": "STRR"}],
            "paymentInfo": {"paymentMethod": "DIRECT_PAY"},
        }

        if request.mailingAddress:
            create_account_payload["mailingAddress"] = request.mailingAddress.to_dict()

        new_user_account = RestService.post(
            data=create_account_payload,
            endpoint=endpoint,
            token=bearer_token,
            generate_token=False,
        ).json()

        return new_user_account

    @classmethod
    def add_contact_info(cls, bearer_token, account_id, request: SBCAccountCreationRequest, user_id):
        """Create contact info for user account."""

        endpoint = f"{current_app.config.get('AUTH_SVC_URL')}/orgs/{account_id}/contacts"
        create_account_contact_payload = {
            "email": str(request.email),
            "phone": str(request.phone),
            "phoneExtension": str(request.phoneExtension) if request.phoneExtension else "",
        }
        contact_info = RestService.post(
            data=create_account_contact_payload,
            endpoint=endpoint,
            token=bearer_token,
        ).json()
        return contact_info
