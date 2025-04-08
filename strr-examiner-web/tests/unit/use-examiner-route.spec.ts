import { describe, it, beforeEach, vi } from 'vitest'
import { mockHostApplication } from '../mocks/mockedData'

vi.mock('#app', () => ({
  useLocalePath: (path: string) => path
}))

const mockSetButtonControl = vi.fn()
const mockGetButtonControl = vi.fn().mockReturnValue({ leftButtons: [], rightButtons: [] })

vi.mock('@/composables/useButtonControl', () => ({
  useButtonControl: () => ({
    setButtonControl: mockSetButtonControl,
    getButtonControl: mockGetButtonControl
  })
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
    mockGetButtonControl.mockClear()
    mockActiveReg.value = mockRegistration
    mockActiveHeader.value = {
      ...mockHeader,
      examinerActions: ['APPROVE', 'REJECT', 'SEND_NOC']
    }
    mockIsApplication.value = true
  })

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
  })

  it('adds unassign button when reviewer exists', () => {
    mockActiveHeader.value = {
      ...mockHeader,
      examinerActions: ['APPROVE'],
      reviewer: { username: 'testuser', displayName: 'Test User' }
    }
    const { updateRouteAndButtons } = useExaminerRoute()
    const unassignAction = vi.fn()
    updateRouteAndButtons(
      '/test-route',
      { unassign: { action: unassignAction, label: 'Unassign' } }
    )
  })

  it('adds assign button when no reviewer exists', () => {
    mockActiveHeader.value = {
      ...mockHeader,
      examinerActions: ['APPROVE'],
      reviewer: {}
    }
    const { updateRouteAndButtons } = useExaminerRoute()
    const assignAction = vi.fn()
    updateRouteAndButtons(
      '/test-route',
      { assign: { action: assignAction, label: 'Assign' } }
    )
  })

  it('merges with existing buttons when mergeWithExisting is true', () => {
    const existingButtons = {
      leftButtons: [{ label: 'Left', action: vi.fn() }],
      rightButtons: [{ label: 'Right', action: vi.fn() }]
    }
    mockGetButtonControl.mockReturnValueOnce(existingButtons)
    const { updateRouteAndButtons } = useExaminerRoute()
    const approveAction = vi.fn()
    updateRouteAndButtons(
      '/test-route',
      { approve: { action: approveAction, label: 'Approve' } },
      true
    )
  })

  it('skips button updates when !activeReg.value', () => {
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
  })
})
