/**
 * Formats a contact's name by combining first, middle, and last names.
 * @param {Object} contact contact object containing the names.
 * @returns {string | undefined} formatted name or undefined if all name parts are missing.
 * @example
 * { firstName: 'John', middleName: 'A.', lastName: 'Doe' } -> 'John A. Doe'
 */
export function displayContactFullName (contact: {
  firstName?: string
  middleName?: string
  lastName?: string
} | undefined): string | undefined {
  if (!contact) {
    return undefined
  }

  const { firstName, middleName, lastName } = contact
  if (!firstName && !middleName && !lastName) {
    return undefined
  }
  return [firstName, middleName, lastName].filter(Boolean).join(' ')
}

/**
 * Displays the full address based on the provided address object.
 *
 * @param mailingAddress the mailing address object containing address details.
 * @returns formatted full address as a string, or undefined if all fields are empty.
 *
 * @note
 * Best to use in v-html directive to render HTML as return string has new-line chars.
 *
 */
export function displayFullUnitAddress (mailingAddress?: ApiUnitAddress): string | undefined {
  if (!mailingAddress || Object.values(mailingAddress).every(field => !field)) {
    return undefined // let the caller handle the undefined state
  }

  const { streetName, streetNumber, unitNumber, city, postalCode, province, country } = mailingAddress
  // add comma only if address & addressLineTwo exists
  // const addressPartTwo = address && addressLineTwo ? `, ${addressLineTwo}` : addressLineTwo || ''

  // add dash '-' after unit number, if exists
  const displayUnitNumber = unitNumber ? `${unitNumber}-` : ''

  return `
        ${displayUnitNumber}${streetNumber} ${streetName}, 
        ${city || '-'} ${province} ${postalCode || '-'}, 
        ${country || '-'}
      `
}

export function displayFullAddress (mailingAddress?: ApiAddress): string | undefined {
  if (!mailingAddress || Object.values(mailingAddress).every(field => !field)) {
    return undefined // let the caller handle the undefined state
  }

  const { address, addressLineTwo, city, postalCode, province, country } = mailingAddress
  // add comma only if address & addressLineTwo exists
  const addressPartTwo = address && addressLineTwo ? `, ${addressLineTwo}` : addressLineTwo || ''

  return `
      ${address || '-'}${addressPartTwo}, 
      ${city || '-'} ${province} ${postalCode || '-'}, 
      ${country ?? '-'}
    `
}

/**
 * Formats a phone number for display.
 * @param phoneNumber the phone number to format
 * @returns a formatted phone number
 * @example "5554443322" -> "555-444-3322"
 */
export function displayFormattedPhone (phoneNumber: string): string {
  // Filter only numbers from the input
  const cleaned = phoneNumber.replace(/\D/g, '')

  // Check if the input is of correct length
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)

  // If the match is found, format the phone number
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`
  }

  // Return the original input if the format is invalid
  return phoneNumber
}

/**
 * Formats a phone number with country code and extension.
 * @param phoneNumber the optional phone number to format
 * @param phoneExt he optional phone extension to format and add after phone number
 * @param phoneCountryCode the optional country code
 * @returns - The formatted phone number string or undefined if no phone number is provided
 * @example "5554443322, 1234, +1" -> "+1-555-444-3322, Ext. 1234"
 */
export function displayPhoneAndExt (
  phoneNumber?: string,
  phoneExt?: string,
  phoneCountryCode?: string
): string | undefined {
  if (!phoneNumber) {
    return undefined // let the caller handle the undefined state
  }
  const { t } = useNuxtApp().$i18n
  const countryCode = phoneCountryCode ? `+${phoneCountryCode}-` : ''
  const extension = phoneExt ? `, ${t('label.phoneExt')} ${phoneExt}` : ''
  return countryCode + displayFormattedPhone(phoneNumber) + extension
}
