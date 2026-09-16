import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockApplication } from '../mocks/mockedData'
import SupportingInfo from '~/components/summary/SupportingInfo.vue'

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
    documentType: DocumentUploadType.UTILITY_BILL
  }
}

async function load (id: number) {
  const value = structuredClone(mockApplication)
  value.header.applicationNumber = `APP-${id}`
  value.header.status = ApplicationStatus.DRAFT
  value.registration.documents = [document(`existing-${id}`)]
  getApplication.mockResolvedValueOnce(value)
  await useHostPermitStore().loadHostData(`APP-${id}`, true, true)
}

function upload () {
  const store = useDocumentStore()
  store.selectedDocType = DocumentUploadType.UTILITY_BILL
  return store.addStoredDocument(new File(['synthetic'], 'incoming.pdf', { type: 'application/pdf' }))
}

const keys = () => useDocumentStore().apiDocuments.map(doc => doc.fileKey)

let pinia: ReturnType<typeof createPinia>
beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.resetAllMocks()
  save.mockResolvedValue(mockApplication)
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
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      registration: expect.objectContaining({ documents: [document('existing-101')] })
    }), true, 'APP-101')
  })

  it.each(['success', 'failure'])('preserves a newer draft after the old upload %s', async (result) => {
    await load(101)
    const pending = Promise.withResolvers<ApiDocument>()
    api.mockReturnValue(pending.promise)
    const request = upload()
    await vi.waitFor(() => expect(api).toHaveBeenCalled())
    await load(202)
    const wrapper = await mountSuspended(SupportingInfo, { props: { isDashboard: true }, global: { plugins: [pinia] } })
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
    useHostPermitStore().$reset()
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

describe('Host draft document removal', () => {
  it('saves the active draft before deleting its removed document', async () => {
    await load(101)
    const previous = useDocumentStore().storedDocuments[0]!
    const pending = Promise.withResolvers<typeof mockApplication>()
    save.mockReturnValue(pending.promise)
    const request = useDocumentStore().removeStoredDocument(previous)
    expect(keys()).toEqual([])
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      registration: expect.objectContaining({ documents: [] })
    }), true, 'APP-101')
    expect(remove).not.toHaveBeenCalled()
    pending.resolve(mockApplication)
    await request
    expect(remove).toHaveBeenCalledOnce()
  })

  it('restores the document when saving the active draft fails', async () => {
    await load(101)
    const failure = new Error('Synthetic save failure')
    save.mockRejectedValue(failure)
    await useDocumentStore().removeStoredDocument(useDocumentStore().storedDocuments[0]!)
    expect(keys()).toEqual(['key-existing-101'])
    expect(openAppSubmitError).toHaveBeenCalledWith(failure)
    expect(remove).not.toHaveBeenCalled()
  })

  it.each(['success', 'failure'])('keeps a newer draft after an earlier removal save %s', async (result) => {
    await load(101)
    const pending = Promise.withResolvers<typeof mockApplication>()
    save.mockReturnValue(pending.promise)
    const request = useDocumentStore().removeStoredDocument(useDocumentStore().storedDocuments[0]!)
    await vi.waitFor(() => expect(save).toHaveBeenCalled())
    await load(202)
    if (result === 'success') {
      pending.resolve(mockApplication)
    } else {
      pending.reject(new Error('Old save failure'))
    }
    await request
    expect(keys()).toEqual(['key-existing-202'])
    expect(save.mock.calls.map(call => call[2])).toEqual(['APP-101'])
    expect(remove).toHaveBeenCalledTimes(result === 'success' ? 1 : 0)
    expect(openAppSubmitError).not.toHaveBeenCalled()
  })

  it('keeps a newer draft after an old failed upload cleanup cannot be saved', async () => {
    await load(101)
    api.mockRejectedValue(new Error('Synthetic upload failure'))
    const pending = Promise.withResolvers<typeof mockApplication>()
    save.mockReturnValue(pending.promise)
    const request = upload()
    await vi.waitFor(() => expect(save).toHaveBeenCalled())
    expect(openErrorModal).toHaveBeenCalledOnce()
    await load(202)
    pending.reject(new Error('Old cleanup save failure'))
    await request
    expect(keys()).toEqual(['key-existing-202'])
    expect(openAppSubmitError).not.toHaveBeenCalled()
    expect(save.mock.calls.map(call => call[2])).toEqual(['APP-101'])
  })
})
