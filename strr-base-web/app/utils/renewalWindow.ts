import { DateTime } from 'luxon'

/** Format a YYYY-MM-DD calendar date, eg January 15, 2027. It is never converted to another timezone. */
export const formatRenewalWindowDate = (date: string): string => {
  const locale = useNuxtApp().$i18n.locale.value
  return DateTime.fromISO(date, { zone: 'utc' }).setLocale(locale).toFormat('DDD')
}

/** Date from which an early renewal draft can be submitted, or undefined if the renewal window has started. */
export const getEarlyRenewalDate = (startDate?: string, hasStarted?: boolean): string | undefined =>
  startDate && hasStarted === false ? formatRenewalWindowDate(startDate) : undefined

type DraftHeader = Pick<ApplicationHeader, 'applicationNumber' | 'renewalWindowStartDate' | 'hasRenewalWindowStarted'>

/**
 * Early renewal date for the draft open in the application wizard.
 * A header for another application, eg one left in the store by an earlier draft, is ignored.
 */
export const getDraftEarlyRenewalDate = (
  header: DraftHeader | undefined,
  applicationNumber: string | undefined
): string | undefined =>
  header && header.applicationNumber === applicationNumber
    ? getEarlyRenewalDate(header.renewalWindowStartDate, header.hasRenewalWindowStarted)
    : undefined

/** Subtitle for the renewal draft todo, saying when an early draft can be submitted. */
export const getRenewalDraftSubtitle = (
  t: (key: string, named?: Record<string, unknown>) => string,
  earlyRenewalDate: string | undefined
): string =>
  earlyRenewalDate
    ? t('todos.renewalDraft.earlySubtitle', { date: earlyRenewalDate })
    : t('todos.renewalDraft.subtitle')
