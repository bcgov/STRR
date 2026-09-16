import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPermitDetailsData } from '../mocks/mockedData'
import DocumentList from '~/components/document/list/index.vue'

const api = vi.fn()
const remove = vi.fn()
const getApplication = vi.fn()
const save = vi.fn()
const openErrorModal = vi.fn()
const openAppSubmitError = vi.fn()

mockNuxtImport('useRuntimeConfig', original => () => {
  const config = original()
  return { ...config, public: { ...config.public, strrApiURL: '' } }
})
registerEndpoint('/documents', { method: 'POST', handler: () => api() })
registerEndpoint('/documents/key-existing-101', { method: 'DELETE', handler: () => remove() })
mockNuxtImport('useStrrApi', () => () => ({
  getAccountApplication: getApplication,
  getAccountRegistrations: vi.fn(),
  searchRegistrations: vi.fn(),
  getApplicationReceipt: vi.fn(),
  getRegistrationCert: vi.fn(),
  updatePaymentDetails: vi.fn(),
  postApplication: save
}))
mockNuxtImport('useStrrModals', () => () => ({ openErrorModal, openAppSubmitError }))

enableAutoUnmount(afterEach)

function document (name: string): ApiDocument {
  return {
    fileName: `${name}.pdf`,
    fileKey: `key-${name}`,
    fileType: 'application/pdf',
    documentType: DocumentUploadType.STRATA_HOTEL_DOCUMENTATION
  }
}

async function load (id: number) {
  const registration = structuredClone(mockPermitDetailsData)
  registration.documents = [document(`existing-${id}`)]
  getApplication.mockResolvedValueOnce({
    header: { applicationNumber: `APP-${id}`, status: ApplicationStatus.DRAFT }, registration
  })
  await useStrrStrataStore().loadStrata(`APP-${id}`, true)
}

function upload () {
  const store = useDocumentStore()
  store.selectedDocType = DocumentUploadType.STRATA_HOTEL_DOCUMENTATION
  return store.addStoredDocument(new File(['synthetic'], 'incoming.pdf', { type: 'application/pdf' }))
}

const keys = () => useDocumentStore().apiDocuments.map(doc => doc.fileKey)

let pinia: ReturnType<typeof createPinia>
beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.resetAllMocks()
  remove.mockResolvedValue({})
})

describe('draft document context', () => {
  it('stores a successful first-time upload on the active draft', async () => {
    await load(101)
    api.mockResolvedValue(document('incoming'))
    await upload()
    expect(keys()).toEqual(['key-existing-101', 'key-incoming'])
    expect(useDocumentStore().storedDocuments[1]!.loading).toBe(false)
    expect(openErrorModal).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
  })

  it('removes a failed first-time upload from the active draft', async () => {
    await load(101)
    api.mockRejectedValue(new Error('Synthetic active upload failure'))
    await upload()
    expect(keys()).toEqual(['key-existing-101'])
    expect(openErrorModal).toHaveBeenCalledOnce()
    expect(save).not.toHaveBeenCalled()
  })

  it.each(['success', 'failure'])('preserves a newer draft after the old upload %s', async (result) => {
    await load(101)
    const pending = Promise.withResolvers<ApiDocument>()
    api.mockReturnValue(pending.promise)
    const request = upload()
    await vi.waitFor(() => expect(api).toHaveBeenCalled())
    await load(202)
    const wrapper = await mountSuspended(DocumentList, { global: { plugins: [pinia] } })
    expect(wrapper.text()).toContain('existing-202.pdf')
    if (result === 'success') {
      pending.resolve(document('incoming'))
    } else {
      pending.reject(new Error('Old failure'))
    }
    await request
    expect(keys()).toEqual(['key-existing-202'])
    expect(wrapper.text()).not.toContain('incoming.pdf')
    expect(save).not.toHaveBeenCalled()
    expect(openErrorModal).not.toHaveBeenCalled()
  })

  it.each(['success', 'failure'])('keeps a reset draft cleared after upload %s', async (result) => {
    await load(101)
    const pending = Promise.withResolvers<ApiDocument>()
    api.mockReturnValue(pending.promise)
    const request = upload()
    await vi.waitFor(() => expect(api).toHaveBeenCalled())
    useStrrStrataStore().$reset()
    if (result === 'success') {
      pending.resolve(document('incoming'))
    } else {
      pending.reject(new Error('Old failure'))
    }
    await request
    expect(keys()).toEqual([])
    expect(save).not.toHaveBeenCalled()
    expect(openErrorModal).not.toHaveBeenCalled()
  })

  it('preserves a freshly reloaded draft after its earlier upload fails', async () => {
    await load(101)
    const pending = Promise.withResolvers<ApiDocument>()
    api.mockReturnValue(pending.promise)
    const request = upload()
    await vi.waitFor(() => expect(api).toHaveBeenCalled())
    await load(101)
    pending.reject(new Error('Old failure'))
    await request
    expect(keys()).toEqual(['key-existing-101'])
    expect(save).not.toHaveBeenCalled()
    expect(openErrorModal).not.toHaveBeenCalled()
  })

  it('ignores removal of a document belonging to an earlier draft', async () => {
    await load(101)
    const previous = useDocumentStore().storedDocuments[0]!
    await load(202)
    await useDocumentStore().removeStoredDocument(previous)
    expect(keys()).toEqual(['key-existing-202'])
    expect(save).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
  })
})
