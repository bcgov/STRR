import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { mockHostApplication, mockHostRegistration } from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import ApplicationInfoHeader from '~/components/ApplicationInfoHeader.vue'

const api = vi.fn()
const payApi = vi.fn()
const { logError } = vi.hoisted(() => ({ logError: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => Object.assign(Object.create(original()), {
  $i18n: { t: (key: string) => enI18n.global.t(key) }, $strrApi: api, $payApi: payApi
}))
mockNuxtImport('useStrrApi', () => () => ({ getAccountApplications: vi.fn() }))
mockNuxtImport('useKeycloak', () => () => ({ kcUser: ref({ userName: 'synthetic-examiner' }) }))
mockNuxtImport('useStrrModals', () => () => ({ openErrorModal: vi.fn() }))
mockNuxtImport('useExaminerFeatureFlags', () => () => ({ isSplitDashboardTableEnabled: ref(false) }))
mockNuxtImport('useFeatureFlags', () => () => ({ isFeatureEnabled: () => ref(false) }))
mockNuxtImport('useLocalePath', () => () => (path: string) => path)
mockNuxtImport('logFetchError', () => logError)

let wrapper: Awaited<ReturnType<typeof mountSuspended>> | undefined
let releases: (() => void)[] = []
const oldInvoice = { total: 100, paymentDate: '2026-09-01T12:00:00' }
const newInvoice = { total: 200, paymentDate: '2026-09-15T12:00:00' }
const application = (number: string, paymentToken?: number, paymentAccount = 'synthetic-account') => ({
  ...mockHostApplication,
  header: { ...mockHostApplication.header, applicationNumber: number, paymentAccount, paymentToken }
})
const deferred = <T>() => {
  const value = Promise.withResolvers<T>()
  releases.push(() => value.resolve(undefined as T))
  return value
}
const mount = () => mountSuspended(defineComponent({
  setup () {
    const store = useExaminerStore()
    return () => store.isApplication ? h(ApplicationInfoHeader) : h('div', 'No application selected')
  }
}), { global: { plugins: [enI18n] } })
const select = async (value: ReturnType<typeof application>) => {
  api.mockResolvedValueOnce(value)
  await useExaminerStore().getApplicationById(value.header.applicationNumber)
  await flushPromises()
}
const expectPayment = (amount: string, date: string) => {
  expect(wrapper!.text()).toContain(`${enI18n.global.t('strr.label.invoiceAmount')} ${amount}`)
  expect(wrapper!.text()).toContain(`${enI18n.global.t('strr.label.paymentDate')} ${date}`)
}

beforeEach(async () => {
  useExaminerStore().activeRecord = undefined
  await flushPromises()
  api.mockReset()
  payApi.mockReset()
  logError.mockReset()
  releases = []
})
afterEach(async () => {
  wrapper?.unmount()
  wrapper = undefined
  useExaminerStore().activeRecord = undefined
  releases.forEach(release => release())
  await flushPromises()
})

describe('Examiner application payment metadata', () => {
  it('shows unavailable metadata while pending, then renders the current invoice amount and date', async () => {
    const invoice = deferred<typeof newInvoice>()
    payApi.mockReturnValueOnce(invoice.promise)
    await select(application('22222222222222', 222))
    wrapper = await mount()
    expectPayment('N/A', 'N/A')
    expect(payApi).toHaveBeenCalledExactlyOnceWith('/payment-requests/222', { method: 'GET' })

    invoice.resolve(newInvoice)
    await flushPromises()
    expectPayment('$200.00', '2026-09-15')
  })

  it('preserves a zero invoice total and an absent payment date', async () => {
    payApi.mockResolvedValueOnce({ total: 0, paymentDate: null })
    await select(application('22222222222222', 222))
    wrapper = await mount()
    expectPayment('$0.00', 'N/A')
  })

  it.each([
    { token: undefined, account: 'synthetic-account' },
    { token: 222, account: '' }
  ])('does not fetch an invoice without its required token/account ($token, $account)', async ({ token, account }) => {
    await select(application('22222222222222', token, account))
    wrapper = await mount()
    expect(payApi).not.toHaveBeenCalled()
    expectPayment('N/A', 'N/A')
  })

  it('keeps the current application visible when its invoice fetch fails', async () => {
    const error = new Error('synthetic invoice failure')
    payApi.mockRejectedValueOnce(error)
    await select(application('22222222222222', 222))
    wrapper = await mount()
    expect(wrapper.find('[data-testid="application-number"]').text()).toBe('22222222222222')
    expectPayment('N/A', 'N/A')
    expect(logError).toHaveBeenCalledOnce()
    expect(logError.mock.calls[0]![0]).toBe(error)
  })

  it.each([false, true])('ignores an older invoice after a newer fetch (failure: %s)', async (fails) => {
    const older = deferred<typeof oldInvoice>()
    const newer = deferred<typeof newInvoice>()
    payApi.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
    await select(application('11111111111111', 111))
    wrapper = await mount()
    await select(application('22222222222222', 222))
    expectPayment('N/A', 'N/A')
    expect(payApi.mock.calls.map(([path]) => path)).toEqual(['/payment-requests/111', '/payment-requests/222'])
    if (fails) { newer.reject(new Error('synthetic invoice failure')) } else { newer.resolve(newInvoice) }
    await flushPromises()
    older.resolve(oldInvoice)
    await flushPromises()

    expect(wrapper.find('[data-testid="application-number"]').text()).toBe('22222222222222')
    expectPayment(fails ? 'N/A' : '$200.00', fails ? 'N/A' : '2026-09-15')
  })

  it.each(['failed application load', 'application without invoice', 'registration', 'snapshot'])(
    'does not restore invoice metadata after switching to %s', async (target) => {
      const older = deferred<typeof oldInvoice>()
      payApi.mockReturnValueOnce(older.promise)
      await select(application('11111111111111', 111))
      wrapper = await mount()
      if (target === 'failed application load') {
        api.mockRejectedValueOnce(new Error('synthetic application failure'))
        await expect(useExaminerStore().getApplicationById('22222222222222'))
          .rejects.toThrow('synthetic application failure')
      } else if (target === 'application without invoice') {
        await select(application('22222222222222'))
      } else if (target === 'registration') {
        api.mockResolvedValueOnce(mockHostRegistration)
        await useExaminerStore().getRegistrationById('222')
      } else {
        api.mockResolvedValueOnce({
          id: 1,
          registrationId: 222,
          version: 1,
          snapshotDateTime: null,
          snapshotData: { ...mockHostRegistration, id: 222 }
        })
        await useExaminerStore().getSnapshotById('222', '1')
      }
      await flushPromises()
      older.resolve(oldInvoice)
      await flushPromises()

      expect(useExaminerStore().activePaymentTotal).toBeNull()
      expect(useExaminerStore().activePaymentDate).toBeNull()
      if (target === 'application without invoice') {
        expectPayment('N/A', 'N/A')
      } else {
        expect(wrapper.find('[data-testid="application-number"]').exists()).toBe(false)
      }
    }
  )

  it('clears the previous invoice while reloading the same application and uses the new response', async () => {
    payApi.mockResolvedValueOnce(oldInvoice)
    await select(application('11111111111111', 111))
    wrapper = await mount()
    expectPayment('$100.00', '2026-09-01')
    const updated = deferred<typeof newInvoice>()
    payApi.mockReturnValueOnce(updated.promise)
    await select(application('11111111111111', 111))
    expectPayment('N/A', 'N/A')
    updated.resolve(newInvoice)
    await flushPromises()
    expectPayment('$200.00', '2026-09-15')
  })

  it('invalidates a pending invoice when its account becomes unavailable without a token change', async () => {
    const older = deferred<typeof oldInvoice>()
    payApi.mockReturnValueOnce(older.promise)
    await select(application('11111111111111', 111))
    wrapper = await mount()
    useExaminerStore().activeRecord = application('11111111111111', 111, '')
    await flushPromises()
    older.resolve(oldInvoice)
    await flushPromises()
    expectPayment('N/A', 'N/A')
    expect(payApi).toHaveBeenCalledOnce()
  })

  it('clears displayed metadata on same-token registration replacement', async () => {
    payApi.mockResolvedValueOnce(oldInvoice)
    await select(application('11111111111111', 111))
    wrapper = await mount()
    expectPayment('$100.00', '2026-09-01')
    useExaminerStore().activeRecord = {
      ...mockHostRegistration,
      header: { ...mockHostRegistration.header, paymentToken: 111 }
    }
    await flushPromises()
    expect(useExaminerStore().isApplication).toBe(false)
    expect(useExaminerStore().activePaymentTotal).toBeNull()
    expect(useExaminerStore().activePaymentDate).toBeNull()
    expect(payApi).toHaveBeenCalledOnce()
  })
})
