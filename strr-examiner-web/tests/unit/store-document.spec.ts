import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import { mockHostRegistration, mockDocuments } from '../mocks/mockedData'
import { DocumentUploadType } from '#imports'

const mockStrrApi = vi.fn().mockResolvedValue({})
const mockOpenErrorModal = vi.fn()

mockNuxtImport('useNuxtApp', () => () => ({
  $i18n: { t: (key: string) => key },
  $strrApi: mockStrrApi
}))

mockNuxtImport('useStrrModals', () => () => ({ openErrorModal: mockOpenErrorModal }))

describe('Document Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockStrrApi.mockResolvedValue({})
  })

  it('should have correct state when opening PR upload', () => {
    const store = useExaminerDocumentStore()

    store.openBlUpload() // set BL state first
    store.openPrUpload()

    expect(store.isPrUploadOpen).toBe(true)
    expect(store.isBlUploadOpen).toBe(false)
    expect(store.uploadSectionType).toBe('PR')
    expect(store.selectedDocType).toBeUndefined()
    expect(store.docTypeOptions).toHaveLength(17) // all options returned for PR
  })

  it('should reset all upload state when closing upload section', () => {
    const store = useExaminerDocumentStore()

    store.openPrUpload()
    store.closeUpload()

    expect(store.isPrUploadOpen).toBe(false)
    expect(store.isBlUploadOpen).toBe(false)
    expect(store.uploadSectionType).toBeUndefined()
    expect(store.selectedDocType).toBeUndefined()
  })

  it('should return only Business License for docTypeOptions when upload section is BL', () => {
    const store = useExaminerDocumentStore()

    store.openBlUpload()

    expect(store.docTypeOptions).toHaveLength(1)
    expect(store.docTypeOptions[0]!.value).toBe(DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE)
  })

  it('should show error modal when api fails', async () => {
    const exStore = useExaminerStore()
    exStore.activeRecord = { ...mockHostRegistration, documents: [...mockDocuments] }

    const docStore = useExaminerDocumentStore()
    const apiError = new Error('Upload failed')
    mockStrrApi.mockRejectedValueOnce(apiError)

    const uiDoc = {
      file: new File(['content'], 'utility-bill.pdf', { type: 'application/pdf' }),
      type: DocumentUploadType.UTILITY_BILL,
      loading: false
    } as UiDocument

    await expect(docStore.addDocumentToRegistration(uiDoc, 12345)).rejects.toThrow('Upload failed')

    expect(mockOpenErrorModal).toHaveBeenCalledWith(
      'error.docUpload.generic.title',
      'error.docUpload.generic.description',
      false
    )
    expect(uiDoc.loading).toBe(false)
    expect(exStore.activeReg!.documents).toHaveLength(mockDocuments.length) // no doc appended
  })

  it('should append document to activeReg when adding document to registration', async () => {
    const exStore = useExaminerStore()
    exStore.activeRecord = { ...mockHostRegistration, documents: [...mockDocuments] }

    const docStore = useExaminerDocumentStore()
    const registrationId = 12345

    const apiDocResponse = {
      documentType: DocumentUploadType.UTILITY_BILL,
      fileKey: 'file-key-123',
      fileName: 'utility-bill.pdf',
      fileType: 'application/pdf',
      uploadDate: '2026-03-13',
      addedOn: '2026-03-13'
    }
    mockStrrApi.mockResolvedValueOnce(apiDocResponse)

    const uiDoc = {
      file: new File(['content'], 'utility-bill.pdf', { type: 'application/pdf' }),
      type: DocumentUploadType.UTILITY_BILL,
      loading: false
    } as UiDocument

    await docStore.addDocumentToRegistration(uiDoc, registrationId)

    expect(mockStrrApi).toHaveBeenCalledWith(
      `/registrations/${registrationId}/documents`,
      expect.objectContaining({ method: 'POST' })
    )
    expect(exStore.activeReg!.documents).toHaveLength(mockDocuments.length + 1)
    expect(exStore.activeReg!.documents!.at(-1)).toMatchObject({
      fileKey: 'file-key-123',
      documentType: DocumentUploadType.UTILITY_BILL
    })
  })
})
