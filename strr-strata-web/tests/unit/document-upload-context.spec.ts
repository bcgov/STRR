import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPermitDetailsData } from '../mocks/mockedData'
import DocumentList from '~/components/document/list/index.vue'

const api = vi.fn()
const getApplication = vi.fn()
const getRegistration = vi.fn()
const openErrorModal = vi.fn()

mockNuxtImport('useRuntimeConfig', original => () => {
  const config = original()
  return { ...config, public: { ...config.public, strrApiURL: '' } }
})
registerEndpoint('/applications/APP-101/documents', { method: 'PUT', handler: () => api() })
mockNuxtImport('useStrrApi', () => () => ({
  getAccountApplication: getApplication,
  getAccountRegistrations: getRegistration,
  searchRegistrations: vi.fn(),
  getApplicationReceipt: vi.fn(),
  getRegistrationCert: vi.fn(),
  updatePaymentDetails: vi.fn()
}))
mockNuxtImport('useStrrModals', () => () => ({ openErrorModal }))

enableAutoUnmount(afterEach)

function document (name: string): ApiDocument {
  return {
    fileName: `${name}.pdf`,
    fileKey: `key-${name}`,
    fileType: 'application/pdf',
    documentType: DocumentUploadType.STRATA_HOTEL_DOCUMENTATION
  }
}

function incoming (): UiDocument {
  const file = new File(['synthetic'], 'incoming-A.pdf', { type: 'application/pdf' })
  return {
    id: 'incoming-A',
    file,
    name: file.name,
    type: DocumentUploadType.STRATA_HOTEL_DOCUMENTATION,
    apiDoc: {} as ApiDocument,
    loading: false,
    uploadStep: DocumentUploadStep.NOC
  }
}

async function load (id: number) {
  const registration = structuredClone(mockPermitDetailsData)
  registration.documents = [document(`existing-${id}`)]
  getApplication.mockResolvedValueOnce({
    header: { applicationNumber: `APP-${id}`, status: ApplicationStatus.NOC_PENDING },
    registration
  })
  await useStrrStrataStore().loadStrata(`APP-${id}`)
}

function result () {
  return { registration: { documents: [document('existing-101'), document('incoming-A')] } }
}

function upload (doc: UiDocument) {
  return useDocumentStore().addDocumentToApplication(doc, 'APP-101')
}

let pinia: ReturnType<typeof createPinia>
beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.resetAllMocks()
})

describe('Strata upload document context', () => {
  it('adds the returned file while the same record remains loaded', async () => {
    await load(101)
    const doc = incoming()
    api.mockResolvedValueOnce(result())
    await upload(doc)
    expect(doc.apiDoc.fileKey).toBe('key-incoming-A')
    expect(useDocumentStore().apiDocuments.map(value => value.fileKey))
      .toEqual(['key-existing-101', 'key-incoming-A'])
    expect(doc.loading).toBe(false)
  })

  it('reports a failed upload while the same record remains loaded', async () => {
    await load(101)
    const doc = incoming()
    api.mockRejectedValue(new Error('Synthetic active upload failure'))
    await expect(upload(doc)).rejects.toBeInstanceOf(Error)
    expect(useDocumentStore().apiDocuments.map(value => value.fileKey)).toEqual(['key-existing-101'])
    expect(openErrorModal).toHaveBeenCalledOnce()
    expect(doc.loading).toBe(false)
  })

  it('does not restore documents after the current record has been reset', async () => {
    await load(101)
    const pending = Promise.withResolvers<ReturnType<typeof result>>()
    api.mockReturnValue(pending.promise)
    const doc = incoming()
    const request = upload(doc)
    await vi.waitFor(() => expect(api).toHaveBeenCalled())
    useStrrStrataStore().$reset()
    pending.resolve(result())
    await request
    expect(useDocumentStore().storedDocuments).toEqual([])
    expect(doc.loading).toBe(false)
  })

  it('keeps a newer record and its rendered documents after an older upload succeeds', async () => {
    await load(101)
    const pending = Promise.withResolvers<ReturnType<typeof result>>()
    api.mockReturnValue(pending.promise)
    const doc = incoming()
    const request = upload(doc)
    await vi.waitFor(() => expect(api).toHaveBeenCalled())
    await load(202)
    const wrapper = await mountSuspended(DocumentList, { global: { plugins: [pinia] } })
    expect(wrapper.text()).toContain('existing-202.pdf')
    pending.resolve(result())
    await request
    await flushPromises()
    expect(useDocumentStore().apiDocuments.map(value => value.fileKey)).toEqual(['key-existing-202'])
    expect(wrapper.text()).not.toContain('incoming-A.pdf')
    expect(doc.loading).toBe(false)
  })

  it('keeps a newer record free of an older upload error dialog', async () => {
    await load(101)
    const pending = Promise.withResolvers<ReturnType<typeof result>>()
    api.mockReturnValue(pending.promise)
    const doc = incoming()
    const request = upload(doc).catch(error => error)
    await vi.waitFor(() => expect(api).toHaveBeenCalled())
    await load(202)
    const failure = new Error('Synthetic old upload failure')
    pending.reject(failure)
    expect(await request).toBeInstanceOf(Error)
    expect(useDocumentStore().apiDocuments.map(value => value.fileKey)).toEqual(['key-existing-202'])
    expect(openErrorModal).not.toHaveBeenCalled()
    expect(doc.loading).toBe(false)
  })
})
