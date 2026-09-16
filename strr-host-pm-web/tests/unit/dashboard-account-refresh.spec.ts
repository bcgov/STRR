import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useConnectAccountStore } from '@daxiom/nuxt-core-layer-test/app/stores/connect-account'
import { mockApplication, mockHostRegistration } from '../mocks/mockedData'
import Dashboard from '~/pages/dashboard-new/index.vue'

const state = vi.hoisted(() => ({
  store: undefined as ReturnType<typeof useConnectAccountStore> | undefined,
  applications: vi.fn(),
  registrations: vi.fn(),
  searchApplications: vi.fn(),
  searchRegistrations: vi.fn(),
  requests: [] as { kind: string; account: string; args: unknown[] }[]
}))

mockNuxtImport('useConnectAccountStore', () => () => state.store)
mockNuxtImport('useStrrApi', () => () => ({
  getAccountApplications: (...args: unknown[]) => {
    state.requests.push({ kind: 'applications', account: state.store!.currentAccount.id, args })
    return state.applications(...args)
  },
  getAccountRegistrations: (...args: unknown[]) => {
    state.requests.push({ kind: 'registrations', account: state.store!.currentAccount.id, args })
    return state.registrations(...args)
  },
  searchApplications: state.searchApplications,
  searchRegistrations: state.searchRegistrations,
  getRegistrationToDos: () => Promise.resolve({ todos: [] }),
  deleteApplication: vi.fn()
}))

enableAutoUnmount(afterEach)

function response (account: string) {
  const application = structuredClone(mockApplication)
  application.header.applicationNumber = `APP-${account}`
  const registration = {
    ...structuredClone(mockHostRegistration),
    registrationNumber: `REG-${account}`,
    expiryDate: '2027-06-01T07:00:00+00:00'
  }
  return {
    applications: { applications: [application], total: 1 },
    registrations: { registrations: [registration], total: 1 }
  }
}

function pendingResponse () {
  let resolve!: (value: ReturnType<typeof response>['applications' | 'registrations']) => void
  const promise = new Promise<ReturnType<typeof response>['applications' | 'registrations']>((_resolve) => {
    resolve = _resolve
  })
  return { promise, resolve }
}

beforeEach(async () => {
  sessionStorage.clear()
  state.requests = []
  state.applications.mockReset().mockImplementation(() =>
    Promise.resolve(response(state.store!.currentAccount.id).applications))
  state.registrations.mockReset().mockImplementation(() =>
    Promise.resolve(response(state.store!.currentAccount.id).registrations))
  state.searchApplications.mockReset().mockImplementation(() =>
    Promise.resolve(response(state.store!.currentAccount.id).applications))
  state.searchRegistrations.mockReset().mockImplementation(() =>
    Promise.resolve(response(state.store!.currentAccount.id).registrations))
  await mountSuspended(defineComponent({
    setup () {
      clearNuxtData(['host-applications-list', 'host-registrations-list'])
      state.store = useConnectAccountStore(createPinia())
      state.store.userAccounts = ['A', 'B', 'C'].map(id => ({
        id,
        label: `Synthetic account ${id}`,
        accountStatus: AccountStatus.ACTIVE,
        accountType: AccountType.BASIC,
        type: UserSettingsType.ACCOUNT
      }))
      state.store.currentAccount = state.store.userAccounts[0]!
      useHostPermitStore().$reset()
      return () => h('div')
    }
  }))
})

afterEach(() => { state.store?.$dispose() })

describe('dashboard account refresh with real Nuxt asynchronous data', () => {
  it.each(['applications', 'registrations'] as const)(
    'can switch accounts before the initial %s request finishes', async (kind) => {
      const initial = pendingResponse()
      state[kind].mockImplementationOnce(() => initial.promise)
      const mounted = mountSuspended(Dashboard)
      try {
        await vi.waitFor(() => {
          expect(state.requests.some(request => request.account === 'A' && request.kind === kind)).toBe(true)
        }, { timeout: 3000 })
        state.store!.switchCurrentAccount('B')
        const wrapper = await mounted
        await vi.waitFor(() => {
          expect(wrapper.text()).toContain('APP-B')
          expect(wrapper.text()).toContain('REG-B')
        }, { timeout: 3000 })
        initial.resolve(response('A')[kind])
        await flushPromises()
        expect(wrapper.text()).not.toContain('APP-A')
        expect(wrapper.text()).not.toContain('REG-A')
      } finally {
        initial.resolve(response('A')[kind])
        await mounted
        await flushPromises()
      }
    }
  )

  it('fetches both tables for the newly selected account', async () => {
    const wrapper = await mountSuspended(Dashboard)
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('APP-A')
      expect(wrapper.text()).toContain('REG-A')
    }, { timeout: 3000 })

    state.store!.switchCurrentAccount('B')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('APP-B')
      expect(wrapper.text()).toContain('REG-B')
    }, { timeout: 3000 })
    expect(wrapper.text()).not.toContain('APP-A')
    expect(wrapper.text()).not.toContain('REG-A')
    expect(state.requests.filter(request => request.account === 'B').map(request => request.kind).sort())
      .toEqual(['applications', 'registrations'])
  })

  it.each(['applications', 'registrations'] as const)(
    'starts the latest account %s request while an older request is pending', async (kind) => {
      const wrapper = await mountSuspended(Dashboard)
      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('APP-A')
        expect(wrapper.text()).toContain('REG-A')
      }, { timeout: 3000 })
      const earlier = pendingResponse()
      state[kind].mockImplementationOnce(() => earlier.promise)
      try {
        state.store!.switchCurrentAccount('B')
        await vi.waitFor(() => {
          expect(state.requests.some(request => request.account === 'B' && request.kind === kind)).toBe(true)
        }, { timeout: 3000 })

        state.store!.switchCurrentAccount('C')
        await vi.waitFor(() => {
          expect(state.requests.some(request => request.account === 'C' && request.kind === kind)).toBe(true)
          expect(wrapper.text()).toContain('APP-C')
          expect(wrapper.text()).toContain('REG-C')
        }, { timeout: 3000 })
      } finally {
        earlier.resolve(response('B')[kind])
        await flushPromises()
      }
      expect(wrapper.text()).toContain('APP-C')
      expect(wrapper.text()).toContain('REG-C')
      expect(wrapper.text()).not.toContain('APP-B')
      expect(wrapper.text()).not.toContain('REG-B')
    }
  )

  it('removes the previous account rows while the next account loads', async () => {
    const wrapper = await mountSuspended(Dashboard)
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('APP-A')
      expect(wrapper.text()).toContain('REG-A')
    }, { timeout: 3000 })
    const applications = pendingResponse()
    const registrations = pendingResponse()
    state.applications.mockImplementationOnce(() => applications.promise)
    state.registrations.mockImplementationOnce(() => registrations.promise)
    try {
      state.store!.switchCurrentAccount('B')
      await nextTick()
      expect(wrapper.text()).not.toContain('APP-A')
      expect(wrapper.text()).not.toContain('REG-A')
    } finally {
      applications.resolve(response('B').applications)
      registrations.resolve(response('B').registrations)
      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('APP-B')
        expect(wrapper.text()).toContain('REG-B')
      }, { timeout: 3000 })
    }
  })

  it('resets both search terms and page numbers before fetching a different account', async () => {
    sessionStorage.setItem('appPage', '4')
    sessionStorage.setItem('regPage', '3')
    sessionStorage.setItem('appSearch', 'previous application')
    sessionStorage.setItem('regSearch', 'previous registration')
    const wrapper = await mountSuspended(Dashboard)
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('APP-A')
      expect(wrapper.text()).toContain('REG-A')
    }, { timeout: 3000 })
    expect(state.searchApplications.mock.calls[0]!.slice(0, 3)).toEqual(['previous application', 6, 4])
    expect(state.searchRegistrations.mock.calls[0]!.slice(0, 3)).toEqual(['previous registration', 6, 3])

    state.store!.switchCurrentAccount('B')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('APP-B')
      expect(wrapper.text()).toContain('REG-B')
    }, { timeout: 3000 })
    const accountRequests = state.requests.filter(request => request.account === 'B')
    expect(accountRequests.find(request => request.kind === 'applications')!.args[1]).toBe(1)
    expect(accountRequests.find(request => request.kind === 'registrations')!.args[3]).toBe(1)
    expect(state.searchApplications).toHaveBeenCalledTimes(1)
    expect(state.searchRegistrations).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem('appSearch')).toBe('')
    expect(sessionStorage.getItem('regSearch')).toBe('')
  })

  it.each(['applications', 'registrations'] as const)(
    'can load another account after a failed %s request', async (kind) => {
      const wrapper = await mountSuspended(Dashboard)
      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('APP-A')
        expect(wrapper.text()).toContain('REG-A')
      }, { timeout: 3000 })
      state[kind].mockRejectedValueOnce(new Error('Synthetic request failure'))
      state.store!.switchCurrentAccount('B')
      await vi.waitFor(() => {
        expect(state.requests.filter(request => request.account === 'B')).toHaveLength(2)
      }, { timeout: 3000 })
      await flushPromises()
      state.store!.switchCurrentAccount('C')
      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('APP-C')
        expect(wrapper.text()).toContain('REG-C')
      }, { timeout: 3000 })
      expect(wrapper.text()).not.toContain('APP-A')
      expect(wrapper.text()).not.toContain('REG-A')
    }
  )
})
