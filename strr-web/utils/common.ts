import { HostResidenceE } from '~/enums/host-residence-e'
import { RentalUnitSpaceTypeE } from '~/enums/rental-unit-space-type-e'

export const getOwnershipTypeDisplay = (ownershipType: string | undefined, t: (key: string) => string) => {
  switch (ownershipType) {
    case 'CO_OWN':
      return t('coOwner')
    case 'OWN':
      return t('owner')
    case 'RENT':
      return t('rent')
    default:
      return ownershipType ?? '-'
  }
}

export const getRentalUnitSpaceTypeDisplay = (
  rentalUnitSpaceType: RentalUnitSpaceTypeE | undefined,
  t: (key: string) => string
) => {
  switch (rentalUnitSpaceType) {
    case RentalUnitSpaceTypeE.ENTIRE_HOME:
      return t('entireHome')
    case RentalUnitSpaceTypeE.SHARED_ACCOMMODATION:
      return t('sharedAccommodation')
    default:
      return '-' // Fallback for undefined values
  }
}

export const getPrincipalResidenceDisplay = (
  principalResidence: boolean | undefined,
  t: (key: string) => string
) => {
  switch (principalResidence) {
    case true:
      return t('yes')
    case false:
      return t('no')
    default:
      return '-' // Fallback for undefined values
  }
}

export const getHostResidenceDisplay = (
  hostResidenceType: HostResidenceE | undefined,
  t: (key: string) => string
) => {
  switch (hostResidenceType) {
    case HostResidenceE.SAME_UNIT:
      return t('sameUnit')
    case HostResidenceE.ANOTHER_UNIT:
      return t('anotherUnit')
    default:
      return '-' // Fallback for undefined values
  }
}
