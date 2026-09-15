import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { mockHostApplication } from '../mocks/mockedData'

mockNuxtImport('useLocalePath', () => () => (path: string) => path)

const mockSetButtonControl = vi.fn()
const mockGetButtonControl = vi.fn().mockReturnValue({ leftButtons: [], rightButtons: [] })

mockNuxtImport('useButtonControl', () => () => ({
  setButtonControl: mockSetButtonControl,
  getButtonControl: mockGetButtonControl
}))

const mockRegistration = mockHostApplication.registration
const mockHeader = mockHostApplication.header
const mockActiveReg = ref(mockRegistration)
const mockActiveHeader = ref(mockHeader)
const mockIsApplication = ref(true)
const mockStore = {
  activeReg: mockActiveReg,
  activeHeader: mockActiveHeader,
  isApplication: mockIsApplication
}

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => mockStore,
  storeToRefs: (store: any) => ({
    activeReg: store.activeReg,
    activeHeader: store.activeHeader,
    isApplication: store.isApplication
  })
}))

describe('useExaminerRoute', () => {
  beforeEach(() => {
    mockSetButtonControl.mockClear()
    mockGetButtonControl.mockReset().mockReturnValue({ leftButtons: [], rightButtons: [] })
    vi.spyOn(window.history, 'replaceState')
    mockActiveReg.value = mockRegistration
    mockActiveHeader.value = {
      ...mockHeader,
      examinerActions: ['APPROVE', 'REJECT', 'SEND_NOC']
    }
    mockIsApplication.value = true
  })

  afterEach(() => vi.restoreAllMocks())

  it('updates route and adds buttons based on examiner actions', () => {
    const { updateRouteAndButtons } = useExaminerRoute()
    const approveAction = vi.fn()
    const rejectAction = vi.fn()
    const sendNocAction = vi.fn()
    updateRouteAndButtons(
      '/test-route',
      {
        approve: { action: approveAction, label: 'Approve' },
        reject: { action: rejectAction, label: 'Reject' },
        sendNotice: { action: sendNocAction, label: 'Send NOC' }
      }
    )

    expect(window.history.replaceState).toHaveBeenCalledWith(
      history.state, '', `/test-route/${mockHeader.applicationNumber}`
    )
    const controls = mockSetButtonControl.mock.calls[0]![0]
    expect(controls.rightButtons.map((button: ConnectBtnControlItem) => button.label))
      .toEqual(['Send NOC', 'Reject', 'Approve'])
    controls.rightButtons.forEach((button: ConnectBtnControlItem) => button.action())
    for (const action of [approveAction, rejectAction, sendNocAction]) {
      expect(action).toHaveBeenCalledWith(mockHeader.applicationNumber)
    }
  })

  it('adds unassign button when reviewer exists', () => {
    mockActiveHeader.value = {
      ...mockHeader,
      examinerActions: ['APPROVE'],
      assignee: { username: 'testuser', displayName: 'Test User' }
    }
    const { updateRouteAndButtons } = useExaminerRoute()
    const unassignAction = vi.fn()
    updateRouteAndButtons(
      '/test-route',
      { unassign: { action: unassignAction, label: 'Unassign' } }
    )
    const buttons = mockSetButtonControl.mock.calls[0]![0].rightButtons
    expect(buttons).toHaveLength(1)
    expect(buttons[0].label).toBe('Unassign')
    buttons[0].action()
    expect(unassignAction).toHaveBeenCalledWith(mockHeader.applicationNumber)
  })

  it('adds assign button when no reviewer exists', () => {
    mockActiveHeader.value = {
      ...mockHeader,
      examinerActions: ['APPROVE'],
      assignee: {}
    }
    const { updateRouteAndButtons } = useExaminerRoute()
    const assignAction = vi.fn()
    updateRouteAndButtons(
      '/test-route',
      { assign: { action: assignAction, label: 'Assign' } }
    )
    const buttons = mockSetButtonControl.mock.calls[0]![0].rightButtons
    expect(buttons).toHaveLength(1)
    expect(buttons[0].label).toBe('Assign')
    buttons[0].action()
    expect(assignAction).toHaveBeenCalledWith(mockHeader.applicationNumber)
  })

  it('preserves existing navigation and unrelated controls when adding a decision', () => {
    const existingButtons = {
      leftButtons: [{ label: 'Left', action: vi.fn() }],
      rightButtons: [{ label: 'Right', action: vi.fn() }]
    }
    mockGetButtonControl.mockReturnValueOnce(existingButtons)
    const { updateRouteAndButtons } = useExaminerRoute()
    const approveAction = vi.fn()
    updateRouteAndButtons(
      '/test-route',
      { approve: { action: approveAction, label: 'Approve', disabled: true } }
    )
    const controls = mockSetButtonControl.mock.calls[0]![0]
    expect(controls.leftButtons).toEqual(existingButtons.leftButtons)
    expect(controls.rightButtons[0]).toEqual(existingButtons.rightButtons[0])
    expect(controls.rightButtons[1]).toMatchObject({ label: 'Approve', disabled: true })
  })

  it('clears controls without changing the route when there is no active record', () => {
    mockActiveReg.value = undefined
    mockActiveHeader.value = {
      ...mockHeader,
      examinerActions: ['APPROVE']
    }
    const { updateRouteAndButtons } = useExaminerRoute()
    const approveAction = vi.fn()
    updateRouteAndButtons(
      '/test-route',
      { approve: { action: approveAction, label: 'Approve' } }
    )
    expect(mockSetButtonControl).toHaveBeenCalledWith({ leftButtons: [], rightButtons: [] })
    expect(window.history.replaceState).not.toHaveBeenCalled()
  })
})
