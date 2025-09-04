"""
Registration Snapshot model
"""
from __future__ import annotations

from sqlalchemy.dialects.postgresql import JSONB

from strr_api.models.base_model import SimpleBaseModel

from .db import db


class RegistrationSnapshot(SimpleBaseModel):
    """Registration snapshot model."""

    id = db.Column(db.Integer, primary_key=True)
    snapshot_data = db.Column("snapshot_data", JSONB, nullable=False)
    version = db.Column(db.Integer, nullable=False, index=True)
    snapshot_datetime = db.Column("snapshot_datetime", db.DateTime(timezone=True))
    registration_id = db.Column(db.Integer, db.ForeignKey("registrations.id"), nullable=False, index=True)

    registration = db.relationship("Registration", foreign_keys=[registration_id], back_populates="snapshots")

    @classmethod
    def find_latest_snapshot(cls, registration_id):
        """Returns the latest snapshot of a registration if present."""
        return cls.query.filter_by(registration_id=registration_id).order_by(RegistrationSnapshot.id.desc()).first()
