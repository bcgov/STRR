"""
Model  for LTSA details of an application/registration.
"""
from __future__ import annotations

from typing import List, Optional

from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import text

from strr_api.models.base_model import BaseModel

from .db import db


class LTSARecord(BaseModel):
    """LTSA Record"""

    __tablename__ = "ltsa"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    application_id = db.Column(db.Integer, db.ForeignKey("application.id"), nullable=False)
    record = db.Column(JSONB, nullable=False)
    creation_date = db.Column(db.DateTime, nullable=False, server_default=text("(NOW())"))

    @classmethod
    def get_application_ltsa_records(cls, application_id: int) -> Optional[List[LTSARecord]]:
        """Get LTSA records for a given application."""
        return cls.query.filter_by(application_id=application_id).all()
