"""This manages a Retal record

"""
from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import Enum
from sqlalchemy.orm import relationship

from strr_api.enums.enum import OwnershipType, PropertyType, RegistrationStatus
from strr_api.models.base_model import BaseModel

from .db import db


class RentalProperty(BaseModel):
    """Rental Property"""

    __tablename__ = "rental_properties"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    property_manager_id = db.Column(db.Integer, db.ForeignKey("property_managers.id"), nullable=False)
    address_id = db.Column(db.Integer, db.ForeignKey("addresses.id"), nullable=False)
    nickname = db.Column(db.String, nullable=True)
    parcel_identifier = db.Column(db.String, nullable=True)
    local_business_licence = db.Column(db.String, nullable=True)
    # Enum: All or part of primary dwelling; Secondary suite; Accessory dwelling unit; Float home; Other
    property_type = db.Column(Enum(PropertyType), nullable=False)
    ownership_type = db.Column(Enum(OwnershipType), nullable=False)  # Enum: own, rent, co-own

    property_manager = relationship("PropertyManager")
    rental_platforms = relationship("RentalPlatform")
    registrations = relationship("Registration")
    address = relationship("Address", foreign_keys=[address_id], back_populates="rental_properties_address")


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


class PropertyManager(BaseModel):
    """Property Manager"""

    __tablename__ = "property_managers"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    primary_contact_id = db.Column(db.Integer, db.ForeignKey("contacts.id"), nullable=False)
    secondary_contact_id = db.Column(db.Integer, db.ForeignKey("contacts.id"), nullable=False)

    primary_contact = relationship("Contact", foreign_keys=[primary_contact_id])
    secondary_contact = relationship("Contact", foreign_keys=[secondary_contact_id])


class RentalPlatform(BaseModel):
    """Rental Platform"""

    __tablename__ = "rental_platforms"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String, nullable=True)
    property_id = db.Column(db.Integer, db.ForeignKey("rental_properties.id"), nullable=False)
    url = db.Column(db.String, nullable=False)
    type = db.Column(db.String, nullable=True)

    property = relationship("RentalProperty", back_populates="rental_platforms")


class Registration(BaseModel):
    """Registration"""

    DEFAULT_REGISTRATION_RENEWAL_PERIOD = timedelta(days=365)

    __tablename__ = "registrations"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    sbc_account_id = db.Column(db.Integer, nullable=True)
    rental_property_id = db.Column(db.Integer, db.ForeignKey("rental_properties.id"), nullable=False)
    submission_date = db.Column(db.DateTime, default=datetime.now, nullable=False)
    updated_date = db.Column(db.DateTime, default=datetime.now, nullable=False)
    status = db.Column(Enum(RegistrationStatus), nullable=False)
    registration_number = db.Column(db.String, unique=True, index=True)

    # start_date is nullable as it will take effect when the correct status is set
    start_date = db.Column(db.DateTime, nullable=True)
    expiry_date = db.Column(db.DateTime, nullable=True)

    user = relationship("User", back_populates="registrations")
    rental_property = relationship("RentalProperty", back_populates="registrations")
    eligibility = relationship("Eligibility", back_populates="registrations", uselist=False)
    certificates = relationship("Certificate", back_populates="registration")

    def save(self):
        """Store the Registration into the local cache."""
        db.session.add(self)
        db.session.commit()


class Document(BaseModel):
    """Document model to store supporting files for eligibility criteria."""

    __tablename__ = "documents"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    eligibility_id = db.Column(db.Integer, db.ForeignKey("eligibilities.id"), nullable=False)
    file_name = db.Column(db.String, nullable=False)
    file_type = db.Column(db.String, nullable=False)  # e.g., 'pdf', 'jpeg', etc.
    path = db.Column(db.String, nullable=False)  # e.g., 'pdf', 'jpeg', etc.

    eligibility = relationship("Eligibility", back_populates="documents")


class Eligibility(BaseModel):
    """Eligibility criteria for a rental property."""

    __tablename__ = "eligibilities"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    registration_id = db.Column(db.Integer, db.ForeignKey("registrations.id"), nullable=False)
    is_principal_residence = db.Column(db.Boolean, nullable=False, default=False)
    agreed_to_rental_act = db.Column(db.Boolean, nullable=False, default=False)
    non_principal_option = db.Column(db.String, nullable=True)
    specified_service_provider = db.Column(db.String, nullable=True)
    agreed_to_submit = db.Column(db.Boolean, nullable=False, default=False)

    documents = relationship("Document")
    registrations = relationship("Registration", back_populates="eligibility")
