# Copyright © 2025 Province of British Columbia
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# pylint: disable=logging-fstring-interpolation, W0612, W0511, W0718, W0212

"""Batch Permit Validator Job."""

import concurrent.futures
import copy
import json
import os
import sys
import traceback
from datetime import datetime
from functools import partial

from flask import Flask, current_app
from strr_api.enums.enum import ErrorMessage
from strr_api.models import BulkValidation, db
from strr_api.schemas.utils import validate
from strr_api.services.approval_service import ApprovalService
from strr_api.services.gcp_storage_service import GCPStorageService
from strr_api.services.registration_service import RegistrationService
from strr_api.services.validation_service import ValidationService
from strr_api.services import gcp_queue_publisher
from structured_logging import StructuredLogging

from batch_permit_validator.config import CONFIGURATION
from batch_permit_validator.validation_cache import ValidationCache

logger = StructuredLogging.get_logger()

# TODO: Optimize this based on the number of listings in the request
CHUNK_SIZE = 5000
EXPIRATION_PERIOD = 24 * 60 * 7


def create_app(run_mode=os.getenv("FLASK_ENV", "production")):
    """Return a configured Flask App using the Factory method."""
    app = Flask(__name__)
    app.config.from_object(CONFIGURATION[run_mode])
    db.init_app(app)
    register_shellcontext(app)
    return app


def register_shellcontext(app):
    """Register shell context objects."""

    def shell_context():
        """Shell context objects."""
        return {"app": app}

    app.shell_context_processor(shell_context)


def _process_file(file_name):
    validation_request_bucket = GCPStorageService.get_bucket(
        current_app.config.get("BULK_VALIDATION_REQUESTS_BUCKET")
    )
    blob = validation_request_bucket.blob(file_name)
    request_json = json.loads(blob.download_as_text())
    logger.info(request_json)
    process_records_in_parallel(request_json, file_name)


def run():
    """Run the batch permit validator job."""
    try:
        app = create_app()
        with app.app_context():
            logger.info("Starting batch permit validator job")
            file_name = sys.argv[1:][
                0
            ]  # sys.argv[0] is the script name, so we take everything after that
            logger.info(f"Processing file {file_name}")
            if file_name:
                _process_file(file_name=file_name)
            else:
                logger.error("Empty file name.")
    except Exception as err:  # pylint: disable=broad-except
        logger.error(err, logger.error(err, stack_info=True, exc_info=True))
        logger.error(f"Unexpected error: {str(err)}")


def process_record(record: dict, validation_cache: ValidationCache, app):
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
                registration = RegistrationService.find_by_registration_number(
                    identifier
                )

                if registration:
                    response = ValidationService.check_permit_details(
                        record, registration
                    )
                else:
                    response["errors"] = [
                        {
                            "code": ErrorMessage.PERMIT_NOT_FOUND.name,
                            "message": ErrorMessage.PERMIT_NOT_FOUND.value,
                        }
                    ]
            else:
                str_requirements = get_strr_requirements(
                    record.get("address"), validation_cache
                )
                response.update(str_requirements)
                logger.info("STR requirements updated for record: %s", response)

            return response

    except Exception as e:
        logger.error(f"Processing error for the record  {record}: {e}")
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


def get_strr_requirements(unit_address: dict, validation_cache):
    """Call Data Portal API to get the STR requirements."""
    address_line_1 = ""
    if unit_number := unit_address.get("unitNumber"):
        address_line_1 = f"{unit_number}-"
    address_line_1 = f"{address_line_1}{unit_address.get('streetNumber')} {unit_address.get('streetName')}"
    address = (
        f"{address_line_1}, {unit_address.get('city')}, {unit_address.get('province')}"
    )
    cached_data = validation_cache.cache.get(address)

    if cached_data:
        # If the key exists, return the cached data.
        logger.info(f"Key exists :::: {address}")
        str_data = json.loads(cached_data)
    else:
        logger.info(f"Key does not exist :::: {address}")
        str_data = ApprovalService.getSTRDataForAddress(address=address)
        if not str_data:
            return {
                "code": ErrorMessage.STRR_REQUIREMENTS_FETCH_ERROR.name,
                "message": ErrorMessage.STRR_REQUIREMENTS_FETCH_ERROR.value,
            }
        validation_cache.cache.set(address, json.dumps(str_data))
    return {"isStraaExempt": str_data.get("isStraaExempt")}


def process_chunk(chunk, validation_cache, max_workers=5):
    """Process a chunk of records in parallel."""
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        process_record_args = partial(
            process_record,
            validation_cache=validation_cache,
            app=current_app._get_current_object(),
        )
        return list(executor.map(process_record_args, chunk))


def process_records_in_parallel(request_json, request_file_key, chunk_size=CHUNK_SIZE):
    """Read JSON in chunks, validate in parallel, and write results incrementally."""
    try:
        validation_cache = ValidationCache()
        permits = request_json.get("permits")
        total_records = len(permits)

        logger.info(f"Loaded {total_records} records for processing.")

        for idx in range(0, total_records, chunk_size):
            chunk = permits[idx : idx + chunk_size]
            logger.info(
                f"Processing chunk {idx // chunk_size + 1} ({len(chunk)} records)..."
            )

            results = []

            result = process_chunk(chunk, validation_cache)
            results.extend(result)

            logger.info(f"Chunk {idx // chunk_size + 1} processed!")

        response_json = {"controls": request_json.get("controls"), "permits": results}
        presigned_url = _save_response(
            response_json=response_json, request_file_key=request_file_key
        )

        callback_queue_message = {
            "callBackUrl": request_json.get("controls").get("callBackUrl"),
            "preSignedUrl": presigned_url,
        }
        logger.info(f"Response: {callback_queue_message}")

        gcp_queue_publisher.publish_to_queue(
            gcp_queue_publisher.QueueMessage(
                source="batch-permit-validator",
                message_type="strr.batchPermitValidationResult",
                payload=callback_queue_message,
                topic=current_app.config.get("BULK_VALIDATION_RESPONSE_TOPIC"),
            )
        )

        logger.info("Published response to the queue successfully!")

    except Exception as e:
        _update_bulk_validation_record(request_file_key, BulkValidation.Status.ERROR)
        logger.error(traceback.format_exc())
        logger.error(f"Error reading JSON file: {e}")


def _save_response(response_json: dict, request_file_key: str) -> str:
    """Uploads the request to cloud storage and creates an entry in the db."""

    bucket_id = current_app.config.get("BULK_VALIDATION_RESPONSE_BUCKET")
    response_file_key = GCPStorageService.upload_file(
        file_type="application/json",
        file_contents=json.dumps(response_json),
        bucket_id=bucket_id,
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
