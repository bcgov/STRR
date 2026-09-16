import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const strrApi = vi.fn()
const openErrorModal = vi.fn()
mockNuxtImport('useNuxtApp', original => () => Object.assign(Object.create(original()), {
  $i18n: { t: (key: string) => key },
  $strrApi: strrApi
}))
mockNuxtImport('useStrrModals', () => () => ({ openErrorModal }))

describe('Strata additional document upload metadata', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it.each<[DocumentUploadStep | undefined, string | undefined]>([
    [undefined, undefined],
    [DocumentUploadStep.NOC, '2026-09-15T12:00:00Z'],
    [DocumentUploadStep.RENEWAL, undefined]
  ])('sends only provided metadata for step %s and date %s', async (uploadStep, uploadDate) => {
    const file = new File(['document'], 'support.pdf', { type: 'application/pdf' })
    const document: UiDocument = {
      id: 'incoming',
      file,
      name: file.name,
      type: DocumentUploadType.STRATA_HOTEL_DOCUMENTATION,
      apiDoc: {} as ApiDocument,
      loading: false,
      uploadStep,
      uploadDate
    }
    strrApi.mockResolvedValueOnce({
      registration: {
        documents: [{ fileKey: 'uploaded', fileName: file.name, documentType: document.type }]
      }
    })

    await useDocumentStore().addDocumentToApplication(document, 'APP123')

    expect(strrApi).toHaveBeenCalledOnce()
    const [url, options] = strrApi.mock.calls[0]!
    expect(url).toBe('/applications/APP123/documents')
    expect(options.method).toBe('PUT')
    expect(options.body.get('file')).toEqual(file)
    expect(options.body.get('documentType')).toBe(DocumentUploadType.STRATA_HOTEL_DOCUMENTATION)
    expect(options.body.get('uploadStep')).toBe(uploadStep ?? null)
    expect(options.body.get('uploadDate')).toBe(uploadDate ?? null)
    expect(document.loading).toBe(false)
    expect(openErrorModal).not.toHaveBeenCalled()
  })
})
