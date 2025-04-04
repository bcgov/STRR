// format tokens
// https://moment.github.io/luxon/#/formatting?id=table-of-tokens
import { DateTime } from 'luxon'

/** Return the date string as a date
 * @param dateString expected dateString format: YYYY-MM-DD
*/
export function dateStringToDate (dateString: string): Date | null {
  const date = DateTime.fromISO(dateString, { zone: 'local' })

  // return null if date is invalid
  if (!date.isValid) {
    return null
  }

  return date.toJSDate()
}

/** Return the date as a string in the desired format
 * @param date - js Date or ISO datestring
 * @param format default: YYYY-MM-DD, see format options:
 * https://moment.github.io/luxon/#/formatting?id=table-of-tokens
 * @param toPacific - convert to pacific timezone
*/
export function dateToString (date: Date | string, format = 'y-MM-dd', toPacific = false) {
  const luxonFormat = format.replace('a', 't')
  const jsDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? DateTime.fromISO(date, { zone: 'America/Vancouver' }).plus({ minutes: 1 })
    : DateTime.fromJSDate(new Date(date))
  let formattedDate
  if (toPacific) {
    formattedDate = jsDate.setZone('America/Vancouver').toFormat(luxonFormat)
  } else {
    formattedDate = jsDate.toFormat(luxonFormat)
  }
  if (format.includes('t') || format.includes('a')) {
    formattedDate = formattedDate.replace(/(\d{1,4}[-/]\d{1,2}[-/]\d{1,2})\s/g, '$1, ')
  }

  if (format.includes('a')) {
    return formattedDate.replace(/AM|PM/g, match => match.toLowerCase())
  }
  return formattedDate
}

/** Convert the date to pacific time and return as a string in the desired format
 * @param {Date | string} date - js Date or ISO datestring
 * @param format default: YYYY-MM-DD, see format options here
 * https://moment.github.io/luxon/#/formatting?id=table-of-tokens
 */
export function dateToStringPacific (date: Date | string, format = 'y-MM-dd') {
  const locale = useNuxtApp().$i18n.locale.value
  const jsDate = DateTime.fromJSDate(new Date(date), { zone: 'UTC' }) // convert to jsdate, assume UTC timezone
  return jsDate
    .setZone('America/Vancouver') // convert to pacific
    .setLocale(locale)
    .toFormat(format)
}

/** Return the date string in date format from datetime string format
 * @param datetimeString expected format: YYYY-MM-DDT:HH:mm:ss+-HH:mm
*/
// export function datetimeStringToDateString (datetimeString: string) {
//   const date = new Date(datetimeString)
//   // convert to date and back so that it returns correctly for the timezone
//   return (date) ? moment(date).local().format('YYYY-MM-DD') : ''
// }

// export function addOneYear (dateString: string) {
//   const date = dateStringToDate(dateString)
//   return moment(date).add(1, 'year').format('YYYY-MM-DD')
// }

/**
 * Calculates the number of full days remaining until a given end date.
 * If isElapsed is true, it calculates the number of full days since the end date.
 *
 * @param end - The ISO datestring for the end value.
 * @returns The number of full days remaining until the end date.
 */
export function dayCountdown (end: string, isElapsed: boolean = false): number {
  const startDate = DateTime.utc() // get current utc date
  const endDate = DateTime.fromISO(end, { setZone: true }).toUTC() // get given end date and convert to utc

  // get difference in days https://moment.github.io/luxon/#/math?id=diffs
  const diff = isElapsed
    ? startDate.diff(endDate, 'days').toObject().days ?? 0
    : endDate.diff(startDate, 'days').toObject().days

  // round difference down
  return Math.floor(diff)
}
