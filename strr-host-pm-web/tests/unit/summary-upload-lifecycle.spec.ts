import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockApplication, mockHostRegistration } from '../mocks/mockedData'
import AdditionalDocuments from '../../../strr-base-web/app/components/BaseUploadAdditionalDocuments.vue'
import SupportingInfo from '~/components/summary/SupportingInfo.vue'
import Select from '~/components/document/upload/Select.vue'
import { UButton } from '#components'

const getApplication = vi.fn()
const getRegistration = vi.fn()
const appUpload = vi.fn()
const regUpload = vi.fn()
const businessLicenseEnabled = ref(false)

mockNuxtImport('useStrrApi', () => () => ({
  getAccountApplication: getApplication,
  getAccountRegistrations: getRegistration,
  searchRegistrations: vi.fn(),
  getApplicationReceipt: vi.fn(),
  getRegistrationCert: vi.fn(),
  updatePaymentDetails: vi.fn()
}))
mockNuxtImport('useHostFeatureFlags', original => () => ({
  ...original(), isBusinessLicenseDocumentUploadEnabled: businessLicenseEnabled
}))

enableAutoUnmount(afterEach)

let pinia: ReturnType<typeof createPinia>
beforeEach(() => {
  vi.resetAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
  businessLicenseEnabled.value = false
  appUpload.mockResolvedValue(undefined)
  regUpload.mockResolvedValue(undefined)
  vi.spyOn(useDocumentStore(), 'addDocumentToApplication').mockImplementation(appUpload)
  vi.spyOn(useDocumentStore(), 'addDocumentToRegistration').mockImplementation(regUpload)
})

async function load (kind: 'application' | 'registration' | 'business-license', id = 101) {
  if (kind === 'application') {
    const value = structuredClone(mockApplication)
    value.header.applicationNumber = `APP-${id}`
    value.header.status = ApplicationStatus.NOC_PENDING
    getApplication.mockResolvedValueOnce(value)
    await useHostPermitStore().loadHostData(`APP-${id}`, false, true)
  } else {
    const value = structuredClone(mockHostRegistration)
    value.id = id
    value.registrationNumber = `REG-${id}`
    value.status = RegistrationStatus.ACTIVE
    value.nocStatus = kind === 'registration' ? RegistrationNocStatus.NOC_PENDING : undefined
    businessLicenseEnabled.value = kind === 'business-license'
    Object.assign(value.unitDetails, { jurisdiction: 'City of Kelowna' })
    getRegistration.mockResolvedValueOnce(value)
    await useHostPermitStore().loadHostRegistrationData(String(id))
  }
}

async function mountSummary () {
  const wrapper = await mountSuspended(SupportingInfo, {
    props: { isDashboard: true },
    global: {
      plugins: [pinia],
      // Exercise the checked-out shared queue, including its disposal handling.
      stubs: { BaseUploadAdditionalDocuments: AdditionalDocuments }
    }
  })
  const open = () => wrapper.get('[data-test-id="add-noc-doc-btn"]').trigger('click')
  const panel = () => wrapper.findComponent(AdditionalDocuments)
  const select = async (name: string) => {
    useDocumentStore().selectedDocType = DocumentUploadType.UTILITY_BILL
    await flushPromises()
    wrapper.findComponent(Select).vm.$emit('change', new File(['synthetic'], name, { type: 'application/pdf' }))
    await flushPromises()
  }
  const submit = async () => {
    await panel().findAllComponents(UButton).find(button => button.props('type') === 'submit')!.trigger('click')
    await flushPromises()
  }
  await open()
  expect(panel().exists()).toBe(true)
  return { wrapper, open, panel, select, submit }
}

describe('summary upload lifecycle', () => {
  it.each(['application', 'registration', 'business-license'] as const)(
    'uploads to the active %s target', async (kind) => {
      await load(kind)
      const { select, submit, panel } = await mountSummary()
      await select('one.pdf')
      await submit()
      const target = kind === 'application' ? appUpload : regUpload
      expect(target).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ name: 'one.pdf', type: DocumentUploadType.UTILITY_BILL }),
        kind === 'application' ? 'APP-101' : 101
      )
      expect(panel().exists()).toBe(false)
    }
  )

  it('keeps the queue until all files on the same record finish', async () => {
    await load('application')
    const pending = Promise.withResolvers<void>()
    appUpload.mockReturnValueOnce(pending.promise)
    const { select, submit, panel } = await mountSummary()
    await select('one.pdf')
    await select('two.pdf')
    await submit()
    expect(appUpload).toHaveBeenCalledOnce()
    expect(panel().exists()).toBe(true)
    pending.resolve()
    await flushPromises()
    expect(appUpload.mock.calls.map(([doc, id]) => [doc.name, id]))
      .toEqual([['one.pdf', 'APP-101'], ['two.pdf', 'APP-101']])
    expect(panel().exists()).toBe(false)
  })

  it('closes the panel when its record is reset and opens an empty queue on the next record', async () => {
    await load('application')
    const { wrapper, select, panel, open } = await mountSummary()
    await select('old.pdf')
    useHostPermitStore().$reset()
    await flushPromises()
    expect(panel().exists()).toBe(false)
    await load('application', 202)
    await flushPromises()
    await open()
    expect(panel().exists()).toBe(true)
    expect(wrapper.text()).not.toContain('old.pdf')
    expect(appUpload).not.toHaveBeenCalled()
  })

  it.each(['application', 'registration'] as const)(
    'stops a pending queue after loading a different %s', async (kind) => {
      await load('application')
      const pending = Promise.withResolvers<void>()
      appUpload.mockReturnValueOnce(pending.promise)
      const { select, submit, panel } = await mountSummary()
      await select('one.pdf')
      await select('two.pdf')
      await submit()
      expect(appUpload).toHaveBeenCalledOnce()
      await load(kind, 202)
      await flushPromises()
      pending.resolve()
      await flushPromises()
      expect(appUpload.mock.calls.map(([doc, id]) => [doc.name, id])).toEqual([['one.pdf', 'APP-101']])
      expect(regUpload).not.toHaveBeenCalled()
      expect(panel().exists()).toBe(false)
    }
  )

  it('closes an old queue when the same record is reloaded', async () => {
    await load('application')
    const { select, panel } = await mountSummary()
    await select('old.pdf')
    await load('application')
    await flushPromises()
    expect(panel().exists()).toBe(false)
    expect(appUpload).not.toHaveBeenCalled()
  })
})
