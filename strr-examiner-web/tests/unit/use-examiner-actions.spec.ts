import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ApplicationActionsE, RegistrationActionsE } from '#imports'

const mockOpenErrorModal = vi.fn()
const mockTranslation = vi.fn((key: string) => key)

mockNuxtImport('useStrrModals', () => () => ({
  openConfirmActionModal: vi.fn(),
  openErrorModal: mockOpenErrorModal,
  close: vi.fn()
}))

mockNuxtImport('useNuxtApp', original => () => Object.assign(Object.create(original()), {
  $i18n: { t: mockTranslation }
}))

describe('useExaminerActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useButtonControl().setButtonControl({
      leftButtons: [
        { label: 'Back', action: vi.fn(), disabled: false, loading: false },
        { label: 'Cancel', action: vi.fn(), disabled: false, loading: false }
      ],
      rightButtons: [{ label: 'Approve', action: vi.fn(), disabled: false, loading: false }]
    })
  })

  it('should correctly set button loading, args, refresh, reset states', async () => {
    const { manageAction } = useExaminerActions()
    const actionFn = vi.fn().mockResolvedValue(undefined)
    const refresh = vi.fn()

    await manageAction({ id: 42 }, RegistrationActionsE.CANCEL, actionFn, 'left', 1, refresh, ['extra', 'args'] as any)

    expect(actionFn).toHaveBeenCalledWith(42, 'extra', 'args')
    expect(refresh).toHaveBeenCalledOnce()
    expect(useButtonControl().getButtonControl()?.leftButtons[1]).toMatchObject({ loading: false, disabled: false })
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
    expect(useButtonControl().getButtonControl()?.rightButtons[0]).toMatchObject({ loading: false, disabled: false })

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
    expect(useButtonControl().getButtonControl()?.rightButtons[0]).toMatchObject({ loading: false, disabled: false })
  })

  it('keeps buttons busy and the action pending until the detail refresh completes', async () => {
    const { manageAction } = useExaminerActions()
    const mutation = Promise.withResolvers<void>()
    const reload = Promise.withResolvers<void>()
    const refresh = vi.fn(() => reload.promise)
    const settled = vi.fn()
    const action = manageAction(
      { id: 42 }, RegistrationActionsE.CANCEL, () => mutation.promise, 'left', 1, refresh
    ).then(settled)

    await flushPromises()
    expect(refresh).not.toHaveBeenCalled()
    expect(useButtonControl().getButtonControl()?.leftButtons[1]?.loading).toBe(true)

    mutation.resolve()
    await flushPromises()
    expect(refresh).toHaveBeenCalledOnce()
    expect(settled).not.toHaveBeenCalled()
    expect(useButtonControl().getButtonControl()?.leftButtons[1]?.loading).toBe(true)
    expect(useButtonControl().getButtonControl()?.rightButtons[0]?.disabled).toBe(true)

    reload.resolve()
    await action
    expect(settled).toHaveBeenCalledOnce()
    expect(useButtonControl().getButtonControl()?.leftButtons[1]).toMatchObject({ loading: false, disabled: false })
    expect(useButtonControl().getButtonControl()?.rightButtons[0]?.disabled).toBe(false)
  })

  it('restores the original disabled state when validation stops an action', async () => {
    const controls = useButtonControl()
    controls.getButtonControl()!.leftButtons[0]!.disabled = true
    const actionFn = vi.fn()
    const refresh = vi.fn()

    await useExaminerActions().manageAction(
      { id: 42 }, RegistrationActionsE.CANCEL, actionFn, 'left', 1, refresh, [], () => Promise.resolve(false)
    )

    expect(controls.getButtonControl()?.leftButtons[0]?.disabled).toBe(true)
    expect(controls.getButtonControl()?.leftButtons[1]).toMatchObject({ loading: false, disabled: false })
    expect(actionFn).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('preserves replacement controls and restores buttons retained across a reload', async () => {
    const controls = useButtonControl()
    const retainedButtons = controls.getButtonControl()!.leftButtons
    const replacement = { label: 'Reassign', action: vi.fn(), disabled: true, loading: false }

    await useExaminerActions().manageAction(
      { id: 42 }, RegistrationActionsE.CANCEL, async () => {}, 'left', 1,
      () => { controls.setButtonControl({ leftButtons: retainedButtons, rightButtons: [replacement] }) }
    )

    expect(controls.getButtonControl()?.rightButtons[0]?.disabled).toBe(true)
    expect(controls.getButtonControl()?.leftButtons[1]).toMatchObject({ loading: false, disabled: false })
  })

  it('restores disabled controls when the mutation fails', async () => {
    const controls = useButtonControl()
    controls.getButtonControl()!.leftButtons[0]!.disabled = true
    const refresh = vi.fn()

    await useExaminerActions().manageAction(
      { id: 42 }, RegistrationActionsE.CANCEL,
      () => Promise.reject(new Error('mutation failed')), 'left', 1, refresh
    )

    expect(controls.getButtonControl()?.leftButtons[0]?.disabled).toBe(true)
    expect(controls.getButtonControl()?.leftButtons[1]).toMatchObject({ loading: false, disabled: false })
    expect(refresh).not.toHaveBeenCalled()
    expect(mockOpenErrorModal).toHaveBeenCalledWith('Error', 'error.action.cancel', false)
  })
})
