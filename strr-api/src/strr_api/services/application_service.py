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
import copy
from datetime import datetime, time, timedelta, timezone
from typing import Optional

import pytz
from flask import current_app

from strr_api.enums.enum import ApplicationType, PaymentStatus, RegistrationStatus
from strr_api.models import Application, Events, NoticeOfConsideration, Registration, User
from strr_api.models.application import ApplicationSerializer
from strr_api.models.dataclass import ApplicationSearch
from strr_api.models.rental import PropertyContact
from strr_api.services.email_service import EmailService
from strr_api.services.events_service import EventsService
from strr_api.services.registration_service import RegistrationService
from strr_api.services.user_service import UserService

APPLICATION_TERMINAL_STATES = [
    Application.Status.FULL_REVIEW_APPROVED,
    Application.Status.PROVISIONALLY_APPROVED,
    Application.Status.AUTO_APPROVED,
    Application.Status.DECLINED,
    Application.Status.PROVISIONALLY_DECLINED,
]
APPLICATION_STATES_STAFF_ACTION = [
    Application.Status.FULL_REVIEW_APPROVED,
    Application.Status.PROVISIONALLY_APPROVED,
    Application.Status.DECLINED,
    Application.Status.PROVISIONALLY_DECLINED,
    Application.Status.ADDITIONAL_INFO_REQUESTED,
]
APPLICATION_UNPAID_STATES = [Application.Status.DRAFT, Application.Status.PAYMENT_DUE]
APPLICATION_ASSIGN_STATES = [
    Application.Status.FULL_REVIEW,
    Application.Status.PROVISIONAL_REVIEW,
    Application.Status.PROVISIONAL,
    Application.Status.NOC_PENDING,
    Application.Status.NOC_EXPIRED,
    Application.Status.ADDITIONAL_INFO_REQUESTED,
    Application.Status.FULL_REVIEW_APPROVED,
    Application.Status.PROVISIONALLY_APPROVED,
    Application.Status.AUTO_APPROVED,
    Application.Status.DECLINED,
    Application.Status.PROVISIONAL_REVIEW_NOC_PENDING,
    Application.Status.PROVISIONAL_REVIEW_NOC_EXPIRED,
]


class ApplicationService:
    """Service to interact with the applications model."""

    @staticmethod
    def validate_user_is_assignee(user: User, application: Application) -> bool:
        """Validate that the current user is the assignee for the application."""
        if not UserService.is_strr_staff_or_system():
            return False
        return application.reviewer_id == user.id

    @staticmethod
    def serialize(application: Application) -> dict:
        """Returns application JSON."""
        app_dict = ApplicationSerializer.to_dict(application)
        # add number of existing host registrations
        if application.registration_type == Registration.RegistrationType.HOST:
            app_dict["header"]["existingHostRegistrations"] = ApplicationService.get_existing_host_registrations_count(
                app_dict
            )
        return app_dict

    @staticmethod
    def save_application(account_id: int, request_json: dict, application: Application) -> Application:
        """Saves an application to db."""
        user = UserService.get_or_create_user_in_context()
        application_type = request_json.get("header", {}).get("applicationType")
        if not application:
            application = Application()
            application.registration_type = request_json.get("registration").get("registrationType")
            application.application_number = Application.generate_unique_application_number()
        application.payment_account = account_id
        application.submitter_id = user.id
        application.application_date = datetime.now(timezone.utc)
        application.type = application_type or ApplicationType.REGISTRATION.value
        application.application_json = request_json
        if application_type == ApplicationType.RENEWAL.value:
            application.registration_id = request_json.get("header", {}).get("registrationId")
        application.save()
        return application

    @staticmethod
    def list_applications(account_id: int, filter_criteria: ApplicationSearch) -> dict:
        """List all applications matching the search criteria."""
        UserService.get_or_create_user_in_context()
        is_examiner = UserService.is_strr_staff_or_system()
        paginated_result = Application.find_by_account(account_id, filter_criteria, is_examiner)
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
    def get_application(application_number: str, account_id: Optional[int] = None) -> Application:
        """Get the application with the specified number."""
        UserService.get_or_create_user_in_context()
        application = Application.find_by_application_number(application_number)
        if application and ApplicationService.is_user_authorized_for_application(account_id, application.id):
            return application
        return None

    @staticmethod
    def is_user_authorized_for_application(account_id: int, application_id: int) -> bool:
        """Check the user authorization for an application."""
        if UserService.is_strr_staff_or_system():
            return True
        application = Application.get_application_by_account(account_id=account_id, application_id=application_id)
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
                visible_to_applicant=True,
            )
        else:
            if application.payment_status_code == PaymentStatus.COMPLETED.value:
                application.status = Application.Status.PAID
                application.payment_completion_date = (
                    datetime.fromisoformat(invoice_details.get("paymentDate"))
                    if invoice_details.get("paymentDate")
                    else datetime.utcnow()
                )
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
    def update_application_status(
        application: Application,
        application_status: Application.Status,
        reviewer: User,
        custom_content: Optional[str] = None,
    ) -> Application:
        """Updates the application status. If the application status is approved, a new registration is created."""
        original_status = application.status
        application.is_set_aside = False
        application.status = application_status
        if application_status == Application.Status.FULL_REVIEW_APPROVED:
            registration = RegistrationService.create_registration(
                application.submitter_id, application.payment_account, application.application_json
            )
            registration.reviewer_id = reviewer.id
            registration.decider_id = reviewer.id
            registration.save()
            EventsService.save_event(
                event_type=Events.EventType.REGISTRATION,
                event_name=Events.EventName.REGISTRATION_CREATED,
                application_id=application.id,
                registration_id=registration.id,
                visible_to_applicant=True,
                user_id=reviewer.id,
            )
            application.registration_id = registration.id

        if application_status == Application.Status.PROVISIONALLY_DECLINED and original_status in [
            Application.Status.PROVISIONAL_REVIEW_NOC_PENDING,
            Application.Status.PROVISIONAL_REVIEW_NOC_EXPIRED,
        ]:
            registration = application.registration
            if registration:
                registration.status = RegistrationStatus.CANCELLED.value
                registration.cancelled_date = datetime.now(timezone.utc)
                registration.save()
                EventsService.save_event(
                    event_type=Events.EventType.REGISTRATION,
                    event_name=Events.EventName.REGISTRATION_CANCELLED,
                    registration_id=registration.id,
                    user_id=reviewer.id,
                )

        if application.status in APPLICATION_TERMINAL_STATES:
            application.decision_date = datetime.utcnow()
        application.reviewer_id = reviewer.id
        application.decider_id = reviewer.id
        application.save()

        EventsService.save_event(
            event_type=Events.EventType.APPLICATION,
            event_name=ApplicationService._get_event_name(application.status),
            application_id=application.id,
            user_id=reviewer.id,
            details=f"Custom Email Content: {custom_content}" if custom_content else None,
        )

        EmailService.send_application_status_update_email(application, custom_content)

        return application

    @staticmethod
    def _get_event_name(application_status: Application.Status) -> str:
        event_name = None
        if application_status == Application.Status.FULL_REVIEW_APPROVED:
            event_name = Events.EventName.MANUALLY_APPROVED
        elif application_status == Application.Status.DECLINED:
            event_name = Events.EventName.MANUALLY_DENIED
        elif application_status == Application.Status.PROVISIONALLY_DECLINED:
            event_name = Events.EventName.MANUALLY_DENIED
        elif application_status == Application.Status.ADDITIONAL_INFO_REQUESTED:
            event_name = Events.EventName.MORE_INFORMATION_REQUESTED
        elif application_status == Application.Status.PROVISIONALLY_APPROVED:
            event_name = Events.EventName.MANUALLY_APPROVED
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

    @staticmethod
    def get_existing_host_registrations(application: Application) -> list[dict]:
        """Return all the existing host registrations for the host of the given application."""
        application_json = ApplicationService.serialize(application)
        contact_type = application_json.get("registration", {}).get("primaryContact", {}).get("contactType")
        # NOTE: contactType may not be set
        if contact_type == PropertyContact.ContactType.BUSINESS.value:
            # TODO: does not not have anything to compare against when the host is a business
            return []

        host_sin = application_json.get("registration", {}).get("primaryContact", {}).get("socialInsuranceNumber")
        if not host_sin:
            return []

        registrations = RegistrationService.find_all_by_host_sin(host_sin)
        return [RegistrationService.serialize(reg) for reg in registrations]

    @staticmethod
    def get_existing_host_registrations_count(application_dict: dict) -> int:
        """Return the count of existing host registrations for the host of the given application."""
        contact_type = application_dict.get("registration", {}).get("primaryContact", {}).get("contactType")
        # NOTE: contactType may not be set
        if contact_type == PropertyContact.ContactType.BUSINESS.value:
            # TODO: does not not have anything to compare against when the host is a business
            return 0

        host_sin = application_dict.get("registration", {}).get("primaryContact", {}).get("socialInsuranceNumber")
        if not host_sin:
            return 0

        return RegistrationService.find_all_by_host_sin(host_sin, True)

    @staticmethod
    def send_notice_of_consideration(application: Application, content: str, reviewer: User = None) -> Application:
        """Sends the notice of consideration."""
        notice_of_consideration = NoticeOfConsideration()
        notice_of_consideration.content = content
        notice_of_consideration.application_id = application.id
        notice_of_consideration.start_date = datetime.combine(
            datetime.now(pytz.timezone("America/Vancouver")) + timedelta(days=1), time(0, 1, 0)
        )
        days = current_app.config.get("NOC_EXPIRY_DAYS", 8)
        notice_of_consideration.end_date = notice_of_consideration.start_date + timedelta(days=int(days))
        notice_of_consideration.save()
        application.status = (
            Application.Status.PROVISIONAL_REVIEW_NOC_PENDING
            if application.status == Application.Status.PROVISIONAL_REVIEW
            else Application.Status.NOC_PENDING
        )
        application.save()
        EmailService.send_notice_of_consideration_for_application(application)
        reviewer_id = reviewer.id if reviewer else None
        EventsService.save_event(
            event_type=Events.EventType.APPLICATION,
            event_name=Events.EventName.NOC_SENT,
            application_id=application.id,
            user_id=reviewer_id,
        )
        return application

    @staticmethod
    def update_document_list(application: Application, document: str) -> Application:
        """Updates the document list of an application."""
        application_json = copy.deepcopy(application.application_json)
        application_json.get("registration").get("documents", []).append(document)
        application.application_json = application_json
        application.save()
        return application

    @staticmethod
    def assign_application(application: Application, reviewer_id: int) -> Application:
        """Updates the reviewer of an application."""
        application.reviewer_id = reviewer_id
        application.save()

        EventsService.save_event(
            event_type=Events.EventType.APPLICATION,
            event_name=Events.EventName.APPLICATION_REVIEWER_ASSIGNED,
            application_id=application.id,
            user_id=reviewer_id,
        )

        return application

    @staticmethod
    def unassign_application(application: Application, user_id: int) -> Application:
        """Unassigns the reviewer from an application."""
        application.reviewer_id = None
        application.save()

        EventsService.save_event(
            event_type=Events.EventType.APPLICATION,
            event_name=Events.EventName.APPLICATION_REVIEWER_UNASSIGNED,
            application_id=application.id,
            user_id=user_id,
        )

        return application

    @staticmethod
    def update_host_unit_address(application: Application, unit_address: dict, user: User) -> Application:
        """Updates the rental unit address for a host application."""
        original_address = application.application_json.get("registration", {}).get("unitAddress", {})
        previous_address_details = (
            f"Previous Address: Street Number={original_address.get('streetNumber', '')} "
            f"Street Name={original_address.get('streetName', '')}, "
            f"Street Additional={original_address.get('addressLineTwo', '')}, "
            f"City={original_address.get('city', '')}, Province={original_address.get('province', '')}, "
            f"Postal Code={original_address.get('postalCode', '')}"
        )
        application_json = copy.deepcopy(application.application_json)
        for key, value in unit_address.items():
            application_json["registration"]["unitAddress"][key] = value
        application.application_json = application_json
        application.save()
        EventsService.save_event(
            event_type=Events.EventType.APPLICATION,
            event_name=Events.EventName.HOST_APPLICATION_UNIT_ADDRESS_UPDATED,
            application_id=application.id,
            details=previous_address_details,
            user_id=user.id,
            visible_to_applicant=True,
        )
        return application

    @staticmethod
    def set_aside_decision(application: Application, set_aside_request: dict, user: User) -> Application:
        """Sets aside the decision for a host application."""
        application.is_set_aside = True
        application.save()

        EventsService.save_event(
            event_type=Events.EventType.APPLICATION,
            event_name=Events.EventName.APPLICATION_DECISION_SET_ASIDE,
            details="Application decision set aside",
            application_id=application.id,
            user_id=user.id,
            visible_to_applicant=True,
        )
        return application
