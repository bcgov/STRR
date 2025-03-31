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
"""Registration Application Model."""
from __future__ import annotations

import copy
from typing import List, Optional

from nanoid import generate
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Query, backref
from sqlalchemy_utils.types.ts_vector import TSVectorType

from strr_api.common.enum import BaseEnum, auto
from strr_api.enums.enum import StrrRequirement
from strr_api.models.base_model import BaseModel
from strr_api.models.dataclass import ApplicationSearch
from strr_api.models.rental import Registration
from strr_api.models.user import User

from .db import db


def _generate_application_number() -> str:
    """Generate an application number."""
    return generate(alphabet="0123456789", size=14)


class Application(BaseModel):
    """Stores the STRR Applications."""

    class Status(BaseEnum):
        """Enum of the application statuses."""

        DRAFT = auto()  # pylint: disable=invalid-name
        PAYMENT_DUE = auto()  # pylint: disable=invalid-name
        PAID = auto()  # pylint: disable=invalid-name
        AUTO_APPROVED = auto()  # pylint: disable=invalid-name
        PROVISIONALLY_APPROVED = auto()  # pylint: disable=invalid-name
        FULL_REVIEW_APPROVED = auto()  # pylint: disable=invalid-name
        PROVISIONAL_REVIEW = auto()  # pylint: disable=invalid-name
        ADDITIONAL_INFO_REQUESTED = auto()  # pylint: disable=invalid-name
        FULL_REVIEW = auto()  # pylint: disable=invalid-name
        DECLINED = auto()  # pylint: disable=invalid-name
        PROVISIONAL = auto()  # pylint: disable=invalid-name
        NOC_PENDING = auto()  # pylint: disable=invalid-name
        NOC_EXPIRED = auto()  # pylint: disable=invalid-name

    __tablename__ = "application"

    id = db.Column(db.Integer, primary_key=True)
    application_json = db.Column("application_json", JSONB, nullable=False)
    application_number = db.Column(db.String(14), unique=True, nullable=False)
    application_date = db.Column(
        "application_date", db.DateTime(timezone=True), server_default=func.now()  # pylint:disable=not-callable
    )  # pylint:disable=not-callable
    type = db.Column("type", db.String(50), nullable=False, index=True)
    registration_type = db.Column(db.Enum(Registration.RegistrationType), index=True, nullable=True)
    status = db.Column("status", db.String(50), default=Status.DRAFT, index=True)
    decision_date = db.Column("decision_date", db.DateTime(timezone=True))

    # maps to invoice id created by the pay-api (used for getting receipt)
    invoice_id = db.Column(db.Integer, nullable=True)
    payment_status_code = db.Column("payment_status_code", db.String(50))
    payment_completion_date = db.Column("payment_completion_date", db.DateTime(timezone=True))
    payment_account = db.Column("payment_account", db.String(30))

    # Relationships
    registration_id = db.Column("registration_id", db.Integer, db.ForeignKey("registrations.id"), nullable=True)
    submitter_id = db.Column("submitter_id", db.Integer, db.ForeignKey("users.id"))
    reviewer_id = db.Column("reviewer_id", db.Integer, db.ForeignKey("users.id"), nullable=True)

    application_tsv = db.Column(
        TSVectorType("application_json", regconfig="english"),
        db.Computed("jsonb_to_tsvector('english', \"application_json\", '[\"string\"]')", persisted=True),
    )

    __table_args__ = (
        # Indexing the application_tsv column
        db.Index("idx_application_tsv", application_tsv, postgresql_using="gin"),
        db.Index(
            "idx_gin_application_json_path_ops",
            "application_json",
            postgresql_using="gin",
            postgresql_ops={"application_json": "jsonb_path_ops"},
        ),
    )

    submitter = db.relationship(
        "User",
        backref=backref("submitter", uselist=False),
        foreign_keys=[submitter_id],
    )
    reviewer = db.relationship(
        "User",
        backref=backref("reviewer", uselist=False),
        foreign_keys=[reviewer_id],
    )
    # Currently this relects a one-to-one, although the RFC depicted a many-to-one relationship
    registration = db.relationship(
        "Registration",
        backref=backref("registration", uselist=False),
        foreign_keys=[registration_id],
    )

    noc = db.relationship("NoticeOfConsideration", back_populates="application", uselist=False)

    @classmethod
    def find_by_id(cls, application_id: int) -> Application | None:
        """Return the application by id."""
        return cls.query.filter_by(id=application_id).one_or_none()

    @classmethod
    def find_by_invoice_id(cls, invoice_id: int) -> Application | None:
        """Return the application by invoice id."""
        return cls.query.filter_by(invoice_id=invoice_id).one_or_none()

    @classmethod
    def generate_unique_application_number(cls):  # pylint: disable=inconsistent-return-statements
        """Generate a unique application number."""
        max_attempts = 10
        for _ in range(max_attempts):
            new_number = _generate_application_number()
            if not cls.query.filter_by(application_number=new_number).first():
                return new_number
        raise ValueError("Failed to generate a unique application number")

    @classmethod
    def find_by_application_number(cls, application_number: str) -> Application | None:
        """Return the application by application number."""
        return cls.query.filter_by(application_number=application_number).one_or_none()

    @classmethod
    def get_application_by_account(cls, account_id: int, application_id: int) -> Application | None:
        """Return the application by application_id and account_id."""
        return cls.query.filter_by(id=application_id, payment_account=account_id).one_or_none()

    @classmethod
    def find_by_account(
        cls, account_id: int, filter_criteria: ApplicationSearch, is_examiner: bool
    ) -> Application | None:
        """Return the application by account, filter criteria."""
        query = cls.query
        if not is_examiner:
            query = query.filter_by(payment_account=account_id)
        if filter_criteria.registration_types:
            query = cls._filter_by_registration_types(filter_criteria.registration_types, query)
        if filter_criteria.record_number:
            query = cls._filter_by_application_registration_number(filter_criteria.record_number, query)
        if filter_criteria.statuses or filter_criteria.registration_statuses:
            query = cls._filter_by_application_or_registration_status(
                filter_criteria.statuses, filter_criteria.registration_statuses, query
            )
        if filter_criteria.assignee:
            query = cls._filter_by_assignee(filter_criteria.assignee, query)
        if filter_criteria.requirements:
            query = cls._filter_by_application_requirement(filter_criteria.requirements, query)
        sort_column = getattr(Application, filter_criteria.sort_by, Application.id)
        if filter_criteria.sort_order and filter_criteria.sort_order.lower() == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())

        paginated_result = query.paginate(per_page=filter_criteria.limit, page=filter_criteria.page)
        return paginated_result

    @classmethod
    def get_by_registration_id(cls, registration_id: int) -> Application | None:
        """Return the application associated with a given registration_id."""
        return cls.query.filter_by(registration_id=registration_id).one_or_none()

    @classmethod
    def _filter_by_application_registration_number(cls, search_term: str, query: Query) -> Query:
        """Filter query by application or registration number."""
        if not search_term:
            return query

        search_term = search_term.strip()
        query = query.filter(
            db.or_(
                Application.application_number.ilike(f"%{search_term}%"),
                db.exists().where(
                    db.and_(
                        Registration.id == Application.registration_id,
                        Registration.registration_number.ilike(f"%{search_term}%"),
                    )
                ),
            )
        )
        return query.filter(Application.status != Application.Status.DRAFT)

    @classmethod
    def _filter_by_registration_types(cls, registration_types: List[str], query: Query) -> Query:
        """Filter query by registration types."""
        if not registration_types:
            return query

        registration_types = [type.upper() for type in registration_types if type]
        query = query.filter(Application.registration_type.in_(registration_types))
        return query.filter(Application.status != Application.Status.DRAFT)

    @classmethod
    def _filter_by_assignee(cls, assignee: str, query: Query) -> Query:
        """Filter query by assignee."""
        if not assignee:
            return query

        return query.filter(
            db.exists().where(db.and_(User.id == Application.reviewer_id, User.username.ilike(f"%{assignee.strip()}%")))
        )

    @classmethod
    def _get_host_requirement_condition(cls, req: str):
        """Get condition for host requirement."""
        host_req_mapping = {
            StrrRequirement.BL.value: {"registration": {"strRequirements": {"isBusinessLicenceRequired": True}}},
            StrrRequirement.PR.value: {"registration": {"strRequirements": {"isPrincipalResidenceRequired": True}}},
            StrrRequirement.PROHIBITED.value: {"registration": {"strRequirements": {"isStrProhibited": True}}},
            StrrRequirement.NO_REQ.value: {"registration": {"strRequirements": {"isStraaExempt": True}}},
        }
        pr_exempt_mapping = {
            StrrRequirement.PR_EXEMPT_STRATA_HOTEL.value: "STRATA_HOTEL",
            StrrRequirement.PR_EXEMPT_FARM_LAND.value: "FARM_LAND",
            StrrRequirement.PR_EXEMPT_FRACTIONAL_OWNERSHIP.value: "FRACTIONAL_OWNERSHIP",
        }

        if req in host_req_mapping:
            return Application.application_json.contains(host_req_mapping[req])

        if req in pr_exempt_mapping:
            return Application.application_json.contains(
                {"registration": {"unitDetails": {"prExemptReason": pr_exempt_mapping[req]}}}
            )

        return None

    @classmethod
    def _get_platform_requirement_condition(cls, req: str):
        """Get condition for platform requirement."""
        platform_req_mapping = {
            StrrRequirement.PLATFORM_MAJOR.value: "THOUSAND_AND_ABOVE",
            StrrRequirement.PLATFORM_MEDIUM.value: "BETWEEN_250_AND_999",
            StrrRequirement.PLATFORM_MINOR.value: "LESS_THAN_250",
        }

        if req in platform_req_mapping:
            return Application.application_json.contains(
                {"registration": {"platformDetails": {"listingSize": platform_req_mapping[req]}}}
            )

        return None

    @classmethod
    def _get_strata_requirement_condition(cls, req: str):
        """Get condition for strata requirement."""
        if req == StrrRequirement.STRATA_NO_PR.value:
            return Application.application_json.contains(
                {"registration": {"strataHotelDetails": {"category": "MULTI_UNIT_NON_PR"}}}
            )
        elif req == StrrRequirement.STRATA_PR.value:
            return db.or_(
                Application.application_json.contains(
                    {"registration": {"strataHotelDetails": {"category": "FULL_SERVICE"}}}
                ),
                Application.application_json.contains(
                    {"registration": {"strataHotelDetails": {"category": "POST_DECEMBER_2023"}}}
                ),
            )

        return None

    @classmethod
    def _filter_by_application_requirement(cls, requirement: list[str], query: Query) -> Query:
        """Filter query by requirements."""
        if not requirement:
            return query

        host_requirement_conditions = []
        platform_requirement_conditions = []
        strata_requirement_conditions = []

        for req in requirement:
            host_condition = cls._get_host_requirement_condition(req)
            if host_condition is not None:
                host_requirement_conditions.append(host_condition)
                continue

            platform_condition = cls._get_platform_requirement_condition(req)
            if platform_condition is not None:
                platform_requirement_conditions.append(platform_condition)
                continue

            strata_condition = cls._get_strata_requirement_condition(req)
            if strata_condition is not None:
                strata_requirement_conditions.append(strata_condition)

        combined_conditions = []
        if host_requirement_conditions:
            combined_conditions.append(db.and_(*host_requirement_conditions))
        if platform_requirement_conditions:
            combined_conditions.append(db.and_(*platform_requirement_conditions))
        if strata_requirement_conditions:
            combined_conditions.append(db.and_(*strata_requirement_conditions))
        if combined_conditions:
            query = query.filter(db.or_(*combined_conditions))
        return query

    @classmethod
    def _filter_by_application_or_registration_status(
        cls, statuses: Optional[List[str]], registration_statuses: Optional[List[str]], query: Query
    ) -> Query:
        """Filter query by application statuses OR registration statuses."""
        conditions = []
        if statuses:
            statuses = [status.upper() for status in statuses if status]
            if statuses:
                conditions.append(Application.status.in_(statuses))

        if registration_statuses:
            registration_statuses = [status.upper() for status in registration_statuses if status]
            if registration_statuses:
                conditions.append(
                    db.exists().where(
                        (Registration.id == Application.registration_id)
                        & (Registration.status.in_(registration_statuses))
                    )
                )

        if not conditions:
            return query

        return query.filter(db.or_(*conditions))

    @classmethod
    def search_applications(cls, filter_criteria: ApplicationSearch):
        """Returns the applications matching the search criteria."""
        query = cls.query
        if filter_criteria.search_text:
            query = query.filter(
                db.or_(
                    Application.application_tsv.match(filter_criteria.search_text),
                    Application.application_number.ilike(f"%{filter_criteria.search_text}%"),
                )
            )
        if filter_criteria.statuses or filter_criteria.registration_statuses:
            statuses = [status.upper() for status in filter_criteria.statuses if status]
            # Remove DRAFT if present
            if Application.Status.DRAFT in statuses:
                statuses.remove(Application.Status.DRAFT)
            query = cls._filter_by_application_or_registration_status(
                statuses, filter_criteria.registration_statuses, query
            )
        else:
            query = query.filter(Application.status != Application.Status.DRAFT)
        if filter_criteria.registration_types:
            query = cls._filter_by_registration_types(filter_criteria.registration_types, query)
        if filter_criteria.record_number:
            query = cls._filter_by_application_registration_number(filter_criteria.record_number, query)
        if filter_criteria.assignee:
            query = cls._filter_by_assignee(filter_criteria.assignee, query)
        if filter_criteria.requirements:
            query = cls._filter_by_application_requirement(filter_criteria.requirements, query)
        sort_column = getattr(Application, filter_criteria.sort_by, Application.id)
        if filter_criteria.sort_order and filter_criteria.sort_order.lower() == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())
        paginated_result = query.paginate(per_page=filter_criteria.limit, page=filter_criteria.page)
        return paginated_result


class ApplicationSerializer:
    """Serializer for application. Can convert to dict, string from application model."""

    HOST_STATUSES = {
        Application.Status.DRAFT: "Draft",
        Application.Status.PAYMENT_DUE: "Payment Due",
        Application.Status.PAID: "Pending Approval",
        Application.Status.AUTO_APPROVED: "Approved",
        Application.Status.PROVISIONALLY_APPROVED: "Approved",
        Application.Status.FULL_REVIEW_APPROVED: "Approved",
        Application.Status.PROVISIONAL_REVIEW: "Approved – Provisional",
        Application.Status.FULL_REVIEW: "Pending Approval",
        Application.Status.DECLINED: "Declined",
        Application.Status.NOC_PENDING: "Notice of Consideration - Pending",
        Application.Status.NOC_EXPIRED: "Notice of Consideration - Expired",
    }

    HOST_ACTIONS = {Application.Status.PAYMENT_DUE: ["SUBMIT_PAYMENT"]}

    EXAMINER_STATUSES = {
        Application.Status.DRAFT: "Draft",
        Application.Status.PAYMENT_DUE: "Payment Due",
        Application.Status.PAID: "Paid",
        Application.Status.AUTO_APPROVED: "Approved – Automatic",
        Application.Status.PROVISIONALLY_APPROVED: "Approved – Provisional",
        Application.Status.FULL_REVIEW_APPROVED: "Approved – Examined",
        Application.Status.PROVISIONAL_REVIEW: "Provisional Examination",
        Application.Status.FULL_REVIEW: "Full Examination",
        Application.Status.DECLINED: "Declined",
        Application.Status.NOC_PENDING: "Notice of Consideration - Pending",
        Application.Status.NOC_EXPIRED: "Notice of Consideration - Expired",
    }

    EXAMINER_ACTIONS = {
        Application.Status.FULL_REVIEW_APPROVED: [],
        Application.Status.FULL_REVIEW: ["APPROVE", "SEND_NOC"],
        Application.Status.NOC_PENDING: ["APPROVE", "REJECT"],
        Application.Status.NOC_EXPIRED: ["APPROVE", "REJECT"],
    }

    @staticmethod
    def to_str(application: Application):
        """Return string representation of application model."""
        return str(ApplicationSerializer.to_dict(application))

    @staticmethod
    def to_dict(application: Application) -> dict:
        """Return the application object as a dict."""
        application_dict = copy.deepcopy(application.application_json)
        if not application_dict.get("header", None):
            application_dict["header"] = {}
        application_dict["header"]["applicationNumber"] = application.application_number
        application_dict["header"]["name"] = application.type
        application_dict["header"]["paymentToken"] = application.invoice_id
        application_dict["header"]["paymentStatus"] = application.payment_status_code
        application_dict["header"]["paymentAccount"] = application.payment_account
        application_dict["header"]["status"] = application.status
        application_dict["header"]["hostStatus"] = ApplicationSerializer.HOST_STATUSES.get(application.status, "")
        application_dict["header"]["examinerStatus"] = ApplicationSerializer.EXAMINER_STATUSES.get(
            application.status, ""
        )
        application_dict["header"]["hostActions"] = ApplicationSerializer.HOST_ACTIONS.get(application.status, [])
        application_dict["header"]["examinerActions"] = ApplicationSerializer.EXAMINER_ACTIONS.get(
            application.status, []
        )
        if application.status == Application.Status.FULL_REVIEW_APPROVED:
            certificates = application.registration.certificates
            if certificates:
                application_dict["header"]["examinerActions"] = []
        application_dict["header"]["applicationDateTime"] = application.application_date.isoformat()
        application_dict["header"]["decisionDate"] = (
            application.decision_date.isoformat() if application.decision_date else None
        )
        application_dict["header"]["submitter"] = {}
        if application.submitter_id:
            application_dict["header"]["submitter"]["username"] = application.submitter.username

            submitter_display_name = ""
            if application.submitter.firstname:
                submitter_display_name = f"{submitter_display_name}{application.submitter.firstname}"
            if application.submitter.lastname:
                submitter_display_name = f"{submitter_display_name} {application.submitter.lastname}"
            application_dict["header"]["submitter"]["displayName"] = submitter_display_name

        application_dict["header"]["reviewer"] = {}
        if application.reviewer_id:
            application_dict["header"]["reviewer"]["username"] = application.reviewer.username

            reviewer_display_name = ""
            if application.reviewer.firstname:
                reviewer_display_name = f"{reviewer_display_name}{application.reviewer.firstname}"
            if application.reviewer.lastname:
                reviewer_display_name = f"{reviewer_display_name} {application.reviewer.lastname}"
            application_dict["header"]["reviewer"]["displayName"] = reviewer_display_name

        application_dict["header"]["isCertificateIssued"] = False
        if application.registration_id:
            application_dict["header"]["registrationId"] = application.registration_id
            application_dict["header"]["registrationStartDate"] = application.registration.start_date.isoformat()
            application_dict["header"]["registrationEndDate"] = application.registration.expiry_date.isoformat()
            application_dict["header"]["registrationStatus"] = application.registration.status.value
            application_dict["header"]["registrationNumber"] = application.registration.registration_number
            application_dict["header"]["isCertificateIssued"] = bool(application.registration.certificates)

        if application.noc:
            application_dict["header"]["nocStartDate"] = application.noc.start_date.strftime("%Y-%m-%d")
            application_dict["header"]["nocEndDate"] = application.noc.end_date.strftime("%Y-%m-%d")

        return application_dict
