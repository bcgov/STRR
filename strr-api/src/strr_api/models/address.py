"""Registration model.

"""

from __future__ import annotations

from sql_versioning import Versioned
from sqlalchemy.orm import relationship

from strr_api.models.base_model import BaseModel

from .db import db


class Address(Versioned, BaseModel):
    """Address"""

    __tablename__ = "addresses"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    country = db.Column(db.String, nullable=False)
    street_address = db.Column(db.String, nullable=False)
    street_address_additional = db.Column(db.String, nullable=True)
    city = db.Column(db.String, nullable=False)
    province = db.Column(db.String, nullable=False)
    postal_code = db.Column(db.String, nullable=False)
    location_description = db.Column(db.String, nullable=True)
    unit_number = db.Column(db.String, nullable=True)
    street_number = db.Column(db.String, nullable=True)

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
