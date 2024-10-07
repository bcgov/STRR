"""Registration model.

"""
from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import Enum
from sqlalchemy.orm import relationship

from strr_api.common.enum import BaseEnum, auto
from strr_api.enums.enum import OwnershipType, PropertyType, RegistrationStatus
from strr_api.models.base_model import BaseModel
from strr_api.models.platforms import Platform  # pylint: disable=W0611

from .db import db


class Registration(BaseModel):
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

    user = relationship("User", back_populates="registrations")

    certificates = relationship("Certificate", back_populates="registration")
    rental_property = relationship("RentalProperty", back_populates="registration", uselist=False)
    platform = relationship("Platform", back_populates="registration", uselist=False)
    documents = relationship("Document", back_populates="registration")


class RentalProperty(BaseModel):
    """Rental Property"""

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

    address_id = db.Column(db.Integer, db.ForeignKey("addresses.id"), nullable=False)
    registration_id = db.Column(db.Integer, db.ForeignKey("registrations.id"), nullable=False)

    address = relationship("Address", foreign_keys=[address_id], back_populates="rental_properties_address")
    registration = relationship("Registration", foreign_keys=[registration_id], back_populates="rental_property")

    contacts = relationship("PropertyContact")
    property_listings = relationship("PropertyListing")


class Address(BaseModel):
    """Address"""

    __tablename__ = "addresses"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    country = db.Column(db.String, nullable=False)
    street_address = db.Column(db.String, nullable=False)
    street_address_additional = db.Column(db.String, nullable=True)
    city = db.Column(db.String, nullable=False)
    province = db.Column(db.String, nullable=False)
    postal_code = db.Column(db.String, nullable=False)

    contact = relationship("Contact", back_populates="address", foreign_keys="Contact.address_id")
    rental_properties_address = relationship(
        "RentalProperty", back_populates="address", foreign_keys="RentalProperty.address_id"
    )

    def to_oneline_address(self):
        """Convert object to one line address."""
        unit = ""
        if self.street_address_additional:
            unit = f"{self.street_address_additional} "
        return f"{unit}{self.street_address}, {self.city}, {self.province}, {self.country}, {self.postal_code}"


class PropertyContact(BaseModel):
    """Property Contacts"""

    __tablename__ = "property_contacts"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    is_primary = db.Column(db.Boolean, nullable=False, default=False)

    contact_id = db.Column(db.Integer, db.ForeignKey("contacts.id"), nullable=False)
    property_id = db.Column(db.Integer, db.ForeignKey("rental_properties.id"), nullable=False)

    contact = relationship("Contact", foreign_keys=[contact_id])
    property = relationship("RentalProperty", back_populates="contacts")


class PropertyListing(BaseModel):
    """Platform Listings"""

    __tablename__ = "property_listings"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    platform = db.Column(db.String, nullable=True)
    url = db.Column(db.String, nullable=False)
    type = db.Column(db.String, nullable=True)

    property_id = db.Column(db.Integer, db.ForeignKey("rental_properties.id"), nullable=False)

    property = relationship("RentalProperty", back_populates="property_listings")


class Document(BaseModel):
    """Document model."""

    __tablename__ = "documents"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    file_name = db.Column(db.String, nullable=False)
    file_type = db.Column(db.String, nullable=False)  # e.g., 'pdf', 'jpeg', etc.
    path = db.Column(db.String, nullable=False)

    registration_id = db.Column(db.Integer, db.ForeignKey("registrations.id"), nullable=False)
    registration = relationship("Registration", foreign_keys=[registration_id], back_populates="documents")
