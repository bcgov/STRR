"""
ORM Mapping for Certificate Records
"""
from __future__ import annotations

from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from strr_api.models.base_model import BaseModel

from .db import db


class Certificate(BaseModel):
    """Certificate Record"""

    __tablename__ = "certificates"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    registration_id = db.Column(db.Integer, db.ForeignKey("registrations.id"), nullable=False)
    registration_number = db.Column(db.String, nullable=False)
    creation_date = db.Column(db.DateTime, nullable=False, server_default=text("(NOW())"))
    expiry_date = db.Column(db.DateTime, nullable=False, server_default=text("(NOW() + interval '1 year')"))
    certificate = db.Column(db.LargeBinary, nullable=False)

    registration = relationship("Registration", back_populates="certificates")
