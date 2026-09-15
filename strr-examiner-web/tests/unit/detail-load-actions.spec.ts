import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { mockHostApplicationWithReviewer, mockHostRegistration } from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import ApplicationDetails from '~/pages/examine/[applicationId].vue'
import RegistrationDetails from '~/pages/registration/[registrationId]/index.vue'
import ExamineLayout from '~/layouts/examine.vue'

const mockApi = vi.fn()
const mockGetApplications = vi.fn()
const decisionsEnabled = ref(false)
const route = { name: 'examine-applicationId', params: { applicationId: '2222222222', registrationId: '222' } }
const mockOpenErrorModal = vi.fn()

mockNuxtImport('useNuxtApp', original => () => Object.assign(Object.create(original()), {
  $i18n: { t: (key: string) => enI18n.global.t(key) },
  $strrApi: mockApi,
  $payApi: vi.fn().mockResolvedValue({})
}))
mockNuxtImport('useStrrApi', () => () => ({ getAccountApplications: mockGetApplications }))
mockNuxtImport('useKeycloak', () => () => ({ kcUser: ref({ userName: 'examiner1' }), isAuthenticated: ref(true) }))
mockNuxtImport('useRoute', () => () => route)
mockNuxtImport('useLocalePath', () => () => (path: string) => path)
mockNuxtImport('useFeatureFlags', () => () => ({ isFeatureEnabled: () => ref(false) }))
mockNuxtImport('useExaminerFeatureFlags', () => () => ({
  isExaminerDecisionsEnabled: decisionsEnabled,
  isExaminerNotesEnabled: ref(false),
  isHistoricalApplicationsTableEnabled: ref(false),
  isSnapshotVersionsTableEnabled: ref(false),
  isSplitDashboardTableEnabled: ref(false)
}))
mockNuxtImport('useStrrModals', () => () => ({
  openErrorModal: mockOpenErrorModal,
  openConfirmActionModal: vi.fn(),
  close: vi.fn()
}))
mockNuxtImport('useExaminerNotes', () => () => ({
  withNoteCheck: (action: () => Promise<void>) => action(),
  useNoteLeaveGuard: vi.fn()
}))

let wrapper: Awaited<ReturnType<typeof mountSuspended>> | undefined
let releases: (() => void)[] = []
const deferred = <T>() => {
  const result = Promise.withResolvers<T>()
  releases.push(() => result.resolve(undefined as T))
  return result
}
const mount = (
  page: typeof ApplicationDetails | typeof RegistrationDetails,
  renderDetails = false
) => mountSuspended(defineComponent({
  render: () => h(ExamineLayout, null, { default: () => h(page) })
}), {
  global: {
    plugins: [enI18n],
    stubs: {
      ConnectHeaderWrapper: true,
      ConnectSystemBanner: true,
      ConnectFooter: true,
      ApplicationDetailsView: !renderDetails,
      DocumentUpload: true,
      ComposeNoc: true,
      DecisionPanel: true,
      ConnectSpinner: true
    }
  }
})

const assignedHeader = (header: typeof mockHostApplicationWithReviewer.header, number: string) => ({
  ...header,
  applicationNumber: number,
  assignee: { username: 'examiner1', displayName: 'Synthetic Examiner' },
  examinerActions: ['APPROVE', 'REJECT', 'SEND_NOC']
})
const application = (number: string) => ({
  ...mockHostApplicationWithReviewer,
  header: assignedHeader(mockHostApplicationWithReviewer.header, number)
})
const registration = (id: number) => ({
  ...mockHostRegistration,
  id,
  header: { ...assignedHeader(mockHostRegistration.header, '2222222222'), examinerActions: ['APPROVE', 'CANCEL'] }
})
const cases = [
  {
    name: 'application',
    page: ApplicationDetails,
    old: application('1111111111'),
    fresh: application('2222222222'),
    url: '/applications/2222222222',
    route: '/examine/2222222222'
  },
  {
    name: 'registration',
    page: RegistrationDetails,
    old: registration(111),
    fresh: registration(222),
    url: '/registrations/222',
    route: '/registration/222'
  }
]

beforeEach(() => {
  vi.clearAllMocks()
  clearNuxtData(['application-details-view', 'registration-details-view'])
  mockApi.mockReset().mockResolvedValue({})
  mockGetApplications.mockReset().mockResolvedValue({ applications: [] })
  route.params.applicationId = '2222222222'
  useButtonControl().setButtonControl({ leftButtons: [], rightButtons: [] })
  useExaminerDecision().resetDecision()
  releases = []
})

afterEach(async () => {
  wrapper?.unmount()
  wrapper = undefined
  releases.forEach(release => release())
  await flushPromises()
  clearNuxtData(['application-details-view', 'registration-details-view'])
  useExaminerStore().activeRecord = undefined
})

it('ignores an older next-application response after opening a registration', async () => {
  const queue = deferred<{ applications: ReturnType<typeof application>[] }>()
  mockGetApplications.mockReturnValueOnce(queue.promise)
  const store = useExaminerStore()
  const oldRequest = store.getNextApplication()
  const fresh = registration(222)
  mockApi.mockResolvedValueOnce(fresh)
  await store.getRegistrationById('222')
  queue.resolve({ applications: [application('1111111111')] })
  await oldRequest

  expect(store.activeRecord).toEqual(fresh)
  expect(store.isApplication).toBe(false)
})

it('does not restore an older registration after the next-application queue is empty', async () => {
  const older = deferred<ReturnType<typeof registration>>()
  mockApi.mockReturnValueOnce(older.promise)
  const store = useExaminerStore()
  const oldRequest = store.getRegistrationById('111')
  await store.getNextApplication()
  older.resolve(registration(111))
  await oldRequest

  expect(store.activeRecord).toBeUndefined()
})

describe.each([false, true])('detail loads with newer decision buttons %s', (enabled) => {
  beforeEach(() => { decisionsEnabled.value = enabled })

  describe.each(cases)('$name', ({ page, old, fresh, url, route: path }) => {
    it('hides prior record actions while the requested record is loading', async () => {
      const load = deferred<typeof fresh>()
      useExaminerStore().activeRecord = old
      mockApi.mockReturnValueOnce(load.promise)
      wrapper = await mount(page)
      await flushPromises()

      expect(mockApi).toHaveBeenCalledWith(url, { method: 'GET' })
      expect(wrapper.find('[data-testid="button-control"]').exists()).toBe(false)
      load.resolve(fresh)
      await flushPromises()
      expect(wrapper.find('[data-testid="button-control"]').exists()).toBe(true)
    })

    it('keeps stale actions and IDs out of an initial fetch error and recovers on retry', async () => {
      useExaminerStore().activeRecord = old
      window.history.replaceState({}, '', path)
      mockApi.mockRejectedValueOnce(new Error('synthetic detail failure'))
      wrapper = await mount(page)
      await flushPromises()

      expect(wrapper.find('[data-testid="examiner-error-state"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="button-control"]').exists()).toBe(false)
      expect(window.location.pathname).toBe(path)
      expect(mockApi.mock.calls.every(([, options]) => options.method === 'GET')).toBe(true)

      const recovered = { ...fresh, header: { ...fresh.header, assignee: { username: 'another-examiner' } } }
      mockApi.mockResolvedValueOnce(recovered)
      const retry = wrapper.findAll('button').find(button => button.text() === 'Try Again')!
      await retry.trigger('click')
      await flushPromises()
      expect(wrapper.find('[data-testid="examiner-error-state"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="button-control"]').exists()).toBe(true)
      expect(useExaminerStore().activeRecord).toEqual(recovered)
      expect(useExaminerStore().isAssignedToUser).toBe(false)
      expect(window.location.pathname).toBe(path)
      if (!enabled) {
        const approve = useButtonControl().getButtonControl()!.rightButtons
          .find(button => button.label.includes('Approve'))!
        expect(approve.disabled).toBe(true)
      }
    })

    it.each(['success', 'failure'])('ignores an older request after the current load ends in %s', async (outcome) => {
      const older = deferred<typeof old>()
      mockApi.mockReturnValueOnce(older.promise)
      const store = useExaminerStore()
      const oldRequest = 'registration' in old
        ? store.getApplicationById('1111111111')
        : store.getRegistrationById('111')
      if (outcome === 'success') {
        mockApi.mockResolvedValueOnce(fresh)
      } else {
        mockApi.mockRejectedValueOnce(new Error('synthetic current load failure'))
      }
      window.history.replaceState({}, '', path)
      wrapper = await mount(page)
      await flushPromises()
      expect(mockApi).toHaveBeenCalledWith(url, { method: 'GET' })
      older.resolve(old)
      await oldRequest
      await flushPromises()

      expect(store.activeRecord).toEqual(outcome === 'success' ? fresh : undefined)
      expect(wrapper.find('[data-testid="button-control"]').exists()).toBe(outcome === 'success')
      expect(window.location.pathname).toBe(path)
      expect(mockApi.mock.calls.every(([, options]) => options.method === 'GET')).toBe(true)
    })

    it('removes actions when a successful unassignment is followed by a failed reload', async () => {
      mockApi.mockResolvedValueOnce(fresh)
      wrapper = await mount(page)
      await flushPromises()
      const unassign = wrapper.findAll('[data-testid="button-control"] button')
        .find(button => button.text() === enI18n.global.t('btn.unassign'))!
      expect(unassign).toBeDefined()
      mockApi.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('synthetic reload failure'))
      await unassign.trigger('click')
      await flushPromises()

      expect(mockApi).toHaveBeenCalledWith(`${url}/unassign`, { method: 'PUT' })
      expect(wrapper.find('[data-testid="examiner-error-state"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="button-control"]').exists()).toBe(false)
      expect(mockApi.mock.calls.filter(([, options]) => options.method === 'PUT')).toHaveLength(1)
      expect(mockOpenErrorModal).not.toHaveBeenCalled()
      expect(useExaminerStore().activeRecord).toBeUndefined()
      expect(useButtonControl().getButtonControl()).toEqual({ leftButtons: [], rightButtons: [] })
    })
  })

  it('shows an empty queue without record controls when no next application exists', async () => {
    route.params.applicationId = 'startNew'
    useExaminerStore().activeRecord = application('1111111111')
    wrapper = await mount(ApplicationDetails, true)
    await flushPromises()

    expect(mockGetApplications).toHaveBeenCalledOnce()
    expect(wrapper.find('[data-testid="button-control"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('No applications are available for examination.')
    expect(wrapper.find('a').attributes('href')).toBe('/dashboard')
    expect(mockApi).not.toHaveBeenCalled()
  })

  it('auto-assigns only the newly loaded unassigned application', async () => {
    const fresh = application('2222222222')
    const unassigned = { ...fresh, header: { ...fresh.header, assignee: { username: '' } } }
    useExaminerStore().activeRecord = application('1111111111')
    mockApi.mockResolvedValueOnce(unassigned).mockResolvedValueOnce(undefined).mockResolvedValueOnce(fresh)
    wrapper = await mount(ApplicationDetails)
    await flushPromises()

    expect(mockApi.mock.calls).toEqual([
      ['/applications/2222222222', { method: 'GET' }],
      ['/applications/2222222222/assign', { method: 'PUT' }],
      ['/applications/2222222222', { method: 'GET' }]
    ])
    expect(useExaminerStore().isAssignedToUser).toBe(true)
    expect(wrapper.find('[data-testid="button-control"]').exists()).toBe(true)
  })

  it('does not auto-assign a previous unassigned application after another application fails to load', async () => {
    const old = application('1111111111')
    useExaminerStore().activeRecord = { ...old, header: { ...old.header, assignee: { username: '' } } }
    mockApi.mockImplementation((_: string, options: { method: string }) => options.method === 'GET'
      ? Promise.reject(new Error('synthetic detail failure'))
      : Promise.resolve(undefined))
    wrapper = await mount(ApplicationDetails)
    await flushPromises()

    expect(wrapper.find('[data-testid="examiner-error-state"]').exists()).toBe(true)
    expect(mockApi.mock.calls.filter(([, options]) => options.method === 'PUT')).toEqual([])
    expect(mockApi).toHaveBeenCalledOnce()
  })
})
