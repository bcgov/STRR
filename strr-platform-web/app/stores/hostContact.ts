import { z } from 'zod'
import type { HostContactInformation } from '#imports'
import {
  getOptionalSin, getRequiredAddress, getRequiredEmail, getRequiredNonEmptyString,
  getRequiredPhone, getRequiredSin, optionalOrEmptyString
} from '~/utils/connect-validation'

export const useStrrHostContact = defineStore('strr/hostContact', () => {
  const getContactSchema = (primary = true) => {
    return z.object({
      fullName: getRequiredNonEmptyString('Required'),
      preferredName: optionalOrEmptyString,
      socialInsuranceNumber: primary
        ? getRequiredSin('Please enter a valid SIN')
        : getOptionalSin('Please enter a valid SIN'),
      businessNumber: optionalOrEmptyString,
      phone: getRequiredPhone('Required', 'Required'),
      faxNumber: optionalOrEmptyString,
      emailAddress: getRequiredEmail('Required'),
      address: getRequiredAddress('Required', 'Required', 'Required', 'Required', 'Required'),
      dateOfBirth: getRequiredNonEmptyString('Required')
    })
  }

  const getNewContact = (): HostContactInformation => {
    return {
      fullName: '',
      preferredName: '',
      phone: {
        countryCode: '',
        number: '',
        extension: ''
      },
      faxNumber: '',
      emailAddress: '',
      address: {
        street: '',
        streetAdditional: '',
        region: '',
        city: '',
        country: 'CA',
        postalCode: '',
        locationDescription: ''
      },
      dateOfBirth: '',
      socialInsuranceNumber: '',
      businessNumber: ''
    }
  }

  const primaryContact = ref<HostContactInformation>(getNewContact())
  const secondaryContact = ref<HostContactInformation | undefined>(undefined)

  return {
    primaryContact,
    secondaryContact,
    getContactSchema,
    getNewContact
  }
})
