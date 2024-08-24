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
"""Auth helper methods."""
from flask_jwt_oidc import JwtManager

SYSTEM_ROLE = "system"
STAFF_ROLE = "staff"
BASIC_USER = "basic"
COLIN_SVC_ROLE = "colin"
PUBLIC_USER = "public_user"
ACCOUNT_IDENTITY = "account_identity"
STRR_EXAMINER = "strr_examiner"
STRR_INVESTIGATOR = "strr_investigator"


def create_jwt(
    jwt_manager: JwtManager,
    roles: list[str] = [],
    username: str = "test-user",
    email: str = None,
    firstname: str = None,
    lastname: str = None,
    login_source: str = None,
    sub: str = None,
    idp_userid: str = None,
) -> str:
    """Create a jwt bearer token with the correct keys, roles and username."""
    token_header = {"alg": "RS256", "typ": "JWT", "kid": "flask-jwt-oidc-test-client"}
    claims = {
        "iss": "https://example.localdomain/auth/realms/example",
        "sub": sub,
        "aud": "example",
        "exp": 2539722391,
        "iat": 1539718791,
        "jti": "flask-jwt-oidc-test-support",
        "typ": "Bearer",
        "username": f"{username}",
        "firstname": firstname,
        "lastname": lastname,
        "email": email,
        "loginSource": login_source,
        "idp_userid": idp_userid,
        "realm_access": {"roles": [] + roles},
    }
    return jwt_manager.create_jwt(claims, token_header)


def create_header(
    jwt_manager,
    roles: list[str] = [],
    username: str = "test-user",
    firstname: str = None,
    lastname: str = None,
    email: str = None,
    login_source: str = None,
    sub: str = "43e6a245-0bf7-4ccf-9bd0-e7fb85fd18cc",
    idp_userid: str = "123",
    **kwargs,
):
    """Return a header containing a JWT bearer token."""
    token = create_jwt(
        jwt_manager,
        roles=roles,
        username=username,
        firstname=firstname,
        lastname=lastname,
        email=email,
        login_source=login_source,
        idp_userid=idp_userid,
        sub=sub,
    )
    headers = {**kwargs, **{"Authorization": "Bearer " + token}}
    return headers


def create_header_account(
    jwt_manager, roles: list[str] = [], username: str = "test-user", account_id: str = "PS12345", **kwargs
):
    """Return a header containing a JWT bearer token and an account ID."""
    token = create_jwt(jwt_manager, roles=roles, username=username)
    headers = {**kwargs, **{"Authorization": "Bearer " + token}, **{"Account-Id": account_id}}
    return headers
