import { describe, beforeEach, it, expect, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { mockStoredDocument } from '../mocks/mockedData'

const mockStrrApi = vi.fn().mockResolvedValue(undefined)
const mockOpenErrorModal = vi.fn()

mockNuxtImport('useNuxtApp', original => () => Object.assign(Object.create(original()), {
  $strrApi: mockStrrApi,
  $i18n: { t: (key: string) => key }
}))

mockNuxtImport('useStrrModals', () => () => ({ openErrorModal: mockOpenErrorModal }))

describe('Document Store', () => {
  beforeEach(() => {
    useDocumentStore().$reset()
    mockStrrApi.mockReset()
    mockStrrApi.mockResolvedValue(undefined)
    mockOpenErrorModal.mockClear()
  })

  it('reset function clears storedDocuments', () => {
    const store = useDocumentStore()
    store.storedDocuments.push(mockStoredDocument)
    expect(store.storedDocuments).toHaveLength(1)

    store.$reset()
    expect(store.storedDocuments).toHaveLength(0)
  })

  it('apiDocuments computed should map storedDocuments to their apiDoc entries', () => {
    const store = useDocumentStore()
    store.storedDocuments.push(mockStoredDocument)

    expect(store.apiDocuments).toHaveLength(1)
    expect(store.apiDocuments[0]).toStrictEqual(mockStoredDocument.apiDoc)
  })

  it('remove document from storedDocuments when apiDoc has no fileKey', async () => {
    const store = useDocumentStore()
    store.storedDocuments.push(mockStoredDocument)
    expect(store.storedDocuments).toHaveLength(1)

    await store.removeStoredDocument(mockStoredDocument)

    expect(store.storedDocuments).toHaveLength(0)
  })

  it('getDocumentSchema returns a schema that accepts an empty array', () => {
    const store = useDocumentStore()
    const schema = store.getDocumentSchema()
    const result = schema.safeParse([])
    expect(result.success).toBe(true)
  })

  it('validateDocuments should be true when storedDocuments is empty and returnBool is true', () => {
    expect(useDocumentStore().validateDocuments(true)).toBe(true)
  })

  it('validateDocuments should return multi results when returnBool is false', () => {
    const result = useDocumentStore().validateDocuments(false)
    expect(Array.isArray(result)).toBe(true) // should be array of results
  })

  it('selectedDocType defaults to STRATA_HOTEL_DOCUMENTATION', () => {
    expect(useDocumentStore().selectedDocType).toBe(DocumentUploadType.STRATA_HOTEL_DOCUMENTATION)
  })

  it('selectedDocType can be updated to undefined', () => {
    const store = useDocumentStore()
    store.selectedDocType = undefined
    expect(store.selectedDocType).toBeUndefined()
  })

  it('reset all stored documents that have no fileKey', async () => {
    const store = useDocumentStore()
    store.storedDocuments.push(
      { ...mockStoredDocument, id: 'doc-a', name: 'a.pdf' },
      { ...mockStoredDocument, id: 'doc-b', name: 'b.pdf' }
    )

    expect(store.storedDocuments).toHaveLength(2)
    await store.resetApiDocs()
    expect(store.storedDocuments).toHaveLength(0)
  })

  it('does nothing when removing a document that is not in storedDocuments', async () => {
    const store = useDocumentStore()
    store.storedDocuments.push(mockStoredDocument)
    const missingDoc: UiDocument = {
      ...mockStoredDocument,
      id: 'doc-missing',
      apiDoc: { ...mockStoredDocument.apiDoc, fileKey: 'missing-key' }
    }

    await store.removeStoredDocument(missingDoc)

    expect(store.storedDocuments).toHaveLength(1)
    expect(store.storedDocuments[0]!.id).toBe(mockStoredDocument.id)
    expect(mockStrrApi).not.toHaveBeenCalled()
  })

  it('keeps existing documents and deletes nothing when a dashboard upload is rejected', async () => {
    const store = useDocumentStore()
    store.storedDocuments.push(mockStoredDocument)
    mockStrrApi.mockRejectedValueOnce(new Error('File contents do not match the file type'))
    // upload never succeeded, so the new doc has no apiDoc and was never added to storedDocuments
    const rejectedDoc: UiDocument = { ...mockStoredDocument, id: 'doc-rejected', apiDoc: {} as ApiDocument }

    await store.addDocumentToApplication(rejectedDoc, 'APP-123')

    expect(mockOpenErrorModal).toHaveBeenCalled()
    expect(store.storedDocuments).toHaveLength(1)
    expect(store.storedDocuments[0]!.id).toBe(mockStoredDocument.id)
    // only the failed PUT, no DELETE /documents/{fileKey}
    expect(mockStrrApi).toHaveBeenCalledTimes(1)
    expect(mockStrrApi).toHaveBeenCalledWith('/applications/APP-123/documents', expect.objectContaining({ method: 'PUT' }))
  })
})
