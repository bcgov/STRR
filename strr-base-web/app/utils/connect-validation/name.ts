/**
 * Validates the characters of a name string to ensure that the name only consists of Unicode letters and whitespace
 * @param {string} name - string representation of the name input
 */
export const validateNameCharacters = (name: string): boolean => {
  return /^[\p{L}\p{Zs}]+$/u.test(name)
}

/**
 * Validates a preferred name to ensure that it only consists of Unicode letters and whitespace.
 * An empty string is also valid.
 * @param {string} name - string representation of the name input
 */
export const validatePreferredName = (name: string): boolean => {
  return name === '' || validateNameCharacters(name)
}
