import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPermitDetailsData } from '../mocks/mockedData'
import Dashboard from '~/pages/strata-hotel/dashboard/index.vue'
import { UPagination } from '#components'

const account = reactive({ currentAccount: { id: 'A' } })
const getApplications = vi.fn()
const requests: { account: string; page: unknown }[] = []

mockNuxtImport('useConnectAccountStore', () => () => account)
mockNuxtImport('useStrrApi', () => () => ({
  getAccountApplications: (...args: unknown[]) => {
    requests.push({ account: account.currentAccount.id, page: args[1] })
    return getApplications(...args)
  },
  deleteApplication: vi.fn()
}))

enableAutoUnmount(afterEach)

function response (id: string) {
  return {
    applications: [{
      header: {
        applicationNumber: `APP-${id}`,
        applicationDateTime: '2026-09-01T12:00:00+00:00',
        decisionDate: null,
        status: ApplicationStatus.DRAFT,
        hostStatus: 'Draft'
      },
      registration: structuredClone(mockPermitDetailsData)
    }],
    total: 60
  }
}

function deferred () {
  let resolve!: (value: ReturnType<typeof response>) => void
  const promise = new Promise<ReturnType<typeof response>>((_resolve) => { resolve = _resolve })
  return { promise, resolve }
}

beforeEach(() => {
  clearNuxtData('strata-hotel-list-resp')
  account.currentAccount.id = 'A'
  requests.length = 0
  getApplications.mockReset().mockImplementation(() => Promise.resolve(response(account.currentAccount.id)))
})

describe('Strata dashboard account refresh', () => {
  it('can switch accounts before the initial request finishes', async () => {
    const initial = deferred()
    getApplications.mockImplementationOnce(() => initial.promise)
    const mounted = mountSuspended(Dashboard)
    try {
      await vi.waitFor(() => expect(requests.at(-1)!.account).toBe('A'))
      account.currentAccount.id = 'B'
      const wrapper = await mounted
      expect(wrapper.text()).toContain('APP-B')
      initial.resolve(response('A'))
      await flushPromises()
      expect(wrapper.text()).not.toContain('APP-A')
    } finally {
      initial.resolve(response('A'))
      await mounted
      await flushPromises()
    }
  })

  it('loads the newly selected account', async () => {
    const wrapper = await mountSuspended(Dashboard)
    expect(wrapper.text()).toContain('APP-A')
    account.currentAccount.id = 'B'
    await flushPromises()
    expect(wrapper.text()).toContain('APP-B')
    expect(wrapper.text()).not.toContain('APP-A')
  })

  it('starts the newest account request without waiting for an older account', async () => {
    const wrapper = await mountSuspended(Dashboard)
    const earlier = deferred()
    getApplications.mockImplementationOnce(() => earlier.promise)
    try {
      account.currentAccount.id = 'B'
      await flushPromises()
      expect(requests.at(-1)!.account).toBe('B')
      account.currentAccount.id = 'C'
      await flushPromises()
      expect(requests.at(-1)!.account).toBe('C')
      expect(wrapper.text()).toContain('APP-C')
    } finally {
      earlier.resolve(response('B'))
      await flushPromises()
    }
    expect(wrapper.text()).toContain('APP-C')
    expect(wrapper.text()).not.toContain('APP-B')
  })

  it('clears the previous account rows while the next account loads', async () => {
    const wrapper = await mountSuspended(Dashboard)
    const pending = deferred()
    getApplications.mockImplementationOnce(() => pending.promise)
    try {
      account.currentAccount.id = 'B'
      await nextTick()
      expect(wrapper.text()).not.toContain('APP-A')
    } finally {
      pending.resolve(response('B'))
      await flushPromises()
    }
  })

  it('starts from page one when changing accounts', async () => {
    const wrapper = await mountSuspended(Dashboard)
    wrapper.findComponent(UPagination).vm.$emit('update:modelValue', 2)
    await flushPromises()
    expect(requests.at(-1)).toEqual({ account: 'A', page: 2 })
    account.currentAccount.id = 'B'
    await flushPromises()
    expect(requests.filter(request => request.account === 'B')).toEqual([{ account: 'B', page: 1 }])
  })
})
