"""
Real Time Validation Model.
"""
from __future__ import annotations

from sqlalchemy.dialects.postgresql import JSONB

from strr_api.models.base_model import BaseModel

from .db import db


class RealTimeValidation(BaseModel):
    """Real Time Validation Model."""

    __tablename__ = "real_time_validation"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    request_json = db.Column("request_json", JSONB, nullable=False)
    response_json = db.Column("response_json", JSONB)
    status_code = db.Column(db.String(100))
