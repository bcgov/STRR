from interactions_update.services.interaction_processor import InteractionProcessor
from strr_api.enums.enum import InteractionStatus


def test_merge_primary_notify_metadata_preserves_initial_dispatch_fields():
    processor = InteractionProcessor()
    existing_meta_data = {
        "notify_references": "ref-1,ref-2",
        "notify_response": {
            "id": "ref-1",
            "ids": "ref-1,ref-2",
            "recipients": "good1@gov.bc.ca,good2@gov.bc.ca",
            "failed_recipients": [
                {
                    "email_address": "bad@gov.bc.ca.ca",
                    "status_code": 400,
                    "error": "Invalid email",
                }
            ],
        },
    }
    primary_payload = {
        "id": "ref-1",
        "recipients": "good1@gov.bc.ca",
        "notifyStatus": "delivered",
        "status_description": "Delivered",
        "sentDate": "2026-10-06T12:00:00Z",
    }

    processor._merge_primary_notify_metadata(existing_meta_data, primary_payload)

    notify_response = existing_meta_data["notify_response"]
    assert notify_response["failed_recipients"] == [
        {
            "email_address": "bad@gov.bc.ca.ca",
            "status_code": 400,
            "error": "Invalid email",
        }
    ]
    assert notify_response["ids"] == "ref-1,ref-2"
    assert notify_response["recipients"] == "good1@gov.bc.ca,good2@gov.bc.ca"
    assert notify_response["notifyStatus"] == "delivered"
    assert notify_response["sentDate"] == "2026-10-06T12:00:00Z"


def test_merge_primary_notify_metadata_none_payload():
    processor = InteractionProcessor()
    existing_meta_data = {"notify_response": {"id": "1"}}
    processor._merge_primary_notify_metadata(existing_meta_data, None)
    assert existing_meta_data == {"notify_response": {"id": "1"}}


def test_resolve_new_status_with_failed_mapped_status():
    status = InteractionProcessor._resolve_new_status(
        [InteractionStatus.DELIVERED, InteractionStatus.FAILED],
        reference_count=2,
        has_failed_recipients=False,
    )
    assert status == InteractionStatus.FAILED


def test_resolve_new_status_all_delivered_no_failed_recipients():
    status = InteractionProcessor._resolve_new_status(
        [InteractionStatus.DELIVERED, InteractionStatus.DELIVERED],
        reference_count=2,
        has_failed_recipients=False,
    )
    assert status == InteractionStatus.DELIVERED


def test_resolve_new_status_all_delivered_with_failed_recipients():
    status = InteractionProcessor._resolve_new_status(
        [InteractionStatus.DELIVERED, InteractionStatus.DELIVERED],
        reference_count=2,
        has_failed_recipients=True,
    )
    assert status == InteractionStatus.FAILED


def test_resolve_new_status_in_progress_returns_none_to_continue_polling():
    status = InteractionProcessor._resolve_new_status(
        [InteractionStatus.DELIVERED],
        reference_count=2,
        has_failed_recipients=True,
    )
    assert status is None
