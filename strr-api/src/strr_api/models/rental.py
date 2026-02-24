"""Registration model.

"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from sql_versioning import Versioned
from sqlalchemy import Boolean, Enum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy_utils.types.ts_vector import TSVectorType

from strr_api.common.enum import BaseEnum, auto
from strr_api.enums.enum import (
    PropertyType,
    RegistrationNocStatus,
    RegistrationStatus,
    StrataHotelCategory,
    StrrRequirement,
)
from strr_api.models.base_model import BaseModel

from .db import db

# Avoid Circular Import Error
if TYPE_CHECKING:
    from strr_api.models.dataclass import RegistrationSearch


class Registration(Versioned, BaseModel):
    """Registration model"""

    class RegistrationType(BaseEnum):
        """Enum of the registration types."""

        HOST = auto()  # pylint: disable=invalid-name
        PLATFORM = auto()  # pylint: disable=invalid-name
        STRATA_HOTEL = auto()  # pylint: disable=invalid-name

    DEFAULT_REGISTRATION_RENEWAL_PERIOD = timedelta(days=365)

    __tablename__ = "registrations"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    registration_type = db.Column(db.String, index=True)
    registration_number = db.Column(db.String, unique=True, index=True)
    sbc_account_id = db.Column(db.Integer, nullable=False, index=True)
    status = db.Column(Enum(RegistrationStatus), nullable=False, index=True)
    start_date = db.Column(db.DateTime, nullable=False)
    expiry_date = db.Column(db.DateTime, nullable=False)
    updated_date = db.Column(db.DateTime, default=datetime.now, nullable=False)
    cancelled_date = db.Column(db.DateTime, nullable=True)
    is_set_aside = db.Column(Boolean, default=False)
    noc_status = db.Column(Enum(RegistrationNocStatus), nullable=True)
    provisional_extension_applied = db.Column(Boolean, default=False)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    reviewer_id = db.Column("reviewer_id", db.Integer, db.ForeignKey("users.id"), nullable=True)
    decider_id = db.Column("decider_id", db.Integer, db.ForeignKey("users.id"), nullable=True)

    registration_json = db.Column(JSONB, nullable=True)
    registration_tsv = db.Column(
        TSVectorType("registration_json", regconfig="english"),
        db.Computed(
            "jsonb_to_tsvector('english', COALESCE(\"registration_json\", '{}'), '[\"string\"]')", persisted=True
        ),
    )

    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship(
        "User",
        backref="registration_reviewer",
        foreign_keys=[reviewer_id],
    )
    decider = relationship(
        "User",
        backref="registration_decider",
        foreign_keys=[decider_id],
    )

    certificates = relationship("Certificate", back_populates="registration")
    rental_property = relationship(
        "RentalProperty",
        back_populates="registration",
        uselist=False,
        cascade="all, delete-orphan",
    )
    platform_registration = relationship(
        "PlatformRegistration",
        back_populates="registration",
        uselist=False,
        cascade="all, delete-orphan",
    )
    strata_hotel_registration = relationship(
        "StrataHotelRegistration",
        back_populates="registration",
        uselist=False,
        cascade="all, delete-orphan",
    )
    documents = relationship("Document", back_populates="registration")
    nocs = relationship("RegistrationNoticeOfConsideration", back_populates="registration")
    conditionsOfApproval = relationship("ConditionsOfApproval", back_populates="registration", uselist=False)
    snapshots = relationship("RegistrationSnapshot", back_populates="registration")

    __table_args__ = (
        db.Index("idx_registration_tsv", registration_tsv, postgresql_using="gin"),
        db.Index(
            "idx_gin_registration_json_path_ops",
            "registration_json",
            postgresql_using="gin",
            postgresql_ops={"registration_json": "jsonb_path_ops"},
        ),
    )

    @classmethod
    def search_registrations(cls, filter_criteria: RegistrationSearch):
        """Returns the registrations matching the search criteria."""
        query = cls.query
        if filter_criteria.account_id:
            query = query.filter(Registration.sbc_account_id == filter_criteria.account_id)
        if filter_criteria.search_text:
            query = query.filter(
                db.or_(
                    Registration.registration_tsv.match(filter_criteria.search_text),
                    Registration.registration_number.ilike(f"%{filter_criteria.search_text}%"),
                )
            )
        if filter_criteria.statuses:
            query = query.filter(Registration.status.in_(filter_criteria.statuses))
        if filter_criteria.registration_types:
            query = query.filter(Registration.registration_type.in_(filter_criteria.registration_types))
        if filter_criteria.record_number:
            query = query.filter(Registration.registration_number.ilike(f"%{filter_criteria.record_number}%"))
        if filter_criteria.assignee:
            from strr_api.models import User  # pylint: disable=import-outside-toplevel

            query = query.join(User, Registration.reviewer_id == User.id).filter(
                User.username.ilike(f"%{filter_criteria.assignee}%")
            )
        if filter_criteria.requirements:
            query = cls._filter_by_registration_requirement(filter_criteria.requirements, query)
        if filter_criteria.approval_methods:
            query = cls._filter_by_approval_method(filter_criteria.approval_methods, query)
        if filter_criteria.noc_statuses:
            query = query.filter(Registration.noc_status.in_(filter_criteria.noc_statuses))
        if filter_criteria.is_set_aside is True:
            query = query.filter(Registration.is_set_aside == True)  # noqa: E712
        sort_column = getattr(Registration, filter_criteria.sort_by, Registration.id)
        if filter_criteria.sort_order and filter_criteria.sort_order.lower() == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())
        paginated_result = query.paginate(per_page=filter_criteria.limit, page=filter_criteria.page)
        return paginated_result

    @classmethod
    def _host_condition_bl_or_pr(cls, application_model):
        """BL+PR selected: records with BL true or PR true."""
        bl_true = (
            application_model.application_json["registration"]["strRequirements"]["isBusinessLicenceRequired"].astext
            == "true"
        )
        pr_true = (
            application_model.application_json["registration"]["strRequirements"]["isPrincipalResidenceRequired"].astext
            == "true"
        )
        return db.exists().where(
            db.and_(
                application_model.registration_id == Registration.id,
                db.or_(bl_true, pr_true),
            )
        )

    @classmethod
    def _host_condition_no_req(cls):
        """No requirements - STRAA exempt or both BL and PR not required."""
        # pylint: disable=import-outside-toplevel
        from strr_api.models.application import Application

        return db.or_(
            db.exists().where(
                db.and_(
                    RentalProperty.registration_id == Registration.id,
                    RentalProperty.strr_exempt == True,  # noqa: E712
                )
            ),
            db.exists().where(
                db.and_(
                    Application.registration_id == Registration.id,
                    db.or_(
                        Application.application_json["registration"]["strRequirements"]["isStraaExempt"].astext
                        == "true",
                        db.and_(
                            Application.application_json["registration"]["strRequirements"][
                                "isBusinessLicenceRequired"
                            ].astext
                            == "false",
                            Application.application_json["registration"]["strRequirements"][
                                "isPrincipalResidenceRequired"
                            ].astext
                            == "false",
                        ),
                    ),
                )
            ),
        )

    @classmethod
    def _strata_condition_no_pr(cls, application_model, strata_hotel_model, strata_hotel_registration_model):
        """Strata Hotel MULTI_UNIT_NON_PR category."""
        return db.or_(
            db.exists().where(
                db.and_(
                    strata_hotel_registration_model.registration_id == Registration.id,
                    strata_hotel_registration_model.strata_hotel_id == strata_hotel_model.id,
                    strata_hotel_model.category == StrataHotelCategory.MULTI_UNIT_NON_PR,
                )
            ),
            db.exists().where(
                db.and_(
                    application_model.registration_id == Registration.id,
                    application_model.application_json["registration"]["strataHotelDetails"]["category"].astext
                    == "MULTI_UNIT_NON_PR",
                )
            ),
        )

    @classmethod
    def _strata_condition_pr(cls, application_model, strata_hotel_model, strata_hotel_registration_model):
        """Strata Hotel FULL_SERVICE or POST_DECEMBER_2023 category."""
        return db.or_(
            db.exists().where(
                db.and_(
                    strata_hotel_registration_model.registration_id == Registration.id,
                    strata_hotel_registration_model.strata_hotel_id == strata_hotel_model.id,
                    db.or_(
                        strata_hotel_model.category == StrataHotelCategory.FULL_SERVICE,
                        strata_hotel_model.category == StrataHotelCategory.POST_DECEMBER_2023,
                    ),
                )
            ),
            db.exists().where(
                db.and_(
                    application_model.registration_id == Registration.id,
                    db.or_(
                        application_model.application_json["registration"]["strataHotelDetails"]["category"].astext
                        == "FULL_SERVICE",
                        application_model.application_json["registration"]["strataHotelDetails"]["category"].astext
                        == "POST_DECEMBER_2023",
                    ),
                )
            ),
        )

    @classmethod
    def _handle_bl_pr_requirement(cls, req: str, requirement: list[str], host_conditions: list):
        """If req is BL+PR or PR (when both selected), handle and return True; else False."""
        if req == StrrRequirement.BL.value and StrrRequirement.PR.value in requirement:
            # pylint: disable=import-outside-toplevel
            from strr_api.models.application import Application

            host_conditions.append(cls._host_condition_bl_or_pr(Application))
            return True
        if req == StrrRequirement.PR.value and StrrRequirement.BL.value in requirement:
            return True
        return False

    @classmethod
    def _condition_for_requirement(
        cls,
        req: str,
        pr_exempt_mapping: dict,
        platform_req_mapping: dict,
        application_model,
        platform_registration_model,
        platform_model,
        strata_hotel_model,
        strata_hotel_registration_model,
    ):
        """Return (condition, 'host'|'platform'|'strata') for req, or (None, None) if not handled."""
        if req == StrrRequirement.BL.value:
            return (
                db.exists().where(
                    db.and_(
                        application_model.registration_id == Registration.id,
                        application_model.application_json["registration"]["strRequirements"][
                            "isBusinessLicenceRequired"
                        ].astext
                        == "true",
                    )
                ),
                "host",
            )
        if req == StrrRequirement.PR.value:
            return (
                db.exists().where(
                    db.and_(
                        application_model.registration_id == Registration.id,
                        application_model.application_json["registration"]["strRequirements"][
                            "isPrincipalResidenceRequired"
                        ].astext
                        == "true",
                    )
                ),
                "host",
            )
        if req == StrrRequirement.PROHIBITED.value:
            return (
                db.exists().where(
                    db.and_(
                        application_model.registration_id == Registration.id,
                        application_model.application_json["registration"]["strRequirements"]["isStrProhibited"].astext
                        == "true",
                    )
                ),
                "host",
            )
        if req == StrrRequirement.NO_REQ.value:
            return (cls._host_condition_no_req(), "host")
        if req in pr_exempt_mapping:
            return (
                db.exists().where(
                    db.and_(
                        RentalProperty.registration_id == Registration.id,
                        RentalProperty.pr_exempt_reason == pr_exempt_mapping[req],
                    )
                ),
                "host",
            )
        if req in platform_req_mapping:
            return (
                db.exists().where(
                    db.and_(
                        platform_registration_model.registration_id == Registration.id,
                        platform_registration_model.platform_id == platform_model.id,
                        platform_model.listing_size == platform_req_mapping[req],
                    )
                ),
                "platform",
            )
        if req == StrrRequirement.STRATA_NO_PR.value:
            return (
                cls._strata_condition_no_pr(application_model, strata_hotel_model, strata_hotel_registration_model),
                "strata",
            )
        if req == StrrRequirement.STRATA_PR.value:
            return (
                cls._strata_condition_pr(application_model, strata_hotel_model, strata_hotel_registration_model),
                "strata",
            )
        return (None, None)

    @classmethod
    def _collect_registration_requirement_conditions(cls, requirement: list[str]):
        """Build host, platform, and strata condition lists from requirement filters."""
        # pylint: disable=import-outside-toplevel
        from strr_api.models.application import Application
        from strr_api.models.platforms import Platform, PlatformRegistration
        from strr_api.models.strata_hotels import StrataHotel, StrataHotelRegistration

        pr_exempt_mapping = {
            StrrRequirement.PR_EXEMPT_STRATA_HOTEL.value: "STRATA_HOTEL",
            StrrRequirement.PR_EXEMPT_FARM_LAND.value: "FARM_LAND",
            StrrRequirement.PR_EXEMPT_FRACTIONAL_OWNERSHIP.value: "FRACTIONAL_OWNERSHIP",
        }
        platform_req_mapping = {
            StrrRequirement.PLATFORM_MAJOR.value: "THOUSAND_AND_ABOVE",
            StrrRequirement.PLATFORM_MEDIUM.value: "BETWEEN_250_AND_999",
            StrrRequirement.PLATFORM_MINOR.value: "LESS_THAN_250",
        }

        host_conditions = []
        platform_conditions = []
        strata_conditions = []

        for req in requirement:
            if cls._handle_bl_pr_requirement(req, requirement, host_conditions):
                continue
            cond, kind = cls._condition_for_requirement(
                req,
                pr_exempt_mapping,
                platform_req_mapping,
                Application,
                PlatformRegistration,
                Platform,
                StrataHotel,
                StrataHotelRegistration,
            )
            if cond is None:
                continue
            if kind == "host":
                host_conditions.append(cond)
            elif kind == "platform":
                platform_conditions.append(cond)
            else:
                strata_conditions.append(cond)

        return host_conditions, platform_conditions, strata_conditions

    @classmethod
    def _filter_by_registration_requirement(cls, requirement: list[str], query):
        """Filter query by requirements.

        Since registration_json is often null, we query the actual related tables:
        - For HOST: RentalProperty table and Application.application_json for strRequirements
        - For PLATFORM: Platform table via PlatformRegistration
        - For STRATA_HOTEL: StrataHotel table via StrataHotelRegistration

        Grouping logic matches Application model:
        - Host conditions are ANDed together
        - Platform conditions are ANDed together
        - Strata conditions are ANDed together
        - Then the groups are ORed together
        """
        if not requirement:
            return query

        host_list, platform_list, strata_list = cls._collect_registration_requirement_conditions(requirement)
        combined_conditions = []
        if host_list:
            combined_conditions.append(db.and_(*host_list))
        if platform_list:
            combined_conditions.append(db.and_(*platform_list))
        if strata_list:
            combined_conditions.append(db.and_(*strata_list))
        if combined_conditions:
            query = query.filter(db.or_(*combined_conditions))
        return query

    @classmethod
    def _filter_by_approval_method(cls, approval_methods: list[str], query):
        """Filter registrations by application approval method.

        Only considers the most recent application (index 0 when sorted by
        application_date desc) for each registration. Returns registrations
        where that most recent application's status is in the given approval methods.
        """
        if not approval_methods:
            return query
        # pylint: disable=import-outside-toplevel
        from sqlalchemy import select

        from strr_api.models.application import Application

        # Correlated subquery: for each registration, get the status of the
        # most recent application (by application_date desc)
        latest_app_status_subq = (
            select(Application.status)
            .where(Application.registration_id == Registration.id)
            .order_by(Application.application_date.desc())
            .limit(1)
            .scalar_subquery()
        )
        return query.filter(latest_app_status_subq.in_(approval_methods))


class RentalProperty(Versioned, BaseModel):
    """Rental Property"""

    class RentalUnitSpaceType(BaseEnum):
        """Enum of rental unit space type."""

        ENTIRE_HOME = auto()  # pylint: disable=invalid-name
        SHARED_ACCOMMODATION = auto()  # pylint: disable=invalid-name

    class RentalSpaceOption(BaseEnum):
        """Enum of rental space option."""

        DIFFERENT_PROPERTY = auto()  # pylint: disable=invalid-name
        SEPARATE_UNIT_SAME_PROPERTY = auto()  # pylint: disable=invalid-name
        PRIMARY_RESIDENCE_OR_SHARED_SPACE = auto()  # pylint: disable=invalid-name

    class HostResidence(BaseEnum):
        """Enum of host residence option."""

        SAME_UNIT = auto()  # pylint: disable=invalid-name
        ANOTHER_UNIT = auto()  # pylint: disable=invalid-name

    class HostType(BaseEnum):
        """Enum of host type."""

        OWNER = auto()  # pylint: disable=invalid-name
        FRIEND_RELATIVE = auto()  # pylint: disable=invalid-name
        LONG_TERM_TENANT = auto()  # pylint: disable=invalid-name

    class OwnershipType(BaseEnum):
        """Ownership Type."""

        OWN = auto()  # pylint: disable=invalid-name
        RENT = auto()  # pylint: disable=invalid-name
        CO_OWN = auto()  # pylint: disable=invalid-name
        OTHER = auto()  # pylint: disable=invalid-name

    __tablename__ = "rental_properties"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nickname = db.Column(db.String, nullable=True)
    parcel_identifier = db.Column(db.String, nullable=True)
    local_business_licence = db.Column(db.String, nullable=True)
    local_business_licence_expiry_date = db.Column(db.Date, nullable=True)
    bl_exempt_reason = db.Column(db.String, nullable=True)
    property_type = db.Column(Enum(PropertyType), nullable=False)
    ownership_type = db.Column(db.Enum(OwnershipType), nullable=True)
    is_principal_residence = db.Column(db.Boolean, nullable=False, default=False)
    rental_act_accepted = db.Column(db.Boolean, nullable=False, default=False)
    pr_exempt_reason = db.Column(db.String, nullable=True)
    service_provider = db.Column(db.String, nullable=True)
    space_type = db.Column(db.Enum(RentalUnitSpaceType), nullable=True)
    host_residence = db.Column(db.Enum(HostResidence), nullable=True)
    rental_space_option = db.Column(db.Enum(RentalSpaceOption), nullable=True)
    is_unit_on_principal_residence_property = db.Column(db.Boolean, nullable=True)
    host_type = db.Column(db.Enum(HostType), nullable=True)
    number_of_rooms_for_rent = db.Column(db.Integer, nullable=True)
    strata_hotel_registration_number = db.Column(db.String, nullable=True)
    strata_hotel_category = db.Column(Enum(StrataHotelCategory), nullable=True, index=True)
    pr_required = db.Column(db.Boolean, nullable=True, index=True)
    bl_required = db.Column(db.Boolean, nullable=True, index=True)
    jurisdiction = db.Column(db.String, nullable=True, index=True)
    strr_exempt = db.Column(db.Boolean, nullable=True)

    address_id = db.Column(db.Integer, db.ForeignKey("addresses.id"), nullable=False)
    registration_id = db.Column(db.Integer, db.ForeignKey("registrations.id"), nullable=False)
    property_manager_id = db.Column(db.Integer, db.ForeignKey("property_manager.id"), nullable=True)

    address = relationship("Address", foreign_keys=[address_id], back_populates="rental_properties_address")
    registration = relationship("Registration", foreign_keys=[registration_id], back_populates="rental_property")
    property_manager = relationship(
        "PropertyManager", foreign_keys=[property_manager_id], back_populates="rental_property"
    )

    contacts = relationship("PropertyContact", cascade="all, delete-orphan")
    property_listings = relationship("PropertyListing", cascade="all, delete-orphan")


class PropertyManager(Versioned, BaseModel):
    """Property Manager"""

    class PropertyManagerType(BaseEnum):
        """Enum of property manager types."""

        INDIVIDUAL = auto()  # pylint: disable=invalid-name
        BUSINESS = auto()  # pylint: disable=invalid-name

    __tablename__ = "property_manager"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    property_manager_type = db.Column(db.Enum(PropertyManagerType))

    business_legal_name = db.Column(db.String(250), nullable=True)
    business_number = db.Column(db.String(100), nullable=True)
    business_mailing_address_id = db.Column(db.Integer, db.ForeignKey("addresses.id"))

    primary_contact_id = db.Column(db.Integer, db.ForeignKey("contacts.id"))

    business_mailing_address = relationship("Address", foreign_keys=[business_mailing_address_id])
    primary_contact = relationship("Contact", foreign_keys=[primary_contact_id])

    rental_property = relationship("RentalProperty", back_populates="property_manager", uselist=False)


class PropertyContact(Versioned, BaseModel):
    """Property Contacts"""

    class ContactType(BaseEnum):
        """Enum of host types."""

        INDIVIDUAL = auto()  # pylint: disable=invalid-name
        BUSINESS = auto()  # pylint: disable=invalid-name

    __tablename__ = "property_contacts"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    is_primary = db.Column(db.Boolean, nullable=False, default=False)
    contact_type = db.Column(db.Enum(ContactType), default=ContactType.INDIVIDUAL)
    business_legal_name = db.Column(db.String(1000), nullable=True)

    contact_id = db.Column(db.Integer, db.ForeignKey("contacts.id"), nullable=False)
    property_id = db.Column(db.Integer, db.ForeignKey("rental_properties.id"), nullable=False)

    contact = relationship("Contact", foreign_keys=[contact_id])
    property = relationship("RentalProperty", back_populates="contacts")


class PropertyListing(Versioned, BaseModel):
    """Platform Listings"""

    __tablename__ = "property_listings"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    platform = db.Column(db.String, nullable=True)
    url = db.Column(db.String, nullable=False)
    type = db.Column(db.String, nullable=True)

    property_id = db.Column(db.Integer, db.ForeignKey("rental_properties.id"), nullable=False)

    property = relationship("RentalProperty", back_populates="property_listings")


class Document(Versioned, BaseModel):
    """Document model."""

    class DocumentType(BaseEnum):
        """Enum of the document types."""

        LESS_THAN_250 = auto()  # pylint: disable=invalid-name
        BETWEEN_250_AND_999 = auto()  # pylint: disable=invalid-name
        THOUSAND_AND_ABOVE = auto()  # pylint: disable=invalid-name
        BC_DRIVERS_LICENSE = auto()  # pylint: disable=invalid-name
        PROPERTY_ASSESSMENT_NOTICE = auto()  # pylint: disable=invalid-name
        SPEC_TAX_CONFIRMATION = auto()  # pylint: disable=invalid-name
        HOG_DECLARATION = auto()  # pylint: disable=invalid-name
        ICBC_CERTIFICATE_OF_INSURANCE = auto()  # pylint: disable=invalid-name
        HOME_INSURANCE_SUMMARY = auto()  # pylint: disable=invalid-name
        PROPERTY_TAX_NOTICE = auto()  # pylint: disable=invalid-name
        UTILITY_BILL = auto()  # pylint: disable=invalid-name
        GOVT_OR_CROWN_CORP_OFFICIAL_NOTICE = auto()  # pylint: disable=invalid-name
        TENANCY_AGREEMENT = auto()  # pylint: disable=invalid-name
        RENT_RECEIPT_OR_BANK_STATEMENT = auto()  # pylint: disable=invalid-name
        LOCAL_GOVT_BUSINESS_LICENSE = auto()  # pylint: disable=invalid-name
        OTHERS = auto()  # pylint: disable=invalid-name
        STRATA_HOTEL_DOCUMENTATION = auto()  # pylint: disable=invalid-name
        FRACTIONAL_OWNERSHIP_AGREEMENT = auto()  # pylint: disable=invalid-name
        BCSC = auto()  # pylint: disable=invalid-name
        COMBINED_BCSC_LICENSE = auto()  # pylint: disable=invalid-name
        PROPERTY_TITLE_WITH_FRACTIONAL_OWNERSHIP = auto()  # pylint: disable=invalid-name
        TITLE_CERTIFICATE_OR_SEARCH = auto()  # pylint: disable=invalid-name
        SPECULATION_VACANCY_TAX_DECLARATION = auto()  # pylint: disable=invalid-name
        HOME_OWNER_GRANT_APPROVAL = auto()  # pylint: disable=invalid-name
        NOTARIZED_REAL_ESTATE_DOC = auto()  # pylint: disable=invalid-name
        PROPERTY_TRANSFER_TAX_RETURN = auto()  # pylint: disable=invalid-name
        AFFIDAVIT_PRINCIPAL_RESIDENCE = auto()  # pylint: disable=invalid-name
        ASSESSMENT_ACT_NOTICE = auto()  # pylint: disable=invalid-name
        MORTGAGE_STATEMENT_OR_SAVINGS_DOC = auto()  # pylint: disable=invalid-name

    __tablename__ = "documents"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    file_name = db.Column(db.String, nullable=False)
    file_type = db.Column(db.String, nullable=False)  # e.g., 'pdf', 'jpeg', etc.
    path = db.Column(db.String, nullable=False)
    document_type = db.Column("document_type", db.Enum(DocumentType), default=DocumentType.OTHERS, index=True)
    added_on = db.Column(db.Date, nullable=True)
    parsed_data = db.Column("parsed_data", JSONB, nullable=True)
    parsing_error = db.Column("parsing_error", JSONB, nullable=True)

    registration_id = db.Column(db.Integer, db.ForeignKey("registrations.id"), nullable=False)
    registration = relationship("Registration", foreign_keys=[registration_id], back_populates="documents")
