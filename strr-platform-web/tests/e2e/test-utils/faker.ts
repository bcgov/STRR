import { faker, fakerEN_CA } from '@faker-js/faker'

export function getFakeContactDetails (): StrrContact {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  return {
    position: faker.person.jobTitle(),
    firstName,
    middleName: faker.person.middleName(),
    lastName,
    preferredName: faker.person.firstName(),
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
    city: fakerEN_CA.location.city(),
    region: fakerEN_CA.location.state(),
    postalCode: fakerEN_CA.location.zipCode(),
    country: 'CA',
    locationDescription: faker.lorem.sentence(),
    streetName: faker.location.street(),
    streetNumber: faker.number.int({ min: 100, max: 7000 }).toString(),
    unitNumber: faker.number.int({ min: 1, max: 1000 }).toString()
  }
}

export function getFakeBusinessDetails (): PlatBusiness {
  const businessAddress = getFakeAddress()
  return {
    hasCpbc: true,
    cpbcLicenceNumber: faker.number.int({ min: 10000, max: 100000 }).toString(),
    nonComplianceEmail: faker.internet.email(),
    nonComplianceEmailOptional: faker.internet.email(),
    takeDownEmail: faker.internet.email(),
    takeDownEmailOptional: faker.internet.email(),
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

export function getFakePlatformDetails (): { brands: StrrBrand[], listingSize: string } {
  const brandCount = faker.number.int({ min: 1, max: 3 })
  const brands = Array.from({ length: brandCount }, () => ({
    name: faker.company.name(),
    website: faker.internet.url(),
  }))
  return {
    brands,
    listingSize: faker.helpers.arrayElement(['1000 or more', '250-999', '249 or less'])
  }
}