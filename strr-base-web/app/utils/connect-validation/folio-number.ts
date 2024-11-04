/**
 * Validates whether all characters in the given folio number are alphanumeric.
 *
 * @param {string} folioNumber - The folio number to be validated.
 * @returns {boolean} - True if all characters are alphanumeric, false otherwise.
 */
export const validateFolioNumberCharacters = (folioNumber: string): boolean => {
  return /^[a-zA-Z0-9]+$/.test(folioNumber)
}
