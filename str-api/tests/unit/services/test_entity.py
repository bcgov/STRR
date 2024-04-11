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
"""Tests to assure the pay service."""
import pytest

from str_api.services import EntityService, str_entity


def test_init_app(app):
    """Assure the init works as expected."""
    mock_svc_url = 'https://fakeurl1'
    mock_timeout = 99

    app.config.update(LEGAL_SVC_URL=mock_svc_url)
    app.config.update(LEGAL_SVC_TIMEOUT=mock_timeout)
    new_entity = EntityService()
    new_entity.init_app(app)

    assert new_entity.app == app
    assert new_entity.svc_url == mock_svc_url
    assert new_entity.timeout == mock_timeout


def test_get_entity(app, jwt, mocker, requests_mock):
    """Assure the get_entity function works as expected in str_entity."""
    def mock_get_token():
        return 'token'
    mocker.patch.object(jwt, 'get_token_auth_header', mock_get_token)
    identifier = '12345'
    mocked_response = {'mock': 'response'}
    legal_api_mock = requests_mock.get(f"{app.config.get('LEGAL_SVC_URL')}/businesses/{identifier}", json=mocked_response)

    str_entity.init_app(app)
    resp = str_entity.get_entity(jwt, identifier)

    assert legal_api_mock.called == True
    assert resp.json() == mocked_response
