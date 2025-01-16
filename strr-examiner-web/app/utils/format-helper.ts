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

  return `
        ${unitNumber} ${streetNumber} ${streetName}, 
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
