"""
ORM Mapping for Event Records
"""

from __future__ import annotations

from geoalchemy2 import Geometry
from sqlalchemy import TIMESTAMP, UUID, BigInteger, Boolean, Column, String, text

from .db import db


class DSSOrganization(db.Model):
    """ORM model for the dss_organization table."""

    __tablename__ = "dss_organization"

    organization_id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_type = Column(String(25), nullable=False)
    organization_cd = Column(String(25), nullable=False)
    organization_nm = Column(String(250), nullable=False)
    is_lg_participating = Column(Boolean)
    is_principal_residence_required = Column(Boolean)
    is_business_licence_required = Column(Boolean)
    area_geometry = Column(Geometry("GEOMETRY"))
    managing_organization_id = Column(BigInteger)
    upd_dtm = Column(TIMESTAMP(timezone=True), nullable=False)
    upd_user_guid = Column(UUID)

    @classmethod
    def lookup_by_geocode(cls, longitude: str, latitude: str):
        """Return the details for a geocode if it is within a known geometry."""
        search_point = f"SRID=4326;POINT ({longitude} {latitude})"
        sql_query = text("""
            SELECT do1.organization_nm, do1.is_principal_residence_required, do1.is_business_licence_required
            FROM dss_organization do1
            WHERE do1.organization_id = dss_containing_organization_id(:search_point)
        """)
        result = db.session.execute(sql_query, {"search_point": search_point}).fetchone()
        if result:
            return {
                "organization_nm": result[0],
                "is_principal_residence_required": result[1],
                "is_business_licence_required": result[2],
            }
        return None
