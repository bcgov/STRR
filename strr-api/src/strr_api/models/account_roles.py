"""
Account Roles Model.
"""
from __future__ import annotations

from typing import List

from strr_api.models.base_model import BaseModel

from .db import db


class AccountRoles(BaseModel):
    """Account Roles Model."""

    __tablename__ = "account_roles"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    account_id = db.Column(db.Integer, nullable=False)
    role = db.Column(db.String(25), nullable=False)

    @classmethod
    def get_account_roles(cls, account_id: int) -> List[str]:
        """Get roles for a given account id."""
        account_roles = []
        account_roles_rs = cls.query.filter_by(account_id=account_id).all()
        for rs in account_roles_rs:
            account_roles.append(rs.role)
        return account_roles
