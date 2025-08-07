from datetime import datetime

from strr_api.models import ConditionsOfApproval, Registration, User


def test_create_conditions_of_approval(session, client, jwt):
    user = User(
        username="testUser",
        firstname="Test",
        lastname="User",
        iss="test1",
        sub="subTest1",
        idp_userid="testUserID1",
        login_source="testLogin1",
    )
    user.save()

    registration = Registration()
    registration.registration_number = "H1234"
    registration.registration_type = "HOST"
    registration.status = "ACTIVE"
    registration.sbc_account_id = 1
    registration.user_id = user.id
    registration.start_date = datetime.now()
    registration.expiry_date = datetime.now()
    registration.save()

    conditions_of_approval = ConditionsOfApproval()
    conditions_of_approval.preapproved_conditions = ["Condition 1"]
    conditions_of_approval.custom_conditions = ["Condition 2"]
    conditions_of_approval.registration_id = registration.id
    conditions_of_approval.save()
    assert conditions_of_approval.id
