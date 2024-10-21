import { z } from 'zod'
import { getRequiredNonEmptyString, optionalOrEmptyString } from '.'

export const getRequiredAddress = (
  streetMessage: string,
  cityMessage: string,
  regionMessage: string,
  postalCodeMessage: string,
  countryMessage: string
) => z.object({
  street: getRequiredNonEmptyString(streetMessage),
  streetAdditional: optionalOrEmptyString,
  city: getRequiredNonEmptyString(cityMessage),
  region: getRequiredNonEmptyString(regionMessage),
  postalCode: getRequiredNonEmptyString(postalCodeMessage),
  country: getRequiredNonEmptyString(countryMessage),
  locationDescription: optionalOrEmptyString
})

export const getRequiredBCAddress = (
  streetMessage: string,
  cityMessage: string,
  regionMessage: string,
  postalCodeMessage: string,
  countryMessage: string,
  bcRequiredMessage: string,
  caRequiredMessage: string
) => z.object({
  street: getRequiredNonEmptyString(streetMessage),
  streetAdditional: optionalOrEmptyString,
  city: getRequiredNonEmptyString(cityMessage),
  region: getRequiredNonEmptyString(regionMessage)
    .refine(province => province === 'BC', bcRequiredMessage),
  postalCode: getRequiredNonEmptyString(postalCodeMessage),
  country: getRequiredNonEmptyString(countryMessage)
    .refine(country => country === 'CA', caRequiredMessage),
  locationDescription: optionalOrEmptyString
})
