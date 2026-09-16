import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, reactive, ref } from 'vue'
import { mockHostRegistration, mockSnapshots } from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import SnapshotDetails from '~/pages/registration/[registrationId]/snapshots/[snapshotId].vue'
import RegistrationDetails from '~/pages/registration/[registrationId]/index.vue'
import ExamineLayout from '~/layouts/examine.vue'

const mockApi = vi.fn()
const decisionsEnabled = ref(false)
const route = reactive({
  name: 'registration-registrationId-snapshots-snapshotId',
  params: { registrationId: '222', snapshotId: '7' }
})

mockNuxtImport('useNuxtApp', original => () => Object.assign(Object.create(original()), {
  $i18n: { t: (key: string) => enI18n.global.t(key) },
  $strrApi: mockApi,
  $payApi: vi.fn().mockResolvedValue({})
}))
mockNuxtImport('useStrrApi', () => () => ({ getAccountApplications: vi.fn() }))
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
  openErrorModal: vi.fn(), openConfirmActionModal: vi.fn(), close: vi.fn()
}))
mockNuxtImport('useExaminerNotes', () => () => ({
  withNoteCheck: (action: () => Promise<void>) => action(), useNoteLeaveGuard: vi.fn()
}))

let wrapper: Awaited<ReturnType<typeof mountSuspended>> | undefined
let releases: (() => void)[] = []
const registration = (id: number) => ({
  ...mockHostRegistration,
  id,
  registrationNumber: `REG${id}`,
  header: {
    ...mockHostRegistration.header,
    applicationNumber: `${id}0000000`,
    assignee: { username: 'examiner1', displayName: 'Synthetic Examiner' }
  }
})
const snapshot = (id: number, registrationId = 222) => ({
  id,
  registrationId,
  version: id,
  snapshotDateTime: '2025-04-02T12:00:00',
  snapshotData: registration(registrationId)
})
const deferred = <T>() => {
  const result = Promise.withResolvers<T>()
  releases.push(() => result.resolve(undefined as T))
  return result
}
const mount = (page: typeof SnapshotDetails | typeof RegistrationDetails = SnapshotDetails) =>
  mountSuspended(defineComponent({
    render: () => h(ExamineLayout, null, { default: () => h(page) })
  }), {
    global: {
      plugins: [enI18n],
      stubs: {
        ConnectHeaderWrapper: true,
        ConnectSystemBanner: true,
        ConnectFooter: true,
        StrataSubHeader: true,
        PlatformSubHeader: true,
        HostSupportingInfo: true,
        StrataSupportingInfo: true,
        ConnectExpansionRoot: true,
        ConnectSpinner: true,
        DocumentUpload: true,
        ComposeNoc: true,
        DecisionPanel: true
      }
    }
  })
const error = () => Object.assign(new Error('synthetic snapshot failure'), { statusCode: 503 })

beforeEach(() => {
  vi.clearAllMocks()
  clearNuxtData(['snapshot-details-view', 'registration-details-view'])
  mockApi.mockReset().mockResolvedValue(snapshot(7))
  route.name = 'registration-registrationId-snapshots-snapshotId'
  route.params.registrationId = '222'
  route.params.snapshotId = '7'
  useExaminerStore().activeRecord = registration(111)
  useExaminerStore().snapshotInfo = { ...mockSnapshots[0], version: 1 }
  useButtonControl().setButtonControl({
    leftButtons: [],
    rightButtons: [{ label: 'Old action', action: vi.fn() }]
  })
  releases = []
})

afterEach(async () => {
  wrapper?.unmount()
  wrapper = undefined
  releases.forEach(release => release())
  await flushPromises()
  clearNuxtData(['snapshot-details-view', 'registration-details-view'])
  useExaminerStore().activeRecord = undefined
})

describe.each([false, true])('snapshot loading with newer decision buttons %s', (enabled) => {
  beforeEach(() => { decisionsEnabled.value = enabled })

  it('clears stale record and metadata while loading, then shows the requested read-only snapshot', async () => {
    const load = deferred<ReturnType<typeof snapshot>>()
    mockApi.mockReturnValueOnce(load.promise)
    wrapper = await mount()
    await flushPromises()

    expect(mockApi).toHaveBeenCalledWith('/registrations/222/snapshots/7', { method: 'GET' })
    expect(useExaminerStore().activeRecord).toBeUndefined()
    expect(useExaminerStore().snapshotInfo).toBeUndefined()
    expect(wrapper.find('[data-testid="button-control"]').exists()).toBe(false)
    load.resolve(snapshot(7))
    await flushPromises()

    expect(wrapper.text()).toContain('REG222')
    expect(wrapper.find('[data-testid="snapshot-info"]').text())
      .toContain(`${enI18n.global.t('strr.label.version')} 7`)
    expect(wrapper.find('[data-testid="snapshot-info"]').text()).toContain('2025-04-02')
    expect(wrapper.find('[data-testid="button-control"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="view-receipt-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="edit-rental-unit-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="edit-registration-email"]').exists()).toBe(false)
  })

  it.each([true, false])('shows a fetch error and retries with a prior record %s', async (hasPriorRecord) => {
    if (!hasPriorRecord) { useExaminerStore().activeRecord = undefined }
    mockApi.mockRejectedValueOnce(error())
    wrapper = await mount()
    await flushPromises()

    expect(wrapper.find('[data-testid="examiner-error-state"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('REG111')
    expect(wrapper.find('[data-testid="snapshot-info"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="button-control"]').exists()).toBe(false)
    mockApi.mockResolvedValueOnce(snapshot(7))
    await wrapper.findAll('button').find(button => button.text() === 'Try Again')!.trigger('click')
    await flushPromises()

    expect(mockApi.mock.calls.map(([path]) => path)).toEqual([
      '/registrations/222/snapshots/7', '/registrations/222/snapshots/7'
    ])
    expect(wrapper.find('[data-testid="examiner-error-state"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('REG222')
    expect(useExaminerStore().snapshotInfo).toMatchObject({ id: 7, version: 7 })
  })

  it('removes an already displayed snapshot and metadata when reloading fails', async () => {
    wrapper = await mount()
    await flushPromises()
    expect(wrapper.text()).toContain('REG222')
    mockApi.mockRejectedValueOnce(error())
    await refreshNuxtData('snapshot-details-view')
    await flushPromises()

    expect(wrapper.find('[data-testid="examiner-error-state"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('REG222')
    expect(wrapper.find('[data-testid="snapshot-info"]').exists()).toBe(false)
    expect(useExaminerStore().activeRecord).toBeUndefined()
    expect(useExaminerStore().snapshotInfo).toBeUndefined()
  })

  it.each([
    { target: 'snapshot', fails: false }, { target: 'snapshot', fails: true },
    { target: 'live', fails: false }, { target: 'live', fails: true }
  ])('ignores an older snapshot after a newer $target request (failure: $fails)', async ({ target, fails }) => {
    const older = deferred<ReturnType<typeof snapshot>>()
    mockApi.mockReturnValueOnce(older.promise)
    wrapper = await mount()
    await flushPromises()
    wrapper.unmount()
    wrapper = undefined
    route.params.registrationId = '333'
    if (target === 'snapshot') {
      route.params.snapshotId = '8'
      if (fails) { mockApi.mockRejectedValueOnce(error()) } else { mockApi.mockResolvedValueOnce(snapshot(8, 333)) }
      wrapper = await mount()
    } else {
      route.name = 'registration-registrationId'
      if (fails) { mockApi.mockRejectedValueOnce(error()) } else { mockApi.mockResolvedValueOnce(registration(333)) }
      wrapper = await mount(RegistrationDetails)
    }
    await flushPromises()
    older.resolve(snapshot(7))
    await flushPromises()

    expect(useExaminerStore().activeReg?.registrationNumber).toBe(fails ? undefined : 'REG333')
    if (fails) {
      expect(wrapper.find('[data-testid="examiner-error-state"]').exists()).toBe(true)
      expect(useExaminerStore().snapshotInfo).toBeUndefined()
      return
    }
    expect(wrapper.text()).toContain('REG333')
    if (target === 'snapshot') {
      expect(useExaminerStore().snapshotInfo).toMatchObject({ id: 8, version: 8 })
      expect(wrapper.find('[data-testid="snapshot-info"]').text())
        .toContain(`${enI18n.global.t('strr.label.version')} 8`)
    } else {
      expect(useExaminerStore().snapshotInfo).toBeUndefined()
      expect(wrapper.find('[data-testid="snapshot-info"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="edit-rental-unit-button"]').attributes('disabled')).toBeUndefined()
      expect(wrapper.find('[data-testid="edit-registration-email"]').attributes('disabled')).toBeUndefined()
    }
  })

  it('displays a missing snapshot timestamp without an invalid date', async () => {
    mockApi.mockResolvedValueOnce({ ...snapshot(7), snapshotDateTime: null })
    wrapper = await mount()
    await flushPromises()

    expect(wrapper.find('[data-testid="snapshot-info"]').text())
      .toContain(`${enI18n.global.t('strr.label.date')} -`)
  })

  it('ignores an older live-record response after opening a snapshot', async () => {
    const older = deferred<ReturnType<typeof registration>>()
    mockApi.mockReturnValueOnce(older.promise)
    const previous = useExaminerStore().getRegistrationById('111')
    mockApi.mockResolvedValueOnce(snapshot(7))
    wrapper = await mount()
    await flushPromises()
    older.resolve(registration(111))
    await previous
    await flushPromises()

    expect(useExaminerStore().activeReg?.registrationNumber).toBe('REG222')
    expect(wrapper.text()).toContain('REG222')
    expect(useExaminerStore().snapshotInfo).toMatchObject({ id: 7, version: 7 })
  })
})
