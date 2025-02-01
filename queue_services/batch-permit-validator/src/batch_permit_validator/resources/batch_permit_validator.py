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

# pylint: disable=logging-fstring-interpolation, W0612, W0511, W0718, W0212

"""This Module processes eventarc messages for bulk validation file upload.
"""
import concurrent.futures
import copy
from datetime import datetime
from functools import partial
from http import HTTPStatus
import json
import logging

from flask import Blueprint
from flask import current_app
from flask import request
from strr_api.enums.enum import ErrorMessage
from strr_api.models import BulkValidation
from strr_api.schemas.utils import validate
from strr_api.services.approval_service import ApprovalService
from strr_api.services.gcp_storage_service import GCPStorageService
from strr_api.services.registration_service import RegistrationService
from strr_api.services.validation_service import ValidationService
from structured_logging import StructuredLogging

EXPIRATION_PERIOD = 24 * 60 * 7

bp = Blueprint("worker", __name__)

logger = StructuredLogging.get_logger()

# TODO: Optimize this based on the number of listings in the request
CHUNK_SIZE = 5000


@bp.route("/", methods=("POST",))
def worker():
    """Process the incoming file uploaded event."""
    if not request.data:
        return {}, HTTPStatus.OK

    logger.info(f"Incoming raw msg: {str(request.data)}")

    # 1. Get cloud event
    request_bytes = request.data.decode().replace("'", '"')
    ce = json.loads(request_bytes)
    file_name = ce.get("name")
    if not file_name:
        return {"error": "Invalid File Name"}, HTTPStatus.BAD_REQUEST

    validation_request_bucket = GCPStorageService.get_bucket(
        current_app.config.get("BULK_VALIDATION_REQUESTS_BUCKET")
    )
    blob = validation_request_bucket.blob(file_name)
    request_json = json.loads(blob.download_as_text())
    logger.info(request_json)
    process_records_in_parallel(request_json, file_name)
    return {}, HTTPStatus.OK


def process_record(record: dict, app):
    """Processes the individual record."""
    response = copy.deepcopy(record)
    try:
        with app.app_context():
            # Validate the record based on whether the identifier is present or not.
            valid, errors = _validate_record(record)
            if errors:
                response["errors"] = errors
                return response

            if identifier := record.get("identifier"):
                registration = RegistrationService.find_by_registration_number(identifier)

                if registration:
                    response = ValidationService.check_permit_details(record, registration)
                else:
                    response["errors"] = [
                        {
                            "code": ErrorMessage.PERMIT_NOT_FOUND.name,
                            "message": ErrorMessage.PERMIT_NOT_FOUND.value,
                        }
                    ]
            else:
                str_requirements = get_strr_requirements(record.get("address"))
                response.update(str_requirements)
                logging.info("STR requirements updated for record: %s", response)

            return response

    except Exception as e:
        logging.error(f"Processing error for the record  {record}: {e}")
        response["errors"] = [
            {
                "code": ErrorMessage.PROCESSING_ERROR.name,
                "message": ErrorMessage.PROCESSING_ERROR.value,
            }
        ]
        return response


def _validate_record(record: dict):
    if record.get("identifier"):
        [valid, errors] = validate(record, "real_time_validation")
    else:
        [valid, errors] = validate(record, "rental_unit_address")

    return valid, errors


def get_strr_requirements(unit_address: dict):
    # TODO: Cache this.
    """Call Data Portal API to get the STR requirements."""
    address_line_1 = ""
    if unit_number := unit_address.get("unitNumber"):
        address_line_1 = f"{unit_number}-"
    address_line_1 = (
        f"{address_line_1}{unit_address.get('streetNumber')} {unit_address.get('streetName')}"
    )
    address = f"{address_line_1}, {unit_address.get('city')}, {unit_address.get('province')}"
    str_data = ApprovalService.getSTRDataForAddress(address=address)
    if not str_data:
        return {
            "code": ErrorMessage.STRR_REQUIREMENTS_FETCH_ERROR.name,
            "message": ErrorMessage.STRR_REQUIREMENTS_FETCH_ERROR.value,
        }
    return {"isStraaExempt": str_data.get("isStraaExempt")}


def process_chunk(chunk, max_workers=5):
    """Process a chunk of records in parallel."""
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        process_record_args = partial(process_record, app=current_app._get_current_object())
        return list(executor.map(process_record_args, chunk))


def process_records_in_parallel(request_json, request_file_key, chunk_size=CHUNK_SIZE):
    """Read JSON in chunks, validate in parallel, and write results incrementally."""
    try:
        permits = request_json.get("permits")
        total_records = len(permits)

        logging.info(f"Loaded {total_records} records for processing.")

        for idx in range(0, total_records, chunk_size):
            chunk = permits[idx : idx + chunk_size]
            logging.info(f"Processing chunk {idx // chunk_size + 1} ({len(chunk)} records)...")

            results = []

            result = process_chunk(chunk)
            results.extend(result)

            logging.info(f"Chunk {idx // chunk_size + 1} processed!")

        response_json = {"controls": request_json.get("controls"), "permits": results}
        presigned_url = _save_response(
            response_json=response_json, request_file_key=request_file_key
        )

        callback_queue_message = {
            "callBackUrl": request_json.get("controls").get("callBackUrl"),
            "preSignedUrl": presigned_url,
        }
        logger.info(f"Response: {callback_queue_message}")

        # TODO: Publish to the queue

        logging.info("Processing completed successfully!")

    except Exception as e:
        _update_bulk_validation_record(request_file_key, BulkValidation.Status.ERROR)
        logging.error(f"Error reading JSON file: {e}")


def _save_response(response_json: dict, request_file_key: str) -> str:
    """Uploads the request to cloud storage and creates an entry in the db."""

    bucket_id = current_app.config.get("BULK_VALIDATION_RESPONSE_BUCKET")
    response_file_key = GCPStorageService.upload_file(
        file_type="application/json", file_contents=json.dumps(response_json), bucket_id=bucket_id
    )
    presigned_url = GCPStorageService.get_presigned_url(
        bucket_id, response_file_key, EXPIRATION_PERIOD
    )

    _update_bulk_validation_record(
        request_file_key, BulkValidation.Status.COMPLETED, response_file_key
    )

    return presigned_url


def _update_bulk_validation_record(request_file_key, status, response_file_key=None):
    """Updates the bulk validation record."""
    bulk_validation = BulkValidation.get_record_by_request_file_id(request_file_key)
    if bulk_validation:
        bulk_validation.status = status
        if response_file_key:
            bulk_validation.response_file_id = response_file_key
            bulk_validation.response_timestamp = datetime.utcnow()

        bulk_validation.save()
