"""Platforms model.

"""
from __future__ import annotations

from sqlalchemy.orm import relationship

from strr_api.models.base_model import BaseModel

from .db import db


class Platform(BaseModel):
    """Rental Property"""

    __tablename__ = "platforms"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    legal_name = db.Column(db.String, nullable=False)
    business_number = db.Column(db.String, nullable=False)

    registration_id = db.Column(db.Integer, db.ForeignKey("registrations.id"), nullable=False)
    registration = relationship("Registration", foreign_keys=[registration_id], back_populates="platform")
