"""
ORM mapping for examiner notes on applications and registrations.
"""
from __future__ import annotations

from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from strr_api.models.base_model import SimpleBaseModel

from .db import db


class ExaminerNote(SimpleBaseModel):
    """Staff-only append-only note attached to one application or registration."""

    __tablename__ = "examiner_notes"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    body = db.Column(db.Text, nullable=False)

    application_id = db.Column(db.Integer, db.ForeignKey("application.id"), nullable=True, index=True)
    registration_id = db.Column(db.Integer, db.ForeignKey("registrations.id"), nullable=True, index=True)

    author_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())

    author = relationship("User", foreign_keys=[author_user_id])

    __table_args__ = (
        db.CheckConstraint(
            "(application_id IS NOT NULL AND registration_id IS NULL) "
            "OR (application_id IS NULL AND registration_id IS NOT NULL)",
            name="chk_examiner_notes_single_parent",
        ),
    )
