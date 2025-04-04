"""
Model to store Notice of consideration
"""
from __future__ import annotations

from sqlalchemy.sql import text

from strr_api.models.base_model import SimpleBaseModel

from .db import db


class NoticeOfConsideration(SimpleBaseModel):
    """Notice of consideration"""

    __tablename__ = "notice_of_consideration"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    application_id = db.Column(db.Integer, db.ForeignKey("application.id"), nullable=False)
    content = db.Column(db.Text, nullable=False)
    start_date = db.Column(db.DateTime(timezone=True), nullable=False)
    end_date = db.Column(db.DateTime(timezone=True), nullable=False)
    creation_date = db.Column(db.DateTime(timezone=True), nullable=False, server_default=text("(NOW())"))

    application = db.relationship("Application", foreign_keys=[application_id], back_populates="noc")
