/**
 * Formats a Date object into a long date string.
 * @param {Date} date - The date to format.
 * @returns {string} The formatted date string in 'Month Day, Year' format.
 */
export function formatLongDate (date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

/**
 * Formats a Date object into a time string.
 * @param {Date} date - The date to format.
 * @returns {string} The formatted time string in 'HH:MM AM/PM' format.
 */
export function formatTimeString (date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Converts a date string in 'YYYY-MM-DD' format to a long date format, ignoring the timezone.
 *
 * @example "2024-05-20" -> "May 20, 2024"
 * @param dateString - A string representing a date in 'YYYY-MM-DD' format.
 * @returns A string representing the date in long format.
 */
export function convertDateToLongFormat (dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * Formats a phone number for display.
 * @param phoneNumber the phone number to format
 * @returns a formatted phone number
 * @example "5554443322" -> "555-444-3322"
 */
function displayFormattedPhone (phoneNumber: string): string {
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
 * Formats a phone number and its extension for display.
 * @param phoneNumber the optional phone number to format
 * @param phoneExt the optional phone extension to format and add after phone number
 * @returns The formatted phone number with extension, or undefined if no phone number is provided
 * @example "5554443322, 1234" -> "555-444-3322, Ext. 1234"
 */
export function displayPhoneAndExt (phoneNumber?: string, phoneExt?: string): string | undefined {
  if (!phoneNumber) {
    return undefined // let the caller handle the undefined state
  }
  const { t } = useTranslation()
  const extension = phoneExt ? `, ${t('common.phoneExt')} ${phoneExt}` : ''
  return displayFormattedPhone(phoneNumber) + extension
}

const regionNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'region' })

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
export function displayFullAddress (mailingAddress?: MailingAddressAPII): string | undefined {
  if (!mailingAddress || Object.values(mailingAddress).every(field => !field)) {
    return undefined // let the caller handle the undefined state
  }

  const { address, addressLineTwo, city, postalCode, province, country } = mailingAddress
  // add comma only if address & addressLineTwo exists
  const addressPartTwo = address && addressLineTwo ? `, ${addressLineTwo}` : addressLineTwo || ''

  return `
      ${address || '-'}${addressPartTwo}<br>
      ${city || '-'} ${province} ${postalCode || '-'}<br>
      ${country ? regionNamesInEnglish.of(country) : '-'}
    `
}

/**
 * Displays the full unit address based on the provided address object.
 *
 * @param unitAddress the unit address object containing address details.
 * @returns formatted full address as a string, or undefined if all fields are empty.
 */
export function displayFullAddressWithStreetAttributes (unitAddress?: UnitAddressI): string | undefined {
  if (!unitAddress || Object.values(unitAddress).every(field => !field)) {
    return undefined // let the caller handle the undefined state
  }
  const { streetName, streetNumber, unitNumber, addressLineTwo, city, postalCode, province, country } = unitAddress
  // add comma only if address & addressLineTwo exists
  const addressPartTwo = streetNumber && streetName && addressLineTwo ? `, ${addressLineTwo}` : addressLineTwo || ''

  return `
      ${streetNumber || '-'} ${streetName || '-'} ${unitNumber || ''}${addressPartTwo}<br>
      ${city || '-'} ${province} ${postalCode || '-'}<br>
      ${country ? regionNamesInEnglish.of(country) : '-'}
    `
}
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
}): string | undefined {
  const { firstName, middleName, lastName } = contact
  if (!firstName && !middleName && !lastName) {
    return undefined
  }
  return [firstName, middleName, lastName].filter(Boolean).join(' ')
}
