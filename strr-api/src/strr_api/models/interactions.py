# Copyright © 2025 Province of British Columbia
#
# Licensed under the BSD 3 Clause License, (the "License");
# you may not use this file except in compliance with the License.
# The template for the license can be found here
#    https://opensource.org/license/bsd-3-clause/
#
# Redistribution and use in source and binary forms,
# with or without modification, are permitted provided that the
# following conditions are met:
#
# 1. Redistributions of source code must retain the above copyright notice,
#    this list of conditions and the following disclaimer.
#
# 2. Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.
#
# 3. Neither the name of the copyright holder nor the names of its contributors
#    may be used to endorse or promote products derived from this software
#    without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS”
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
# THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
# ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
# LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sql_versioning import Versioned
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, exists, or_, select
from sqlalchemy.dialects.postgresql import ENUM as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from strr_api.enums.enum import ChannelType, DeliveryStatus, InteractionStatus

from .base_model import SimpleBaseModel
from .db import db

if TYPE_CHECKING:
    from .application import Application
    from .rental import Registration
    from .user import User

FAILURE_DELIVERY_STATUSES = (
    DeliveryStatus.PERMANENT_FAILURE,
    DeliveryStatus.TEMPORARY_FAILURE,
    DeliveryStatus.TECHNICAL_FAILURE,
    DeliveryStatus.BLOCKED,
)


class InteractionRecipient(Versioned, SimpleBaseModel):
    """Normalized per-recipient delivery state for a customer interaction."""

    __tablename__ = "interaction_recipients"

    id: Mapped[int] = mapped_column(primary_key=True)
    interaction_id: Mapped[int] = mapped_column(
        ForeignKey("interactions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recipient_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email_address: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    status: Mapped[DeliveryStatus] = mapped_column(
        SQLEnum(DeliveryStatus, name="delivery_status"),
        nullable=False,
        default=DeliveryStatus.PENDING,
    )
    failure_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notify_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, unique=True, index=True)
    provider_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    request_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    raw_payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    interaction: Mapped["CustomerInteraction"] = relationship(
        "CustomerInteraction",
        back_populates="recipients",
        foreign_keys=[interaction_id],
    )

    __table_args__ = (
        Index(
            "ix_interaction_recipients_failure_lookup",
            interaction_id,
            status,
            postgresql_where=status.in_(FAILURE_DELIVERY_STATUSES),
        ),
    )

    def save(self):
        """Store the InteractionRecipient."""
        db.session.add(self)
        db.session.commit()


class CustomerInteraction(Versioned, SimpleBaseModel):
    """Manage interactions between customers, staff and systems."""

    __tablename__ = "interactions"

    id: Mapped[int] = mapped_column(primary_key=True)

    interaction_uuid: Mapped[str] = mapped_column(
        String(36), unique=True, index=True, default=lambda: str(uuid.uuid4())
    )

    # tracking this was successfully sent, and the run that covered it
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(255), unique=False, index=True)

    # Enum-based fixed fields
    channel: Mapped[ChannelType] = mapped_column(SQLEnum(ChannelType))
    status: Mapped[InteractionStatus] = mapped_column(SQLEnum(InteractionStatus), default=InteractionStatus.SENT)

    body_content: Mapped[Optional[str]] = mapped_column(Text)

    # Callback transaction link for audit
    notify_reference: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    provider_reference: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    meta_data: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    customer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    application_id: Mapped[Optional[int]] = mapped_column(ForeignKey("application.id"), nullable=True, index=True)
    registration_id: Mapped[Optional[int]] = mapped_column(ForeignKey("registrations.id"), nullable=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)

    # --- Relationships ---
    # 'User', 'Application', 'Registration' are string references, making them future refs
    customer: Mapped[Optional["User"]] = relationship(foreign_keys=[customer_id])
    application: Mapped[Optional["Application"]] = relationship(foreign_keys=[application_id])
    registration: Mapped[Optional["Registration"]] = relationship(foreign_keys=[registration_id])
    user: Mapped[Optional["User"]] = relationship(foreign_keys=[user_id])
    recipients: Mapped[list["InteractionRecipient"]] = relationship(
        "InteractionRecipient",
        back_populates="interaction",
        cascade="all, delete-orphan",
        order_by="InteractionRecipient.id",
    )

    # Ensure it this is linked to only 1 of the 3.
    __table_args__ = (
        CheckConstraint(
            func.num_nonnulls(customer_id, application_id, registration_id) == 1,
            name="check_exclusive_owner_interaction",
        ),
    )

    def save(self):
        """Store the Interaction."""
        db.session.add(self)
        db.session.commit()

    @classmethod
    def find_by_id_idempotency_key(
        cls,
        idempotency_key: str,
        registration_id: int = None,
        application_id: int = None,
    ) -> CustomerInteraction | None:
        """Return an Interation if it exists."""
        return cls.query.filter(
            cls.idempotency_key == idempotency_key,
            or_(cls.registration_id == registration_id, cls.application_id == application_id),
        ).one_or_none()

    @classmethod
    def find_by_uuid(
        cls,
        interaction_uuid: str,
    ):
        """Return an Interation if it exists."""
        return cls.query.filter(cls.interaction_uuid == interaction_uuid).one_or_none()

    @classmethod
    def fetch_application_interactions(cls, application_id: int) -> list[CustomerInteraction]:
        """Return interactions for an application sorted by create time."""
        return cls.query.filter(cls.application_id == application_id).order_by(cls.created_at).all()

    @classmethod
    def fetch_registration_interactions(cls, registration_id: int) -> list[CustomerInteraction]:
        """Return interactions for a registration sorted by create time."""
        return cls.query.filter(cls.registration_id == registration_id).order_by(cls.created_at).all()

    @classmethod
    def application_email_failure_exists_expr(cls, application_id_expr):
        """Return a SQLAlchemy EXISTS expression checking if an application has any failed email recipient."""
        return exists(
            select(1)
            .select_from(InteractionRecipient)
            .join(cls, cls.id == InteractionRecipient.interaction_id)
            .where(
                cls.application_id == application_id_expr,
                InteractionRecipient.status.in_(FAILURE_DELIVERY_STATUSES),
            )
        )

    @classmethod
    def registration_email_failure_exists_expr(cls, registration_id_expr, application_model=None):
        """Return a SQLAlchemy EXISTS expression checking if a registration has any failed email recipient."""
        direct_exists = exists(
            select(1)
            .select_from(InteractionRecipient)
            .join(cls, cls.id == InteractionRecipient.interaction_id)
            .where(
                cls.registration_id == registration_id_expr,
                InteractionRecipient.status.in_(FAILURE_DELIVERY_STATUSES),
            )
        )
        if application_model is None:
            return direct_exists

        # Use a separate EXISTS with an INNER JOIN on application_model so Postgres can hash/index-probe
        # each branch independently instead of falling back to an O(N*M) OR nested-loop join filter.
        app_exists = exists(
            select(1)
            .select_from(InteractionRecipient)
            .join(cls, cls.id == InteractionRecipient.interaction_id)
            .join(application_model, application_model.id == cls.application_id)
            .where(
                application_model.registration_id == registration_id_expr,
                InteractionRecipient.status.in_(FAILURE_DELIVERY_STATUSES),
            )
        )
        return or_(direct_exists, app_exists)

    @classmethod
    def has_application_email_delivery_failure(cls, application_id: int) -> bool:
        """Evaluate whether an application has any failed email delivery recipient."""
        if not application_id:
            return False
        return bool(db.session.scalar(select(cls.application_email_failure_exists_expr(application_id))))

    @classmethod
    def has_registration_email_delivery_failure(cls, registration_id: int, application_model=None) -> bool:
        """Evaluate whether a registration (or its linked applications) has any failed email delivery recipient."""
        if not registration_id:
            return False
        return bool(
            db.session.scalar(
                select(cls.registration_email_failure_exists_expr(registration_id, application_model=application_model))
            )
        )

    @classmethod
    def populate_application_email_failure_flags(cls, applications: list, known_filter: bool | None = None) -> None:
        """Batch-populate _has_email_delivery_failure on a list of Application instances to avoid N+1 queries."""
        if not applications:
            return
        if known_filter is not None:
            for app in applications:
                setattr(app, "_has_email_delivery_failure", bool(known_filter))
            return

        unresolved = [
            app
            for app in applications
            if getattr(app, "id", None) is not None and getattr(app, "_has_email_delivery_failure", None) is None
        ]
        if not unresolved:
            return

        try:
            app_ids = [app.id for app in unresolved]
            stmt = (
                select(cls.application_id)
                .select_from(InteractionRecipient)
                .join(cls, cls.id == InteractionRecipient.interaction_id)
                .where(
                    cls.application_id.in_(app_ids),
                    InteractionRecipient.status.in_(FAILURE_DELIVERY_STATUSES),
                )
                .distinct()
            )
            failed_ids = set(db.session.scalars(stmt).all())
            for app in unresolved:
                setattr(app, "_has_email_delivery_failure", app.id in failed_ids)
        except Exception:  # pylint: disable=broad-exception-caught
            pass

    @classmethod
    def populate_registration_email_failure_flags(
        cls, registrations: list, application_model=None, known_filter: bool | None = None
    ) -> None:
        """Batch-populate _has_email_delivery_failure on a list of Registration instances to avoid N+1 queries."""
        if not registrations:
            return
        if known_filter is not None:
            for reg in registrations:
                setattr(reg, "_has_email_delivery_failure", bool(known_filter))
            return

        unresolved = [
            reg
            for reg in registrations
            if getattr(reg, "id", None) is not None and getattr(reg, "_has_email_delivery_failure", None) is None
        ]
        if not unresolved:
            return

        try:
            reg_ids = [reg.id for reg in unresolved]
            direct_stmt = (
                select(cls.registration_id)
                .select_from(InteractionRecipient)
                .join(cls, cls.id == InteractionRecipient.interaction_id)
                .where(
                    cls.registration_id.in_(reg_ids),
                    InteractionRecipient.status.in_(FAILURE_DELIVERY_STATUSES),
                )
                .distinct()
            )
            failed_ids = set(db.session.scalars(direct_stmt).all())

            if application_model is not None:
                linked_app_stmt = (
                    select(application_model.registration_id)
                    .select_from(InteractionRecipient)
                    .join(cls, cls.id == InteractionRecipient.interaction_id)
                    .join(application_model, application_model.id == cls.application_id)
                    .where(
                        application_model.registration_id.in_(reg_ids),
                        InteractionRecipient.status.in_(FAILURE_DELIVERY_STATUSES),
                    )
                    .distinct()
                )
                failed_ids.update(db.session.scalars(linked_app_stmt).all())

            for reg in unresolved:
                setattr(reg, "_has_email_delivery_failure", reg.id in failed_ids)
        except Exception:  # pylint: disable=broad-exception-caught
            pass
