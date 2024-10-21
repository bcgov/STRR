import { z } from 'zod'
import {
  httpRegex, optionalOrEmptyString, getOptionalPID, getRequiredBCAddress, getRequiredNonEmptyString
} from '~/utils/connect-validation'

export const useStrrProperty = defineStore('strr/property', () => {
  const { t } = useI18n()
  const listingDetailsSchema = z.array(
    z.object({
      url: z
        .string()
        .refine(value => httpRegex.test(value ?? ''), 'Invalid URL format')
        .or(z.string().refine(value => value === ''))
    })
  )
  const propertyDetailsSchema = z.object({
    address: getRequiredBCAddress(
      t('validation.address.street'),
      t('validation.address.city'),
      t('validation.address.region'),
      t('validation.address.postalCode'),
      t('validation.address.country'),
      t('validation.address.requiredBC.region'),
      t('validation.address.requiredBC.country')
    ),
    businessLicense: optionalOrEmptyString,
    whichPlatform: z.string().refine(
      value => httpRegex.test(value ?? ''), 'Please enter a valid URL (i.e. https://www.xxx.com)'),
    listingDetails: listingDetailsSchema,
    nickname: optionalOrEmptyString,
    ownershipType: getRequiredNonEmptyString(t('validation.ownershipType')),
    parcelIdentifier: getOptionalPID(t('validation.pid')),
    propertyType: getRequiredNonEmptyString(t('validation.propertyType'))
  })

  const property = ref({
    address: {
      street: '',
      streetAdditional: '',
      region: 'BC',
      city: '',
      country: 'CA',
      postalCode: '',
      locationDescription: ''
    },
    parcelIdentifier: undefined,
    businessLicense: undefined,
    propertyType: undefined,
    ownershipType: undefined,
    primaryResidence: undefined,
    whichPlatform: undefined,
    nickname: '',
    listingDetails: [{ url: '' }]
  })

  return {
    propertyDetailsSchema,
    property
  }
})
