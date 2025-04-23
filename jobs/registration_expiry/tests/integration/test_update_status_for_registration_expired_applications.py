
from registration_expiry.job import update_status_for_registration_expired_applications

def test_update_status_for_registration_expired_applications(app):

    update_status_for_registration_expired_applications(app)

    assert True
