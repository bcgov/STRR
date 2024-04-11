import datetime
from unittest import mock

import pytest

from str_api.config import Testing
from str_api.models.user import User, db


@pytest.fixture
def sample_user():
    return User(username="testUser", firstname="Test", lastname="User",
                iss="test", sub="subTest", idp_userid="testUserID", login_source="testLogin")


def test_display_name_with_name(sample_user):
    sample_user.middlename = "Middle"
    assert sample_user.display_name == "Test Middle User"


def test_display_name_without_name():
    sample_user = User()
    sample_user.username = "testUserName"
    assert sample_user.display_name == "testUserName"


def test_find_by_id(client, session, sample_user):
    session.add(sample_user)
    session.commit()

    result = User.find_by_id(sample_user.id)

    assert result == sample_user


def test_find_by_username(client, session, sample_user):
    # session.add(sample_user)
    # session.commit()

    result = User.find_by_username(sample_user.username)

    assert result.username == sample_user.username


def test_find_by_sub(client, session, sample_user):
    # session.add(sample_user)
    # session.commit()

    result = User.find_by_sub(sample_user.sub)

    assert result.sub == sample_user.sub


def test_create_from_jwt_token(client, session,sample_user):
    sample_token = {
        "iss": "test",
        "sub": f"subTest{datetime.datetime.now().strftime('%Y%m%d%H%M')}",
        "idp_userid": "testUserID",
        "loginSource": "testLogin",
    }

    result = User.create_from_jwt_token(sample_token)
    assert result.sub == sample_token['sub']
    assert result.login_source == sample_token['loginSource']


def test_save(client, session, sample_user):
    u1 = User.find_by_username(sample_user.username)
    if not u1:
        session.add(sample_user)
        session.commit()
        u1 = User.find_by_username(sample_user.username)
    u1.username = "totallyNewOne"
    u1.save()
    result = User.find_by_username("totallyNewOne")
    assert result
    assert result.username == "totallyNewOne"


def test_delete(sample_user):
    result = sample_user.delete()
    assert result == sample_user
