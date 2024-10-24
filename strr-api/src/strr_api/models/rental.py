"""Registration model.

"""
from __future__ import annotations

from datetime import datetime, timedelta

from sql_versioning import Versioned
from sqlalchemy import Enum
from sqlalchemy.orm import relationship

from strr_api.common.enum import BaseEnum, auto
from strr_api.enums.enum import OwnershipType, PropertyType, RegistrationStatus
from strr_api.models.base_model import BaseModel

from .db import db


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

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    user = relationship("User", foreign_keys=[user_id])

    certificates = relationship("Certificate", back_populates="registration")
    rental_property = relationship("RentalProperty", back_populates="registration", uselist=False)
    platform_registration = relationship("PlatformRegistration", back_populates="registration", uselist=False)
    documents = relationship("Document", back_populates="registration")


class RentalProperty(Versioned, BaseModel):
    """Rental Property"""

    class RentalUnitSpaceType(BaseEnum):
        """Enum of rental unit space type."""

        ENTIRE_HOME = auto()  # pylint: disable=invalid-name
        SHARED_ACCOMMODATION = auto()  # pylint: disable=invalid-name

    class HostResidence(BaseEnum):
        """Enum of host residence option."""

        SAME_UNIT = auto()  # pylint: disable=invalid-name
        ANOTHER_UNIT = auto()  # pylint: disable=invalid-name

    __tablename__ = "rental_properties"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nickname = db.Column(db.String, nullable=True)
    parcel_identifier = db.Column(db.String, nullable=True)
    local_business_licence = db.Column(db.String, nullable=True)
    local_business_licence_expiry_date = db.Column(db.Date, nullable=True)
    # Enum: All or part of primary dwelling; Secondary suite; Accessory dwelling unit; Float home; Other
    property_type = db.Column(Enum(PropertyType), nullable=False)
    ownership_type = db.Column(Enum(OwnershipType), nullable=False)  # Enum: own, rent, co-own
    is_principal_residence = db.Column(db.Boolean, nullable=False, default=False)
    rental_act_accepted = db.Column(db.Boolean, nullable=False, default=False)
    pr_exempt_reason = db.Column(db.String, nullable=True)
    service_provider = db.Column(db.String, nullable=True)
    space_type = db.Column(db.Enum(RentalUnitSpaceType), nullable=False)
    host_residence = db.Column(db.Enum(HostResidence), nullable=False)
    is_unit_on_principal_residence_property = db.Column(db.Boolean, nullable=False)
    number_of_rooms_for_rent = db.Column(db.Integer, nullable=False)

    address_id = db.Column(db.Integer, db.ForeignKey("addresses.id"), nullable=False)
    registration_id = db.Column(db.Integer, db.ForeignKey("registrations.id"), nullable=False)
    property_manager_id = db.Column(db.Integer, db.ForeignKey("property_manager.id"), nullable=True)

    address = relationship("Address", foreign_keys=[address_id], back_populates="rental_properties_address")
    registration = relationship("Registration", foreign_keys=[registration_id], back_populates="rental_property")
    property_manager = relationship(
        "PropertyManager", foreign_keys=[property_manager_id], back_populates="rental_property"
    )

    contacts = relationship("PropertyContact")
    property_listings = relationship("PropertyListing")


class PropertyManager(Versioned, BaseModel):
    """Property Manager"""

    __tablename__ = "property_manager"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    business_legal_name = db.Column(db.String(250), nullable=True)
    business_number = db.Column(db.String(100), nullable=True)

    business_mailing_address_id = db.Column(db.Integer, db.ForeignKey("addresses.id"), nullable=False)
    contact_id = db.Column(db.Integer, db.ForeignKey("contacts.id"), nullable=False)

    business_mailing_address = relationship("Address", foreign_keys=[business_mailing_address_id])
    contact = relationship("Contact", foreign_keys=[contact_id])

    rental_property = relationship("RentalProperty", back_populates="property_manager", uselist=False)


class PropertyContact(Versioned, BaseModel):
    """Property Contacts"""

    __tablename__ = "property_contacts"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    is_primary = db.Column(db.Boolean, nullable=False, default=False)

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

    __tablename__ = "documents"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    file_name = db.Column(db.String, nullable=False)
    file_type = db.Column(db.String, nullable=False)  # e.g., 'pdf', 'jpeg', etc.
    path = db.Column(db.String, nullable=False)

    registration_id = db.Column(db.Integer, db.ForeignKey("registrations.id"), nullable=False)
    registration = relationship("Registration", foreign_keys=[registration_id], back_populates="documents")
