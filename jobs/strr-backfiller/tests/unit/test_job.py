"""Unit tests for backfiller job helpers (no database)."""

from unittest.mock import MagicMock, PropertyMock

import pytest
from backfiller.job import (
    _get_json_from_application,
    _log_progress,
    _process_single_registration,
    backfill_jurisdiction,
    backfill_registration_search,
    backfill_strata_hotel_category,
    create_app,
    run,
)


def _stats():
    return {
        "total_processed": 0,
        "total_updated": 0,
        "total_skipped": 0,
        "total_errors": 0,
    }


def _patch_application_query(mocker, first_return):
    chain = mocker.MagicMock()
    chain.filter_by.return_value = chain
    chain.filter.return_value = chain
    chain.order_by.return_value = chain
    chain.first.return_value = first_return
    mocker.patch("backfiller.job.Application", mocker.MagicMock(query=chain))


def _patch_registration_join(mocker, *registrations):
    join_q = MagicMock()
    join_q.filter.return_value.all.return_value = list(registrations)
    reg = MagicMock()
    reg.query.join.return_value = join_q
    mocker.patch("backfiller.job.Registration", reg)


def _patch_strata_and_application(mocker, hotels, application_first=None, application_side_effect=None):
    sh = MagicMock()
    sh.query.filter.return_value.all.return_value = hotels
    mocker.patch("backfiller.job.StrataHotel", sh)
    app_model = MagicMock()
    if application_side_effect is not None:
        app_model.query.filter_by.return_value.first.side_effect = application_side_effect
    else:
        app_model.query.filter_by.return_value.first.return_value = application_first
    mocker.patch("backfiller.job.Application", app_model)


def _address_mock(**overrides):
    address = MagicMock()
    address.unit_number = overrides.get("unit_number")
    address.street_number = "100"
    address.street_address = "Douglas"
    address.street_address_additional = "Suite"
    address.city = "Victoria"
    address.province = "BC"
    return address


@pytest.mark.parametrize(
    "total_processed, expect_log",
    [
        pytest.param(500, True, id="at_500"),
        pytest.param(499, False, id="below_500"),
    ],
)
def test_log_progress_only_at_multiples_of_500(total_processed, expect_log):
    app = MagicMock()
    stats = {
        "total_processed": total_processed,
        "total_updated": 1,
        "total_skipped": 2,
        "total_errors": 0,
    }
    _log_progress(app, stats, 1000)
    if expect_log:
        app.logger.info.assert_called_once()
    else:
        app.logger.info.assert_not_called()


@pytest.mark.parametrize(
    "application_json, expected, expect_warning",
    [
        pytest.param("NO_APPLICATION", None, True, id="no_row"),
        pytest.param(
            {"registration": {"unit": "test"}},
            {"unit": "test"},
            False,
            id="returns_registration_payload",
        ),
        pytest.param({"other": True}, None, True, id="missing_registration_key"),
        pytest.param({"registration": None}, None, True, id="registration_subdoc_null"),
    ],
)
def test_get_json_from_application(mocker, application_json, expected, expect_warning):
    app = MagicMock()
    registration = MagicMock()
    registration.id = 1

    if application_json == "NO_APPLICATION":
        application = None
    else:
        application = MagicMock()
        application.application_json = application_json
        application.application_number = "N1"

    _patch_application_query(mocker, application)
    assert _get_json_from_application(registration, app) == expected
    if expect_warning:
        app.logger.warning.assert_called()
    else:
        app.logger.warning.assert_not_called()


def test_create_app_and_shellcontext(mocker):
    mocker.patch("backfiller.job.db.init_app")
    app = create_app("unittest")
    assert app.name == "backfiller.job"
    assert app.shell_context_processors[0]() == {"app": app}


def test_process_single_registration_skips_when_enrich_unchanged(mocker):
    registration = MagicMock(id=1, registration_type="HOST", registration_json={"a": 1})
    mocker.patch(
        "backfiller.job.RegistrationService._enrich_registration_json",
        return_value={"a": 1},
    )
    stats = _stats()
    _process_single_registration(registration, MagicMock(), stats)
    assert stats == {
        "total_processed": 1,
        "total_updated": 0,
        "total_skipped": 1,
        "total_errors": 0,
    }
    registration.save.assert_not_called()


def test_process_single_registration_updates_when_enrich_changes(mocker):
    registration = MagicMock(id=2, registration_type="HOST", registration_json={"a": 1})
    mocker.patch(
        "backfiller.job.RegistrationService._enrich_registration_json",
        return_value={"a": 1, "jurisdiction": "BC"},
    )
    stats = _stats()
    _process_single_registration(registration, MagicMock(), stats)
    assert stats["total_updated"] == 1 and stats["total_skipped"] == 0
    registration.save.assert_called_once()


def test_process_single_registration_skips_when_reconstruct_fails(mocker):
    registration = MagicMock(id=3, registration_json=None)
    mocker.patch("backfiller.job._get_json_from_application", return_value=None)
    stats = _stats()
    _process_single_registration(registration, MagicMock(), stats)
    assert stats["total_skipped"] == 1


def test_process_single_registration_logs_error_on_exception(mocker):
    registration = MagicMock(id=4, registration_json={"a": 1})
    mocker.patch(
        "backfiller.job.RegistrationService._enrich_registration_json",
        side_effect=RuntimeError("boom"),
    )
    app = MagicMock()
    stats = _stats()
    _process_single_registration(registration, app, stats)
    assert stats["total_errors"] == 1
    app.logger.error.assert_called()


def test_backfill_jurisdiction_updates_rental_fields(mocker):
    app = MagicMock()
    rental = MagicMock(address=_address_mock(unit_number="5"), save=MagicMock())
    registration = MagicMock(id=42, rental_property=rental)
    _patch_registration_join(mocker, registration)
    mocker.patch(
        "backfiller.job.ApprovalService.getSTRDataForAddress",
        return_value={
            "isPrincipalResidenceRequired": True,
            "isBusinessLicenceRequired": False,
            "organizationNm": "Test Org",
            "isStraaExempt": False,
        },
    )
    backfill_jurisdiction(app)
    assert rental.pr_required is True
    assert rental.bl_required is False
    assert rental.jurisdiction == "Test Org"
    assert rental.strr_exempt is False
    rental.save.assert_called_once()


def test_backfill_jurisdiction_logs_when_no_str_data(mocker):
    app = MagicMock()
    rental = MagicMock(address=_address_mock(), save=MagicMock())
    registration = MagicMock(id=9, rental_property=rental)
    _patch_registration_join(mocker, registration)
    mocker.patch("backfiller.job.ApprovalService.getSTRDataForAddress", return_value=None)
    backfill_jurisdiction(app)
    rental.save.assert_not_called()


def test_backfill_jurisdiction_catches_enrichment_errors(mocker):
    app = MagicMock()
    addr = MagicMock()
    type(addr).unit_number = PropertyMock(side_effect=RuntimeError("bad"))
    registration = MagicMock(id=11, rental_property=MagicMock(address=addr))
    _patch_registration_join(mocker, registration)
    backfill_jurisdiction(app)
    app.logger.error.assert_called()


def _strata_hotel(sh_id, reg_links):
    sh = MagicMock(id=sh_id, strata_hotel_registrations=reg_links, save=MagicMock())
    return sh


def test_backfill_strata_hotel_category_success(mocker):
    reg_link = MagicMock()
    reg_link.registration = MagicMock(id=55)
    strata_hotel = _strata_hotel(700, [reg_link])
    application = MagicMock(
        application_json={"registration": {"strataHotelDetails": {"category": "FULL_SERVICE"}}},
        application_number="APP-1",
    )
    _patch_strata_and_application(mocker, [strata_hotel], application_first=application)
    backfill_strata_hotel_category(MagicMock())
    strata_hotel.save.assert_called_once()
    assert strata_hotel.category is not None


def test_backfill_strata_hotel_no_registration_link(mocker):
    strata_hotel = _strata_hotel(1, [])
    _patch_strata_and_application(mocker, [strata_hotel])
    backfill_strata_hotel_category(MagicMock())
    strata_hotel.save.assert_not_called()


def test_backfill_strata_hotel_no_application(mocker):
    reg_link = MagicMock()
    reg_link.registration = MagicMock(id=77)
    strata_hotel = _strata_hotel(1, [reg_link])
    _patch_strata_and_application(mocker, [strata_hotel], application_first=None)
    backfill_strata_hotel_category(MagicMock())
    strata_hotel.save.assert_not_called()


def test_backfill_strata_hotel_missing_category_in_json(mocker):
    reg_link = MagicMock()
    reg_link.registration = MagicMock(id=99)
    strata_hotel = _strata_hotel(4, [reg_link])
    application = MagicMock(
        application_json={"registration": {"strataHotelDetails": {}}},
        application_number="NO-CAT",
    )
    _patch_strata_and_application(mocker, [strata_hotel], application_first=application)
    backfill_strata_hotel_category(MagicMock())
    strata_hotel.save.assert_not_called()


def test_backfill_strata_hotel_invalid_category_enum(mocker):
    reg_link = MagicMock()
    reg_link.registration = MagicMock(id=88)
    strata_hotel = _strata_hotel(2, [reg_link])
    application = MagicMock(
        application_json={
            "registration": {"strataHotelDetails": {"category": "NOT_A_REAL_CATEGORY"}},
        },
        application_number="X",
    )
    app = MagicMock()
    _patch_strata_and_application(mocker, [strata_hotel], application_first=application)
    backfill_strata_hotel_category(app)
    app.logger.error.assert_called()
    strata_hotel.save.assert_not_called()


def test_backfill_strata_hotel_outer_exception(mocker):
    strata_hotel = _strata_hotel(3, [MagicMock()])
    app = MagicMock()
    _patch_strata_and_application(mocker, [strata_hotel], application_side_effect=RuntimeError("db down"))
    backfill_strata_hotel_category(app)
    app.logger.error.assert_called()


def test_backfill_registration_search_processes_batches(mocker):
    app = MagicMock()
    registration = MagicMock(id=200, registration_type="HOST", registration_json={"x": 1})
    batch_query = MagicMock()
    batch_query.all.side_effect = [[registration], []]
    limit_mock = MagicMock()
    limit_mock.offset.return_value = batch_query
    ordered = MagicMock()
    ordered.count.return_value = 2
    ordered.limit.return_value = limit_mock
    reg_model = MagicMock()
    reg_model.query.order_by.return_value = ordered
    mocker.patch("backfiller.job.Registration", reg_model)
    mocker.patch(
        "backfiller.job.RegistrationService._enrich_registration_json",
        return_value={"x": 1},
    )
    backfill_registration_search(app, batch_size=10)
    app.logger.info.assert_any_call("--------------------------------------")


def test_backfill_registration_search_fatal_error(mocker):
    app = MagicMock()
    reg_model = MagicMock()
    reg_model.query.order_by.side_effect = RuntimeError("fatal")
    mocker.patch("backfiller.job.Registration", reg_model)
    backfill_registration_search(app, batch_size=5)
    app.logger.error.assert_called()


def _mock_run_context(mock_app):
    cm = MagicMock()
    cm.__enter__ = MagicMock(return_value=None)
    cm.__exit__ = MagicMock(return_value=False)
    mock_app.app_context.return_value = cm


def test_run_executes_registration_backfill_when_config_enabled(mocker):
    mock_app = MagicMock()
    mock_app.config.get.side_effect = lambda key, default=None: {
        "BACKFILL_REGISTRATION_SEARCH": True,
        "BACKFILL_REGISTRATION_SEARCH_BATCH_SIZE": 25,
    }.get(key, default)
    _mock_run_context(mock_app)
    mocker.patch("backfiller.job.create_app", return_value=mock_app)
    mock_backfill = mocker.patch("backfiller.job.backfill_registration_search")
    run()
    mock_backfill.assert_called_once_with(mock_app, batch_size=25)


def test_run_skips_backfill_when_disabled(mocker):
    mock_app = MagicMock()
    mock_app.config.get.return_value = False
    _mock_run_context(mock_app)
    mocker.patch("backfiller.job.create_app", return_value=mock_app)
    mock_backfill = mocker.patch("backfiller.job.backfill_registration_search")
    run()
    mock_backfill.assert_not_called()
