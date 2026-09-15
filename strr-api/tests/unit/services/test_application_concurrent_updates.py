"""Exercise application JSON updates through independent PostgreSQL sessions."""

import copy
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier, Event, get_ident
from time import monotonic
from uuid import uuid4

import pytest
from sqlalchemy import event, text

from strr_api import db
from strr_api.enums.enum import ApplicationType
from strr_api.models import Application, Events, Registration, User
from strr_api.services import ApplicationService

ORIGINAL = {
    "registration": {
        "registrationType": "HOST",
        "primaryContact": {"firstName": "Synthetic", "lastName": "Host", "emailAddress": "host@example.com"},
        "unitAddress": {
            "streetNumber": "10",
            "streetName": "Test Street",
            "addressLineTwo": "",
            "city": "Vancouver",
            "province": "BC",
            "postalCode": "V6B 1A1",
        },
        "documents": [{"fileKey": "existing", "fileName": "existing.pdf"}],
        "listingDetails": [{"url": "https://example.com/listing"}],
    }
}
UPLOAD_ONE = ("upload", {"fileKey": "new-one", "fileName": "one.pdf"})
UPLOAD_TWO = ("upload", {"fileKey": "new-two", "fileName": "two.pdf"})
ADDRESS_ONE = ("address", {"city": "Kelowna"})
ADDRESS_TWO = ("address", {"streetNumber": "999"})
OPERATIONS = [
    pytest.param(UPLOAD_ONE, ADDRESS_ONE, id="upload-then-address"),
    pytest.param(ADDRESS_ONE, UPLOAD_ONE, id="address-then-upload"),
    pytest.param(UPLOAD_ONE, UPLOAD_TWO, id="two-uploads"),
    pytest.param(ADDRESS_ONE, ADDRESS_TWO, id="two-address-edits"),
]


@pytest.fixture
def committed_application(app):
    """Use real commits so separate request contexts can see this synthetic record."""
    with app.app_context():
        user = User(username=f"concurrent-{uuid4().hex}", firstname="Synthetic", lastname="Examiner")
        db.session.add(user)
        db.session.flush()
        application = Application(
            application_number=Application.generate_unique_application_number(),
            application_json=copy.deepcopy(ORIGINAL),
            type=ApplicationType.REGISTRATION.value,
            registration_type=Registration.RegistrationType.HOST,
            status=Application.Status.FULL_REVIEW,
            submitter_id=user.id,
            reviewer_id=user.id,
        )
        db.session.add(application)
        db.session.commit()
        identifiers = (application.id, user.id)

    try:
        yield identifiers
    finally:
        with app.app_context():
            Events.query.filter_by(application_id=identifiers[0]).delete(synchronize_session=False)
            Application.query.filter_by(id=identifiers[0]).delete(synchronize_session=False)
            User.query.filter_by(id=identifiers[1]).delete(synchronize_session=False)
            db.session.commit()


def _load(identifiers):
    db.session.execute(text("SET LOCAL statement_timeout = '10s'"))
    db.session.execute(text("SET LOCAL lock_timeout = '5s'"))
    return db.session.get(Application, identifiers[0]), db.session.get(User, identifiers[1])


def _update(application, user, operation):
    kind, data = operation
    if kind == "upload":
        ApplicationService.update_document_list(application, copy.deepcopy(data), user)
    else:
        ApplicationService.update_host_unit_address(application, dict(data), user)


def _assert_saved(app, identifiers, operations):
    expected = copy.deepcopy(ORIGINAL)
    for kind, data in operations:
        if kind == "upload":
            expected["registration"]["documents"].append(data)
        else:
            expected["registration"]["unitAddress"].update(data)
    with app.app_context():
        assert db.session.get(Application, identifiers[0]).application_json == expected
        events = Events.fetch_application_events(identifiers[0])
        assert len(events) == 2
        assert all(item.user_id == identifiers[1] and item.visible_to_applicant for item in events)
        names = {
            "upload": Events.EventName.APPLICATION_DOCUMENT_UPLOADED,
            "address": Events.EventName.HOST_APPLICATION_UNIT_ADDRESS_UPDATED,
        }
        assert Counter(item.event_name for item in events) == Counter(names[kind] for kind, _ in operations)
        for kind, data in operations:
            if kind == "upload":
                assert any(item.details == f"Document uploaded: {data['fileName']}" for item in events)
        if any(kind == "address" for kind, _ in operations):
            assert any("City=Vancouver" in item.details for item in events)
        if all(kind == "address" for kind, _ in operations):
            assert any("City=Kelowna" in item.details for item in events)


@pytest.mark.parametrize("first,second", OPERATIONS)
@pytest.mark.parametrize("overlapping_reads", [False, True], ids=["sequential-reads", "overlapping-reads"])
def test_application_updates_preserve_both_commits(app, committed_application, first, second, overlapping_reads):
    """The second request may have loaded the application before the first commit."""
    both_loaded = Barrier(2)
    first_committed = Event()

    def write(index, operation):
        try:
            if index == 1 and not overlapping_reads:
                assert first_committed.wait(15), "First writer did not finish"
            with app.app_context():
                application, user = _load(committed_application)
                if overlapping_reads:
                    both_loaded.wait(timeout=15)
                if index == 1:
                    assert first_committed.wait(15), "First writer did not finish"
                _update(application, user, operation)
        finally:
            if index == 0:
                first_committed.set()

    with ThreadPoolExecutor(max_workers=2) as pool:
        writers = [pool.submit(write, index, operation) for index, operation in enumerate((first, second))]
        for writer in writers:
            writer.result(timeout=20)
    _assert_saved(app, committed_application, (first, second))


@pytest.mark.parametrize("first,second", OPERATIONS)
def test_application_updates_wait_for_the_pending_writer(app, committed_application, first, second):
    """Hold the first UPDATE and observe the second waiting on its PostgreSQL lock."""
    first_at_write = Event()
    release_first = Event()
    second_started = Event()
    second_finished = Event()
    writers = {}
    with app.app_context():
        engine = db.engine

    def hold_first_update(_connection, _cursor, _statement, _parameters, context, _executemany):
        if (
            get_ident() == writers.get("first_thread")
            and context.isupdate
            and context.compiled.statement.table.name == "application"
        ):
            first_at_write.set()
            assert release_first.wait(15), "First writer was not released"

    def write(index, operation):
        try:
            with app.app_context():
                application, user = _load(committed_application)
                writers[f"pid_{index}"] = db.session.execute(text("SELECT pg_backend_pid()")).scalar_one()
                if index == 0:
                    writers["first_thread"] = get_ident()
                else:
                    second_started.set()
                _update(application, user, operation)
        finally:
            if index == 1:
                second_finished.set()

    event.listen(engine, "before_cursor_execute", hold_first_update)
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            first_writer = pool.submit(write, 0, first)
            try:
                assert first_at_write.wait(15), "First writer did not reach its UPDATE"
                second_writer = pool.submit(write, 1, second)
                assert second_started.wait(15), "Second writer did not start"
                blocked = False
                deadline = monotonic() + 3
                with app.app_context():
                    while monotonic() < deadline and not second_finished.is_set():
                        blockers = db.session.execute(
                            text("SELECT pg_blocking_pids(:pid)"), {"pid": writers["pid_1"]}
                        ).scalar_one()
                        if writers["pid_0"] in blockers:
                            blocked = True
                            break
                        second_finished.wait(0.02)
                assert blocked, "Second update did not wait for the first application's write lock"
            finally:
                release_first.set()
            first_writer.result(timeout=20)
            second_writer.result(timeout=20)
    finally:
        release_first.set()
        event.remove(engine, "before_cursor_execute", hold_first_update)
    _assert_saved(app, committed_application, (first, second))
