from strr_api.models import User


def test_setup(db):

    user = User()

    db.add(user)
    db.commit()
