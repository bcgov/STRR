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
