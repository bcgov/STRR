import { DateTime } from 'luxon'
import { dateStringToDate } from '#imports'

/** Document fields used for the dashboard "New document" indicator. */
type ApiDocLike = { addedOn?: string; uploadDate?: string }

type RegistrationLike = {
  registrationType?: ApplicationType
  documents?: ApiDocLike[]
  platformDetails?: { documents?: ApiDocLike[] }
  strataHotelDetails?: { documents?: ApiDocLike[] }
}

/**
 * Local midnight for the calendar day in dateString (YYYY-MM-DD or datetime string).
 * Returns null if invalid.
 */
function documentLocalDayStart (dateString: string): DateTime | null {
  const trimmed = dateString.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = dateStringToDate(trimmed)
    return date ? DateTime.fromJSDate(date).startOf('day') : null
  }
  const dateTime = DateTime.fromJSDate(new Date(trimmed))
  return dateTime.isValid ? dateTime.startOf('day') : null
}

/**
 * True when at least one document was uploaded on or after the day the NOC was sent.
 * Compares calendar days in local timezone — including same-day uploads.
 * Return false if nocSentDate is not provided (no active NOC or no decision pending).
 */
export function hasRecentDocumentUpload (
  documents: ApiDocLike[] | undefined | null,
  nocSentDate: string | Date | undefined | null
): boolean {
  if (!documents?.length || !nocSentDate) {
    return false
  }
  const nocDay = DateTime.fromISO(String(nocSentDate)).toLocal().startOf('day')
  if (!nocDay.isValid) {
    return false
  }
  return documents.some((doc) => {
    const docDate = doc.addedOn || doc.uploadDate
    if (!docDate) {
      return false
    }
    const docDay = documentLocalDayStart(docDate)
    return docDay !== null && docDay >= nocDay
  })
}

/** Get documents from an application. */
export function getDocumentsFromApplication (app: { registration: RegistrationLike }): ApiDocLike[] {
  const reg = app.registration
  const type = reg.registrationType ?? ''
  switch (type) {
    case ApplicationType.HOST:
      return reg.documents ?? []
    case ApplicationType.PLATFORM:
      return reg.platformDetails?.documents ?? []
    case ApplicationType.STRATA_HOTEL: {
      const nested = reg.strataHotelDetails?.documents ?? []
      const root = reg.documents ?? []
      return nested.length > 0 ? nested : root
    }
    default:
      return []
  }
}

/** Get documents from a registration. */
export function getDocumentsFromRegistration (reg: RegistrationLike): ApiDocLike[] {
  const type = reg.registrationType ?? ''
  switch (type) {
    case ApplicationType.HOST:
      return reg.documents ?? []
    case ApplicationType.PLATFORM:
      return reg.platformDetails?.documents ?? []
    case ApplicationType.STRATA_HOTEL: {
      const nested = reg.strataHotelDetails?.documents ?? []
      const root = reg.documents ?? []
      return nested.length > 0 ? nested : root
    }
    default:
      return []
  }
}
