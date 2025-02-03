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
from http import HTTPStatus
import json

from flask import Blueprint
from flask import current_app
from flask import request
from google.cloud import run_v2
from structured_logging import StructuredLogging

bp = Blueprint("worker", __name__)

logger = StructuredLogging.get_logger()

TIMEOUT_IN_SECONDS = 45 * 60


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
    logger.info(f"File Name: {file_name}")
    if not file_name:
        return {"error": "Invalid File Name"}, HTTPStatus.BAD_REQUEST

    _trigger_batch_permit_validator_job(file_name=file_name)

    logger.info(f"Finished processing : {str(ce)}")
    return {}, HTTPStatus.OK


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

        logger.info(overrides)

        # Initialize request argument(s)
        job_request = run_v2.RunJobRequest(
            name=parent,
            overrides=overrides,
        )

        # Make the request
        client.run_job(request=job_request)

        # Output the execution details
        logger.info(f"Execution triggered for job {job_name}")

    except Exception as e:
        logger.error(e, stack_info=True, exc_info=True)
        logger.error(f"Error triggering job: {e}")
        raise e
