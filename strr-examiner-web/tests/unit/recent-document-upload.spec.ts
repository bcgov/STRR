import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  hasRecentDocumentUpload,
  getDocumentsFromApplication,
  getDocumentsFromRegistration
} from '~/utils/recent-document-upload'

describe('recent-document-upload utils', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-19T18:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('hasRecentDocumentUpload', () => {
    const NOC_SENT_DATE = '2026-03-10T17:00:00.000Z'

    it('returns false when documents missing or empty', () => {
      expect(hasRecentDocumentUpload(undefined, NOC_SENT_DATE)).toBe(false)
      expect(hasRecentDocumentUpload(null, NOC_SENT_DATE)).toBe(false)
      expect(hasRecentDocumentUpload([], NOC_SENT_DATE)).toBe(false)
    })

    it('returns false when nocSentDate is not provided', () => {
      expect(hasRecentDocumentUpload([{ addedOn: '2026-03-15' }], undefined)).toBe(false)
      expect(hasRecentDocumentUpload([{ addedOn: '2026-03-15' }], null)).toBe(false)
    })

    it('returns false when no document has a date', () => {
      expect(hasRecentDocumentUpload([{ fileKey: 'a' } as any], NOC_SENT_DATE)).toBe(false)
    })

    it('returns false for date-only value on the NOC day, without exact upload time', () => {
      expect(hasRecentDocumentUpload([{ addedOn: '2026-03-10' }], NOC_SENT_DATE)).toBe(false)
    })

    it('returns true when doc is after the NOC day', () => {
      expect(hasRecentDocumentUpload([{ addedOn: '2026-03-15' }], NOC_SENT_DATE)).toBe(true)
    })

    it('returns true for full datetime after the NOC sent time on the same day', () => {
      expect(hasRecentDocumentUpload([{ addedOn: '2026-03-10T20:00:00.000Z' }], NOC_SENT_DATE)).toBe(true)
      expect(hasRecentDocumentUpload([{ addedOn: '2026-03-10T17:01:00.000Z' }], NOC_SENT_DATE)).toBe(true)
    })

    it('returns false for full datetime before the NOC sent time on the same day', () => {
      expect(hasRecentDocumentUpload([{ addedOn: '2026-03-10T16:59:00.000Z' }], NOC_SENT_DATE)).toBe(false)
    })

    it('returns false when doc is before the NOC day', () => {
      expect(hasRecentDocumentUpload([{ addedOn: '2026-03-09' }], NOC_SENT_DATE)).toBe(false)
    })

    it('prefers addedOn over uploadDate when both set', () => {
      expect(
        hasRecentDocumentUpload([{ addedOn: '2026-03-05', uploadDate: '2026-03-19' }], NOC_SENT_DATE)
      ).toBe(false)
    })

    it('returns true when at least one doc qualifies among mixed dates', () => {
      expect(
        hasRecentDocumentUpload([{ addedOn: '2026-03-05' }, { addedOn: '2026-03-11' }], NOC_SENT_DATE)
      ).toBe(true)
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
