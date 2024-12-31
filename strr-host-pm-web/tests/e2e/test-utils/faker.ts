import { faker, fakerEN_CA as fakerCa } from '@faker-js/faker'

export function getFakeContactDetails (): StrrContact {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  return {
    position: faker.person.jobTitle(),
    firstName,
    middleName: faker.person.middleName(),
    lastName,
    preferredName: `${firstName} ${lastName}`,
    phone: {
      countryIso2: 'CA',
      countryCode: '1',
      number: faker.phone.number({ style: 'national' }),
      extension: faker.number.int({ min: 1, max: 1000 }).toString()
    },
    faxNumber: faker.phone.number({ style: 'national' }),
    emailAddress: faker.internet.email({ firstName, lastName })
  }
}

function getFakeAddress () {
  return {
    street: faker.location.streetAddress(),
    streetAdditional: '',
    city: fakerCa.location.city(),
    region: fakerCa.location.state(),
    postalCode: fakerCa.location.zipCode(),
    country: 'CA',
    locationDescription: faker.lorem.sentence(),
    streetName: faker.location.street(),
    streetNumber: faker.number.int({ min: 100, max: 7000 }).toString(),
    unitNumber: faker.number.int({ min: 1, max: 1000 }).toString()
  }
}

export function getFakePropertyNickname () {
  return faker.lorem.words(2)
}

export function getFakeBusinessDetails (): StrrBusiness {
  const businessAddress = getFakeAddress()
  return {
    legalName: faker.company.name(),
    homeJurisdiction: businessAddress.region,
    businessNumber: faker.helpers.fromRegExp(/[0-9]{9}BC[0-9]{4}/),
    mailingAddress: businessAddress,
    hasRegOffAtt: true,
    regOfficeOrAtt: {
      attorneyName: faker.person.fullName(),
      sameAsMailAddress: false,
      mailingAddress: getFakeAddress()
    }
  }
}

export function getFakePid (): string {
  const pid = faker.number.int({ min: 100000000, max: 999999999 }).toString()
  return `${pid.slice(0, 3)}-${pid.slice(3, 6)}-${pid.slice(6)}`
}

export function getFakeOwner (ownerType: OwnerType, role: OwnerRole, isCompParty: boolean): HostOwner {
  return {
    ...getFakeContactDetails(),
    ownerType,
    dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }).toISOString().split('T')[0]!,
    businessLegalName: faker.company.name(),
    businessNumber: faker.helpers.fromRegExp(/[0-9]{9}BC[0-9]{4}/),
    mailingAddress: getFakeAddress(),
    role,
    isCompParty,
    taxNumber: '046 454 286'
  }
}

function getFakeExpiryDate() {
  const now = new Date()
  // add 10 months
  now.setMonth(now.getMonth() + 10)
  // set to first of the month
  now.setDate(1)
  // return formatted yyyy-mm-dd
  return now.toISOString().split('T')[0]!
}

export function getFakeBlInfo(): UiBlInfo {
  return {
    businessLicense: 'BC' + faker.number.int({ min: 10000, max: 99999 }).toString(),
    businessLicenseExpiryDate: getFakeExpiryDate()
  }
}
