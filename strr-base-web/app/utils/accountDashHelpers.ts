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
