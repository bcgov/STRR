import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('recent-document-upload utils', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-19T18:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('hasRecentDocumentUpload', () => {
    it('returns false when documents missing or empty', () => {
      expect(hasRecentDocumentUpload(undefined)).toBe(false)
      expect(hasRecentDocumentUpload(null)).toBe(false)
      expect(hasRecentDocumentUpload([])).toBe(false)
    })

    it('returns false when no document has a date', () => {
      expect(hasRecentDocumentUpload([{ fileKey: 'a' } as any])).toBe(false)
    })

    it('returns true for addedOn on first day of 14-day window', () => {
      expect(hasRecentDocumentUpload([{ addedOn: '2026-03-06' }])).toBe(true)
    })

    it('returns true for uploadDate on today', () => {
      expect(hasRecentDocumentUpload([{ uploadDate: '2026-03-19' }])).toBe(true)
    })

    it('returns false when newest date is before the window', () => {
      expect(hasRecentDocumentUpload([{ addedOn: '2026-03-05' }])).toBe(false)
    })

    it('prefers addedOn over uploadDate when both set', () => {
      expect(
        hasRecentDocumentUpload([{ addedOn: '2026-03-05', uploadDate: '2026-03-19' }])
      ).toBe(false)
    })
  })

  describe('getDocumentsFromApplication', () => {
    it('collects host registration.documents', () => {
      const docs = [{ addedOn: '2026-03-10' }]
      const app = {
        registration: {
          registrationType: ApplicationType.HOST,
          documents: docs
        }
      }
      expect(getDocumentsFromApplication(app as any)).toBe(docs)
    })

    it('collects platform platformDetails.documents', () => {
      const docs = [{ addedOn: '2026-03-10' }]
      const app = {
        registration: {
          registrationType: ApplicationType.PLATFORM,
          platformDetails: { documents: docs }
        }
      }
      expect(getDocumentsFromApplication(app as any)).toBe(docs)
    })

    it('uses strataHotelDetails documents when non-empty, else registration.documents', () => {
      const nested = [{ addedOn: '2026-03-10' }]
      const root = [{ addedOn: '2026-03-11' }]
      const appNested = {
        registration: {
          registrationType: ApplicationType.STRATA_HOTEL,
          strataHotelDetails: { documents: nested },
          documents: root
        }
      }
      expect(getDocumentsFromApplication(appNested as any)).toBe(nested)

      const appRootOnly = {
        registration: {
          registrationType: ApplicationType.STRATA_HOTEL,
          strataHotelDetails: { documents: [] },
          documents: root
        }
      }
      expect(getDocumentsFromApplication(appRootOnly as any)).toBe(root)
    })
  })

  describe('getDocumentsFromRegistration', () => {
    it('collects host documents', () => {
      const docs = [{ addedOn: '2026-03-10' }]
      expect(getDocumentsFromRegistration({ registrationType: ApplicationType.HOST, documents: docs })).toBe(docs)
    })
  })
})
