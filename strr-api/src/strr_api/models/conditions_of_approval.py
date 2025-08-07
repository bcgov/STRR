"""Conditions of Approval model."""

from __future__ import annotations

from sql_versioning import Versioned
from sqlalchemy.dialects.postgresql import ARRAY

from strr_api.models.base_model import BaseModel

from .db import db


class ConditionsOfApproval(Versioned, BaseModel):
    """Conditions of Approval"""

    __tablename__ = "conditions_of_approval"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    preapproved_conditions = db.Column(ARRAY(db.String), nullable=True)
    custom_conditions = db.Column(ARRAY(db.String), nullable=True)
    minBookingDays = db.Column(db.Integer, nullable=True)
    registration_id = db.Column(db.Integer, db.ForeignKey("registrations.id"), nullable=False)

    registration = db.relationship(
        "Registration", foreign_keys=[registration_id], back_populates="conditionsOfApproval"
    )
