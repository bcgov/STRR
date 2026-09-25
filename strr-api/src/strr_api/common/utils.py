"""Common utility functions."""

from typing import Any

from strr_api.models import Address
from strr_api.requests import SBCMailingAddress


def compare_addresses(property_address: Address, sbc_address: SBCMailingAddress):
    """Compare property address with sbc address."""

    result = (
        property_address.street_address.lower() == sbc_address.street.lower()
        and (
            (property_address.street_address_additional.lower() if property_address.street_address_additional else "")
            == (sbc_address.streetAdditional.lower() if sbc_address.streetAdditional else "")
        )
        and property_address.city.lower() == sbc_address.city.lower()
        and property_address.province.lower() == sbc_address.region.lower()
        and property_address.postal_code.lower().replace(" ", "") == sbc_address.postalCode.lower().replace(" ", "")
        and property_address.country.lower() == sbc_address.country.lower()
    )
    return result


def normalize_to_list(value: Any) -> list[str]:
    """Convert a string, list, or scalar to a cleaned list of strings."""
    if value is None or isinstance(value, bool):
        return []
    if isinstance(value, (list, set, tuple)):
        items = value
    elif isinstance(value, (str, int, float)):
        items = str(value).split(",")
    else:
        return []
    return [str(x).strip() for x in items if str(x).strip()]
