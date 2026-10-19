import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'

const mock$strrApi = vi.fn()
const mockOpenErrorModal = vi.fn()
const mockLogFetchError = vi.fn()
const mockOpen = vi.fn()
const mockCreateObjectURL = vi.fn().mockReturnValue('blob:http://localhost/test-blob')
const mockRevokeObjectURL = vi.fn()

vi.stubGlobal('ref', ref)
vi.stubGlobal('computed', computed)
vi.stubGlobal('useNuxtApp', () => ({
  $strrApi: mock$strrApi,
  $i18n: {
    t: (key: string) => key
  }
}))
vi.stubGlobal('useStrrModals', () => ({
  openErrorModal: mockOpenErrorModal
}))
vi.stubGlobal('logFetchError', mockLogFetchError)
vi.stubGlobal('open', mockOpen)
vi.stubGlobal('URL', class MockURL extends URL {
  static createObjectURL = mockCreateObjectURL
  static revokeObjectURL = mockRevokeObjectURL
})
vi.stubGlobal('window', {
  open: mockOpen,
  URL: class MockURL extends URL {
    static createObjectURL = mockCreateObjectURL
    static revokeObjectURL = mockRevokeObjectURL
  }
})

const { useStrrApi } = await import('../../app/composables/useStrrApi')
vi.stubGlobal('useStrrApi', useStrrApi)
const { useStrrBasePermit } = await import('../../app/composables/useStrrBasePermit')

describe('useStrrBasePermit document viewing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getDocument calls $strrApi with correct endpoint and responseType blob', async () => {
    const api = useStrrApi()
    const mockBlob = new Blob(['sample-data'], { type: 'application/pdf' })
    mock$strrApi.mockResolvedValueOnce(mockBlob)

    const result = await api.getDocument('123', 'file-key-abc', 'registrations')
    expect(mock$strrApi).toHaveBeenCalledWith('/registrations/123/documents/file-key-abc', {
      method: 'GET',
      responseType: 'blob'
    })
    expect(result).toBe(mockBlob)
  })

  it('openDocInNewTab opens registration document in a new browser tab (AC2, AC3, AC5)', async () => {
    const permit = useStrrBasePermit<any, any, any>()
    permit.registration.value = {
      id: 999,
      registrationNumber: 'H123456',
      documents: []
    }

    const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' })
    mock$strrApi.mockResolvedValueOnce(mockBlob)

    const doc = {
      name: 'rental_agreement.pdf',
      loading: false,
      apiDoc: {
        fileKey: 'key-rental-123',
        fileName: 'rental_agreement.pdf',
        fileType: 'application/pdf',
        documentType: 'RENTAL_AGREEMENT' as any
      }
    } as any

    await permit.openDocInNewTab(doc)

    expect(mock$strrApi).toHaveBeenCalledWith('/registrations/999/documents/key-rental-123', {
      method: 'GET',
      responseType: 'blob'
    })
    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockOpen).toHaveBeenCalledWith('blob:http://localhost/test-blob', '_blank')
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-blob')
    expect(doc.loading).toBe(false)
  })

  it('openDocInNewTab opens application document in a new browser tab when registration is not set', async () => {
    const permit = useStrrBasePermit<any, any, any>()
    permit.application.value = {
      header: { applicationNumber: 'APP-777' },
      registration: { documents: [] }
    }

    const mockBlob = new Blob(['image-content'], { type: 'image/jpeg' })
    mock$strrApi.mockResolvedValueOnce(mockBlob)

    const doc = {
      name: 'property_tax.jpg',
      loading: false,
      apiDoc: {
        fileKey: 'key-tax-456',
        fileName: 'property_tax.jpg',
        fileType: 'image/jpeg',
        documentType: 'PROPERTY_TAX_NOTICE' as any
      }
    } as any

    await permit.openDocInNewTab(doc)

    expect(mock$strrApi).toHaveBeenCalledWith('/applications/APP-777/documents/key-tax-456', {
      method: 'GET',
      responseType: 'blob'
    })
    expect(mockOpen).toHaveBeenCalledWith('blob:http://localhost/test-blob', '_blank')
  })

  it('openDocInNewTab previews local File without API call if file object is present', async () => {
    const permit = useStrrBasePermit<any, any, any>()
    const localFile = new File(['local-content'], 'local_doc.pdf', { type: 'application/pdf' })

    const doc = {
      file: localFile,
      name: 'local_doc.pdf',
      loading: false,
      apiDoc: { fileKey: 'temp-key' }
    } as any

    await permit.openDocInNewTab(doc)

    expect(mock$strrApi).not.toHaveBeenCalled()
    expect(mockCreateObjectURL).toHaveBeenCalledWith(localFile)
    expect(mockOpen).toHaveBeenCalledWith('blob:http://localhost/test-blob', '_blank')
  })

  it('openDocInNewTab falls back to application documents if registration endpoint 404s', async () => {
    const permit = useStrrBasePermit<any, any, any>()
    permit.registration.value = { id: 999, registrationNumber: 'H123456' }
    permit.application.value = { header: { applicationNumber: 'APP-777' } }

    const mockBlob = new Blob(['fallback-content'], { type: 'application/pdf' })
    mock$strrApi.mockRejectedValueOnce(new Error('404 Not Found'))
    mock$strrApi.mockResolvedValueOnce(mockBlob)

    const doc = {
      name: 'doc.pdf',
      apiDoc: { fileKey: 'key-123', fileType: 'application/pdf' }
    } as any

    await permit.openDocInNewTab(doc)

    expect(mock$strrApi).toHaveBeenCalledTimes(2)
    expect(mock$strrApi).toHaveBeenNthCalledWith(1, '/registrations/999/documents/key-123', expect.anything())
    expect(mock$strrApi).toHaveBeenNthCalledWith(2, '/applications/APP-777/documents/key-123', expect.anything())
    expect(mockOpen).toHaveBeenCalledWith('blob:http://localhost/test-blob', '_blank')
  })

  it('openDocInNewTab opens error modal when document is unavailable or corrupt (AC8)', async () => {
    const permit = useStrrBasePermit<any, any, any>()
    permit.registration.value = { id: 999, registrationNumber: 'H123456' }

    mock$strrApi.mockRejectedValueOnce(new Error('500 Server Error'))

    const doc = {
      name: 'corrupt.pdf',
      loading: false,
      apiDoc: { fileKey: 'corrupt-key', fileType: 'application/pdf' }
    } as any

    await permit.openDocInNewTab(doc)

    expect(mockOpenErrorModal).toHaveBeenCalledWith(
      'error.openDocument.title',
      'error.openDocument.description',
      false
    )
    expect(mockOpen).not.toHaveBeenCalled()
    expect(doc.loading).toBe(false)
  })

  it('openDocInNewTab opens error modal if fileKey or identifier is missing', async () => {
    const permit = useStrrBasePermit<any, any, any>()
    // No registration or application set
    const doc = {
      name: 'missing.pdf',
      apiDoc: { fileKey: 'key' }
    } as any

    await permit.openDocInNewTab(doc)

    expect(mockOpenErrorModal).toHaveBeenCalled()
    expect(mock$strrApi).not.toHaveBeenCalled()
  })
})
