# Copyright © 2024 Province of British Columbia
#
# Licensed under the BSD 3 Clause License, (the "License");
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
"""Service to interact with the applications model."""
from datetime import datetime, timezone

from strr_api.enums.enum import ApplicationType, PaymentStatus
from strr_api.models import Application, Events, User
from strr_api.models.application import ApplicationSerializer
from strr_api.models.dataclass import ApplicationSearch
from strr_api.requests import RegistrationRequest
from strr_api.services.events_service import EventsService
from strr_api.services.registration_service import RegistrationService
from strr_api.utils.user_context import UserContext, user_context

APPLICATION_TERMINAL_STATES = [
    Application.Status.FULL_REVIEW_APPROVED,
    Application.Status.PROVISIONALLY_APPROVED,
    Application.Status.AUTO_APPROVED,
    Application.Status.DECLINED,
]
APPLICATION_STATES_STAFF_ACTION = [
    Application.Status.FULL_REVIEW_APPROVED,
    Application.Status.PROVISIONALLY_APPROVED,
    Application.Status.DECLINED,
    Application.Status.ADDITIONAL_INFO_REQUESTED,
]
APPLICATION_UNPAID_STATES = [Application.Status.DRAFT, Application.Status.PAYMENT_DUE]


class ApplicationService:
    """Service to interact with the applications model."""

    @staticmethod
    def serialize(application: Application) -> dict:
        """Returns application JSON."""
        return ApplicationSerializer.to_dict(application)

    @staticmethod
    @user_context
    def save_application(account_id, request_json: dict, **kwargs):
        """Saves an application to db."""
        usr_context: UserContext = kwargs["user_context"]
        user = User.get_or_create_user_by_jwt(usr_context.token_info)
        application = Application()
        application.payment_account = account_id
        application.submitter_id = user.id
        application.type = ApplicationType.REGISTRATION.value
        application.application_json = request_json
        application.save()
        return application

    @staticmethod
    @user_context
    def list_applications(account_id, filter_criteria, **kwargs):
        """List all applications matching the search criteria."""
        usr_context: UserContext = kwargs["user_context"]
        user = User.get_or_create_user_by_jwt(usr_context.token_info)
        is_examiner = usr_context.is_examiner()
        paginated_result = Application.find_by_user_and_account(user.id, account_id, filter_criteria, is_examiner)
        search_results = []
        for item in paginated_result.items:
            search_results.append(ApplicationService.serialize(item))

        return {
            "page": filter_criteria.page,
            "limit": filter_criteria.limit,
            "applications": search_results,
            "total": paginated_result.total,
        }

    @staticmethod
    @user_context
    def get_application(application_id, account_id=None, **kwargs):
        """Get the application with the specified id."""
        usr_context: UserContext = kwargs["user_context"]
        user = User.get_or_create_user_by_jwt(usr_context.token_info)
        if ApplicationService.is_user_authorized_for_application(user.id, account_id, application_id):
            return Application.find_by_id(application_id)
        return None

    @staticmethod
    @user_context
    def is_user_authorized_for_application(user_id: int, account_id: int, application_id: int, **kwargs) -> bool:
        """Check the user authorization for an application."""
        usr_context: UserContext = kwargs["user_context"]
        if usr_context.is_examiner() or usr_context.is_system:
            return True
        application = Application.get_application(user_id, account_id, application_id)
        if application:
            return True
        return False

    @staticmethod
    def update_application_payment_details_and_status(application: Application, invoice_details: dict) -> Application:
        """
        Updates the invoice details in the application. This method also updates the application status based on
        the invoice status.
        """
        if application.payment_status_code == "COMPLETED":
            return application

        application.invoice_id = invoice_details["id"]
        application.payment_account = invoice_details.get("paymentAccount").get("accountId")
        application.payment_status_code = invoice_details.get("statusCode")

        if (
            application.status == Application.Status.DRAFT
            and application.payment_status_code == PaymentStatus.CREATED.value
        ):
            application.status = Application.Status.PAYMENT_DUE
            EventsService.save_event(
                event_type=Events.EventType.APPLICATION,
                event_name=Events.EventName.APPLICATION_SUBMITTED,
                application_id=application.id,
            )
        else:
            if application.payment_status_code == PaymentStatus.COMPLETED.value:
                application.status = Application.Status.PAID
                application.payment_completion_date = datetime.fromisoformat(invoice_details.get("paymentDate"))
            elif application.payment_status_code == PaymentStatus.APPROVED.value:
                application.payment_status_code = PaymentStatus.COMPLETED.value
                application.status = Application.Status.PAID
                application.payment_completion_date = datetime.now(timezone.utc)

        application.save()

        if application.payment_status_code == PaymentStatus.COMPLETED.value:
            EventsService.save_event(
                event_type=Events.EventType.APPLICATION,
                event_name=Events.EventName.PAYMENT_COMPLETE,
                application_id=application.id,
            )
        return application

    @staticmethod
    def update_application_status(application: Application, application_status: Application.Status, reviewer: User):
        """Updates the application status. If the application status is approved, a new registration is created."""
        application.status = application_status

        if application.status == Application.Status.FULL_REVIEW_APPROVED:
            registration_request = RegistrationRequest(**application.application_json)
            registration = RegistrationService.create_registration(
                application.submitter_id, application.payment_account, registration_request.registration
            )
            EventsService.save_event(
                event_type=Events.EventType.REGISTRATION,
                event_name=Events.EventName.REGISTRATION_CREATED,
                application_id=application.id,
                registration_id=registration.id,
            )
            application.registration_id = registration.id

        if application.status in APPLICATION_TERMINAL_STATES:
            application.decision_date = datetime.utcnow()
            application.reviewer_id = reviewer.id

        application.save()

        EventsService.save_event(
            event_type=Events.EventType.APPLICATION,
            event_name=ApplicationService._get_event_name(application.status),
            application_id=application.id,
        )
        return application

    @staticmethod
    def _get_event_name(application_status: Application.Status) -> str:
        if application_status == Application.Status.FULL_REVIEW_APPROVED:
            event_name = Events.EventName.MANUALLY_APPROVED
        elif application_status == Application.Status.DECLINED:
            event_name = Events.EventName.MANUALLY_DENIED
        elif application_status == Application.Status.ADDITIONAL_INFO_REQUESTED:
            event_name = Events.EventName.MORE_INFORMATION_REQUESTED
        return event_name

    @staticmethod
    def search_applications(filter_criteria: ApplicationSearch) -> dict:
        """List all applications matching the search criteria."""
        paginated_result = Application.search_applications(filter_criteria)
        search_results = []
        for item in paginated_result.items:
            search_results.append(ApplicationService.serialize(item))

        return {
            "page": filter_criteria.page,
            "limit": filter_criteria.limit,
            "applications": search_results,
            "total": paginated_result.total,
        }
