"""
ORM Mapping for Certificate Records
"""
from __future__ import annotations

from sqlalchemy.orm import backref, relationship
from sqlalchemy.sql import text

from strr_api.models.base_model import BaseModel

from .db import db


class Certificate(BaseModel):
    """Certificate Model."""

    __tablename__ = "certificates"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    registration_id = db.Column(db.Integer, db.ForeignKey("registrations.id"), nullable=False)
    issued_date = db.Column(db.DateTime, nullable=False, server_default=text("(NOW())"))
    issuer_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    certificate = db.Column(db.LargeBinary, nullable=False)

    registration = relationship("Registration", back_populates="certificates")
    issuer = db.relationship(
        "User",
        backref=backref("issuer", uselist=False),
        foreign_keys=[issuer_id],
    )
