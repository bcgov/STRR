import type { PropertyManagerBusinessAddressI } from '~/interfaces/property-manager-i'

const mockPropertyManagerContact: PropertyManagerContactI = {
  firstName: 'John',
  middleName: 'A.',
  lastName: 'Doe',
  preferredName: 'Johnny',
  phoneNumber: '604-123-4567',
  extension: '101',
  faxNumber: '604-765-4321',
  emailAddress: 'john.doe@bcpropertymanagement.com'
}

const mockBusinessMailingAddress: PropertyManagerBusinessAddressI = {
  address: '1234 Main St',
  addressLineTwo: 'Suite 100',
  city: 'Vancouver',
  postalCode: 'V5K 0A1',
  province: 'BC',
  country: 'CA'
}

export const mockPropertyManager: PropertyManagerI = {
  businessLegalName: 'BC Property Management Inc.',
  businessNumber: '123456789',
  businessMailingAddress: mockBusinessMailingAddress,
  contact: mockPropertyManagerContact
}
