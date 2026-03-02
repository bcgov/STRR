import pytest

from strr_api.models.user import User


@pytest.fixture
def sample_user():
    return User(
        username="testUser",
        firstname="Test",
        lastname="User",
        iss="test",
        sub="subTest",
        idp_userid="testUserID",
        login_source="testLogin",
    )


def test_display_name_with_name(sample_user):
    sample_user.middlename = "Middle"
    assert sample_user.display_name == "Test Middle User"


def test_display_name_with_idir_prefix(sample_user):
    sample_user.firstname = None
    sample_user.lastname = None
    sample_user.middlename = None
    sample_user.username = "idir\\testUser"
    assert sample_user.display_name == "testUser"


def test_display_name_with_idir_suffix(sample_user):
    sample_user.firstname = None
    sample_user.lastname = None
    sample_user.middlename = None
    sample_user.username = "testUser\\idir"
    assert sample_user.display_name == "testUser"


def test_display_name_with_bcsc_prefix(sample_user):
    sample_user.firstname = None
    sample_user.lastname = None
    sample_user.middlename = None
    sample_user.username = "bcsc\\testUser"
    assert sample_user.display_name is None


def test_display_name_without_name():
    sample_user = User()
    sample_user.username = "testUserName"
    assert sample_user.display_name == "testUserName"


def test_find_by_id(client, session, sample_user):
    session.add(sample_user)
    session.commit()
    result = User.find_by_id(sample_user.id)
    assert result == sample_user


def test_find_by_username(session, sample_user):
    session.add(sample_user)
    session.commit()

    result = User.find_by_username(sample_user.username)
    assert result.username == sample_user.username


def test_find_by_sub(session, sample_user):
    session.add(sample_user)
    session.commit()

    result = User.find_by_sub(sample_user.sub)
    assert result.sub == sample_user.sub


def test_find_by_jwt_token_no_idp():
    sample_token = {
        "iss": "test",
        "sub": "subTest",
        "loginSource": "testLogin",
    }

    result = User.find_by_jwt_token(sample_token)
    assert result is None


def test_get_or_create_user_by_jwt(session):
    sample_token = {
        "iss": "test",
        "sub": "subTest",
        "idp_userid": "testUserID",
        "loginSource": "testLogin",
    }

    result = User.get_or_create_user_by_jwt(sample_token)
    assert result.sub == sample_token["sub"]
    assert result.login_source == sample_token["loginSource"]


def test_create_from_jwt_token_no_token():
    result = User.create_from_jwt_token(None)
    assert result is None


def test_get_or_create_user_by_jwt_no_user(session):
    sample_token = {
        "iss": "x",
        "sub": "x",
        "idp_userid": "x",
        "loginSource": "x",
    }

    result = User.get_or_create_user_by_jwt(sample_token)
    assert result.sub == sample_token["sub"]
    assert result.login_source == sample_token["loginSource"]


def test_get_or_create_user_by_jwt_exception():
    sample_token = "asd"
    with pytest.raises(Exception):
        User.get_or_create_user_by_jwt(sample_token)


def test_save(session, sample_user, random_string):
    u1 = User.find_by_username(sample_user.username)
    if not u1:
        sample_user.sub = random_string(10)
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
