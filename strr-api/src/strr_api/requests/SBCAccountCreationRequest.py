# pylint: disable=C0103
# pylint: disable=R0913
"""
SBCAccountCreationRequest request payload objects.
"""


class SBCMailingAddress:
    """SBCMailingAddress payload object."""

    def __init__(self, street, city, region, postalCode, country, streetAdditional=None):
        self.street = street
        self.streetAdditional = streetAdditional
        self.city = city
        self.region = region
        self.postalCode = postalCode
        self.country = country

    def to_dict(self):
        """Convert object to dictionary for json serialization."""
        return {
            key: value
            for key, value in {
                "street": self.street,
                "streetAdditional": self.streetAdditional,
                "city": self.city,
                "region": self.region,
                "postalCode": self.postalCode,
                "country": self.country,
            }.items()
            if value is not None
        }


class SBCAccountCreationRequest:
    """SBCAccountCreationRequest payload object."""

    def __init__(
        self,
        name,
        email,
        phone,
        phoneExtension=None,
        mailingAddress=None,
    ):
        self.name = name
        self.email = email
        self.phone = phone
        self.phoneExtension = phoneExtension
        self.mailingAddress = SBCMailingAddress(**mailingAddress) if mailingAddress else None
