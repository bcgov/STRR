import { describe, beforeEach, it, expect } from 'vitest'
import { mockStoredDocument } from '../mocks/mockedData'

describe('Document Store', () => {
  beforeEach(() => {
    useDocumentStore().$reset()
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
})
