from datetime import date
from str_api.services.submission import SubmissionService

from tests.unit import nested_session
from tests.unit.utils import SUBMISSION_DICT


def test_create_submission(session):
    """Assure the create submission works as expected."""
    with nested_session(session):
        submission = SubmissionService.create_submission(submission_dict=SUBMISSION_DICT, submitter_id=1)

        # Assert the properties of the resulting SubmissionModel instance
        assert submission.effective_date == date.fromisoformat(SUBMISSION_DICT['effectiveDate'])
        assert submission.payload == SUBMISSION_DICT
