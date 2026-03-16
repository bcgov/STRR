import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ApplicationActionsE, RegistrationActionsE } from '#imports'

const mockHandleButtonLoading = vi.fn()
const mockOpenErrorModal = vi.fn()
const mockTranslation = vi.fn((key: string) => key)

mockNuxtImport('useButtonControl', () => () => ({
  handleButtonLoading: mockHandleButtonLoading
}))

mockNuxtImport('useStrrModals', () => () => ({
  openConfirmActionModal: vi.fn(),
  openErrorModal: mockOpenErrorModal,
  close: vi.fn()
}))

mockNuxtImport('useNuxtApp', () => () => ({
  $i18n: { t: mockTranslation }
}))

describe('useExaminerActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should correctly set button loading, args, refresh, reset states', async () => {
    const { manageAction } = useExaminerActions()
    const actionFn = vi.fn().mockResolvedValue(undefined)
    const refresh = vi.fn()

    await manageAction({ id: 42 }, RegistrationActionsE.CANCEL, actionFn, 'left', 1, refresh, ['extra', 'args'] as any)

    expect(mockHandleButtonLoading).toHaveBeenNthCalledWith(1, false, 'left', 1)
    expect(actionFn).toHaveBeenCalledWith(42, 'extra', 'args')
    expect(refresh).toHaveBeenCalledOnce()
    expect(mockHandleButtonLoading).toHaveBeenNthCalledWith(2, true)
    expect(mockOpenErrorModal).not.toHaveBeenCalled()
  })

  it('should skip actionFn and refresh when validateFn returns false, and proceed when true', async () => {
    const { manageAction } = useExaminerActions()
    const actionFn = vi.fn().mockResolvedValue(undefined)
    const refresh = vi.fn()
    const item = { id: '1234567890' }

    const validateFn = vi.fn().mockResolvedValue(false)
    await manageAction(item, ApplicationActionsE.REJECT, actionFn, 'right', 0, refresh, [] as any, validateFn)

    expect(validateFn).toHaveBeenCalledOnce()
    expect(actionFn).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
    expect(mockHandleButtonLoading).toHaveBeenCalledWith(true)

    vi.clearAllMocks()

    const validateTrue = vi.fn().mockResolvedValue(true)
    await manageAction(item, ApplicationActionsE.REJECT, actionFn, 'right', 0, refresh, [] as any, validateTrue)

    expect(actionFn).toHaveBeenCalledWith('1234567890')
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('should open error modal with action key and reset loading on error', async () => {
    const { manageAction } = useExaminerActions()
    const item = { id: '1234567890' }
    const refresh = vi.fn()

    const actionFn = vi.fn().mockRejectedValue(new Error('action failed'))
    await manageAction(item, ApplicationActionsE.REJECT, actionFn, 'right', 0, refresh)

    expect(refresh).not.toHaveBeenCalled()
    expect(mockTranslation).toHaveBeenCalledWith('error.action.reject')
    expect(mockOpenErrorModal).toHaveBeenCalledWith('Error', 'error.action.reject', false)
    expect(mockHandleButtonLoading).toHaveBeenCalledWith(true)
  })
})
