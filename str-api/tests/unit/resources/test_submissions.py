""" Tests to ensure that the submission based end-points work correctly.
"""
import json
import os
from http import HTTPStatus

import pytest
import requests
from sqlalchemy import text

from str_api.models import Submission as SubmissionModel, User as UserModel
from str_api.models import SubmissionType
from str_api.services import SubmissionService

from tests.unit import nested_session
from tests.unit.utils import create_header


@pytest.mark.parametrize(
    'test_name, submission_type, payload',
    [('simple json', SubmissionType.other, {'racoondog': 'red'})],
)
def test_get_plots(app, client, session, jwt, requests_mock, test_name, submission_type, payload):
    """Get the plot submissions.
    A parameterized set of tests that runs defined scenarios.
    """
    with nested_session(session):
        session.execute(text('delete from submission'))
        # Setup
        id = ''
        if payload:
            sub = SubmissionModel()
            sub.business_identifier = 'identifier0'
            sub.payload = payload
            sub.type = submission_type
            session.add(sub)
            session.commit()
            id = sub.id

        requests_mock.get(f"{app.config.get('AUTH_SVC_URL')}/entities/{sub.business_identifier}/authorizations",
                          json={"orgMembership": "COORDINATOR", 'roles': ['edit', 'view']})
        # Test
        rv = client.get(f'/plots/{id}',
                        headers=create_header(jwt, ['basic'], **{'Accept-Version': 'v1',
                                                                 'content-type': 'application/json',
                                                                 'Account-Id': 1}))

        # Confirm outcome
        assert rv.status_code == HTTPStatus.OK

        if payload:
            for key, value in payload.items():
                assert key in rv.text
                assert value in rv.text


_valid_auth_response = {"orgMembership": "COORDINATOR", 'roles': ['edit', 'view']}
_forbidden_auth_response2 = {"orgMembership": "COORDINATOR", 'roles': ['no_edit_role', 'view']}
_forbidden_auth_response = {}


@pytest.mark.parametrize(
    "test_name, business_identifier, auth_svc_response, has_auth_header, expected_http_status",
    [
        ('Good path', 'identifier0', _valid_auth_response, True, HTTPStatus.OK),
        ('Bad path, no auth header', 'identifier0', _valid_auth_response, False, HTTPStatus.UNAUTHORIZED),
        ('Bad path, no edit role', 'identifier0', _forbidden_auth_response2, True, HTTPStatus.FORBIDDEN),
        ('Bad path, not allowed', 'identifier0', _forbidden_auth_response, True, HTTPStatus.FORBIDDEN)
    ]
)
def test_get_plots_auth(app, client, session, jwt, requests_mock, test_name, business_identifier, auth_svc_response,
                        has_auth_header, expected_http_status):
    """Test scenarios connected to authentication on plots endpoint."""
    with nested_session(session):
        session.execute(text('delete from submission'))
        # Setup
        sub = SubmissionModel()
        sub.business_identifier = 'identifier0'
        sub.payload = {'racoondog': 'red'}
        sub.type = SubmissionType.other
        session.add(sub)
        session.commit()
        search_id = sub.id

        requests_mock.get(f"{app.config.get('AUTH_SVC_URL')}/entities/{business_identifier}/authorizations",
                          json=auth_svc_response)

        headers = create_header(jwt,
                                ['basic'],
                                **{'Accept-Version': 'v1',
                                   'content-type': 'application/json',
                                   'Account-Id': 1})

        if not has_auth_header:
            headers = {'Accept-Version': 'v1', 'content-type': 'application/json', 'Account-Id': 1}

        # Test
        rv = client.get(f'/plots/{search_id}', headers=headers)

    # Confirm outcome
    assert rv.status_code == expected_http_status


def test_post_plots_db_mocked(app, session, client, jwt, mocker, requests_mock):
    """Assure post submission works (db mocked)."""
    pay_api_mock = requests_mock.post(f"{app.config.get('PAYMENT_SVC_URL')}/payment-requests", json={'id': 978})
    auth_mock = requests_mock.post(app.config.get('SSO_SVC_TOKEN_URL'), json={'access_token': 'token'})
    bor_api_mock = requests_mock.put(f"{app.config.get('BOR_SVC_URL')}/internal/solr/update",
                                     json={'message': 'Update accepted'})

    current_dir = os.path.dirname(__file__)
    mock_user_save = mocker.patch.object(UserModel, 'save')
    mock_submission_save = mocker.patch.object(SubmissionModel, 'save')
    with open(
        os.path.join(current_dir, '..', '..', 'mocks', 'significantIndividualsFiling', 'valid.json')
    ) as file:
        json_data = json.load(file)

        mocked_entity_response = {"business": {"adminFreeze": False, "state": "ACTIVE"}}
        identifier = json_data['businessIdentifier']
        requests_mock.get(f"{app.config.get('AUTH_SVC_URL')}/entities/{identifier}/authorizations",
                          json={"orgMembership": "COORDINATOR", 'roles': ['edit', 'view']})
        legal_api_mock = requests_mock.get(
            f"{app.config.get('LEGAL_SVC_URL')}/businesses/{identifier}",
            json=mocked_entity_response
        )

        rv = client.post('/plots',
                         json=json_data,
                         headers=create_header(jwt, ['basic'], **{'Accept-Version': 'v1',
                                                                  'Authoriztion': 'Bearer 123',
                                                                  'content-type': 'application/json',
                                                                  'Account-Id': 1}))
        assert rv.status_code == HTTPStatus.CREATED

    mock_user_save.assert_called_once()
    mock_submission_save.assert_called()
    assert legal_api_mock.called == True
    assert pay_api_mock.called == True
    assert auth_mock.called == True
    assert bor_api_mock.called == True
    assert pay_api_mock.request_history[0].json() == {
        'filingInfo': {'filingTypes': [{'filingTypeCode': 'REGSIGIN'}]},
        'businessInfo': {'corpType': 'str', 'businessIdentifier': json_data['businessIdentifier']},
        'details': [{'label': 'Incorporation Number: ', 'value': json_data['businessIdentifier']}]}
    assert bor_api_mock.request_history[0].json() == {
        'business': {'adminFreeze': False, 'state': 'ACTIVE'},
        'owners': [{
            'interestedParty': {
                'describedByPersonStatement': 'bd4061d6-1a24-4356-93f3-c489b56610a4',
                'email': 'test@test.gov.bc.ca',
                'hasTaxNumber': True,
                'isComponent': False,
                'names': [{'fullName': 'Full Name', 'type': 'individual'}],
                'nationalities': [{'code': 'CA', 'name': 'Canada'}],
                'personType': 'knownPerson',
                'publicationDetails': {'bodsVersion': '1.0', 'publicationDate': '2022-12-31',
                                       'publisher': {'name': 'Publisher Name', 'source': {'url': 'http://source.url'},
                                                     'uri': 'http://publisher.uri'}},
                'source': {'asserted': '2023-02-18', 'description': 'The description', 'metadata': 'Metadata',
                           'retrievedAt': '2023-02-28T23:17:17Z', 'url': 'https://yourwebsite.com'},
                'statementDate': '2023-02-28',
                'statementID': 'bd4061d6-1a24-4356-93f3-c489b56610a4',
                'statementType': 'personStatement'
            },
            'interests': [
                {'beneficialOwnershipOrControl': True, 'details': '', 'directOrIndirect': 'direct',
                 'share': {'exact': 27}, 'startDate': '2023-03-01', 'type': 'otherInfluenceOrControl'},
                {'beneficialOwnershipOrControl': True, 'details': 'SharesThroughRightsOrExercisedInConcert',
                 'directOrIndirect': 'unknown', 'startDate': '2023-03-01', 'type': 'shareholding'},
                {'beneficialOwnershipOrControl': True, 'details': '', 'directOrIndirect': 'direct',
                 'startDate': '2023-01-01', 'type': 'appointmentOfBoard'}],
            'isComponent': False,
            'publicationDetails': {'bodsVersion': '1.0', 'publicationDate': '2022-12-31',
                                   'publisher': {'name': 'Publisher Name', 'source': {'url': 'http://source.url'},
                                                 'uri': 'http://publisher.uri'}},
            'source': {'asserted': '2023-02-18', 'description': 'The description', 'metadata': 'Metadata',
                       'retrievedAt': '2023-02-28T23:17:17Z', 'url': 'https://yourwebsite.com'},
            'statementDate': '2023-02-28',
            'statementID': 'bd4061d6-1a24-4356-93f3-c489b56610a3',
            'statementType': 'ownershipOrControlStatement',
            'subject': {'describedByEntityStatement': 'bd4061d6-1a24-4356-93f3-c489b56610a2'}}],
        'ceasedOwners': []}


def test_post_plots(app, client, session, jwt, requests_mock):
    """Assure post submission works."""
    mocked_invoice_id = 9876
    pay_api_mock = requests_mock.post(f"{app.config.get('PAYMENT_SVC_URL')}/payment-requests",
                                      json={'id': mocked_invoice_id})
    auth_mock = requests_mock.post(app.config.get('SSO_SVC_TOKEN_URL'), json={'access_token': 'token'})
    bor_api_mock = requests_mock.put(f"{app.config.get('BOR_SVC_URL')}/internal/solr/update",
                                     json={'message': 'Update accepted'})

    current_dir = os.path.dirname(__file__)
    with open(
        os.path.join(current_dir, '..', '..', 'mocks', 'significantIndividualsFiling', 'valid.json')
    ) as file:
        json_data = json.load(file)

        mocked_entity_response = {"business": {"adminFreeze": False, "state": "ACTIVE"}}
        identifier = json_data['businessIdentifier']
        requests_mock.get(f"{app.config.get('AUTH_SVC_URL')}/entities/{identifier}/authorizations",
                          json={"orgMembership": "COORDINATOR", 'roles': ['edit', 'view']})
        legal_api_mock = requests_mock.get(
            f"{app.config.get('LEGAL_SVC_URL')}/businesses/{identifier}",
            json=mocked_entity_response
        )

        with nested_session(session):
            mocked_username = 'wibbly wabble'
            rv = client.post('/plots',
                             json=json_data,
                             headers=create_header(jwt_manager=jwt,
                                                   roles=['basic'],
                                                   username=mocked_username,
                                                   **{'Accept-Version': 'v1',
                                                      'content-type': 'application/json',
                                                      'Account-Id': 1}))

            assert rv.status_code == HTTPStatus.CREATED
            submission_id = rv.json.get('id')
            assert submission_id
            assert legal_api_mock.called == True
            assert pay_api_mock.called == True
            assert bor_api_mock.called == True
            # check submission details
            created_submission = SubmissionModel.find_by_id(submission_id)
            assert created_submission
            assert created_submission.business_identifier == json_data['businessIdentifier']
            # check pay link
            assert created_submission.invoice_id == mocked_invoice_id
            # check user link
            assert created_submission.submitter_id
            user = UserModel.find_by_id(created_submission.submitter_id)
            assert user.username == mocked_username


def test_post_plots_pay_error(app, client, session, jwt, requests_mock):
    """Assure post submission works (pay error)."""
    pay_api_mock = requests_mock.post(f"{app.config.get('PAYMENT_SVC_URL')}/payment-requests",
                                      exc=requests.exceptions.ConnectTimeout)
    auth_mock = requests_mock.post(app.config.get('SSO_SVC_TOKEN_URL'), json={'access_token': 'token'})
    bor_api_mock = requests_mock.put(f"{app.config.get('BOR_SVC_URL')}/internal/solr/update",
                                     json={'message': 'Update accepted'})

    current_dir = os.path.dirname(__file__)
    with open(
        os.path.join(current_dir, '..', '..', 'mocks', 'significantIndividualsFiling', 'valid.json')
    ) as file:
        json_data = json.load(file)

        mocked_entity_response = {"business": {"adminFreeze": False, "state": "ACTIVE"}}
        identifier = json_data['businessIdentifier']
        requests_mock.get(f"{app.config.get('AUTH_SVC_URL')}/entities/{identifier}/authorizations",
                          json={"orgMembership": "COORDINATOR", 'roles': ['edit', 'view']})
        legal_api_mock = requests_mock.get(
            f"{app.config.get('LEGAL_SVC_URL')}/businesses/{identifier}",
            json=mocked_entity_response
        )

        with nested_session(session):
            rv = client.post('/plots',
                             json=json_data,
                             headers=create_header(jwt_manager=jwt,
                                                   roles=['basic'],
                                                   **{'Accept-Version': 'v1',
                                                      'content-type': 'application/json',
                                                      'Account-Id': 1}))
            assert rv.status_code == HTTPStatus.CREATED
            submission_id = rv.json.get('id')
            assert submission_id
            assert legal_api_mock.called == True
            assert pay_api_mock.called == True
            assert auth_mock.called == True
            assert bor_api_mock.called == True
            # check submission details
            created_submission = SubmissionModel.find_by_id(submission_id)
            assert created_submission
            assert created_submission.business_identifier == json_data['businessIdentifier']
            # no pay link
            assert not created_submission.invoice_id


def test_post_plots_auth_error(app, client, session, jwt, requests_mock):
    """Assure post submission works (auth get token error)."""
    pay_api_mock = requests_mock.post(f"{app.config.get('PAYMENT_SVC_URL')}/payment-requests", json={'id': 1234})
    auth_mock = requests_mock.post(app.config.get('SSO_SVC_TOKEN_URL'), exc=requests.exceptions.ConnectTimeout)
    bor_api_mock = requests_mock.put(f"{app.config.get('BOR_SVC_URL')}/internal/solr/update", json={})

    current_dir = os.path.dirname(__file__)
    with open(
        os.path.join(current_dir, '..', '..', 'mocks', 'significantIndividualsFiling', 'valid.json')
    ) as file:
        json_data = json.load(file)

        mocked_entity_response = {"business": {"adminFreeze": False, "state": "ACTIVE"}}
        identifier = json_data['businessIdentifier']
        requests_mock.get(f"{app.config.get('AUTH_SVC_URL')}/entities/{identifier}/authorizations",
                          json={"orgMembership": "COORDINATOR", 'roles': ['edit', 'view']})
        legal_api_mock = requests_mock.get(
            f"{app.config.get('LEGAL_SVC_URL')}/businesses/{identifier}",
            json=mocked_entity_response
        )

        with nested_session(session):
            rv = client.post('/plots',
                             json=json_data,
                             headers=create_header(jwt_manager=jwt,
                                                   roles=['basic'],
                                                   **{'Accept-Version': 'v1',
                                                      'content-type': 'application/json',
                                                      'Account-Id': 1}))
            assert rv.status_code == HTTPStatus.CREATED
            submission_id = rv.json.get('id')
            assert submission_id
            assert legal_api_mock.called == True
            assert pay_api_mock.called == True
            assert auth_mock.called == True
            assert bor_api_mock.called == False
            # check submission details
            created_submission = SubmissionModel.find_by_id(submission_id)
            assert created_submission
            assert created_submission.business_identifier == json_data['businessIdentifier']


def test_post_plots_bor_error(app, client, session, jwt, requests_mock):
    """Assure post submission works (bor error)."""
    pay_api_mock = requests_mock.post(f"{app.config.get('PAYMENT_SVC_URL')}/payment-requests", json={'id': 1234})
    auth_mock = requests_mock.post(app.config.get('SSO_SVC_TOKEN_URL'), json={'access_token': 'token'})
    bor_api_mock = requests_mock.put(f"{app.config.get('BOR_SVC_URL')}/internal/solr/update",
                                     exc=requests.exceptions.ConnectTimeout)

    current_dir = os.path.dirname(__file__)
    with open(
        os.path.join(current_dir, '..', '..', 'mocks', 'significantIndividualsFiling', 'valid.json')
    ) as file:
        json_data = json.load(file)

        mocked_entity_response = {"business": {"adminFreeze": False, "state": "ACTIVE"}}
        identifier = json_data['businessIdentifier']
        requests_mock.get(f"{app.config.get('AUTH_SVC_URL')}/entities/{identifier}/authorizations",
                          json={"orgMembership": "COORDINATOR", 'roles': ['edit', 'view']})
        legal_api_mock = requests_mock.get(
            f"{app.config.get('LEGAL_SVC_URL')}/businesses/{identifier}",
            json=mocked_entity_response
        )

        with nested_session(session):
            rv = client.post('/plots',
                             json=json_data,
                             headers=create_header(jwt_manager=jwt,
                                                   roles=['basic'],
                                                   **{'Accept-Version': 'v1',
                                                      'content-type': 'application/json',
                                                      'Account-Id': 1}))
            assert rv.status_code == HTTPStatus.CREATED
            submission_id = rv.json.get('id')
            assert submission_id
            assert legal_api_mock.called == True
            assert pay_api_mock.called == True
            assert auth_mock.called == True
            assert bor_api_mock.called == True
            # check submission details
            created_submission = SubmissionModel.find_by_id(submission_id)
            assert created_submission
            assert created_submission.business_identifier == json_data['businessIdentifier']


@pytest.mark.parametrize("test_name, admin_freeze, state, expected_response, errors", [
    ("invalid entity - frozen", True, "ACTIVE", HTTPStatus.FORBIDDEN, ['The business is frozen']),
    ("invalid entity - historical", False, "HISTORICAL", HTTPStatus.FORBIDDEN, ['The business is not active'])
])
def test_post_plots_invalid_entity(app, client, session, jwt, requests_mock, test_name, admin_freeze, state,
                                   expected_response, errors):
    """Assure no submission is created for frozen and historical entities."""
    mocked_invoice_id = 9876
    pay_api_mock = requests_mock.post(f"{app.config.get('PAYMENT_SVC_URL')}/payment-requests",
                                      json={'id': mocked_invoice_id})
    auth_mock = requests_mock.post(app.config.get('SSO_SVC_TOKEN_URL'), json={'access_token': 'token'})
    bor_api_mock = requests_mock.put(f"{app.config.get('BOR_SVC_URL')}/internal/solr/update",
                                     json={'message': 'Update accepted'})

    current_dir = os.path.dirname(__file__)
    with open(
        os.path.join(current_dir, '..', '..', 'mocks', 'significantIndividualsFiling', 'valid.json')
    ) as file:
        json_data = json.load(file)

        mocked_entity_response = {"business": {"adminFreeze": admin_freeze, "state": state}}
        identifier = json_data['businessIdentifier']
        requests_mock.get(f"{app.config.get('AUTH_SVC_URL')}/entities/{identifier}/authorizations",
                          json={"orgMembership": "COORDINATOR", 'roles': ['edit', 'view']})
        legal_api_mock = requests_mock.get(
            f"{app.config.get('LEGAL_SVC_URL')}/businesses/{identifier}",
            json=mocked_entity_response
        )

        with nested_session(session):
            rv = client.post('/plots',
                             json=json_data,
                             headers=create_header(jwt_manager=jwt,
                                                   roles=['basic'],
                                                   **{'Accept-Version': 'v1',
                                                      'content-type': 'application/json',
                                                      'Account-Id': 1}))
            assert rv.status_code == expected_response
            assert rv.json.get('details') == errors
            assert legal_api_mock.called == True
            assert pay_api_mock.called == False
            assert auth_mock.called == False
            assert bor_api_mock.called == False


def test_get_latest_for_entity(app, client, session, jwt, requests_mock):
    """Assure latest submission details are returned."""
    with nested_session(session):
        # Setup
        user = UserModel()
        user.save()
        test_identifier = 'id0'
        s1_dict = {
            'businessIdentifier': test_identifier,
            'effectiveDate': '2020-01-13',
            'ownershipOrControlStatements': {'details': 's1'}
        }
        s2_dict = {
            'businessIdentifier': test_identifier,
            'effectiveDate': '2021-01-13',
            'ownershipOrControlStatements': {'details': 's2'}
        }
        s3_dict = {
            'businessIdentifier': test_identifier + 's3',
            'effectiveDate': '2024-04-22',
            'ownershipOrControlStatements': {'details': 's3'}
        }
        (SubmissionService.create_submission(s1_dict, user.id)).save()
        (SubmissionService.create_submission(s2_dict, user.id)).save()
        (SubmissionService.create_submission(s3_dict, user.id)).save()

        requests_mock.get(f"{app.config.get('AUTH_SVC_URL')}/entities/{test_identifier}/authorizations",
                          json={"orgMembership": "COORDINATOR", 'roles': ['edit', 'view']})
        # Test
        rv = client.get(f'/plots/entity/{test_identifier}',
                        headers=create_header(jwt_manager=jwt,
                                              roles=['basic'],
                                              **{'Accept-Version': 'v1',
                                                 'content-type': 'application/json',
                                                 'Account-Id': 1}))

        # Confirm outcome
        assert rv.status_code == HTTPStatus.OK

        assert test_identifier == rv.json.get('business_identifier')
        assert s2_dict['effectiveDate'] == rv.json.get('effective_date')
        assert s2_dict == rv.json.get('payload')
