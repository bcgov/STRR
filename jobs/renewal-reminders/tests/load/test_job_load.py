import math

import pytest
from sqlalchemy import select
from strr_api.enums.enum import ChannelType
from strr_api.models import CustomerInteraction
from strr_api.models import Registration


@pytest.mark.load  # This test will now be skipped by default
@pytest.mark.parametrize("setup_bulk_parents", [{"records": 10000}], indirect=True)
def test_no_params_validation_scan(setup_bulk_parents):
    # setup_bulk_parents intercepted the 10000 and generated massive data
    graph_info, scenario = setup_bulk_parents
    assert graph_info["record_count"] == 10000


reminder_scenario = {
    "records": 50000,
    "chunk_size": 2000,
    "target_days": [0, 15, 30, 45, 60],
    "target_pct": 0.10,
}


@pytest.mark.load  # This test will now be skipped by default
@pytest.mark.parametrize("setup_bulk_parents", [reminder_scenario], indirect=True)
def test_mid_validation_scan(setup_bulk_parents):
    # setup_bulk_parents intercepted the 10000 and generated massive data
    graph_info, scenario = setup_bulk_parents
    assert graph_info["record_count"] == scenario["records"]
    # ... your load test assertions here ...

    expected_60_day_ids = graph_info["target_reg_ids"][60]
    assert len(expected_60_day_ids) == scenario["records"] * scenario["target_pct"]


scenario_60_day = {"records": 10000, "chunk_size": 2000, "target_days": [60], "target_pct": 0.10}


@pytest.mark.load  # This test will now be skipped by default
@pytest.mark.parametrize("setup_bulk_parents", [scenario_60_day], indirect=True)
def test_heavy_validation_scan(setup_bulk_parents):
    # setup_bulk_parents intercepted the 10000 and generated massive data
    graph_info, scenario = setup_bulk_parents
    assert graph_info["record_count"] == scenario["records"]
    # ... your load test assertions here ...

    expected_60_day_ids = graph_info["target_reg_ids"][60]
    assert len(expected_60_day_ids) == scenario["records"] * scenario["target_pct"]


scenario_uno_day = {
    "records": 1,
    "target_days": [40],
    "target_pct": 1,
}


@pytest.mark.load  # This test will now be skipped by default
@pytest.mark.parametrize("setup_bulk_parents", [scenario_uno_day], indirect=True)
def test_40_validation_scan(mocker, app, session, setup_bulk_parents):
    # setup_bulk_parents created 1 record that expires in 40 days
    graph_info, scenario = setup_bulk_parents
    assert graph_info["record_count"] == scenario["records"]
    expected_40_day_ids = graph_info["target_reg_ids"][40]
    assert len(expected_40_day_ids) == scenario["records"]

    mock_service = mocker.patch(
        "renewal_reminders.job.EmailService.send_renewal_reminder_for_registration"
    )

    from renewal_reminders.job import run

    # Test
    run(app)

    # Validate outcome
    registration = session.scalar(
        select(Registration).where(Registration.id == expected_40_day_ids[0])
    )

    if not mock_service.called:
        assert False
    mock_service.assert_called_once()

    _, kwargs = mock_service.call_args
    assert kwargs["registration"].id == registration.id


scenario_idempotent = {
    "records": 1,
    "target_days": [0],
    "target_pct": 1,
}


@pytest.mark.load  # This test will now be skipped by default
@pytest.mark.parametrize("setup_bulk_parents", [scenario_idempotent], indirect=True)
def test_single_idempotent_skip(mocker, app, session, setup_bulk_parents):
    """Test that the record is skipped if the interaction shows the job has already captured this record."""
    # setup_bulk_parents created 1 record that expires in 0 days
    graph_info, scenario = setup_bulk_parents
    assert graph_info["record_count"] == scenario["records"]
    expected_day_ids = graph_info["target_reg_ids"][0]
    assert len(expected_day_ids) == scenario["records"]

    mock_service = mocker.patch(
        "renewal_reminders.job.EmailService.send_renewal_reminder_for_registration"
    )

    from renewal_reminders.job import renewal_job_key
    from renewal_reminders.job import run

    interaction = CustomerInteraction(
        registration_id=expected_day_ids[0],
        channel=ChannelType.EMAIL,
        idempotency_key=renewal_job_key(),
    )
    session.add(interaction)
    session.flush()

    run(app)

    registration = session.scalar(
        select(Registration).where(Registration.id == expected_day_ids[0])
    )

    if mock_service.called:
        args, kwargs = mock_service.call_args

    assert not mock_service.called


scenario_all_idempotent = [
    {
        "records": 1,
        "target_days": [0],
        "target_pct": 1,
    },
    {
        "records": 1,
        "target_days": [14],
        "target_pct": 1,
    },
    {
        "records": 1,
        "target_days": [40],
        "target_pct": 1,
    },
    {
        "records": 12,
        "target_days": [0, 14, 40],
        "target_pct": 1,
    },
]
scenario_names = [
    f"records_{s['records']}_days_{'-'.join(map(str, s['target_days']))}_pct_{s['target_pct']}"
    for s in scenario_all_idempotent
]


@pytest.mark.load  # This test will now be skipped by default
@pytest.mark.parametrize(
    "setup_bulk_parents", scenario_all_idempotent, indirect=True, ids=scenario_names
)
def test_idempotent_skip(mocker, app, session, setup_bulk_parents):
    """Test that the record is skipped if the interaction shows the job has already captured this record."""
    # setup_bulk_parents created 1 record that expires in 0 days
    graph_info, scenario = setup_bulk_parents
    assert graph_info["record_count"] == scenario["records"]

    mock_service = mocker.patch(
        "renewal_reminders.job.EmailService.send_renewal_reminder_for_registration"
    )

    from renewal_reminders.job import renewal_job_key
    from renewal_reminders.job import run

    expected_skip_count = 0
    for reg_group in graph_info["target_reg_ids"]:
        reg_set = graph_info["target_reg_ids"][reg_group]
        midpoint = (len(reg_set) + 1) // 2
        expected_skip_count += midpoint
        for reg in reg_set[:midpoint]:
            interaction = CustomerInteraction(
                registration_id=reg,
                channel=ChannelType.EMAIL,
                idempotency_key=renewal_job_key(days=reg_group),
            )
            session.add(interaction)
    session.flush()

    run(app)

    assert mock_service.call_count == (scenario["records"] - expected_skip_count)
