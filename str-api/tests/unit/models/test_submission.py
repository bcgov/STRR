from sqlalchemy import text

from str_api.models.submission import Submission, SubmissionType


def test_find_by_id(session):
    # Prepare data
    session.execute(text('delete from submission'))
    submission = Submission(type=SubmissionType.other, business_identifier="Test identifier")
    session.add(submission)
    session.commit()

    # Do test
    result = Submission.find_by_id(submission.id)

    # Verify result
    assert result == submission


def test_get_filtered_submissions(session):
    # Prepare data
    session.execute(text('delete from submission'))
    session.add_all([Submission(type=SubmissionType.other, business_identifier="Test identifier"),
                     Submission(type=SubmissionType.standard, business_identifier="Another identifier")])
    session.commit()
    all_submissions = Submission.query.all()
    # Do test
    result = Submission.get_filtered_submissions()

    # Verify result
    assert len(result) == len(all_submissions)


def test_save_to_session(session):
    # Prepare data
    session.execute(text('delete from submission'))
    submission = Submission(type=SubmissionType.other, business_identifier="Test identifier")

    # Do test
    submission.save_to_session()

    # Verify result
    session.flush()
    assert submission in session
