import { DateTime } from 'luxon'

/** Format a YYYY-MM-DD calendar date, eg January 15, 2027. It is never converted to another timezone. */
export const formatRenewalWindowDate = (date: string): string => {
  const locale = useNuxtApp().$i18n.locale.value
  return DateTime.fromISO(date, { zone: 'utc' }).setLocale(locale).toFormat('DDD')
}

/** Date from which an early renewal draft can be submitted, or undefined if the renewal window has started. */
export const getEarlyRenewalDate = (startDate?: string, hasStarted?: boolean): string | undefined =>
  startDate && hasStarted === false ? formatRenewalWindowDate(startDate) : undefined
