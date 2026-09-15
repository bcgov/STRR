import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { mockHostApplicationWithoutReviewer, mockHostApplicationWithReviewer } from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import { AssignmentActions } from '#components'

const mockAssignApplication = vi.fn().mockResolvedValue(undefined)
const mockUnassignApplication = vi.fn().mockResolvedValue(undefined)
const mockAssignRegistration = vi.fn().mockResolvedValue(undefined)
const mockUnassignRegistration = vi.fn().mockResolvedValue(undefined)
const mockRefresh = vi.fn().mockResolvedValue(undefined)
const mockConfirm = vi.fn()
const mockUpdateRouteAndButtons = vi.fn()

const activeHeader = ref(mockHostApplicationWithReviewer.header)
const activeReg = ref({ id: 42 })
const isAssignedToUser = ref(true)

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => ({
    assignApplication: mockAssignApplication,
    unassignApplication: mockUnassignApplication,
    assignRegistration: mockAssignRegistration,
    unassignRegistration: mockUnassignRegistration,
    activeReg,
    isAssignedToUser,
    activeHeader
  }),
  storeToRefs: () => ({
    activeHeader,
    isAssignedToUser
  })
}))

mockNuxtImport('useStrrModals', () => () => ({
  openConfirmActionModal: mockConfirm,
  close: vi.fn(),
  openErrorModal: vi.fn()
}))

vi.mock('@/composables/useExaminerRoute', () => ({
  useExaminerRoute: () => ({
    updateRouteAndButtons: mockUpdateRouteAndButtons
  })
}))

vi.mock('@/enums/routes', () => ({
  RoutesE: {
    EXAMINE: 'examine',
    REGISTRATION: 'registration'
  }
}))

describe('AssignmentActions Component', () => {
  let wrapper: any
  let releases: (() => void)[] = []

  const deferred = () => {
    const result = Promise.withResolvers<void>()
    releases.push(result.resolve)
    return result
  }

  const mount = (isRegistrationPage = false) => mountSuspended(AssignmentActions, {
    props: { isRegistrationPage, refresh: mockRefresh },
    global: { plugins: [enI18n] }
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    activeHeader.value = mockHostApplicationWithReviewer.header
    isAssignedToUser.value = true
    releases = []
    for (const mock of [
      mockAssignApplication, mockUnassignApplication, mockAssignRegistration, mockUnassignRegistration, mockRefresh
    ]) {
      mock.mockReset().mockResolvedValue(undefined)
    }
    useButtonControl().setButtonControl({
      leftButtons: [{ label: 'Back', action: vi.fn(), disabled: true, loading: false }],
      rightButtons: [
        { label: 'Assignment', action: vi.fn(), disabled: false, loading: false },
        { label: 'Approve', action: vi.fn(), disabled: false, loading: false }
      ]
    })
    wrapper = await mount()
    await flushPromises()
  })

  afterEach(async () => {
    releases.forEach(resolve => resolve())
    await flushPromises()
    wrapper.unmount()
  })

  it('calls updateRouteAndButtons on component mount', () => {
    expect(mockUpdateRouteAndButtons).toHaveBeenCalled()
    const args = mockUpdateRouteAndButtons.mock.calls[0]
    expect(args[0]).toBe('examine')
    expect(args[1]).toHaveProperty('assign')
    expect(args[1]).toHaveProperty('unassign')
  })

  it('calls updateRouteAndButtons when activeHeader changes', async () => {
    mockUpdateRouteAndButtons.mockClear()
    activeHeader.value = mockHostApplicationWithoutReviewer.header
    await flushPromises()
    expect(mockUpdateRouteAndButtons).toHaveBeenCalled()
  })

  const getButtonActions = () => {
    const calls = mockUpdateRouteAndButtons.mock.calls
    const latestCall = calls[calls.length - 1]
    return latestCall ? latestCall[1] : null
  }

  it('calls assignApplication when assign action is triggered', async () => {
    const buttonConfig = getButtonActions()
    expect(buttonConfig).toBeTruthy()
    const assignAction = buttonConfig.assign.action
    await assignAction('12345678901234')
    expect(mockAssignApplication).toHaveBeenCalledWith('12345678901234')
  })

  it('calls unassignApplication directly when current user is the assignee', async () => {
    const buttonConfig = getButtonActions()
    expect(buttonConfig).toBeTruthy()
    const unassignAction = buttonConfig.unassign.action
    await unassignAction('12345678901234')
    expect(mockUnassignApplication).toHaveBeenCalledWith('12345678901234')
  })

  it('requests a refresh after successful assignment', async () => {
    const buttonConfig = getButtonActions()
    expect(buttonConfig).toBeTruthy()
    const assignAction = buttonConfig.assign.action
    await assignAction('12345678901234')
    expect(mockRefresh).toHaveBeenCalledOnce()
  })

  it('requests a refresh after successful unassignment', async () => {
    const buttonConfig = getButtonActions()
    expect(buttonConfig).toBeTruthy()
    const unassignAction = buttonConfig.unassign.action
    await unassignAction('12345678901234')
    expect(mockRefresh).toHaveBeenCalledOnce()
  })

  it.each([
    { name: 'application assignment', registration: false, key: 'assign', api: mockAssignApplication },
    { name: 'application unassignment', registration: false, key: 'unassign', api: mockUnassignApplication },
    { name: 'registration assignment', registration: true, key: 'assign', api: mockAssignRegistration },
    { name: 'registration unassignment', registration: true, key: 'unassign', api: mockUnassignRegistration }
  ])('guards $name through mutation and refresh', async ({ registration, key, api }) => {
    wrapper.unmount()
    wrapper = await mount(registration)
    const mutation = deferred()
    const reload = deferred()
    api.mockReturnValueOnce(mutation.promise)
    mockRefresh.mockReturnValueOnce(reload.promise)
    const action = getButtonActions()[key].action
    const first = action('APP-123')
    const second = action('APP-123')
    await flushPromises()

    expect(api).toHaveBeenCalledOnce()
    expect(api).toHaveBeenCalledWith(registration ? 42 : 'APP-123')
    expect(mockRefresh).not.toHaveBeenCalled()
    expect(useButtonControl().getButtonControl()?.rightButtons[0]?.loading).toBe(true)
    expect(useButtonControl().getButtonControl()?.rightButtons[1]?.disabled).toBe(true)

    mutation.resolve()
    await flushPromises()
    expect(mockRefresh).toHaveBeenCalledOnce()
    await action('APP-123')
    expect(api).toHaveBeenCalledOnce()
    expect(useButtonControl().getButtonControl()?.rightButtons[0]?.loading).toBe(true)

    reload.resolve()
    await Promise.all([first, second])
    expect(useButtonControl().getButtonControl()?.rightButtons[0]).toMatchObject({ loading: false, disabled: false })
    expect(useButtonControl().getButtonControl()?.leftButtons[0]?.disabled).toBe(true)
  })

  it('does not complete assignment until the page refresh resolves', async () => {
    const reload = deferred()
    mockRefresh.mockReturnValueOnce(reload.promise)
    const finished = vi.fn()
    const action = getButtonActions().assign.action('APP-123').then(finished)
    await flushPromises()

    expect(mockRefresh).toHaveBeenCalledOnce()
    expect(finished).not.toHaveBeenCalled()
    reload.resolve()
    await action
    expect(finished).toHaveBeenCalledOnce()
  })

  it('blocks a page decision while assignment is pending', async () => {
    const mutation = deferred()
    mockAssignApplication.mockReturnValueOnce(mutation.promise)
    const assignment = getButtonActions().assign.action('APP-123')
    const approve = vi.fn().mockResolvedValue(undefined)

    await useExaminerActions().manageAction(
      { id: 'APP-123' }, ApplicationActionsE.APPROVE, approve, 'right', 1, vi.fn()
    )

    expect(approve).not.toHaveBeenCalled()
    mutation.resolve()
    await assignment
  })

  it('blocks assignment while a page decision is pending', async () => {
    const mutation = deferred()
    const decision = useExaminerActions().manageAction(
      { id: 'APP-123' }, ApplicationActionsE.APPROVE, () => mutation.promise, 'right', 1, vi.fn()
    )

    await getButtonActions().assign.action('APP-123')

    expect(mockAssignApplication).not.toHaveBeenCalled()
    mutation.resolve()
    await decision
  })

  it('guards repeated confirmation callbacks for another examiner\'s assignment', async () => {
    isAssignedToUser.value = false
    await flushPromises()
    const mutation = deferred()
    mockUnassignApplication.mockReturnValueOnce(mutation.promise)
    await getButtonActions().unassign.action('APP-123')

    expect(mockUnassignApplication).not.toHaveBeenCalled()
    const confirm = mockConfirm.mock.calls[0]![3]
    const first = confirm()
    const second = confirm()
    await flushPromises()

    expect(mockUnassignApplication).toHaveBeenCalledOnce()
    mutation.resolve()
    await Promise.all([first, second])
    expect(mockRefresh).toHaveBeenCalledOnce()
  })
})
