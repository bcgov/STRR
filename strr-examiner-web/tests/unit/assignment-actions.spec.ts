import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { mockHostApplicationWithoutReviewer, mockHostApplicationWithReviewer } from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import { AssignmentActions } from '#components'

const mockAssignApplication = vi.fn().mockResolvedValue(undefined)
const mockUnassignApplication = vi.fn().mockResolvedValue(undefined)
const mockUpdateRouteAndButtons = vi.fn()

const activeHeader = ref(mockHostApplicationWithReviewer.header)
const isAssignedToUser = ref(true)

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => ({
    assignApplication: mockAssignApplication,
    unassignApplication: mockUnassignApplication,
    isAssignedToUser,
    activeHeader
  }),
  storeToRefs: () => ({
    activeHeader,
    isAssignedToUser
  })
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

  beforeEach(async () => {
    vi.clearAllMocks()
    activeHeader.value = mockHostApplicationWithReviewer.header
    isAssignedToUser.value = true
    wrapper = await mountSuspended(AssignmentActions, {
      global: {
        plugins: [enI18n]
      }
    })
    await flushPromises()
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

  it('emits refresh event after successful assignment', async () => {
    const buttonConfig = getButtonActions()
    expect(buttonConfig).toBeTruthy()
    const assignAction = buttonConfig.assign.action
    await assignAction('12345678901234')
    expect(wrapper.emitted()).toHaveProperty('refresh')
  })

  it('emits refresh event after successful unassignment', async () => {
    const buttonConfig = getButtonActions()
    expect(buttonConfig).toBeTruthy()
    const unassignAction = buttonConfig.unassign.action
    await unassignAction('12345678901234')
    expect(wrapper.emitted()).toHaveProperty('refresh')
  })
})
