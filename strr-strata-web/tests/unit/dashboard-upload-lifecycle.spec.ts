import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPermitDetailsData } from '../mocks/mockedData'
import AdditionalDocuments from '../../../strr-base-web/app/components/BaseUploadAdditionalDocuments.vue'
import Dashboard from '~/pages/strata-hotel/dashboard/[applicationId].vue'
import UploadButton from '~/components/document/upload/Button.vue'
import { UButton } from '#components'

const getApplication = vi.fn()
const upload = vi.fn()
const renderError = vi.fn()

mockNuxtImport('useStrrApi', () => () => ({
  getAccountApplication: getApplication,
  getAccountRegistrations: vi.fn(),
  searchRegistrations: vi.fn(),
  getApplicationReceipt: vi.fn(),
  getRegistrationCert: vi.fn(),
  updatePaymentDetails: vi.fn(),
  deleteApplication: vi.fn()
}))
mockNuxtImport('getTodoApplication', () => () => [])

enableAutoUnmount(afterEach)

let pinia: ReturnType<typeof createPinia>
beforeEach(() => {
  vi.resetAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
  upload.mockResolvedValue(undefined)
  vi.spyOn(useDocumentStore(), 'addDocumentToApplication').mockImplementation(upload)
})

function application (id = 101, status = ApplicationStatus.NOC_PENDING) {
  return {
    header: {
      applicationNumber: `APP-${id}`,
      applicationDateTime: '2026-09-01T12:00:00+00:00',
      status,
      hostStatus: 'Pending'
    },
    registration: structuredClone(mockPermitDetailsData)
  }
}

async function load (id = 101) {
  getApplication.mockResolvedValueOnce(application(id))
  await useStrrStrataStore().loadStrata(`APP-${id}`)
  await flushPromises()
}

async function mountDashboard (status = ApplicationStatus.NOC_PENDING) {
  getApplication.mockResolvedValueOnce(application(101, status))
  const wrapper = await mountSuspended(Dashboard, {
    route: '/en-CA/strata-hotel/dashboard/APP-101',
    global: {
      plugins: [pinia],
      config: { errorHandler: renderError },
      // Exercise the checked-out shared queue, including its disposal handling.
      stubs: { BaseUploadAdditionalDocuments: AdditionalDocuments }
    }
  })
  await flushPromises()
  const open = () => wrapper.get('#summary-supporting-info').get('button').trigger('click')
  const panel = () => wrapper.findComponent(AdditionalDocuments)
  const select = async (name: string) => {
    wrapper.findComponent(UploadButton).vm.$emit('change', [
      new File(['synthetic'], name, { type: 'application/pdf' })
    ])
    await flushPromises()
  }
  const submit = async () => {
    await panel().findAllComponents(UButton).find(button => button.props('type') === 'submit')!.trigger('click')
    await flushPromises()
  }
  await open()
  expect(panel().exists()).toBe(true)
  expect(renderError).not.toHaveBeenCalled()
  return { wrapper, open, panel, select, submit }
}

describe('Strata dashboard upload lifecycle', () => {
  it.each([
    ApplicationStatus.NOC_PENDING,
    ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING,
    ApplicationStatus.NOC_EXPIRED,
    ApplicationStatus.PROVISIONAL_REVIEW_NOC_EXPIRED
  ])('uploads to the active application with status %s', async (status) => {
    const { select, submit, panel } = await mountDashboard(status)
    await select('one.pdf')
    await submit()
    expect(upload).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ name: 'one.pdf', type: DocumentUploadType.STRATA_HOTEL_DOCUMENTATION }),
      'APP-101'
    )
    expect(panel().exists()).toBe(false)
    expect(renderError).not.toHaveBeenCalled()
  })

  it('keeps the queue until all files on the same application finish', async () => {
    const pending = Promise.withResolvers<void>()
    upload.mockReturnValueOnce(pending.promise)
    const { select, submit, panel } = await mountDashboard()
    await select('one.pdf')
    await select('two.pdf')
    await submit()
    expect(upload).toHaveBeenCalledOnce()
    expect(panel().exists()).toBe(true)
    pending.resolve()
    await flushPromises()
    expect(upload.mock.calls.map(([doc, id]) => [doc.name, id]))
      .toEqual([['one.pdf', 'APP-101'], ['two.pdf', 'APP-101']])
    expect(panel().exists()).toBe(false)
    expect(renderError).not.toHaveBeenCalled()
  })

  it('closes safely after a reset and opens an empty queue on the next application', async () => {
    const { wrapper, select, panel, open } = await mountDashboard()
    await select('old.pdf')
    useStrrStrataStore().$reset()
    await flushPromises()
    expect(renderError).not.toHaveBeenCalled()
    expect(panel().exists()).toBe(false)
    await load(202)
    await open()
    expect(panel().exists()).toBe(true)
    expect(wrapper.text()).not.toContain('old.pdf')
    expect(upload).not.toHaveBeenCalled()
  })

  it('stops a pending queue after loading a different application', async () => {
    const pending = Promise.withResolvers<void>()
    upload.mockReturnValueOnce(pending.promise)
    const { select, submit, panel } = await mountDashboard()
    await select('one.pdf')
    await select('two.pdf')
    await submit()
    expect(upload).toHaveBeenCalledOnce()
    await load(202)
    pending.resolve()
    await flushPromises()
    expect(upload.mock.calls.map(([doc, id]) => [doc.name, id])).toEqual([['one.pdf', 'APP-101']])
    expect(panel().exists()).toBe(false)
    expect(renderError).not.toHaveBeenCalled()
  })

  it('closes an old queue when the same application is reloaded', async () => {
    const { select, panel } = await mountDashboard()
    await select('old.pdf')
    await load()
    expect(panel().exists()).toBe(false)
    expect(upload).not.toHaveBeenCalled()
    expect(renderError).not.toHaveBeenCalled()
  })
})
