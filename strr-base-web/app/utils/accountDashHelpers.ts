// dashboard list table column formatters
export function getLastStatusChangeColumn (heading: ApplicationHeader) {
  if (heading.registrationStatus !== undefined) {
    return heading.registrationStartDate
  } else if (heading.decisionDate !== null) {
    return heading.decisionDate
  } else {
    return heading.applicationDateTime
  }
}

// value used to apply styling in table cell
export function getDaysToExpiryColumn (heading: ApplicationHeader): { label: string, value: number } {
  const t = useNuxtApp().$i18n.t
  const endDate = heading?.registrationEndDate

  // return '-' if no reg end date
  if (!endDate) {
    return { label: '-', value: NaN }
  }

  // @ts-expect-error - endDate is an iso string
  const daysTillExpiry = dayCountdown(endDate) // get days till expiry

  if (daysTillExpiry < 0) {
    return { label: t('label.expired'), value: -1 }
  }

  if (daysTillExpiry === 0) {
    return { label: t('label.expiresToday'), value: daysTillExpiry }
  }

  return { label: t('label.dayCount', daysTillExpiry), value: daysTillExpiry }
}

/**
 * Returns the countdown for an expiry date: label (e.g. "n days left") and numeric value for styling/sorting.
 * When no endDate: { label: '', value: NaN }. Value is days until expiry (negative when expired).
 */
export function getExpiryCountdown (endDate: string | undefined): { label: string, value: number } {
  if (!endDate) {
    return { label: '', value: Number.NaN }
  }
  const { t } = useNuxtApp().$i18n
  const days = dayCountdown(endDate, false)
  if (days > 0) {
    return { label: t('label.expiryDaysLeft', { count: days }), value: days }
  }
  if (days === 0) {
    return { label: t('label.expiryToday'), value: days }
  }
  return { label: t('label.expiryDaysAgo', { count: Math.abs(days) }), value: days }
}

// return the application status based on the header
export function getApplicationStatus (header: ApplicationHeader): string {
  // for Provisional Pending NOC we should display application host status instead of registration
  if (header.status === ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING) {
    return header.hostStatus
  }
  return header.registrationStatus || header.hostStatus
}
