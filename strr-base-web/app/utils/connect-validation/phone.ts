import { z } from 'zod'
import { getRequiredNonEmptyString, optionalOrEmptyString } from '.'

export const getRequiredPhone = (countryCodeMessage: string, numberMessage: string) => z.object({
  countryIso2: optionalOrEmptyString,
  countryCode: getRequiredNonEmptyString(countryCodeMessage),
  number: getRequiredNonEmptyString(numberMessage),
  extension: optionalOrEmptyString
})
