import { DateTime } from 'luxon'

/** Document fields used for the dashboard "New document" indicator. */
type ApiDocLike = { addedOn?: string; uploadDate?: string }

type RegistrationLike = {
  registrationType?: ApplicationType
  documents?: ApiDocLike[]
  platformDetails?: { documents?: ApiDocLike[] }
  strataHotelDetails?: { documents?: ApiDocLike[] }
}

/**
 * True when at least one document was uploaded after the NOC was sent.
 * Return false if nocSentDate is not provided (no active NOC or no decision pending).
 */
export function hasRecentDocumentUpload (
  documents: ApiDocLike[] | undefined | null,
  nocSentDate: string | Date | undefined | null
): boolean {
  if (!documents?.length || !nocSentDate) {
    return false
  }

  const nocSent = nocSentDate instanceof Date
    ? DateTime.fromJSDate(nocSentDate)
    : DateTime.fromISO(nocSentDate)
  if (!nocSent.isValid) {
    return false
  }
  return documents.some((doc) => {
    const uploaded = DateTime.fromISO(doc.addedOn || doc.uploadDate || '')
    return uploaded.isValid && uploaded > nocSent
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
