"""
Model to store Registration Notice of consideration
"""
from __future__ import annotations

from sqlalchemy.sql import text

from strr_api.models.base_model import SimpleBaseModel

from .db import db


class RegistrationNoticeOfConsideration(SimpleBaseModel):
    """Registration Notice of consideration"""

    __tablename__ = "registration_notice_of_consideration"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    registration_id = db.Column(db.Integer, db.ForeignKey("registrations.id"), nullable=False)
    content = db.Column(db.Text, nullable=False)
    start_date = db.Column(db.DateTime(timezone=True), nullable=False)
    end_date = db.Column(db.DateTime(timezone=True), nullable=False)
    creation_date = db.Column(db.DateTime(timezone=True), nullable=False, server_default=text("(NOW())"))

    registration = db.relationship("Registration", foreign_keys=[registration_id], back_populates="nocs")
