"""Strata Hotels model.

"""
from __future__ import annotations

from sql_versioning import Versioned
from sqlalchemy.orm import relationship

from strr_api.models.base_model import BaseModel

from .db import db


class StrataHotel(Versioned, BaseModel):
    """Strata Hotel"""

    __tablename__ = "strata_hotels"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    legal_name = db.Column("legal_name", db.String(250), nullable=False, index=True)
    home_jurisdiction = db.Column("home_jurisdiction", db.String(150), nullable=False)
    business_number = db.Column("business_number", db.String(150), nullable=True)
    attorney_name = db.Column("attorney_name", db.String(250), nullable=True)
    brand_name = db.Column("brand_name", db.String(250), nullable=False)
    website = db.Column("website", db.String(1000), nullable=False)
    number_of_units = db.Column("number_of_units", db.Integer, nullable=False)

    mailing_address_id = db.Column(db.Integer, db.ForeignKey("addresses.id"), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey("addresses.id"), nullable=False)
    registered_office_attorney_mailing_address_id = db.Column(db.Integer, db.ForeignKey("addresses.id"), nullable=True)

    mailingAddress = relationship("Address", foreign_keys=[mailing_address_id])
    location = relationship("Address", foreign_keys=[location_id])
    registered_office_attorney_mailing_address = relationship(
        "Address", foreign_keys=[registered_office_attorney_mailing_address_id]
    )

    representatives = relationship("StrataHotelRepresentative", back_populates="strata_hotel")
    strata_hotel_registrations = relationship("StrataHotelRegistration", back_populates="strata_hotel")
    buildings = relationship("StrataHotelBuilding", back_populates="strata_hotel")


class StrataHotelRegistration(Versioned, BaseModel):
    """Strata Hotel Registration mapping model"""

    __tablename__ = "strata_hotel_registration"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    registration_id = db.Column(db.Integer, db.ForeignKey("registrations.id"), nullable=False)
    registration = relationship(
        "Registration", foreign_keys=[registration_id], back_populates="strata_hotel_registration"
    )

    strata_hotel_id = db.Column(db.Integer, db.ForeignKey("strata_hotels.id"), nullable=False)
    strata_hotel = relationship(
        "StrataHotel", foreign_keys=[strata_hotel_id], back_populates="strata_hotel_registrations"
    )


class StrataHotelRepresentative(Versioned, BaseModel):
    """Strata Hotel Representatives"""

    __tablename__ = "strata_hotel_representatives"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    contact_id = db.Column(db.Integer, db.ForeignKey("contacts.id"), nullable=False)
    strata_hotel_id = db.Column(db.Integer, db.ForeignKey("strata_hotels.id"), nullable=False)

    contact = relationship("Contact", foreign_keys=[contact_id])
    strata_hotel = relationship("StrataHotel", foreign_keys=[strata_hotel_id], back_populates="representatives")


class StrataHotelBuilding(Versioned, BaseModel):
    """Strata Hotel Buildings."""

    __tablename__ = "strata_hotel_buildings"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    address_id = db.Column(db.Integer, db.ForeignKey("addresses.id"), nullable=False)
    strata_hotel_id = db.Column(db.Integer, db.ForeignKey("strata_hotels.id"), nullable=False)

    address = relationship("Address", foreign_keys=[address_id])
    strata_hotel = relationship("StrataHotel", foreign_keys=[strata_hotel_id], back_populates="buildings")
