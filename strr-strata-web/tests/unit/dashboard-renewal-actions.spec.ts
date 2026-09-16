import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPermitDetailsData } from '../mocks/mockedData'
import Dashboard from '~/pages/strata-hotel/dashboard/[applicationId].vue'
import { UDropdown } from '#components'

const getApplication = vi.fn()
const getRegistration = vi.fn()
const getTodos = vi.fn()
const deleteApplication = vi.fn()
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
const paymentRedirect = vi.fn()

mockNuxtImport('useStrrApi', () => () => ({
  getAccountApplication: getApplication,
  getAccountRegistrations: getRegistration,
  getRegistrationToDos: getTodos,
  deleteApplication,
  searchRegistrations: vi.fn(),
  getApplicationReceipt: vi.fn(),
  getRegistrationCert: vi.fn(),
  updatePaymentDetails: vi.fn()
}))
mockNuxtImport('navigateTo', () => navigate)
mockNuxtImport('useConnectNav', () => () => ({ handlePaymentRedirect: paymentRedirect }))

enableAutoUnmount(afterEach)

let pinia: ReturnType<typeof createPinia>
beforeEach(() => {
  vi.resetAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
  const details = structuredClone(mockPermitDetailsData)
  getApplication.mockResolvedValueOnce({
    header: {
      applicationNumber: 'ORIGINAL-101',
      applicationDateTime: '2026-09-01T12:00:00+00:00',
      applicationType: 'new',
      registrationId: 308,
      status: ApplicationStatus.AUTO_APPROVED,
      hostStatus: 'Approved'
    },
    registration: details
  })
  getRegistration.mockResolvedValue({
    ...details,
    id: 308,
    registrationNumber: 'S123456789',
    status: RegistrationStatus.ACTIVE,
    startDate: '2026-09-01',
    expiryDate: new Date(Date.now() + 20 * 86400000).toISOString()
  })
})

async function mountDashboard (tasks: ApiRegistrationTodoTaskResp[]) {
  getTodos.mockResolvedValueOnce({ todos: tasks })
  const wrapper = await mountSuspended(Dashboard, {
    route: '/en-CA/strata-hotel/dashboard/ORIGINAL-101',
    global: { plugins: [pinia] }
  })
  await vi.waitFor(() => {
    expect(getTodos).toHaveBeenCalledExactlyOnceWith(308)
    expect(useConnectDetailsHeaderStore().loading).toBe(false)
  })
  await flushPromises()
  // Inspect user actions separately from mount-time route guard redirects.
  navigate.mockClear()
  return wrapper
}

describe('Strata dashboard renewal actions', () => {
  it('resumes the draft application returned by the renewal task', async () => {
    const wrapper = await mountDashboard([{
      task: { type: RegistrationTodoType.REGISTRATION_RENEWAL_DRAFT, detail: 'DRAFT-202' }
    }])
    await wrapper.get('[data-test-id="todo-renewal-draft"]').get('button').trigger('click')
    await flushPromises()
    expect(navigate).toHaveBeenCalledExactlyOnceWith({
      path: '/en-CA/strata-hotel/application',
      query: { renew: 'true', applicationId: 'DRAFT-202' }
    })
  })

  it('deletes the task draft and refreshes renewal tasks after deletion finishes', async () => {
    const wrapper = await mountDashboard([{
      task: { type: RegistrationTodoType.REGISTRATION_RENEWAL_DRAFT, detail: 'DRAFT-202' }
    }])
    const pending = Promise.withResolvers<void>()
    deleteApplication.mockReturnValueOnce(pending.promise)
    getTodos.mockResolvedValueOnce({ todos: [{ task: { type: RegistrationTodoType.REGISTRATION_RENEWAL } }] })
    // Select the real Todo component's secondary action at the dropdown boundary.
    const action = wrapper.findComponent(UDropdown).props('items')[0][0].click()
    expect(deleteApplication).toHaveBeenCalledExactlyOnceWith('DRAFT-202')
    expect(getTodos).toHaveBeenCalledTimes(1)
    pending.resolve()
    await action
    await flushPromises()
    expect(getTodos.mock.calls).toEqual([[308], [308]])
    expect(wrapper.find('[data-test-id="todo-renewal-draft"]').exists()).toBe(false)
    expect(wrapper.find('[data-test-id="todo-renew-strata"]').exists()).toBe(true)
  })

  it.each([true, false])('fetches the pending renewal application (payment token present: %s)', async (hasToken) => {
    const wrapper = await mountDashboard([{
      task: { type: RegistrationTodoType.REGISTRATION_RENEWAL_PAYMENT_PENDING, detail: 'PAY-303' }
    }])
    getApplication.mockResolvedValueOnce({
      header: { applicationNumber: 'PAY-303', paymentToken: hasToken ? 'synthetic-token' : undefined }
    })
    await wrapper.get('[data-test-id="todo-renewal-payment-pending"]').get('button').trigger('click')
    await flushPromises()
    expect(getApplication).toHaveBeenLastCalledWith('PAY-303')
    if (hasToken) {
      expect(paymentRedirect).toHaveBeenCalledExactlyOnceWith(
        'synthetic-token', '/strata-hotel/application/PAY-303')
    } else {
      expect(paymentRedirect).not.toHaveBeenCalled()
    }
  })

  it('shows no renewal actions when the API returns no tasks', async () => {
    const wrapper = await mountDashboard([])
    expect(wrapper.find('[data-test-id="todo-renewal-draft"]').exists()).toBe(false)
    expect(wrapper.find('[data-test-id="todo-renewal-payment-pending"]').exists()).toBe(false)
    expect(wrapper.find('[data-test-id="todo-renew-strata"]').exists()).toBe(false)
    expect(deleteApplication).not.toHaveBeenCalled()
    expect(paymentRedirect).not.toHaveBeenCalled()
  })
})
