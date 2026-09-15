import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { baseEnI18n } from '../mocks/i18n'

const strrApi = vi.fn()
const openErrorModal = vi.fn()
mockNuxtImport('useNuxtApp', original => () => Object.assign(Object.create(original()), {
  $i18n: baseEnI18n.global,
  $strrApi: strrApi
}))
mockNuxtImport('useStrrModals', () => () => ({ openErrorModal }))

describe('Strata additional document uploads', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('keeps the uploaded document metadata from the updated application response', async () => {
    const store = useDocumentStore()
    const incoming = {
      id: 'incoming',
      file: new File(['test'], 'incoming.pdf', { type: 'application/pdf' }),
      name: 'incoming.pdf',
      type: DocumentUploadType.STRATA_HOTEL_DOCUMENTATION,
      uploadStep: DocumentUploadStep.NOC,
      apiDoc: {},
      loading: false
    } as UiDocument
    const uploadedDocument = { fileKey: 'new-key', fileName: incoming.name, documentType: incoming.type }
    const existingDocument = { ...uploadedDocument, fileKey: 'old-key' }
    store.storedDocuments = [{ id: 'saved', apiDoc: existingDocument } as UiDocument]
    strrApi.mockResolvedValueOnce({
      registration: { documents: [existingDocument, uploadedDocument] }
    })

    await store.addDocumentToApplication(incoming, 'APP123')

    expect(incoming.apiDoc).toEqual(uploadedDocument)
    expect(store.apiDocuments).toEqual([existingDocument, uploadedDocument])
  })

  it('preserves saved documents and rejects the failed upload for retry', async () => {
    const store = useDocumentStore()
    const existing = { id: 'saved', name: 'saved.pdf', apiDoc: { fileKey: 'saved-key' } } as UiDocument
    const incoming: UiDocument = {
      id: 'incoming',
      file: new File(['test'], 'incoming.pdf', { type: 'application/pdf' }),
      name: 'incoming.pdf',
      apiDoc: {} as ApiDocument,
      type: DocumentUploadType.STRATA_HOTEL_DOCUMENTATION,
      loading: false,
      uploadStep: DocumentUploadStep.NOC
    }
    store.storedDocuments = [existing]
    const failure = new Error('Upload failed')
    strrApi.mockRejectedValueOnce(failure)

    const result = await store.addDocumentToApplication(incoming, 'APP123').then(() => undefined, error => error)

    expect(store.storedDocuments).toEqual([existing])
    expect(strrApi).toHaveBeenCalledTimes(1)
    expect(openErrorModal).toHaveBeenCalledTimes(1)
    expect(incoming.loading).toBe(false)
    expect(result).toBe(failure)
  })
})
