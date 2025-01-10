export function formatPhoneNumber (party: Contact): ApiPhone {
  return {
    phoneNumber: party.phone.number || '',
    phoneCountryCode: party.phone.countryCode || '',
    extension: party.phone.extension || ''
  }
}

export function formatPhoneNumberUI <T extends ApiPhone> (phone: T): ConnectPhone {
  return {
    countryCode: phone.phoneCountryCode,
    number: phone.phoneNumber,
    extension: phone.extension ?? ''
  }
}

export function formatAddress <T extends ApiBaseAddress> (add: ConnectAddress) {
  return <T>{
    country: add.country,
    address: add.street,
    addressLineTwo: add.streetAdditional,
    city: add.city,
    province: add.region,
    postalCode: add.postalCode,
    locationDescription: add.locationDescription
  }
}

export function formatAddressUI <T extends ApiBaseAddress> (add: T): ConnectAddress {
  return {
    country: add.country,
    city: add.city,
    postalCode: add.postalCode,
    street: add.address || '',
    streetAdditional: add.addressLineTwo,
    region: add.province,
    locationDescription: add.locationDescription
  }
}

export function formatParty <T extends Contact> (party: T): ApiParty {
  return {
    lastName: party.lastName,
    emailAddress: party.emailAddress,
    ...formatPhoneNumber(party),
    ...(party.firstName ? { firstName: party.firstName } : {}),
    ...(party.middleName ? { middleName: party.middleName } : {}),
    ...(party.preferredName ? { preferredName: party.preferredName } : {}),
    ...(party.faxNumber ? { faxNumber: party.faxNumber } : {})
  }
}

export function formatPartyUI <T extends ApiParty> (party: T): Contact {
  return {
    firstName: party.firstName || '',
    lastName: party.lastName || '',
    middleName: party.middleName || '',
    emailAddress: party.emailAddress,
    phone: formatPhoneNumberUI(party),
    ...(party.preferredName ? { preferredName: party.preferredName } : {}),
    ...(party.faxNumber ? { faxNumber: party.faxNumber } : {})
  }
}

export function formatRepresentative (rep: StrrContact): ApiRep {
  return {
    ...formatParty(rep),
    jobTitle: rep.position
  }
}

export function formatRepresentativeUI (rep: ApiRep): StrrContact {
  return {
    ...formatPartyUI(rep),
    position: rep.jobTitle
  }
}

export function isSameAddress (addr1: object, addr2: object) {
  return Object.values(addr1).toString() === Object.values(addr2).toString()
}
