# Copyright © 2025 Province of British Columbia
#
# Licensed under the BSD 3 Clause License, (the 'License');
# you may not use this file except in compliance with the License.
# The template for the license can be found here
#    https://opensource.org/license/bsd-3-clause/
#
# Redistribution and use in source and binary forms,
# with or without modification, are permitted provided that the
# following conditions are met:
#
# 1. Redistributions of source code must retain the above copyright notice,
#    this list of conditions and the following disclaimer.
#
# 2. Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.
#
# 3. Neither the name of the copyright holder nor the names of its contributors
#    may be used to endorse or promote products derived from this software
#    without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS”
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
# THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
# ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
# LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.

# pylint: disable=logging-fstring-interpolation, W0612, W0511, W0718, W0212, C0103, R1710

"""This Module handles messages related to bulk validation file upload.
"""
from dataclasses import dataclass
from http import HTTPStatus
import re
from typing import Optional

from flask import Blueprint
from flask import current_app
from flask import request
from google.cloud import run_v2
import requests
from simple_cloudevent import SimpleCloudEvent
from structured_logging import StructuredLogging

from batch_permit_validator.services import gcp_queue

bp = Blueprint("worker", __name__)

logger = StructuredLogging.get_logger()

TIMEOUT_IN_SECONDS = 45 * 60


@bp.route("/", methods=("POST",))
def worker():
    """Process the incoming file uploaded event."""
    if not request.data:
        return {}, HTTPStatus.OK

    ce = request.get_json() or {}
    logger.info("Incoming raw msg: %s", ce)

    file_name = _extract_uploaded_file_name(ce)
    logger.info("File Name: %s", file_name)
    if not file_name:
        return {"error": "Invalid File Name"}, HTTPStatus.BAD_REQUEST

    _trigger_batch_permit_validator_job(file_name=file_name)

    logger.info("Finished processing: %s", str(ce))
    return {}, HTTPStatus.OK


def _extract_uploaded_file_name(ce: dict) -> Optional[str]:
    """Extract object/file name from direct GCS events or Pub/Sub wrapped messages."""
    if not isinstance(ce, dict):
        return None
    if file_name := ce.get("name") or ce.get("objectId"):
        return file_name
    if isinstance(message := ce.get("message"), dict):
        if isinstance(attributes := message.get("attributes"), dict):
            return attributes.get("objectId") or attributes.get("name")
    return None


def _trigger_batch_permit_validator_job(file_name=""):
    try:
        client = run_v2.JobsClient()

        project_id = current_app.config.get("GCP_PROJECT_ID")
        location = current_app.config.get("GCP_CLOUD_RUN_JOB_LOCATION")
        job_name = current_app.config.get("GCP_CLOUD_RUN_JOB_NAME")
        parent = f"projects/{project_id}/locations/{location}/jobs/{job_name}"

        overrides = {
            "container_overrides": [{"args": [file_name]}],
            "timeout": str(TIMEOUT_IN_SECONDS) + "s",
            "task_count": 1,
        }

        logger.info("%s", overrides)

        # Initialize request argument(s)
        job_request = run_v2.RunJobRequest(
            name=parent,
            overrides=overrides,
        )

        # Make the request
        client.run_job(request=job_request)

        # Output the execution details
        logger.info("Execution triggered for job %s", job_name)

    except Exception as e:
        logger.error("Error triggering job %s: %s", job_name, e, exc_info=True)
        raise e


@bp.route("/bulk-validation-response", methods=("POST",))
def send_bulk_validation_response():
    """Process the incoming bulk validation response event."""
    event_id = None
    validation_response = None
    try:
        if not request.data:
            logger.info("Empty request data received on /bulk-validation-response")
            return {}, HTTPStatus.OK

        logger.info("Incoming raw msg: %s", str(request.data))

        # 1. Get cloud event
        if not (ce := gcp_queue.get_simple_cloud_event(request, wrapped=True)):
            logger.warning("Could not extract SimpleCloudEvent from incoming request")
            return {}, HTTPStatus.OK

        event_id = getattr(ce, "id", None)
        logger.info("Received event (id=%s, type=%s)", event_id, getattr(ce, "type", None))

        # 2. Get validation response information
        if not (validation_response := get_bulk_validation_response(ce)):
            logger.warning("Event %s is not a valid BulkValidationResponse event", event_id)
            return {}, HTTPStatus.OK

        if not validation_response.call_back_url or not validation_response.pre_signed_url:
            logger.error(
                "Invalid BulkValidationResponse payload for event %s: call_back_url=%s, pre_signed_url=%s",
                event_id,
                validation_response.call_back_url,
                bool(validation_response.pre_signed_url),
            )
            return {
                "error": "Missing required callback URL or presigned URL"
            }, HTTPStatus.BAD_REQUEST

        logger.info(
            "Sending callback for event %s to %s", event_id, validation_response.call_back_url
        )

        response = requests.post(
            validation_response.call_back_url,
            data={"fileUrl": validation_response.pre_signed_url},
            timeout=10,
        )

        if response.status_code != HTTPStatus.OK:
            logger.error(
                "Callback URL responded with error: event_id=%s, status_code=%s, url=%s, response_text=%s",
                event_id,
                response.status_code,
                validation_response.call_back_url,
                response.text[:500],
            )
            return {
                "error": f"Callback endpoint failed with status {response.status_code}",
            }, HTTPStatus.INTERNAL_SERVER_ERROR

        logger.info("Completed event %s: callback sent successfully", event_id)
        return {}, HTTPStatus.OK
    except requests.exceptions.Timeout as e:
        cb_url = getattr(validation_response, "call_back_url", None)
        logger.error("Timeout sending callback for event %s to %s: %s", event_id, cb_url, e)
        return {"error": "Callback URL timed out"}, HTTPStatus.GATEWAY_TIMEOUT
    except requests.exceptions.RequestException as e:
        cb_url = getattr(validation_response, "call_back_url", None)
        logger.error(
            "Request error sending callback for event %s to %s: %s",
            event_id,
            cb_url,
            e,
            exc_info=True,
        )
        return {"error": "Callback request failure"}, HTTPStatus.INTERNAL_SERVER_ERROR
    except Exception as e:
        logger.error(
            "Unexpected error in send_bulk_validation_response (event_id=%s): %s",
            event_id,
            e,
            exc_info=True,
        )
        return {"error": "Internal server error"}, HTTPStatus.INTERNAL_SERVER_ERROR


@bp.route("/test-response", methods=("POST",))
def dummy_response():
    """Process the incoming bulk validation response event."""
    try:
        logger.info("Incoming message: %s", request.get_json())
        return {}, HTTPStatus.OK
    except Exception as e:
        logger.error("Error processing test response: %s", e, exc_info=True)
        return {"error": "Internal server error"}, HTTPStatus.INTERNAL_SERVER_ERROR


@dataclass
class BulkValidationResponse:
    """Bulk Validation Response class"""

    call_back_url: Optional[str] = None
    pre_signed_url: Optional[str] = None


def get_bulk_validation_response(ce: SimpleCloudEvent):
    """Return a BulkValidationResponse if enclosed in the cloud event."""
    # pylint: disable=fixme
    if (
        (ce.type == "strr.batchPermitValidationResult")
        and (data := ce.data)
        and isinstance(data, dict)
    ):
        converted = dict_keys_to_snake_case(data)
        pt = BulkValidationResponse(**converted)
        return pt
    return None


def dict_keys_to_snake_case(d: dict):
    """Convert the keys of a dict to snake_case"""
    pattern = re.compile(r"(?<!^)(?=[A-Z])")
    converted = {}
    for k, v in d.items():
        converted[pattern.sub("_", k).lower()] = v
    return converted
