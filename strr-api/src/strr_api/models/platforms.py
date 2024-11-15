"""Platforms model.

"""
from __future__ import annotations

from sql_versioning import Versioned
from sqlalchemy.orm import relationship

from strr_api.common.enum import BaseEnum, auto
from strr_api.models.base_model import BaseModel

from .db import db


class Platform(Versioned, BaseModel):
    """Platform"""

    class ListingSize(BaseEnum):
        """Enum of the registration types."""

        LESS_THAN_250 = auto()  # pylint: disable=invalid-name
        BETWEEN_250_AND_999 = auto()  # pylint: disable=invalid-name
        THOUSAND_AND_ABOVE = auto()  # pylint: disable=invalid-name

    __tablename__ = "platforms"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    legal_name = db.Column("legal_name", db.String(150), nullable=False, index=True)
    home_jurisdiction = db.Column("home_jurisdiction", db.String(150), nullable=False)
    business_number = db.Column("business_number", db.String(150), nullable=True)
    cpbc_licence_number = db.Column("cpbc_licence_number", db.String(50), nullable=True)
    primary_non_compliance_notice_email = db.Column(
        "primary_non_compliance_notice_email", db.String(100), nullable=False
    )
    secondary_non_compliance_notice_email = db.Column(
        "secondary_non_compliance_notice_email", db.String(100), nullable=True
    )
    primary_take_down_request_email = db.Column("primary_take_down_request_email", db.String(100), nullable=False)
    secondary_take_down_request_email = db.Column("secondary_take_down_request_email", db.String(100), nullable=True)
    attorney_name = db.Column("attorney_name", db.String(150), nullable=True)

    attorney_name = db.Column("attorney_name", db.String(150), nullable=True)
    listing_size = db.Column("listing_size", db.Enum(ListingSize))

    mailing_address_id = db.Column(db.Integer, db.ForeignKey("addresses.id"), nullable=False)
    registered_office_attorney_mailing_address_id = db.Column(db.Integer, db.ForeignKey("addresses.id"), nullable=True)

    mailingAddress = relationship("Address", foreign_keys=[mailing_address_id])
    registered_office_attorney_mailing_address = relationship(
        "Address", foreign_keys=[registered_office_attorney_mailing_address_id]
    )

    representatives = relationship("PlatformRepresentative", back_populates="platform")
    platform_registrations = relationship("PlatformRegistration", back_populates="platform")
    brands = relationship("PlatformBrand", back_populates="platform")


class PlatformRegistration(Versioned, BaseModel):
    """Platform Registration mapping model"""

    __tablename__ = "platform_registration"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    registration_id = db.Column(db.Integer, db.ForeignKey("registrations.id"), nullable=False)
    registration = relationship("Registration", foreign_keys=[registration_id], back_populates="platform_registration")

    platform_id = db.Column(db.Integer, db.ForeignKey("platforms.id"), nullable=False)
    platform = relationship("Platform", foreign_keys=[platform_id], back_populates="platform_registrations")


class PlatformRepresentative(Versioned, BaseModel):
    """Platform Representatives"""

    __tablename__ = "platform_representatives"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    contact_id = db.Column(db.Integer, db.ForeignKey("contacts.id"), nullable=False)
    platform_id = db.Column(db.Integer, db.ForeignKey("platforms.id"), nullable=False)

    contact = relationship("Contact", foreign_keys=[contact_id])
    platform = relationship("Platform", foreign_keys=[platform_id], back_populates="representatives")


class PlatformBrand(Versioned, BaseModel):
    """Platform Brands."""

    __tablename__ = "platform_brands"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    name = db.Column("name", db.String(150), nullable=False, index=True)
    website = db.Column("website", db.String(500), nullable=False)
    platform_id = db.Column(db.Integer, db.ForeignKey("platforms.id"), nullable=False)

    platform = relationship("Platform", back_populates="brands", foreign_keys=[platform_id])
